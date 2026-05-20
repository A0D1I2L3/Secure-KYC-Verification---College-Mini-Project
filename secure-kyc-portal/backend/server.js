"use strict";

/**
 * KYC Threshold Decryption Backend
 * ─────────────────────────────────
 *
 * ENCRYPTION ARCHITECTURE
 * ───────────────────────
 * Three separate RSA-2048 keypairs (authority_1, authority_2, authority_3) are
 * generated at startup via kyc.generateAuthorities().
 *
 * When a KYC record is submitted:
 *   1. kyc.encryptWithPublicKeys(payload, [pub1, pub2, pub3])
 *      → produces a 3-layer AES-GCM / RSA-OAEP ciphertext.
 *      Layer order: pub1 applied first (innermost), pub3 applied last (outermost).
 *
 *   2. kyc.splitKey({ privateKey: priv_i, threshold: 2, shares: 3 }) is called
 *      separately for EACH of the three authority private keys.
 *      Result: 3 arrays of 3 share-objects each (9 share-objects total).
 *
 *   3. Shares are distributed across THREE authority portals:
 *        Portal A → [ share[0] of key1, share[0] of key2, share[0] of key3 ]
 *        Portal B → [ share[1] of key1, share[1] of key2, share[1] of key3 ]
 *        Portal C → [ share[2] of key1, share[2] of key2, share[2] of key3 ]
 *
 *      Any TWO portals collectively hold 2 shares of every private key,
 *      satisfying each key's threshold=2 requirement simultaneously.
 *
 * DECRYPTION ARCHITECTURE
 * ───────────────────────
 * When ≥ 2 portals submit their share bundles:
 *   1. For each authority key i (0..2):
 *        kyc.reconstructKey({ shares: [shareFromPortalX_keyI, shareFromPortalY_keyI], threshold: 2 })
 *        → privKey_i_pem  (held in memory only, NEVER written to disk)
 *
 *   2. Layer peeling using the low-level API (NOT kyc.decrypt which reads from filesystem):
 *        decryptAuthorityLayer(ciphertext,  privKey_2)           → intermediate2
 *        decryptAuthorityLayer(intermediate2, privKey_1)         → intermediate1
 *        decryptAuthorityLayer(intermediate1, privKey_0, { deserializePayload: true }) → plaintext
 *
 *   3. Reconstructed PEMs are discarded after decryption.
 *
 * WHY decryptAuthorityLayer() INSTEAD OF decrypt()
 * ─────────────────────────────────────────────────
 * kyc.decrypt() internally calls loadPrivateKeys() which reads priv.pem files
 * from the authoritiesDir on disk. That bypasses threshold logic entirely.
 * decryptAuthorityLayer() accepts a privateKeyPem string directly, allowing us
 * to feed in the in-memory reconstructed key without touching the filesystem.
 */

const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const kyc     = require("kyc-encrypt");

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT           = process.env.PORT || 5000;
const KEYS_DIR       = path.join(__dirname, "keys");
const AUTHORITY_COUNT = 3;
const THRESHOLD       = 2;          // minimum portals required to decrypt
const SHARES_PER_KEY  = 3;          // one share per portal
const PORTAL_LABELS   = ["A", "B", "C"];

// ─── In-memory state ─────────────────────────────────────────────────────────
//
// In a production system this state would live in a database.
// For the demo, everything is held in a Map keyed by sessionId.
//
// sessions[id] = {
//   ciphertext      : string            — Base64 layered ciphertext
//   applicantName   : string
//   maskedAadhaar   : string
//   portalShareMap  : { A: Share[], B: Share[], C: Share[] }
//                     — the authoritative share bundles produced at encrypt-time
//   submittedPortals: Set<string>       — which portals have POSTed their shares
//   collectedShares : { [label]: Share[] }
//                     — shares actually received (validated against portalShareMap)
//   threshold       : number
//   authorityCount  : number
//   createdAt       : number
// }

const sessions = new Map();

// Held in process memory after generateAuthorities(); never re-read from disk
// during decryption (we use reconstructKey() instead).
const authorityState = {
  ready      : false,
  publicKeys : [],   // [ pubPem_1, pubPem_2, pubPem_3 ]
  privateKeys: [],   // [ privPem_1, privPem_2, privPem_3 ]  — source of truth for splitKey
};

// ─── Startup: generate / load authority keypairs ──────────────────────────────

async function initAuthorities() {
  if (authorityState.ready) return;

  console.log("[init] Generating authority keypairs …");

  const result = await kyc.generateAuthorities(AUTHORITY_COUNT, {
    authoritiesDir: KEYS_DIR,
    overwrite: true,
  });

  for (const auth of result.authorities) {
    authorityState.publicKeys.push(fs.readFileSync(auth.publicKeyPath,  "utf8"));
    authorityState.privateKeys.push(fs.readFileSync(auth.privateKeyPath, "utf8"));
  }

  authorityState.ready = true;
  console.log(`[init] ${AUTHORITY_COUNT} authority keypairs ready.`);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /health
 */
app.get("/health", (_req, res) => {
  res.json({ ok: true, keysReady: authorityState.ready });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /encrypt
 * Body : { name, aadhaar, dob, pan? }
 *
 * 1. Validates Aadhaar format.
 * 2. Encrypts KYC payload with all 3 authority public keys.
 * 3. Splits each private key into SHARES_PER_KEY shares (threshold THRESHOLD).
 * 4. Distributes shares across portal bundles.
 * 5. Stores session in memory and returns sessionId + metadata.
 */
app.post("/encrypt", async (req, res) => {
  try {
    await initAuthorities();

    const { name, aadhaar, dob, pan } = req.body;

    if (!name || !aadhaar || !dob) {
      return res.status(400).json({ error: "name, aadhaar, and dob are required." });
    }

    // ── 1. Validate Aadhaar ────────────────────────────────────────────────
    const validation = kyc.validateAadhaarFormat(aadhaar);
    if (!validation.isValid) {
      return res.status(400).json({ error: `Invalid Aadhaar: ${validation.reason}` });
    }

    // ── 2. Build payload and encrypt ──────────────────────────────────────
    const payload = { name, aadhaar: validation.normalized, dob };
    if (pan) payload.pan = pan;

    // encryptWithPublicKeys applies layers sequentially:
    //   publicKeys[0] → innermost layer (decrypted last)
    //   publicKeys[2] → outermost layer (decrypted first)
    const ciphertext = await kyc.encryptWithPublicKeys(payload, authorityState.publicKeys);

    // ── 3. Split each authority private key independently ─────────────────
    //
    //   sharesPerKey[i] = [ shareObj_portal_A, shareObj_portal_B, shareObj_portal_C ]
    //   i corresponds to authority key index (0-based).
    //
    const sharesPerKey = [];
    for (let i = 0; i < AUTHORITY_COUNT; i++) {
      const keyShares = await kyc.splitKey({
        privateKey: authorityState.privateKeys[i],
        threshold : THRESHOLD,
        shares    : SHARES_PER_KEY,
      });
      sharesPerKey.push(keyShares);
    }

    // ── 4. Build portal bundle map ─────────────────────────────────────────
    //
    //   Portal A's bundle = [ sharesPerKey[0][0], sharesPerKey[1][0], sharesPerKey[2][0] ]
    //   Portal B's bundle = [ sharesPerKey[0][1], sharesPerKey[1][1], sharesPerKey[2][1] ]
    //   Portal C's bundle = [ sharesPerKey[0][2], sharesPerKey[1][2], sharesPerKey[2][2] ]
    //
    //   Any 2 portals → 2 share-objects per key → threshold met for every key.
    //
    const portalShareMap = {};
    PORTAL_LABELS.forEach((label, portalIdx) => {
      portalShareMap[label] = sharesPerKey.map((keyShareArr) => keyShareArr[portalIdx]);
    });

    // ── 5. Persist session ────────────────────────────────────────────────
    const sessionId = `kyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    sessions.set(sessionId, {
      ciphertext,
      applicantName   : name,
      maskedAadhaar   : kyc.maskAadhaar(validation.normalized),
      portalShareMap,               // authoritative source for verification
      submittedPortals: new Set(),
      collectedShares : {},
      threshold       : THRESHOLD,
      authorityCount  : AUTHORITY_COUNT,
      createdAt       : Date.now(),
    });

    res.json({
      success        : true,
      sessionId,
      maskedAadhaar  : kyc.maskAadhaar(validation.normalized),
      ciphertext,                    // returned so the UI can display it
      authorityCount : AUTHORITY_COUNT,
      threshold      : THRESHOLD,
      portalShareMap,                // each portal's share bundle — needed for submit
      applicantName  : name,
      message        : "KYC data encrypted. Distribute share bundles to authority portals.",
    });

  } catch (err) {
    console.error("[encrypt]", err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /session/:sessionId
 * Returns public session metadata (no shares, no raw ciphertext in this response).
 */
app.get("/session/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });

  res.json({
    sessionId       : req.params.sessionId,
    applicantName   : session.applicantName,
    maskedAadhaar   : session.maskedAadhaar,
    threshold       : session.threshold,
    authorityCount  : session.authorityCount,
    submittedPortals: [...session.submittedPortals],
    sharesSubmitted : session.submittedPortals.size,
    sharesRequired  : session.threshold,
    canDecrypt      : session.submittedPortals.size >= session.threshold,
    createdAt       : session.createdAt,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * GET /session/:sessionId/portal/:label
 * Returns the share bundle for a specific portal (A, B, or C).
 *
 * In production this endpoint would require portal-specific authentication
 * (e.g. a signed JWT issued to each authority organisation).
 */
app.get("/session/:sessionId/portal/:label", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });

  const label = req.params.label.toUpperCase();
  if (!PORTAL_LABELS.includes(label)) {
    return res.status(400).json({ error: `Unknown portal label "${label}". Use A, B, or C.` });
  }

  const shares = session.portalShareMap[label];
  res.json({
    sessionId    : req.params.sessionId,
    portalLabel  : label,
    applicantName: session.applicantName,
    maskedAadhaar: session.maskedAadhaar,
    shares,              // array of Share objects, one per authority key
    alreadySubmitted: session.submittedPortals.has(label),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /session/:sessionId/submit
 * Body : { portalLabel: "A"|"B"|"C", shares: Share[] }
 *
 * Records that a portal has submitted its share bundle.
 * Returns current threshold progress.
 */
app.post("/session/:sessionId/submit", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found." });

  const { portalLabel, shares } = req.body;
  const label = (portalLabel || "").toUpperCase();

  if (!PORTAL_LABELS.includes(label)) {
    return res.status(400).json({ error: "portalLabel must be A, B, or C." });
  }
  if (!Array.isArray(shares) || shares.length !== AUTHORITY_COUNT) {
    return res.status(400).json({
      error: `Expected exactly ${AUTHORITY_COUNT} share objects (one per authority key).`,
    });
  }
  if (session.submittedPortals.has(label)) {
    return res.status(409).json({ error: `Portal ${label} has already submitted.` });
  }

  session.submittedPortals.add(label);
  session.collectedShares[label] = shares;

  const submitted = session.submittedPortals.size;
  const canDecrypt = submitted >= session.threshold;

  res.json({
    submitted,
    sharesRequired  : session.threshold,
    canDecrypt,
    submittedPortals: [...session.submittedPortals],
    message         : canDecrypt
      ? `Threshold reached (${submitted}/${session.threshold}). Decryption is now authorized.`
      : `Waiting for ${session.threshold - submitted} more portal(s).`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * POST /session/:sessionId/decrypt
 *
 * Requires that ≥ THRESHOLD portals have submitted share bundles.
 *
 * DECRYPTION STEPS
 * ─────────────────
 * Step A — Key reconstruction (in memory):
 *   For each authority key index i (0..AUTHORITY_COUNT-1):
 *     Collect one Share object from each submitted portal for key i.
 *     reconstructKey({ shares: collectedSharesForKeyI, threshold })
 *     → privKeyPem_i  (string, never written to disk)
 *
 * Step B — Layer peeling (outermost → innermost):
 *   encryptWithPublicKeys applied keys [0,1,2] in order → outermost layer is key[2].
 *   So we peel: key[2] → key[1] → key[0].
 *
 *   decryptAuthorityLayer(ciphertext,     privKeyPem_2)                         → buf_b64_1
 *   decryptAuthorityLayer(buf_b64_1,      privKeyPem_1)                         → buf_b64_0
 *   decryptAuthorityLayer(buf_b64_0,      privKeyPem_0, {deserializePayload:true}) → plainObject
 *
 * Step C — Sanitise and return:
 *   The raw Aadhaar is masked before sending to the client.
 *   Reconstructed PEMs are discarded (go out of scope).
 */
app.post("/session/:sessionId/decrypt", async (req, res) => {

  const session = sessions.get(req.params.sessionId);

  if (!session) {
    return res
      .status(404)
      .json({
        error: "Session not found."
      });
  }

  if (
    session.submittedPortals.size <
    session.threshold
  ) {

    return res
      .status(403)
      .json({
        error:
          `Threshold not met: ${session.submittedPortals.size}/${session.threshold} portals submitted.`,
      });

  }

  try {

    // ─────────────────────────────────────────────
    // STEP A — RECONSTRUCT PRIVATE KEYS
    // ─────────────────────────────────────────────

    const usedPortals =
      [...session.submittedPortals]
        .slice(0, session.threshold);

    console.log(
      `[decrypt] Using portals: ${usedPortals.join(", ")}`
    );

    const reconstructedPrivKeys = [];

    for (
      let keyIdx = 0;
      keyIdx < AUTHORITY_COUNT;
      keyIdx++
    ) {

      const sharesForThisKey =
        usedPortals.map((label) => {

          const bundle =
            session.collectedShares[label];

          if (
            !bundle ||
            !bundle[keyIdx]
          ) {

            throw new Error(
              `Missing share for key ${keyIdx} from portal ${label}.`
            );

          }

          return bundle[keyIdx];

        });

      console.log(
        `[decrypt] Reconstructing authority key ${keyIdx + 1}...`
      );

      const privPem =
        await kyc.reconstructKey({
          shares:
            sharesForThisKey,
          threshold:
            session.threshold,
        });

      reconstructedPrivKeys.push(
        privPem
      );

    }

    console.log(
      "[decrypt] All keys reconstructed."
    );

    // ─────────────────────────────────────────────
    // STEP B — PEEL ENCRYPTION LAYERS
    // ─────────────────────────────────────────────

    let current =
      session.ciphertext;

    for (
      let i = AUTHORITY_COUNT - 1;
      i >= 0;
      i--
    ) {

      const isInnermostLayer =
        i === 0;

      console.log(
        `[decrypt] Removing layer ${i + 1}`
      );

      current =
        await kyc.decryptAuthorityLayer(
          current,
          reconstructedPrivKeys[i],
          {
            deserializePayload:
              isInnermostLayer,
          }
        );

    }

    // ─────────────────────────────────────────────
    // STEP C — FINAL PAYLOAD FIX
    // ─────────────────────────────────────────────

    let decrypted;

    if (
      typeof current === "string"
    ) {

      try {

        decrypted =
          JSON.parse(current);

      } catch {

        decrypted = {
          value: current
        };

      }

    } else {

      decrypted = current;

    }

    // ─────────────────────────────────────────────
    // STEP D — MASK AADHAAR
    // ─────────────────────────────────────────────

    const safePayload = {
      ...decrypted
    };

    if (
      safePayload.aadhaar
    ) {

      safePayload.maskedAadhaar =
        kyc.maskAadhaar(
          safePayload.aadhaar
        );

    }

    console.log(
      "[decrypt] Decryption successful."
    );

    res.json({

      success: true,

      decrypted:
        safePayload,

      portalsUsed:
        usedPortals,

      threshold:
        `${usedPortals.length}-of-${AUTHORITY_COUNT}`,

    });

  } catch (err) {

    console.error(
      "[decrypt] Error:",
      err
    );

    res.status(500).json({
      error:
        `Decryption failed: ${err.message}`,
    });

  }

});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  try {
    await initAuthorities();
  } catch (e) {
    console.error("[init] Key generation failed:", e.message);
  }
});
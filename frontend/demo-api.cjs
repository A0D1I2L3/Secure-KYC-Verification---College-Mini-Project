"use strict";

const http = require("node:http");
const kyc = require("../index.js");

const HOST = process.env.DEMO_API_HOST || "127.0.0.1";
const PORT = Number(process.env.DEMO_API_PORT || 5174);
const HMAC_SECRET = process.env.DEMO_HMAC_SECRET || "kyc-encrypt-demo-secret";
const AUTHORITY_LABELS = ["Bank", "Auditor", "Regulator"];

function previewPem(pem) {
  const lines = pem.trim().split("\n");
  return [lines[0], lines[1], "...", lines[lines.length - 1]].join("\n");
}

function byteLengthOfBase64(base64) {
  return Buffer.from(base64, "base64").length;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 4096) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

async function runLibraryDemo(aadhaar) {
  const validation = kyc.validateAadhaarFormat(aadhaar);

  if (!validation.isValid) {
    const error = new Error(validation.reason);
    error.statusCode = 400;
    throw error;
  }

  const authorities = await Promise.all(
    AUTHORITY_LABELS.map(async (label) => ({
      label,
      ...(await kyc.generateAuthorityKeyPair({ writeFiles: false })),
    })),
  );
  const publicKeys = authorities.map((authority) => authority.publicKey);
  const bankCiphertext = await kyc.encryptAadhaarWithPublicKeys(aadhaar, [
    publicKeys[0],
  ]);
  const auditorCiphertext = kyc
    .encryptLayer(Buffer.from(bankCiphertext, "base64"), publicKeys[1])
    .toString("base64");
  const regulatorCiphertext = kyc
    .encryptLayer(Buffer.from(auditorCiphertext, "base64"), publicKeys[2])
    .toString("base64");
  const ciphertext = regulatorCiphertext;

  const afterRegulator = kyc.decryptAuthorityLayer(
    ciphertext,
    authorities[2].privateKey,
  );
  const afterAuditor = kyc.decryptAuthorityLayer(
    afterRegulator,
    authorities[1].privateKey,
  );
  const bankRecoveryShares = await kyc.splitKey({
    privateKey: authorities[0].privateKey,
    threshold: 2,
    shares: 3,
  });
  const reconstructedBankKey = await kyc.reconstructKey({
    shares: [bankRecoveryShares[0], bankRecoveryShares[2]],
    threshold: 2,
  });
  const decrypted = kyc.decryptAuthorityLayer(
    afterAuditor,
    reconstructedBankKey,
    { deserializePayload: true },
  );
  const layerSizes = [
    byteLengthOfBase64(bankCiphertext),
    byteLengthOfBase64(auditorCiphertext),
    byteLengthOfBase64(regulatorCiphertext),
  ];

  return {
    demoApiVersion: 2,
    validation,
    masked: kyc.maskAadhaar(aadhaar),
    fingerprint: kyc.fingerprintAadhaar(aadhaar, HMAC_SECRET),
    ciphertext,
    decrypted,
    layerSizes,
    encryptionStages: [
      {
        authority: authorities[0].label,
        operation: "encryptAadhaarWithPublicKeys(aadhaar, [bankPublicKey])",
        input: validation.normalized,
        output: bankCiphertext,
        outputBytes: byteLengthOfBase64(bankCiphertext),
      },
      {
        authority: authorities[1].label,
        operation: "encryptLayer(bankCiphertext, auditorPublicKey)",
        input: bankCiphertext,
        output: auditorCiphertext,
        outputBytes: byteLengthOfBase64(auditorCiphertext),
      },
      {
        authority: authorities[2].label,
        operation: "encryptLayer(auditorCiphertext, regulatorPublicKey)",
        input: auditorCiphertext,
        output: regulatorCiphertext,
        outputBytes: byteLengthOfBase64(regulatorCiphertext),
      },
    ],
    decryptionSteps: [
      {
        authority: authorities[2].label,
        operation: "decryptAuthorityLayer(ciphertext, regulatorPrivateKey)",
        input: ciphertext,
        output: afterRegulator,
        inputBytes: byteLengthOfBase64(ciphertext),
        outputBytes: byteLengthOfBase64(afterRegulator),
      },
      {
        authority: authorities[1].label,
        operation: "decryptAuthorityLayer(afterRegulator, auditorPrivateKey)",
        input: afterRegulator,
        output: afterAuditor,
        inputBytes: byteLengthOfBase64(afterRegulator),
        outputBytes: byteLengthOfBase64(afterAuditor),
      },
      {
        authority: authorities[0].label,
        operation: "reconstructKey(2 of 3 shares) + decryptAuthorityLayer(...)",
        input: afterAuditor,
        output: decrypted,
        inputBytes: byteLengthOfBase64(afterAuditor),
        outputBytes: Buffer.byteLength(String(decrypted)),
      },
    ],
    recovery: {
      authority: authorities[0].label,
      algorithm: bankRecoveryShares[0].algorithm,
      threshold: bankRecoveryShares[0].threshold,
      totalShares: bankRecoveryShares[0].totalShares,
      usedShares: [bankRecoveryShares[0].x, bankRecoveryShares[2].x],
      shareBytes: bankRecoveryShares.map((share) =>
        Buffer.byteLength(JSON.stringify(share)),
      ),
      checksumPreview: `${bankRecoveryShares[0].checksum.slice(0, 12)}...`,
      reconstructedMatchesOriginal:
        reconstructedBankKey === authorities[0].privateKey,
      decryptUsedReconstructedKey: true,
    },
    authorities: authorities.map((authority) => ({
      label: authority.label,
      publicBytes: Buffer.byteLength(authority.publicKey),
      privateBytes: Buffer.byteLength(authority.privateKey),
      publicKeyPreview: previewPem(authority.publicKey),
      privateKeyPreview: previewPem(authority.privateKey),
    })),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/api/demo/health") {
    sendJson(res, 200, { ok: true, service: "kyc-encrypt-demo-api" });
    return;
  }

  if (req.method === "POST" && req.url === "/api/demo/aadhaar") {
    try {
      const body = await readJson(req);
      const result = await runLibraryDemo(body.aadhaar);
      sendJson(res, 200, { ok: true, result });
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error.message || "Demo API failed.",
      });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log(`kyc-encrypt demo API listening on http://${HOST}:${PORT}`);
});

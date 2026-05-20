import { useState, useCallback } from "react";

// ─── API base (matches your existing backend port) ────────────────────────────
const API = "https://secure-kyc-verification-college-mini.onrender.com";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PORTALS = ["A", "B", "C"];
const THRESHOLD = 2;

// ─── Inline styles (no extra CSS file needed) ─────────────────────────────────
const S = {
  root: {
  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  background: "#0a0d12",
  minHeight: "100vh",
  color: "#d8dde7",
  fontSize: 13,
},
  // ── Header
  header: {
  borderBottom: "1px solid #232938",
  background: "#11151d",
  padding: "14px 32px",
  display: "flex",
  alignItems: "center",
  gap: 16,
},
  headerBadge: {
    fontSize: 9,
    letterSpacing: "0.18em",
    color: "#c8a96b",
    border: "1px solid #6b4410",
    padding: "2px 8px",
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 12,
    letterSpacing: "0.1em",
    fontWeight: 600,
    color: "#c9cdd6",
    textTransform: "uppercase",
  },
  headerSpacer: { flex: 1 },
  headerSub: { fontSize: 10, color: "#3e4557", letterSpacing: "0.08em" },
  // ── Layout
  body: {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  minHeight: "calc(100vh - 45px)",
  width: "100%",
},
  // ── Sidebar
  sidebar: {
  background: "#11151d",
  borderRight: "1px solid #232938",
  padding: "24px 0",
},
  sidebarLabel: {
    fontSize: 9,
    letterSpacing: "0.2em",
    color: "#596174",
    textTransform: "uppercase",
    padding: "0 20px 10px",
  },
  stepItem: (active, done) => ({
    display: "flex",
    gap: 12,
    padding: "12px 20px",
    borderLeft: `2px solid ${done ? "#2ecc71" : active ? "#c8a96b" : "transparent"}`,
    background: done
      ? "rgba(46,204,113,0.03)"
      : active
      ? "rgba(212,146,42,0.05)"
      : "transparent",
    cursor: "default",
  }),
  stepNum: (active, done) => ({
    fontSize: 10,
    color: done ? "#2ecc71" : active ? "#c8a96b" : "#596174",
    width: 18,
    flexShrink: 0,
    paddingTop: 1,
  }),
  stepTitle: (active, done) => ({
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: done ? "#2ecc71" : active ? "#c9cdd6" : "#3e4557",
    marginBottom: 2,
  }),
  stepDesc: (active) => ({
    fontSize: 10,
    color: active ? "#a0a8ba" : "#596174",
    lineHeight: 1.5,
  }),
  // ── Content
  content: {
  padding: "34px 42px",
  overflowY: "auto",
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
},
  panelTag: {
    fontSize: 9,
    letterSpacing: "0.2em",
    color: "#c8a96b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  panelTitle: {
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: "0.03em",
  color: "#d8dde7",
  marginBottom: 8,
},
  panelSub: {
  fontSize: 13,
  color: "#a0a8ba",
  lineHeight: 1.8,
  maxWidth: "100%",
  marginBottom: 28,
},
  // ── Cards
  card: {
  background: "#11151d",
  border: "1px solid #232938",
  padding: "18px 22px",
  marginBottom: 14,
  width: "100%",
  boxSizing: "border-box",
},
  cardTitle: {
    fontSize: 9,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#3e4557",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid #232938",
  },
  // ── Form
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  formField: { display: "flex", flexDirection: "column", gap: 5 },
  formFieldFull: { display: "flex", flexDirection: "column", gap: 5, gridColumn: "1 / -1" },
  label: {
    fontSize: 9,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#a0a8ba",
  },
  input: {
    background: "#080a0e",
    border: "1px solid #252c3d",
    color: "#c9cdd6",
    fontFamily: "inherit",
    fontSize: 12,
    padding: "8px 10px",
    outline: "none",
    width: "100%",
  },
  // ── Buttons
  btnPrimary: {
    fontFamily: "inherit",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 600,
    padding: "9px 22px",
    border: "none",
    background: "#c8a96b",
    color: "#080a0e",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  btnSecondary: {
    fontFamily: "inherit",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 600,
    padding: "9px 22px",
    border: "1px solid #252c3d",
    background: "transparent",
    color: "#a0a8ba",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  btnSuccess: {
    fontFamily: "inherit",
    fontSize: 10,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 600,
    padding: "9px 22px",
    border: "none",
    background: "#2ecc71",
    color: "#080a0e",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },
  btnDisabled: { opacity: 0.35, cursor: "not-allowed" },
  // ── Alerts
  alertError: {
    background: "rgba(231,76,60,0.08)",
    border: "1px solid rgba(231,76,60,0.3)",
    color: "#e74c3c",
    padding: "10px 14px",
    fontSize: 11,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  alertSuccess: {
    background: "rgba(46,204,113,0.07)",
    border: "1px solid rgba(46,204,113,0.25)",
    color: "#2ecc71",
    padding: "10px 14px",
    fontSize: 11,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  alertInfo: {
    background: "rgba(76,142,255,0.07)",
    border: "1px solid rgba(76,142,255,0.2)",
    color: "#4c8eff",
    padding: "10px 14px",
    fontSize: 11,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  alertWarn: {
    background: "rgba(212,146,42,0.07)",
    border: "1px solid rgba(212,146,42,0.2)",
    color: "#c8a96b",
    padding: "10px 14px",
    fontSize: 11,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  // ── Portal cards
  portalsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 16,
  marginBottom: 18,
  width: "100%",
},
  portalCard: (submitted, active) => ({
    background: submitted
      ? "rgba(46,204,113,0.04)"
      : active
      ? "rgba(212,146,42,0.05)"
      : "#0d1018",
    border: `1px solid ${submitted ? "#2ecc71" : active ? "#c8a96b" : "#232938"}`,
    padding: "14px 16px",
  }),
  portalLetter: (submitted, active) => ({
    fontSize: 28,
    fontWeight: 700,
    color: submitted ? "#2ecc71" : active ? "#c8a96b" : "#596174",
    marginBottom: 4,
    lineHeight: 1,
  }),
  portalStatusTag: (submitted, active) => ({
    fontSize: 9,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "2px 7px",
    border: `1px solid ${submitted ? "#2ecc71" : active ? "#c8a96b" : "#252c3d"}`,
    color: submitted ? "#2ecc71" : active ? "#c8a96b" : "#3e4557",
    display: "inline-block",
    marginBottom: 10,
  }),
  portalDesc: { fontSize: 10, color: "#3e4557", lineHeight: 1.5, marginBottom: 10 },
  // ── Threshold bar
  threshBar: { marginBottom: 16 },
  threshBarLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "#3e4557",
    marginBottom: 5,
  },
  threshBarTrack: {
    height: 3,
    background: "#232938",
    display: "flex",
    gap: 3,
  },
  threshSeg: (filled) => ({
    flex: 1,
    height: "100%",
    background: filled ? "#c8a96b" : "#232938",
    transition: "background 0.3s",
  }),
  // ── Data table
  dataTable: { width: "100%", borderCollapse: "collapse" },
  dataRow: {
    borderBottom: "1px solid #232938",
    display: "flex",
    minHeight: 34,
    alignItems: "stretch",
  },
  dataKey: {
    fontSize: 9,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#a0a8ba",
    padding: "9px 12px",
    width: 130,
    flexShrink: 0,
    borderRight: "1px solid #232938",
    display: "flex",
    alignItems: "center",
  },
  dataVal: {
    fontSize: 11,
    color: "#c9cdd6",
    padding: "9px 12px",
    flex: 1,
    wordBreak: "break-all",
    display: "flex",
    alignItems: "center",
  },
  // ── Cipher box
  cipherBox: {
    background: "#080a0e",
    border: "1px solid #232938",
    padding: "10px 12px",
    fontSize: 9,
    color: "#6b4410",
    wordBreak: "break-all",
    maxHeight: 80,
    overflow: "hidden",
    lineHeight: 1.6,
    position: "relative",
  },
  // ── Result
  resultPanel: {
    background: "#0d1018",
    border: "1px solid #2ecc71",
    padding: "20px 22px",
    marginTop: 18,
  },
  resultHeader: {
    fontSize: 9,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "#2ecc71",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(46,204,113,0.18)",
  },
  divider: { height: 1, background: "#232938", margin: "18px 0" },
  flexRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  flexRowTop: { display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  shareCountBadge: {
    fontSize: 9,
    letterSpacing: "0.1em",
    color: "#a0a8ba",
    border: "1px solid #232938",
    padding: "2px 7px",
    textTransform: "uppercase",
  },
};

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: "submit",    label: "Submit KYC",      desc: "Applicant enters identity data" },
  { id: "encrypted", label: "Encrypt & Split", desc: "3-layer RSA+AES, Shamir share generation" },
  { id: "authority", label: "Authority Portals", desc: "2-of-3 portals submit share bundles" },
  { id: "decrypt",   label: "Reconstruct & Decrypt", desc: "In-memory key rebuild → layer peel" },
  { id: "result",    label: "Verified KYC",    desc: "Authenticated plaintext revealed" },
];

// ─── Small components ─────────────────────────────────────────────────────────
function Alert({ type = "info", children }) {
  const styleMap = {
    error:   S.alertError,
    success: S.alertSuccess,
    info:    S.alertInfo,
    warn:    S.alertWarn,
  };
  return <div style={styleMap[type]}>{children}</div>;
}

function DataRow({ label, value, mono = true }) {
  return (
    <div style={S.dataRow}>
      <div style={S.dataKey}>{label}</div>
      <div style={{ ...S.dataVal, fontFamily: mono ? "inherit" : "sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

function Btn({ onClick, disabled, variant = "primary", children }) {
  const base =
    variant === "primary" ? S.btnPrimary
    : variant === "success" ? S.btnSuccess
    : S.btnSecondary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...(disabled ? S.btnDisabled : {}) }}
    >
      {children}
    </button>
  );
}

function ThreshBar({ filled, total }) {
  return (
    <div style={S.threshBar}>
      <div style={S.threshBarLabel}>
        <span>THRESHOLD PROGRESS</span>
        <span>{filled}/{total} required</span>
      </div>
      <div style={S.threshBarTrack}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={S.threshSeg(i < filled)} />
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Step tracking
  const [step, setStep] = useState(0); // index into STEPS

  // ── Encryption state
  const [form, setForm] = useState({ name: "", aadhaar: "", dob: "" });
  const [encryptLoading, setEncryptLoading] = useState(false);
  const [encryptError, setEncryptError] = useState("");
  const [session, setSession] = useState(null);
  // session: { sessionId, maskedAadhaar, ciphertext, portalShareMap, … }
  // portalShareMap is returned from /encrypt for demo convenience.
  // In production, each portal would fetch its own bundle.

  // ── Authority portal state
  // submittedPortals: Set of portal labels that have submitted
  const [submittedPortals, setSubmittedPortals] = useState(new Set());
  // activePortal: which portal panel is currently expanded for input
  const [activePortal, setActivePortal] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // ── Decryption state
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptError, setDecryptError] = useState("");
  const [decryptResult, setDecryptResult] = useState(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFormChange = useCallback((e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }, []);

  /**
   * POST /encrypt
   * Sends KYC form data, receives sessionId + ciphertext + portalShareMap.
   * portalShareMap: { A: Share[], B: Share[], C: Share[] }
   * (in a real deployment each authority fetches only its own bundle)
   */
  const handleEncrypt = useCallback(async () => {
    setEncryptError("");
    setEncryptLoading(true);
    setSession(null);
    setSubmittedPortals(new Set());
    setActivePortal(null);
    setDecryptResult(null);
    try {
      const data = await apiFetch("/encrypt", {
        method: "POST",
        body: JSON.stringify(form),
      });
      // Attach the per-portal share bundles so the demo UI can display them
      // without each portal needing to call GET /session/:id/portal/:label
      setSession(data);
      setStep(1);
    } catch (err) {
      setEncryptError(err.message);
    } finally {
      setEncryptLoading(false);
    }
  }, [form]);

  /**
   * POST /session/:id/submit
   * Submits a portal's share bundle to the backend.
   * The backend validates share count and records the submission.
   *
   * For the demo, the frontend retrieves the share bundle it already
   * received from /encrypt (portalShareMap[label]).
   * In production, each authority organisation would call
   * GET /session/:id/portal/:label (with auth) and submit independently.
   */
  const handlePortalSubmit = useCallback(async (label) => {
    if (!session) return;
    setSubmitError("");
    setSubmitLoading(true);
    try {
      // Retrieve this portal's share bundle from the session data
      const shares = session.portalShareMap[label];
      if (!shares) throw new Error(`No shares available for portal ${label}.`);

      const data = await apiFetch(`/session/${session.sessionId}/submit`, {
        method: "POST",
        body: JSON.stringify({ portalLabel: label, shares }),
      });

      const next = new Set([...submittedPortals, label]);
      setSubmittedPortals(next);
      setActivePortal(null);

      if (data.canDecrypt && step < 2) setStep(2);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  }, [session, submittedPortals, step]);

  /**
   * POST /session/:id/decrypt
   *
   * Triggers backend threshold decryption:
   *   1. reconstructKey() × 3  (one per authority key, in memory)
   *   2. decryptAuthorityLayer() × 3  (outermost → innermost)
   *   3. Returns masked plaintext
   */
  const handleDecrypt = useCallback(async () => {
    if (!session) return;
    setDecryptError("");
    setDecryptLoading(true);
    try {
      const data = await apiFetch(`/session/${session.sessionId}/decrypt`, {
        method: "POST",
      });
      setDecryptResult(data);
      setStep(4);
    } catch (err) {
      setDecryptError(err.message);
    } finally {
      setDecryptLoading(false);
    }
  }, [session]);

  const canDecrypt = submittedPortals.size >= THRESHOLD;

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const stepIndex = step; // 0=submit, 1=encrypted, 2=authority, 3=decrypt, 4=result

  function renderSidebar() {
    return (
      <div style={S.sidebar}>
        <div style={S.sidebarLabel}>Protocol Steps</div>
        {STEPS.map((s, i) => {
          const active = i === stepIndex;
          const done   = i < stepIndex;
          return (
            <div key={s.id} style={S.stepItem(active, done)}>
              <div style={S.stepNum(active, done)}>
                {done ? "✓" : String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={S.stepTitle(active, done)}>{s.label}</div>
                <div style={S.stepDesc(active)}>{s.desc}</div>
              </div>
            </div>
          );
        })}

        {session && (
          <>
            <div style={{ ...S.divider, margin: "16px 0" }} />
            <div style={{ padding: "0 20px" }}>
              <div style={{ ...S.sidebarLabel, paddingBottom: 6 }}>Session</div>
              <div style={{ fontSize: 9, color: "#596174", wordBreak: "break-all", lineHeight: 1.7 }}>
                {session.sessionId}
              </div>
              <div style={{ ...S.mt8 }}>
                <div style={{ ...S.sidebarLabel, paddingBottom: 4 }}>Threshold</div>
                <ThreshBar filled={submittedPortals.size} total={THRESHOLD} />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Panel: Submit KYC ─────────────────────────────────────────────────────
  function renderSubmitPanel() {
    return (
      <>
        <div style={S.panelTag}>Step 01</div>
        <div style={S.panelTitle}>Applicant KYC Submission</div>
        <div style={S.panelSub}>
          Enter identity data. The backend will encrypt it with a 3-layer RSA+AES-GCM cipher
          and immediately split each layer's private key using Shamir Secret Sharing (threshold 2-of-3).
        </div>

        {encryptError && <Alert type="error">{encryptError}</Alert>}

        <div style={S.card}>
          <div style={S.cardTitle}>Identity Data</div>
          <div style={S.formGrid}>
            <div style={S.formField}>
              <label style={S.label}>Full Name</label>
              <input
                style={S.input}
                name="name"
                placeholder="As per Aadhaar card"
                value={form.name}
                onChange={handleFormChange}
              />
            </div>
            <div style={S.formField}>
              <label style={S.label}>Date of Birth</label>
              <input
                style={S.input}
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleFormChange}
              />
            </div>
            <div style={S.formFieldFull}>
              <label style={S.label}>Aadhaar Number</label>
              <input
                style={S.input}
                name="aadhaar"
                placeholder="12-digit Aadhaar (spaces or hyphens allowed)"
                value={form.aadhaar}
                onChange={handleFormChange}
              />
            </div>
          </div>
        </div>

        <Btn
          onClick={handleEncrypt}
          disabled={encryptLoading || !form.name || !form.aadhaar || !form.dob}
        >
          {encryptLoading ? "Encrypting …" : "Encrypt KYC Data →"}
        </Btn>
      </>
    );
  }

  // ── Panel: Encrypted ──────────────────────────────────────────────────────
  function renderEncryptedPanel() {
    if (!session) return null;
    return (
      <>
        <div style={S.panelTag}>Step 02</div>
        <div style={S.panelTitle}>Encrypted & Shares Generated</div>
        <div style={S.panelSub}>
          KYC data is encrypted using <strong>3-layer RSA-2048-OAEP + AES-256-GCM</strong>.
          Each authority's private key is then split into <strong>3 Shamir shares</strong> (threshold 2-of-3).
          Proceed to distribute share bundles to authority portals.
        </div>

        <Alert type="success">
          ✓ Encrypted successfully. Session ID: {session.sessionId}
        </Alert>

        <div style={S.card}>
          <div style={S.cardTitle}>Encryption Summary</div>
          <DataRow label="Applicant"    value={session.applicantName || form.name} />
          <DataRow label="Aadhaar"      value={session.maskedAadhaar} />
          <DataRow label="Layers"       value={`${session.authorityCount} (RSA-2048-OAEP + AES-256-GCM each)`} />
          <DataRow label="Threshold"    value={`${session.threshold}-of-${session.authorityCount} portals required`} />
          <DataRow label="Shares / key" value="3 (one per portal)" />
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Ciphertext (stored in secure database)</div>
          <div style={S.cipherBox}>{session.ciphertext}</div>
          <div style={{ fontSize: 9, color: "#596174", marginTop: 6 }}>
            {session.ciphertext?.length} base64 characters — {PORTALS.length} layers applied
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Share Bundle Distribution</div>
          <Alert type="info">
            Each portal receives one share of EACH authority private key.
            Any {THRESHOLD} portals collectively hold enough shares to reconstruct all keys.
          </Alert>
          <div style={S.portalsGrid}>
            {PORTALS.map((label) => {
              const bundle = session.portalShareMap?.[label];
              return (
                <div key={label} style={S.portalCard(false, false)}>
                  <div style={S.portalLetter(false, false)}>Portal {label}</div>
                  <div style={S.portalStatusTag(false, false)}>Ready</div>
                  <div style={S.portalDesc}>
                    {bundle?.length ?? 0} share objects
                    ({session.authorityCount} keys × 1 share each)
                  </div>
                  {bundle?.map((share, i) => (
                    <div key={i} style={{ fontSize: 9, color: "#596174", marginBottom: 2 }}>
                      Key {i + 1}: share x={share.x}, threshold={share.threshold}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <Btn onClick={() => setStep(2)}>
          Proceed to Authority Portals →
        </Btn>
      </>
    );
  }

  // ── Panel: Authority Portals ───────────────────────────────────────────────
  function renderAuthorityPanel() {
    if (!session) return null;
    return (
      <>
        <div style={S.panelTag}>Step 03</div>
        <div style={S.panelTitle}>Authority Portal Participation</div>
        <div style={S.panelSub}>
          Each authority portal independently submits its share bundle.
          Once {THRESHOLD} of {PORTALS.length} portals submit, decryption is authorized.
          Private keys are never reconstructed until the threshold is met.
        </div>

        {submitError && <Alert type="error">{submitError}</Alert>}

        <ThreshBar filled={submittedPortals.size} total={THRESHOLD} />

        {canDecrypt && (
          <Alert type="success">
            ✓ Threshold reached — {submittedPortals.size}-of-{THRESHOLD} portals submitted.
            Decryption is now authorized.
          </Alert>
        )}

        <div style={S.portalsGrid}>
          {PORTALS.map((label) => {
            const submitted = submittedPortals.has(label);
            const active    = activePortal === label;
            const bundle    = session.portalShareMap?.[label];
            return (
              <div key={label} style={S.portalCard(submitted, active)}>
                <div style={S.portalLetter(submitted, active)}>
                  {submitted ? "✓" : label}
                </div>
                <div style={S.portalStatusTag(submitted, active)}>
                  {submitted ? "Submitted" : active ? "Active" : "Pending"}
                </div>
                <div style={S.portalDesc}>
                  {submitted
                    ? `${bundle?.length} share objects submitted successfully.`
                    : `Holds ${bundle?.length} share objects.`}
                </div>

                {/* Share metadata (read-only display) */}
                {bundle?.map((share, i) => (
                  <div key={i} style={{ fontSize: 9, color: submitted ? "#2ecc71" : "#3e4557", marginBottom: 2 }}>
                    Key {i + 1}: x={share.x}
                  </div>
                ))}

                {!submitted && (
                  <div style={S.mt8}>
                    <Btn
                      onClick={() => handlePortalSubmit(label)}
                      disabled={submitLoading}
                    >
                      {submitLoading && active ? "Submitting …" : "Submit Shares"}
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={S.divider} />

        {/* Explain what happens during reconstruction */}
        <div style={S.card}>
          <div style={S.cardTitle}>What Happens at Reconstruction</div>
          <div style={{ fontSize: 11, color: "#a0a8ba", lineHeight: 1.8 }}>
            <div>1. Backend collects share bundles from {THRESHOLD} portals.</div>
            <div>2. For each authority key (3 total):</div>
            <div style={{ paddingLeft: 16 }}>
              reconstructKey([ shareFromPortalX[key], shareFromPortalY[key] ]) → privKey_i (in memory)
            </div>
            <div>3. Layer peeling (outermost → innermost):</div>
            <div style={{ paddingLeft: 16 }}>
              decryptAuthorityLayer(ciphertext, privKey_2) → layer_2<br />
              decryptAuthorityLayer(layer_2, privKey_1) → layer_1<br />
              decryptAuthorityLayer(layer_1, privKey_0, &#123;deserializePayload: true&#125;) → plaintext
            </div>
            <div>4. Reconstructed PEMs are discarded. Never written to disk.</div>
          </div>
        </div>

        <div style={S.flexRow}>
          <Btn
            variant="success"
            onClick={() => { setStep(3); }}
            disabled={!canDecrypt}
          >
            Proceed to Decrypt →
          </Btn>
          {!canDecrypt && (
            <span style={{ fontSize: 10, color: "#3e4557" }}>
              Need {THRESHOLD - submittedPortals.size} more portal(s)
            </span>
          )}
        </div>
      </>
    );
  }

  // ── Panel: Decrypt ────────────────────────────────────────────────────────
  function renderDecryptPanel() {
    if (!session) return null;
    const usedPortals = [...submittedPortals].slice(0, THRESHOLD);
    return (
      <>
        <div style={S.panelTag}>Step 04</div>
        <div style={S.panelTitle}>Threshold Reconstruction & Decryption</div>
        <div style={S.panelSub}>
          The backend will call <code>reconstructKey()</code> × {session.authorityCount} in memory,
          then peel all {session.authorityCount} encryption layers using <code>decryptAuthorityLayer()</code>.
          No private key is ever written to disk.
        </div>

        {decryptError && <Alert type="error">{decryptError}</Alert>}

        <div style={S.card}>
          <div style={S.cardTitle}>Decryption Authorization</div>
          <DataRow label="Session"       value={session.sessionId} />
          <DataRow label="Portals used"  value={usedPortals.join(", ")} />
          <DataRow label="Threshold"     value={`${THRESHOLD}-of-${session.authorityCount}`} />
          <DataRow label="Key recovery"  value="reconstructKey() × 3  (in-memory only)" />
          <DataRow label="Layer peeling" value="decryptAuthorityLayer() × 3  (reverse order)" />
        </div>

        {!decryptResult && (
          <Btn
            variant="success"
            onClick={handleDecrypt}
            disabled={decryptLoading}
          >
            {decryptLoading ? "Reconstructing keys & decrypting …" : "Execute Threshold Decryption →"}
          </Btn>
        )}

        {decryptResult && (
          <>
            <Alert type="success">
              ✓ Decryption successful using portals: {decryptResult.portalsUsed?.join(", ")} ({decryptResult.threshold})
            </Alert>
            <Btn variant="success" onClick={() => setStep(4)}>
              View Decrypted KYC →
            </Btn>
          </>
        )}
      </>
    );
  }

  // ── Panel: Result ─────────────────────────────────────────────────────────
  function renderResultPanel() {
    if (!decryptResult) return null;
    const { decrypted, portalsUsed, threshold } = decryptResult;
    return (
      <>
        <div style={S.panelTag}>Step 05</div>
        <div style={S.panelTitle}>Verified KYC Data</div>
        <div style={S.panelSub}>
          Multi-layer ciphertext successfully decrypted via {threshold} threshold cryptography.
          Raw Aadhaar is masked server-side before transmission.
        </div>

        <Alert type="success">
          ✓ Threshold decryption complete — portals {portalsUsed?.join(" + ")} authorized access.
        </Alert>

        <div style={S.resultPanel}>
          <div style={S.resultHeader}>
            ● DECRYPTED KYC RECORD — {threshold} THRESHOLD MET
          </div>
          <DataRow label="Name"    value={decrypted?.name} />
          <DataRow label="DOB"     value={decrypted?.dob} />
          <DataRow label="Aadhaar" value={decrypted?.aadhaar} />
          {decrypted?.pan && <DataRow label="PAN" value={decrypted.pan} />}
        </div>

        <div style={{ ...S.divider }} />

        <div style={S.card}>
          <div style={S.cardTitle}>Cryptographic Summary</div>
          <DataRow label="Encryption"     value="RSA-2048-OAEP-SHA256 + AES-256-GCM (3 layers)" />
          <DataRow label="Key splitting"   value="Shamir Secret Sharing (2-of-3)" />
          <DataRow label="Reconstruction" value="reconstructKey() — in-memory, never written to disk" />
          <DataRow label="Layer peeling"   value="decryptAuthorityLayer() × 3" />
          <DataRow label="Portals used"    value={portalsUsed?.join(", ")} />
          <DataRow label="Session"         value={session.sessionId} />
        </div>

        <Btn onClick={() => {
          setStep(0);
          setSession(null);
          setSubmittedPortals(new Set());
          setActivePortal(null);
          setDecryptResult(null);
          setForm({ name: "", aadhaar: "", dob: "" });
          setEncryptError("");
          setDecryptError("");
        }}>
          ← New KYC Session
        </Btn>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const panels = [
    renderSubmitPanel,
    renderEncryptedPanel,
    renderAuthorityPanel,
    renderDecryptPanel,
    renderResultPanel,
  ];

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerBadge}>Secure Hybrid KYC Verification Portal</div>
        <div style={S.headerSpacer} />
        <div style={S.headerSub}>
          RSA-2048-OAEP + AES-256-GCM + Shamir 2-of-3
        </div>
      </div>

      <div style={S.body}>
        {renderSidebar()}
        <div style={S.content}>
          {panels[step] ? panels[step]() : null}
        </div>
      </div>
    </div>
  );
}

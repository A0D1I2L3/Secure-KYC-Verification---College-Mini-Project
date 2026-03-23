import { useState, useEffect, useRef } from "react";

const CF = {
  bg: "#161616",
  bg1: "#1c1c1c",
  bg2: "#262626",
  bg3: "#333333",
  border: "#393939",
  text: "#f2f4f8",
  textMid: "#b6c2d3",
  textDim: "#6f7b8b",
  teal: "#3ddbd9",
  blue: "#78a9ff",
  green: "#42be65",
  purple: "#be95ff",
  pink: "#ff7eb6",
  cyan: "#33b1ff",
  comment: "#525252",
  op: "#6f7b8b",
};

const GCSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;font-size:18px;}
body{font-family:'IBM Plex Sans',sans-serif;overflow-x:hidden;background:${CF.bg};color:${CF.text};}
#root{width:100%;min-height:100vh;}
::selection{background:${CF.teal}28;}
.mono{font-family:'IBM Plex Mono',monospace;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
.reveal{opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .45s ease;}
.vis{opacity:1!important;transform:none!important;}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-thumb{background:${CF.bg3};border-radius:2px}

/* layout */
.inner{width:100%;max-width:1320px;margin:0 auto;padding:0 3rem;}
.sec{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:6rem 0;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start;}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);}
.faq-grid{display:grid;grid-template-columns:1fr 1fr;}
.hero-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:4rem;align-items:center;}
.aadhaar-grid{display:grid;grid-template-columns:1fr 1.2fr;gap:4rem;align-items:start;}

/* code block scroll */
.cf-code-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;}
.cf-code-line{white-space:pre;min-height:1.8rem;font-size:0.85rem;}

/* tablet */
@media(max-width:1024px){
  html{font-size:17px;}
  .inner{padding:0 2.5rem;}
  .hero-grid{grid-template-columns:1fr;}
  .aadhaar-grid{grid-template-columns:1fr;}
  .two-col{grid-template-columns:1fr;}
  .feat-grid{grid-template-columns:repeat(2,1fr);}
}

/* mobile */
@media(max-width:640px){
  html{font-size:15px;}
  .inner{padding:0 1rem;}
  .sec{padding:4rem 0;min-height:auto;}
  .feat-grid{grid-template-columns:1fr;}
  .faq-grid{grid-template-columns:1fr;}
  .nav-links{display:none!important;}
  .hero-stats{flex-direction:column;gap:1.5rem!important;}
  .npm-box{flex-direction:column;align-items:stretch!important;}
  .npm-box-copy{border-left:none!important;border-top:1px solid ${CF.border}!important;text-align:center;padding:0.6rem!important;}
  .pipeline-tags{flex-direction:column;align-items:flex-start!important;}
  .cf-code-line{font-size:0.78rem;}
  .nav-npm{display:none!important;}
  .hero-chips{flex-wrap:wrap;}
  .two-col-steps{gap:2rem!important;}
  .authority-code-blocks{gap:1rem!important;}
}

/* very small */
@media(max-width:360px){
  html{font-size:13px;}
  .inner{padding:0 0.75rem;}
}

.cursor::after{content:'▋';animation:blink 1.1s step-end infinite;color:${CF.teal};}
`;

/* ── TOKENS ───────────────────────────────────────────────── */
const tk = {
  kw: (s) => ({ s, c: CF.purple }),
  fn: (s) => ({ s, c: CF.blue }),
  str: (s) => ({ s, c: CF.green }),
  cmt: (s) => ({ s, c: CF.comment }),
  num: (s) => ({ s, c: CF.pink }),
  prop: (s) => ({ s, c: CF.cyan }),
  op: (s) => ({ s, c: CF.op }),
  pl: (s) => ({ s, c: CF.textMid }),
  dim: (s) => ({ s, c: CF.textDim }),
};

const EX = {
  encrypt: [
    [
      tk.kw("const "),
      tk.pl("kyc "),
      tk.op("= "),
      tk.fn("require"),
      tk.op("("),
      tk.str("'kyc-encrypt'"),
      tk.op(")"),
      tk.dim(";"),
    ],
    [],
    [tk.cmt("// Step 1 — generate RSA-2048 keys for 3 authorities")],
    [
      tk.kw("await "),
      tk.pl("kyc."),
      tk.fn("generateAuthorities"),
      tk.dim("("),
      tk.num("3"),
      tk.dim(", { authoritiesDir: "),
      tk.str("'./keys'"),
      tk.dim(", overwrite: "),
      tk.kw("true"),
      tk.dim(" });"),
    ],
    [],
    [tk.cmt("// Step 2 — encrypt KYC payload")],
    [
      tk.kw("const "),
      tk.pl("encrypted "),
      tk.op("= await "),
      tk.pl("kyc."),
      tk.fn("encrypt"),
      tk.dim("({"),
    ],
    [tk.pl("  name: "), tk.str('"Benhur P Benny"'), tk.dim(",")],
    [tk.pl("  aadhaar: "), tk.str('"XXXX-XXXX-1234"'), tk.dim(",")],
    [tk.pl("  dob: "), tk.str('"1998-01-01"'), tk.dim(",")],
    [
      tk.dim("}, { authoritiesDir: "),
      tk.str("'./keys'"),
      tk.dim(", count: "),
      tk.num("3"),
      tk.dim(" });"),
    ],
    [],
    [tk.cmt("// → Base64 string, safe for any DB / transport")],
    [tk.pl("console."), tk.fn("log"), tk.dim("(encrypted);")],
    [tk.cmt('// "eyJrZX1MZW4iOjI1Ni...')],
  ],
  decrypt: [
    [
      tk.kw("const "),
      tk.pl("kyc "),
      tk.op("= "),
      tk.fn("require"),
      tk.op("("),
      tk.str("'kyc-encrypt'"),
      tk.op(")"),
      tk.dim(";"),
    ],
    [],
    [tk.cmt("// Simple file-based flow")],
    [
      tk.kw("const "),
      tk.pl("decrypted "),
      tk.op("= await "),
      tk.pl("kyc."),
      tk.fn("decrypt"),
      tk.dim("(encrypted, {"),
    ],
    [
      tk.dim("  authoritiesDir: "),
      tk.str("'./keys'"),
      tk.dim(", count: "),
      tk.num("3"),
      tk.dim(" });"),
    ],
    [],
    [tk.cmt("// Distributed layer peeling — no key sharing needed")],
    [
      tk.kw("const "),
      tk.pl("s3 "),
      tk.op("= "),
      tk.pl("kyc."),
      tk.fn("decryptAuthorityLayer"),
      tk.dim("(ciphertext, priv3);"),
    ],
    [
      tk.kw("const "),
      tk.pl("s2 "),
      tk.op("= "),
      tk.pl("kyc."),
      tk.fn("decryptAuthorityLayer"),
      tk.dim("(s3, priv2);"),
    ],
    [
      tk.kw("const "),
      tk.pl("pt "),
      tk.op("= "),
      tk.pl("kyc."),
      tk.fn("decryptAuthorityLayer"),
      tk.dim("(s2, priv1, {"),
    ],
    [tk.dim("  deserializePayload: "), tk.kw("true"), tk.dim(" });")],
    [],
    [tk.cmt('// pt → { name: "Benhur P Benny", aadhaar: "...", ... }')],
  ],
  shamir: [
    [
      tk.kw("const "),
      tk.pl("kyc "),
      tk.op("= "),
      tk.fn("require"),
      tk.op("("),
      tk.str("'kyc-encrypt'"),
      tk.op(")"),
      tk.dim(";"),
    ],
    [],
    [tk.cmt("// Split authority-1 key: 3 shares, any 2 to recover")],
    [
      tk.kw("const "),
      tk.dim("{ shares } "),
      tk.op("= await "),
      tk.pl("kyc."),
      tk.fn("splitKey"),
      tk.dim("({"),
    ],
    [
      tk.dim("  privateKeyPath: "),
      tk.str("'./keys/authority-1/priv.pem'"),
      tk.dim(","),
    ],
    [
      tk.prop("  threshold"),
      tk.dim(": "),
      tk.num("2"),
      tk.dim(", "),
      tk.prop("shares"),
      tk.dim(": "),
      tk.num("3"),
      tk.dim(","),
    ],
    [tk.dim("});")],
    [],
    [tk.cmt("// Reconstruct from any 2 shares")],
    [
      tk.kw("const "),
      tk.dim("{ privateKey } "),
      tk.op("= await "),
      tk.pl("kyc."),
      tk.fn("reconstructKey"),
      tk.dim("({"),
    ],
    [
      tk.pl("  shares: "),
      tk.dim("[shares["),
      tk.num("0"),
      tk.dim("], shares["),
      tk.num("2"),
      tk.dim("]],"),
    ],
    [tk.prop("  threshold"), tk.dim(": "), tk.num("2"), tk.dim(",")],
    [tk.dim("});")],
  ],
  aadhaar: [
    [
      tk.kw("const "),
      tk.pl("kyc "),
      tk.op("= "),
      tk.fn("require"),
      tk.op("("),
      tk.str("'kyc-encrypt'"),
      tk.op(")"),
      tk.dim(";"),
    ],
    [],
    [tk.cmt("// Validate + normalise (Verhoeff checksum)")],
    [
      tk.kw("const "),
      tk.pl("r "),
      tk.op("= "),
      tk.pl("kyc."),
      tk.fn("validateAadhaarFormat"),
      tk.dim("("),
      tk.str('"2341 2341 2346"'),
      tk.dim(");"),
    ],
    [tk.cmt('// { isValid: true, normalized: "234123412346" }')],
    [],
    [tk.cmt("// Safe masking for UI / logs")],
    [
      tk.pl("kyc."),
      tk.fn("maskAadhaar"),
      tk.dim("("),
      tk.str('"234123412346"'),
      tk.dim(");"),
      tk.cmt("  // XXXX-XXXX-2346"),
    ],
    [],
    [tk.cmt("// HMAC fingerprint for searchable storage")],
    [
      tk.pl("kyc."),
      tk.fn("fingerprintAadhaar"),
      tk.dim("("),
      tk.str('"234123412346"'),
      tk.dim(", process.env."),
      tk.prop("HMAC_SECRET"),
      tk.dim(");"),
    ],
    [],
    [tk.cmt("// Encrypt with built-in validation")],
    [
      tk.kw("const "),
      tk.pl("enc "),
      tk.op("= await "),
      tk.pl("kyc."),
      tk.fn("encryptAadhaar"),
      tk.dim("("),
      tk.str('"234123412346"'),
      tk.dim(","),
    ],
    [
      tk.dim("  { authoritiesDir: "),
      tk.str("'./keys'"),
      tk.dim(", count: "),
      tk.num("3"),
      tk.dim(" });"),
    ],
  ],
};

/* ── CARBONFOX CODE BLOCK ─────────────────────────────────── */
function CfCode({ tabs, label, showCursor }) {
  const keys = tabs ? Object.keys(tabs) : null;
  const [active, setActive] = useState(keys ? keys[0] : null);
  const lines = tabs ? tabs[active] : [];

  return (
    <div
      style={{
        border: `1px solid ${CF.border}`,
        background: CF.bg1,
        fontFamily: "'IBM Plex Mono',monospace",
        minWidth: 0, // prevent overflow in grid
        width: "100%",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          background: CF.bg2,
          borderBottom: `1px solid ${CF.border}`,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 14px",
            borderRight: `1px solid ${CF.border}`,
            flexShrink: 0,
          }}
        >
          {["#ee5396", "#be95ff", "#42be65"].map((c) => (
            <div
              key={c}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: c,
                opacity: 0.65,
              }}
            />
          ))}
        </div>
        {keys ? (
          keys.map((k) => (
            <button
              key={k}
              onClick={() => setActive(k)}
              style={{
                padding: "0.6rem 0.9rem",
                background: active === k ? CF.bg1 : "transparent",
                color: active === k ? CF.text : CF.textDim,
                border: "none",
                borderRight: `1px solid ${CF.border}`,
                borderBottom:
                  active === k
                    ? `2px solid ${CF.teal}`
                    : "2px solid transparent",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "0.72rem",
                cursor: "pointer",
                transition: "all .1s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {k}
            </button>
          ))
        ) : (
          <span
            style={{
              padding: "0.6rem 1.1rem",
              fontSize: "0.75rem",
              color: CF.textDim,
            }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ display: "flex", overflow: "hidden" }}>
        {/* Gutter */}
        <div
          style={{
            background: CF.bg2,
            borderRight: `1px solid ${CF.border}`,
            padding: "1rem 0",
            minWidth: 38,
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          {lines.map((_, i) => (
            <div
              key={i}
              style={{
                padding: "0 8px 0 4px",
                lineHeight: "1.8rem",
                fontSize: "0.68rem",
                color: CF.textDim,
                textAlign: "right",
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        {/* Code — scrollable horizontally */}
        <div
          className="cf-code-scroll"
          style={{
            padding: "1rem 1rem",
            lineHeight: "1.8rem",
            flex: 1,
            minWidth: 0,
          }}
        >
          {lines.map((toks, i) => (
            <div key={i} className="cf-code-line">
              {toks.length === 0
                ? "\u00a0"
                : toks.map((t, j) => (
                    <span key={j} style={{ color: t.c }}>
                      {t.s}
                    </span>
                  ))}
              {showCursor && i === lines.length - 1 && (
                <span className="cursor" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── HELPERS ──────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const els = ref.current.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting)
            setTimeout(() => e.target.classList.add("vis"), i * 55);
        });
      },
      { threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

// Hook to get window width reactively
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);
  return width;
}

const HR = () => <div style={{ height: 1, background: CF.border }} />;

function Chip({ children, hi }) {
  return (
    <span
      className="mono"
      style={{
        display: "inline-block",
        fontSize: "0.7rem",
        fontWeight: 500,
        padding: "0.2rem 0.55rem",
        background: hi ? `${CF.teal}16` : CF.bg3,
        color: hi ? CF.teal : CF.textDim,
        border: `1px solid ${hi ? CF.teal + "44" : CF.border}`,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: "0.72rem",
        color: CF.teal,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: "0.6rem",
      }}
    >
      {children}
    </div>
  );
}

function H2({ children }) {
  return (
    <h2
      style={{
        fontFamily: "'IBM Plex Mono',monospace",
        fontSize: "clamp(1.4rem,4vw,2.5rem)",
        fontWeight: 400,
        marginBottom: "2rem",
        lineHeight: 1.15,
      }}
    >
      {children}
    </h2>
  );
}

function NpmBox() {
  const [cp, setCp] = useState(false);
  return (
    <div
      className="npm-box"
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        border: `1px solid ${CF.border}`,
        background: CF.bg1,
        overflow: "hidden",
        maxWidth: "100%",
      }}
    >
      <div
        className="mono"
        style={{
          padding: "0.65rem 1rem",
          fontSize: "clamp(0.78rem,2vw,0.95rem)",
          color: CF.textMid,
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <span style={{ color: CF.textDim, flexShrink: 0 }}>$ </span>
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          npm install{" "}
          <span style={{ color: CF.teal, fontWeight: 500 }}>kyc-encrypt</span>
        </span>
      </div>
      <button
        className="npm-box-copy"
        onClick={() => {
          navigator.clipboard
            .writeText("npm install kyc-encrypt")
            .catch(() => {});
          setCp(true);
          setTimeout(() => setCp(false), 1800);
        }}
        style={{
          border: "none",
          borderLeft: `1px solid ${CF.border}`,
          background: cp ? CF.teal : `${CF.teal}14`,
          color: cp ? CF.bg : CF.teal,
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "0.78rem",
          fontWeight: 500,
          padding: "0 1rem",
          cursor: "pointer",
          transition: "all .14s",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {cp ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function Pipeline({ isMobile }) {
  const rows = [
    { label: "KYC plaintext", tag: "JSON", col: CF.green },
    { label: "Authority 1 — Bank", tags: ["AES-256-GCM", "RSA-2048-OAEP"] },
    { label: "Authority 2 — Auditor", tags: ["AES-256-GCM", "RSA-2048-OAEP"] },
    {
      label: "Authority 3 — Regulator",
      tags: ["AES-256-GCM", "RSA-2048-OAEP"],
    },
    { label: "Encrypted payload", tag: "Base64", col: CF.teal },
  ];
  return (
    <div
      style={{
        border: `1px solid ${CF.border}`,
        background: CF.bg1,
        position: isMobile ? "static" : "sticky",
        top: 72,
      }}
    >
      <div
        style={{
          padding: "0.7rem 1rem",
          background: CF.bg2,
          borderBottom: `1px solid ${CF.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: "0.7rem",
            color: CF.textDim,
            letterSpacing: "0.08em",
          }}
        >
          PIPELINE
        </span>
        <Chip>N=3 authorities</Chip>
      </div>
      <div style={{ padding: "0.85rem" }}>
        {rows.map((r, i) => (
          <div key={i}>
            {i > 0 && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.7rem",
                  color: CF.textDim,
                  padding: "0.18rem 0",
                  fontFamily: "'IBM Plex Mono',monospace",
                }}
              >
                ↓
              </div>
            )}
            <div
              className="pipeline-row"
              style={{
                border: `1px solid ${r.col ? r.col + "40" : CF.border}`,
                borderLeft: r.tags ? `3px solid ${CF.teal}` : undefined,
                padding: "0.55rem 0.85rem",
                background: r.col ? `${r.col}09` : CF.bg2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "0.78rem",
                color: r.col || CF.textMid,
              }}
            >
              <span style={{ flexShrink: 0 }}>{r.label}</span>
              <div
                className="pipeline-tags"
                style={{ display: "flex", gap: 5, flexWrap: "wrap" }}
              >
                {r.tags ? (
                  r.tags.map((tg) => <Chip key={tg}>{tg}</Chip>)
                ) : (
                  <Chip hi>{r.tag}</Chip>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "0.65rem 1rem",
          borderTop: `1px solid ${CF.border}`,
          background: CF.bg2,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: "0.65rem",
            color: CF.textDim,
            lineHeight: 1.85,
            wordBreak: "break-all",
          }}
        >
          <span style={{ color: CF.teal }}>Format: </span>[4B
          keyLen][wrappedKey][12B nonce][16B authTag][ct]
        </div>
      </div>
    </div>
  );
}

/* ── MAIN APP ─────────────────────────────────────────────── */
export default function App() {
  const [step, setStep] = useState(0);
  const w = useWindowWidth();
  const isMobile = w <= 640;
  const isTablet = w <= 1024;

  const rFeat = useReveal(),
    rHiw = useReveal(),
    rAad = useReveal(),
    rFaq = useReveal();

  useEffect(() => {
    if (document.getElementById("__cf")) return;
    const s = document.createElement("style");
    s.id = "__cf";
    s.textContent = GCSS;
    document.head.appendChild(s);
  }, []);

  const steps = [
    {
      title: "Authorities generate keypairs locally",
      body: "Each authority runs generateAuthorityKeyPair() on their own machine. The private key stays there — only pub.pem is shared with the app.",
    },
    {
      title: "App encrypts with collected public keys",
      body: "encryptWithPublicKeys(payload, [pub1, pub2, pub3]) stacks N AES-256-GCM layers, each AES key wrapped with that authority's RSA-2048 OAEP public key. No private key is ever needed by the app.",
    },
    {
      title: "Fresh AES key + nonce per layer",
      body: "Every layer gets a new 32-byte AES key and 12-byte GCM nonce from CSPRNG — never reused across layers or invocations. Enforced by design, not configuration.",
    },
    {
      title: "Binary packed → Base64",
      body: "[4B keyLen][wrappedKey][12B nonce][16B authTag][ciphertext] per layer. The final output is a single Base64 blob safe for any database or transport.",
    },
    {
      title: "Decrypt in strict reverse order",
      body: "Authority N peels layer N, passes the inner blob to authority N-1, and so on. Wrong key or any tampering throws immediately — no partial data returned.",
    },
  ];

  const features = [
    {
      icon: "⚡",
      title: "AES-256-GCM",
      desc: "Authenticated encryption. A modified ciphertext throws before returning any data. Fresh key + nonce via CSPRNG per layer.",
      chips: ["AEAD", "tamper-evident"],
    },
    {
      icon: "🔑",
      title: "RSA-2048 OAEP-SHA256",
      desc: "Each layer's AES key is wrapped with that authority's RSA public key. No shared key material between authorities at any point.",
      chips: ["per-authority", "IND-CCA2"],
    },
    {
      icon: "🔗",
      title: "Multi-authority layers",
      desc: "N independent layers stacked sequentially. Decryption requires all N authorities in reverse order — none alone can decrypt.",
      chips: ["sequential", "N-of-N"],
    },
    {
      icon: "🪄",
      title: "Shamir SSS recovery",
      desc: "splitKey() creates M-of-N shares for one authority's private key. Optional disaster recovery — not part of normal operation.",
      chips: ["M-of-N", "optional"],
    },
    {
      icon: "📦",
      title: "Deterministic format",
      desc: "Binary layer layout is fixed and self-contained. No loose files, no ambiguity. A single Base64 blob.",
      chips: ["portable", "deterministic"],
    },
    {
      icon: "⌨️",
      title: "CLI + Programmatic API",
      desc: "CommonJS, ESM, TypeScript types. Full API surface. Interactive CLI via npx kyc-encrypt.",
      chips: ["CommonJS", "ESM", "CLI"],
    },
  ];

  const aadhaarFns = [
    {
      fn: "validateAadhaarFormat()",
      badge: "format",
      desc: "Verhoeff checksum + 12-digit normalisation. Returns { isValid, normalized, reason }.",
    },
    {
      fn: "maskAadhaar()",
      badge: "display",
      desc: "'234123412346' → 'XXXX-XXXX-2346'. Purely presentational, no encryption.",
    },
    {
      fn: "fingerprintAadhaar()",
      badge: "HMAC",
      desc: "Keyed HMAC fingerprint for searchable storage without exposing the raw number. Requires an HMAC secret.",
    },
    {
      fn: "encryptAadhaar()",
      badge: "encrypt",
      desc: "Validates format first, then runs the full multi-authority pipeline. Returns Base64 ciphertext.",
    },
    {
      fn: "decryptAadhaar()",
      badge: "decrypt",
      desc: "Decrypts and returns the normalised 12-digit Aadhaar string.",
    },
    {
      fn: "encryptAadhaarWithPublicKeys()",
      badge: "app-side",
      desc: "Same as encryptAadhaar() but takes collected public keys — no authoritiesDir needed.",
    },
  ];

  const faqs = [
    {
      q: "5 authorities — one shared key?",
      a: "No. Five authorities means five different RSA keypairs. The payload is wrapped in five independent layers, each using a different public key. No key material is ever shared.",
    },
    {
      q: "What is splitKey() actually for?",
      a: "Backing up one authority's private key via Shamir shares. If they lose priv.pem, reconstruction unblocks decryption. It doesn't affect any other authority.",
    },
    {
      q: "Do I need Shamir at all?",
      a: "No. Normal flow: generateAuthorities + encrypt + decrypt. Shamir is entirely optional disaster recovery — most users never need it.",
    },
    {
      q: "Can I use this as a general library?",
      a: "Yes. Use only the helpers you need — generic encrypt/decrypt, encryptWithPublicKeys for app-side, decryptAuthorityLayer for authority-side, or Aadhaar helpers standalone.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: CF.bg, color: CF.text }}>
      {/* ── NAV ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: `${CF.bg}f0`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${CF.border}`,
        }}
      >
        <div
          className="inner"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
            gap: 12,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: "clamp(0.85rem,2vw,1rem)",
              fontWeight: 500,
              color: CF.teal,
              letterSpacing: "0.02em",
              flexShrink: 0,
            }}
          >
            kyc-encrypt
          </span>
          <div
            className="nav-links"
            style={{ display: "flex", gap: "0.1rem", overflow: "hidden" }}
          >
            {[
              ["Features", "#features"],
              ["How it works", "#how-it-works"],
              ["Aadhaar", "#aadhaar"],
              ["Usage", "#usage"],
              ["FAQ", "#faq"],
            ].map(([l, h]) => (
              <a
                key={l}
                href={h}
                style={{
                  fontSize: "0.85rem",
                  color: CF.textDim,
                  textDecoration: "none",
                  padding: "0.4rem 0.7rem",
                  transition: "color .1s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.target.style.color = CF.text)}
                onMouseLeave={(e) => (e.target.style.color = CF.textDim)}
              >
                {l}
              </a>
            ))}
          </div>
          <div className="nav-npm" style={{ flexShrink: 0 }}>
            <NpmBox />
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        className="sec"
        style={{ paddingTop: isMobile ? "5.5rem" : "8rem" }}
      >
        <div className="inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTablet ? "1fr" : "1fr 1.1fr",
              gap: isMobile ? "2.5rem" : "4rem",
              alignItems: "center",
            }}
          >
            <div style={{ animation: "fadeUp .5s ease both", minWidth: 0 }}>
              <div
                className="hero-chips"
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginBottom: "1.5rem",
                }}
              >
                <Chip hi>v1.0</Chip>
                <Chip>MIT License</Chip>
                <Chip>Node.js ≥18</Chip>
              </div>
              <h1
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "clamp(1.8rem,5vw,3.75rem)",
                  fontWeight: 400,
                  lineHeight: 1.08,
                  letterSpacing: "-0.025em",
                  marginBottom: "1.25rem",
                }}
              >
                Hybrid encryption
                <br />
                <span style={{ color: CF.teal }}>for KYC data.</span>
              </h1>
              <p
                style={{
                  fontSize: "clamp(0.9rem,2vw,1.1rem)",
                  color: CF.textDim,
                  maxWidth: 480,
                  lineHeight: 1.8,
                  marginBottom: "2rem",
                }}
              >
                AES-256-GCM + RSA-2048-OAEP, stacked independently per
                authority. No single party can decrypt alone — enforced by the
                cryptographic structure.
              </p>

              <div
                className="hero-stats"
                style={{
                  display: "flex",
                  gap: isMobile ? "1.25rem" : "2.5rem",
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["&lt;100ms", "3 auth / 5 KB"],
                  ["AES-256-GCM", "per layer"],
                  ["M-of-N", "Shamir SSS"],
                  ["Zero", "plaintext stored"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div
                      className="mono"
                      style={{
                        fontSize: "clamp(0.9rem,2vw,1.2rem)",
                        color: CF.teal,
                        marginBottom: 3,
                      }}
                      dangerouslySetInnerHTML={{ __html: v }}
                    />
                    <div style={{ fontSize: "0.78rem", color: CF.textDim }}>
                      {l}
                    </div>
                  </div>
                ))}
              </div>

              {/* Show npm box here on mobile since nav hides it */}
              {isMobile && (
                <div style={{ marginTop: "2rem" }}>
                  <NpmBox />
                </div>
              )}
            </div>

            <div
              style={{
                animation: "fadeUp .5s .12s ease both",
                minWidth: 0,
                width: "100%",
              }}
            >
              <CfCode
                tabs={{
                  Encrypt: EX.encrypt,
                  Decrypt: EX.decrypt,
                  "Shamir SSS": EX.shamir,
                }}
                showCursor
              />
            </div>
          </div>
        </div>
      </section>

      <HR />

      {/* ── FEATURES ── */}
      <section id="features" ref={rFeat} className="sec">
        <div className="inner">
          <div className="reveal" style={{ marginBottom: "2.5rem" }}>
            <SectionLabel>Features</SectionLabel>
            <H2>NIST-approved primitives only.</H2>
            <p
              style={{
                fontSize: "clamp(0.88rem,2vw,1rem)",
                color: CF.textDim,
                maxWidth: 560,
                lineHeight: 1.75,
              }}
            >
              Built on Node.js built-in crypto with OpenSSL — zero third-party
              crypto dependencies, zero supply-chain risk.
            </p>
          </div>
          <div
            className="feat-grid reveal"
            style={{
              border: `1px solid ${CF.border}`,
              borderRight: "none",
              borderBottom: "none",
            }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: isMobile ? "1.5rem" : "2rem",
                  borderRight: `1px solid ${CF.border}`,
                  borderBottom: `1px solid ${CF.border}`,
                }}
              >
                <div style={{ fontSize: "1.4rem", marginBottom: "0.85rem" }}>
                  {f.icon}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    color: CF.text,
                    marginBottom: "0.55rem",
                  }}
                >
                  {f.title}
                </div>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: CF.textDim,
                    lineHeight: 1.7,
                    marginBottom: "1rem",
                  }}
                >
                  {f.desc}
                </p>
                <div
                  style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}
                >
                  {f.chips.map((c, j) => (
                    <Chip key={c} hi={j === 0}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HR />

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        ref={rHiw}
        className="sec"
        style={{ background: CF.bg1 }}
      >
        <div className="inner">
          <div className="reveal" style={{ marginBottom: "2.5rem" }}>
            <SectionLabel>How it works</SectionLabel>
            <H2>Layer by layer.</H2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr",
              gap: isMobile ? "2rem" : "4rem",
              alignItems: "start",
              minWidth: 0,
            }}
          >
            {/* LEFT — steps + inline snippets */}
            <div className="reveal" style={{ minWidth: 0 }}>
              {/* Steps accordion */}
              {steps.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    borderLeft: `3px solid ${step === i ? CF.teal : CF.border}`,
                    paddingLeft: "1.1rem",
                    marginBottom: "1.25rem",
                    cursor: "pointer",
                    transition: "border-color .2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      marginBottom: step === i ? "0.5rem" : 0,
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: "0.72rem",
                        color: step === i ? CF.teal : CF.textDim,
                        flexShrink: 0,
                        paddingTop: "0.18rem",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: "clamp(0.88rem,2vw,1rem)",
                        fontWeight: step === i ? 500 : 400,
                        color: step === i ? CF.text : CF.textMid,
                        lineHeight: 1.4,
                      }}
                    >
                      {s.title}
                    </span>
                  </div>
                  {/* Use auto height trick — max-height large enough to never clip */}
                  <div
                    style={{
                      maxHeight: step === i ? 300 : 0,
                      overflow: "hidden",
                      transition: "max-height .35s ease",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.88rem",
                        color: CF.textDim,
                        lineHeight: 1.75,
                        paddingTop: "0.25rem",
                        paddingRight: "0.5rem",
                      }}
                    >
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}

              {/* Pipeline — shown here on mobile/tablet, after steps */}
              {isTablet && (
                <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
                  <Pipeline isMobile={true} />
                </div>
              )}

              {/* Two-role inline code snippets */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  marginTop: isTablet ? 0 : "2rem",
                }}
              >
                {/* Authority side */}
                <div style={{ minWidth: 0 }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.68rem",
                      color: CF.textDim,
                      letterSpacing: "0.08em",
                      marginBottom: "0.6rem",
                    }}
                  >
                    AUTHORITY SIDE
                  </div>
                  <div
                    style={{
                      border: `1px solid ${CF.border}`,
                      background: CF.bg2,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.55rem 0.85rem",
                        borderBottom: `1px solid ${CF.border}`,
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: "0.7rem", color: CF.textDim }}
                      >
                        authority-1/generate.js
                      </span>
                    </div>
                    <div
                      className="cf-code-scroll mono"
                      style={{
                        padding: "0.85rem 1rem",
                        fontSize: "0.8rem",
                        lineHeight: "1.75rem",
                        color: CF.textDim,
                      }}
                    >
                      <div style={{ whiteSpace: "pre" }}>
                        <span style={{ color: CF.purple }}>const </span>
                        <span style={{ color: CF.textMid }}>pair </span>
                        <span style={{ color: CF.op }}>= await </span>
                        <span style={{ color: CF.textMid }}>kyc.</span>
                        <span style={{ color: CF.blue }}>
                          generateAuthorityKeyPair
                        </span>
                        <span>{"({"}</span>
                        <span style={{ color: CF.cyan }}>outputDir</span>
                        <span>{": "}</span>
                        <span style={{ color: CF.green }}>'./auth-1'</span>
                        <span>{"});"}</span>
                      </div>
                      <div style={{ color: CF.comment, whiteSpace: "pre" }}>
                        {
                          "// pub.pem → share with app  |  priv.pem → stays local"
                        }
                      </div>
                      <div style={{ marginTop: "0.3rem", whiteSpace: "pre" }}>
                        <span style={{ color: CF.purple }}>const </span>
                        <span style={{ color: CF.textMid }}>inner </span>
                        <span style={{ color: CF.op }}>= </span>
                        <span style={{ color: CF.textMid }}>kyc.</span>
                        <span style={{ color: CF.blue }}>
                          decryptAuthorityLayer
                        </span>
                        <span>{"(ciphertext, pair.privateKey);"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* App side */}
                <div style={{ minWidth: 0 }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.68rem",
                      color: CF.textDim,
                      letterSpacing: "0.08em",
                      marginBottom: "0.6rem",
                    }}
                  >
                    APP SIDE
                  </div>
                  <div
                    style={{
                      border: `1px solid ${CF.border}`,
                      background: CF.bg2,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.55rem 0.85rem",
                        borderBottom: `1px solid ${CF.border}`,
                      }}
                    >
                      <span
                        className="mono"
                        style={{ fontSize: "0.7rem", color: CF.textDim }}
                      >
                        app/encrypt.js
                      </span>
                    </div>
                    <div
                      className="cf-code-scroll mono"
                      style={{
                        padding: "0.85rem 1rem",
                        fontSize: "0.8rem",
                        lineHeight: "1.75rem",
                        color: CF.textDim,
                      }}
                    >
                      <div style={{ whiteSpace: "pre" }}>
                        <span style={{ color: CF.purple }}>const </span>
                        <span style={{ color: CF.textMid }}>enc </span>
                        <span style={{ color: CF.op }}>= await </span>
                        <span style={{ color: CF.textMid }}>kyc.</span>
                        <span style={{ color: CF.blue }}>
                          encryptWithPublicKeys
                        </span>
                        <span>{"(payload, [pub1, pub2, pub3]);"}</span>
                      </div>
                      <div style={{ color: CF.comment, whiteSpace: "pre" }}>
                        {
                          "// app never holds any private key  →  Base64 ciphertext"
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — Pipeline (desktop only; mobile renders it inline above) */}
            {!isTablet && (
              <div
                className="reveal"
                style={{ transitionDelay: ".08s", minWidth: 0 }}
              >
                <Pipeline isMobile={false} />
              </div>
            )}
          </div>
        </div>
      </section>

      <HR />

      {/* ── AADHAAR ── */}
      <section id="aadhaar" ref={rAad} className="sec">
        <div className="inner">
          <div className="reveal" style={{ marginBottom: "2.5rem" }}>
            <SectionLabel>Aadhaar helpers</SectionLabel>
            <H2>Safe Aadhaar handling, built in.</H2>
            <p
              style={{
                fontSize: "clamp(0.88rem,2vw,1rem)",
                color: CF.textDim,
                maxWidth: 520,
                lineHeight: 1.75,
              }}
            >
              Format validation, safe masking, HMAC fingerprinting, and
              Aadhaar-specific encryption — all composable with the core
              multi-authority engine.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isTablet ? "1fr" : "1fr 1.2fr",
              gap: isMobile ? "2rem" : "4rem",
              alignItems: "start",
            }}
          >
            <div className="reveal">
              {aadhaarFns.map((item, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: `2px solid ${CF.border}`,
                    paddingLeft: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: "0.3rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: "clamp(0.75rem,2vw,0.85rem)",
                        color: CF.blue,
                        wordBreak: "break-all",
                      }}
                    >
                      {item.fn}
                    </span>
                    <Chip>{item.badge}</Chip>
                  </div>
                  <p
                    style={{
                      fontSize: "0.88rem",
                      color: CF.textDim,
                      lineHeight: 1.7,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
            <div
              className="reveal"
              style={{ transitionDelay: ".08s", minWidth: 0 }}
            >
              <CfCode tabs={{ "Aadhaar API": EX.aadhaar }} />
            </div>
          </div>
        </div>
      </section>

      <HR />

      {/* ── USAGE / INSTALL ── */}
      <section id="usage" className="sec" style={{ background: CF.bg1 }}>
        <div className="inner">
          <SectionLabel>Installation</SectionLabel>
          <H2>One install. Zero peer deps.</H2>
          <div style={{ marginBottom: "2rem" }}>
            <NpmBox />
            <p
              style={{
                fontSize: "0.88rem",
                color: CF.textDim,
                marginTop: "1rem",
                maxWidth: 500,
                lineHeight: 1.7,
              }}
            >
              Node.js built-in crypto (OpenSSL) only. CommonJS + ESM. TypeScript
              types included. Interactive CLI via{" "}
              <span className="mono" style={{ color: CF.blue }}>
                npx kyc-encrypt
              </span>
              .
            </p>
          </div>
          <CfCode
            tabs={{
              Encrypt: EX.encrypt,
              Decrypt: EX.decrypt,
              "Shamir SSS": EX.shamir,
              Aadhaar: EX.aadhaar,
            }}
          />
        </div>
      </section>

      <HR />

      {/* ── FAQ ── */}
      <section id="faq" ref={rFaq} className="sec">
        <div className="inner">
          <div className="reveal" style={{ marginBottom: "2.5rem" }}>
            <SectionLabel>FAQ</SectionLabel>
            <H2>Common questions.</H2>
          </div>
          <div
            className="faq-grid reveal"
            style={{
              border: `1px solid ${CF.border}`,
              borderRight: "none",
              borderBottom: "none",
            }}
          >
            {faqs.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: isMobile ? "1.5rem" : "2rem",
                  borderRight: `1px solid ${CF.border}`,
                  borderBottom: `1px solid ${CF.border}`,
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: "clamp(0.82rem,2vw,0.92rem)",
                    color: CF.text,
                    marginBottom: "0.7rem",
                    lineHeight: 1.45,
                  }}
                >
                  {f.q}
                </div>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: CF.textDim,
                    lineHeight: 1.75,
                  }}
                >
                  {f.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HR />

      {/* ── FOOTER ── */}
      <footer style={{ background: CF.bg1, padding: "2rem 0" }}>
        <div
          className="inner"
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            flexDirection: isMobile ? "column" : "row",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <span
            className="mono"
            style={{ fontSize: "0.88rem", color: CF.teal }}
          >
            kyc-encrypt
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              color: CF.textDim,
              lineHeight: 1.6,
              order: isMobile ? 3 : 0,
            }}
          >
            Benhur P Benny · Adil Haneef M K · Sreemrudu K P
            {isMobile ? <br /> : " — "}
            GEC Thrissur · B.Tech CSE · 2026
          </span>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {["npm", "GitHub", "Docs", "MIT"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontFamily: "'IBM Plex Mono',monospace",
                  fontSize: "0.78rem",
                  color: CF.textDim,
                  textDecoration: "none",
                  transition: "color .1s",
                }}
                onMouseEnter={(e) => (e.target.style.color = CF.text)}
                onMouseLeave={(e) => (e.target.style.color = CF.textDim)}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

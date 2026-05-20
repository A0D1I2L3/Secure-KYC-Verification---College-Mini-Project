"use strict";

const kyc = require("../index.js");

const HMAC_SECRET = process.env.DEMO_HMAC_SECRET || "kyc-encrypt-demo-secret";
const AUTHORITY_LABELS = ["Bank", "Auditor", "Regulator"];

function previewPem(pem) {
  const lines = pem.trim().split("\n");
  return [lines[0], lines[1], "...", lines[lines.length - 1]].join("\n");
}

function byteLengthOfBase64(base64) {
  return Buffer.from(base64, "base64").length;
}

async function runLibraryDemo(aadhaar, options = {}) {
  const validation = kyc.validateAadhaarFormat(aadhaar);
  const requestedRecoveryShares = Number(options.recoveryShares || 2);
  const recoveryShareCount =
    Number.isInteger(requestedRecoveryShares) &&
    requestedRecoveryShares >= 1 &&
    requestedRecoveryShares <= 3
      ? requestedRecoveryShares
      : 2;

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
  const selectedRecoveryShares = bankRecoveryShares.slice(0, recoveryShareCount);
  let reconstructedBankKey = null;
  let recoveryError = null;
  let decrypted = null;

  try {
    reconstructedBankKey = await kyc.reconstructKey({
      shares: selectedRecoveryShares,
      threshold: 2,
    });
    decrypted = kyc.decryptAuthorityLayer(afterAuditor, reconstructedBankKey, {
      deserializePayload: true,
    });
  } catch (error) {
    recoveryError = error.message;
  }

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
        output:
          decrypted ||
          `blocked: ${recoveryShareCount} share${
            recoveryShareCount === 1 ? "" : "s"
          } present, threshold is 2`,
        inputBytes: byteLengthOfBase64(afterAuditor),
        outputBytes: Buffer.byteLength(String(decrypted || "")),
      },
    ],
    recovery: {
      authority: authorities[0].label,
      algorithm: bankRecoveryShares[0].algorithm,
      threshold: bankRecoveryShares[0].threshold,
      totalShares: bankRecoveryShares[0].totalShares,
      requestedShares: recoveryShareCount,
      usedShares: selectedRecoveryShares.map((share) => share.x),
      shares: bankRecoveryShares.map((share) => ({
        x: share.x,
        threshold: share.threshold,
        totalShares: share.totalShares,
        dataPreview: `${share.data.slice(0, 72)}...`,
        bytes: Buffer.byteLength(JSON.stringify(share)),
      })),
      shareBytes: bankRecoveryShares.map((share) =>
        Buffer.byteLength(JSON.stringify(share)),
      ),
      checksumPreview: `${bankRecoveryShares[0].checksum.slice(0, 12)}...`,
      reconstructedMatchesOriginal:
        reconstructedBankKey === authorities[0].privateKey,
      decryptUsedReconstructedKey: Boolean(decrypted),
      canRecover: Boolean(reconstructedBankKey),
      error: recoveryError,
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

module.exports = {
  runLibraryDemo,
};

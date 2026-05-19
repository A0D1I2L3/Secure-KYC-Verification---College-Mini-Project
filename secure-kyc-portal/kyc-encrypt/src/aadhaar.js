"use strict";

const crypto = require("node:crypto");

const VERHOEFF_MULTIPLICATION = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_PERMUTATION = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function normalizeAadhaar(aadhaar) {
  if (typeof aadhaar !== "string" && typeof aadhaar !== "number" && typeof aadhaar !== "bigint") {
    throw new TypeError("aadhaar must be a string, number, or bigint.");
  }

  return String(aadhaar).replace(/[\s-]/g, "");
}

function validateAadhaarFormat(aadhaar) {
  const normalized = normalizeAadhaar(aadhaar);

  if (!/^\d{12}$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      reason: "Aadhaar number must contain exactly 12 digits.",
    };
  }

  if (!isValidVerhoeff(normalized)) {
    return {
      isValid: false,
      normalized,
      reason: "Aadhaar number failed checksum validation.",
    };
  }

  return {
    isValid: true,
    normalized,
    reason: null,
  };
}

function assertValidAadhaar(aadhaar) {
  const result = validateAadhaarFormat(aadhaar);

  if (!result.isValid) {
    throw new Error(result.reason);
  }

  return result.normalized;
}

function maskAadhaar(aadhaar) {
  const normalized = assertValidAadhaar(aadhaar);
  return `XXXX-XXXX-${normalized.slice(-4)}`;
}

function fingerprintAadhaar(aadhaar, secret) {
  const normalized = assertValidAadhaar(aadhaar);

  if (
    !(typeof secret === "string" && secret.length > 0) &&
    !(Buffer.isBuffer(secret) && secret.length > 0)
  ) {
    throw new TypeError("secret must be a non-empty string or Buffer.");
  }

  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

function isValidVerhoeff(numberString) {
  let checksum = 0;
  const reversedDigits = numberString.split("").reverse().map(Number);

  for (let index = 0; index < reversedDigits.length; index += 1) {
    checksum =
      VERHOEFF_MULTIPLICATION[checksum][
        VERHOEFF_PERMUTATION[index % 8][reversedDigits[index]]
      ];
  }

  return checksum === 0;
}

module.exports = {
  assertValidAadhaar,
  fingerprintAadhaar,
  maskAadhaar,
  normalizeAadhaar,
  validateAadhaarFormat,
};

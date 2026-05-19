"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");

const PRIME = 257;
const SHARE_VALUE_BYTES = 2;

function mod(value) {
  return ((value % PRIME) + PRIME) % PRIME;
}

function modInverse(value) {
  let t = 0;
  let newT = 1;
  let r = PRIME;
  let newR = mod(value);

  while (newR !== 0) {
    const quotient = Math.floor(r / newR);
    [t, newT] = [newT, t - quotient * newT];
    [r, newR] = [newR, r - quotient * newR];
  }

  if (r > 1) {
    throw new Error("Share data is not invertible in the configured field.");
  }

  return mod(t);
}

function randomFieldElement() {
  while (true) {
    const candidate = crypto.randomBytes(SHARE_VALUE_BYTES).readUInt16BE(0);

    if (candidate < PRIME * Math.floor(0x10000 / PRIME)) {
      return candidate % PRIME;
    }
  }
}

function evaluatePolynomial(coefficients, x) {
  let y = 0;

  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    y = mod(y * x + coefficients[index]);
  }

  return y;
}

function lagrangeAtZero(points) {
  let secret = 0;

  for (let i = 0; i < points.length; i += 1) {
    let numerator = 1;
    let denominator = 1;
    const current = points[i];

    for (let j = 0; j < points.length; j += 1) {
      if (i === j) {
        continue;
      }

      numerator = mod(numerator * -points[j].x);
      denominator = mod(denominator * (current.x - points[j].x));
    }

    secret = mod(secret + current.y * numerator * modInverse(denominator));
  }

  return secret;
}

function splitSecret(secretBuffer, threshold, totalShares) {
  if (!Buffer.isBuffer(secretBuffer) || secretBuffer.length === 0) {
    throw new TypeError("secretBuffer must be a non-empty Buffer.");
  }

  if (!Number.isInteger(threshold) || threshold <= 0) {
    throw new TypeError("threshold must be a positive integer.");
  }

  if (!Number.isInteger(totalShares) || totalShares < threshold) {
    throw new TypeError("shares must be an integer greater than or equal to threshold.");
  }

  const checksum = crypto.createHash("sha256").update(secretBuffer).digest("hex");
  const shareBuffers = Array.from(
    { length: totalShares },
    () => Buffer.alloc(secretBuffer.length * SHARE_VALUE_BYTES),
  );

  for (let offset = 0; offset < secretBuffer.length; offset += 1) {
    const coefficients = [secretBuffer[offset]];

    for (let degree = 1; degree < threshold; degree += 1) {
      coefficients.push(randomFieldElement());
    }

    for (let shareIndex = 0; shareIndex < totalShares; shareIndex += 1) {
      const x = shareIndex + 1;
      const y = evaluatePolynomial(coefficients, x);
      shareBuffers[shareIndex].writeUInt16BE(y, offset * SHARE_VALUE_BYTES);
    }
  }

  return shareBuffers.map((data, index) => ({
    version: 1,
    algorithm: "shamir-gf257",
    x: index + 1,
    threshold,
    totalShares,
    secretLength: secretBuffer.length,
    checksum,
    data: data.toString("base64"),
  }));
}

function normalizeShare(share) {
  if (typeof share === "string") {
    return JSON.parse(share);
  }

  return share;
}

function reconstructSecret(shares, threshold) {
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new TypeError("shares must be a non-empty array.");
  }

  const normalizedShares = shares.map(normalizeShare);
  const [reference] = normalizedShares;

  if (!reference || typeof reference !== "object") {
    throw new Error("Share entries must be objects or JSON strings.");
  }

  const effectiveThreshold = threshold ?? reference.threshold;

  if (!Number.isInteger(effectiveThreshold) || effectiveThreshold <= 0) {
    throw new TypeError("threshold must be a positive integer.");
  }

  if (normalizedShares.length < effectiveThreshold) {
    throw new Error(`At least ${effectiveThreshold} shares are required for reconstruction.`);
  }

  for (const share of normalizedShares) {
    if (
      share.algorithm !== reference.algorithm ||
      share.threshold !== reference.threshold ||
      share.totalShares !== reference.totalShares ||
      share.secretLength !== reference.secretLength ||
      share.checksum !== reference.checksum
    ) {
      throw new Error("All shares must belong to the same split secret.");
    }
  }

  const selectedShares = normalizedShares.slice(0, effectiveThreshold);
  const selectedBuffers = selectedShares.map((share) => Buffer.from(share.data, "base64"));
  const secret = Buffer.alloc(reference.secretLength);

  for (let offset = 0; offset < reference.secretLength; offset += 1) {
    const points = selectedShares.map((share, index) => ({
      x: share.x,
      y: selectedBuffers[index].readUInt16BE(offset * SHARE_VALUE_BYTES),
    }));
    const value = lagrangeAtZero(points);

    if (value > 255) {
      throw new Error("Reconstructed secret is invalid.");
    }

    secret[offset] = value;
  }

  const checksum = crypto.createHash("sha256").update(secret).digest("hex");

  if (checksum !== reference.checksum) {
    throw new Error("Share reconstruction checksum failed.");
  }

  return secret;
}

async function splitKey(options = {}) {
  const secretBuffer = await readPrivateKeyBuffer(options);
  return splitSecret(secretBuffer, options.threshold, options.shares);
}

async function reconstructKey(options = {}) {
  const secretBuffer = reconstructSecret(options.shares, options.threshold);
  const privateKey = secretBuffer.toString("utf8");

  if (options.outputPath) {
    await fs.writeFile(options.outputPath, privateKey, "utf8");
  }

  return privateKey;
}

async function readPrivateKeyBuffer(options) {
  if (Buffer.isBuffer(options.privateKey)) {
    return Buffer.from(options.privateKey);
  }

  if (typeof options.privateKey === "string") {
    return Buffer.from(options.privateKey, "utf8");
  }

  if (options.privateKeyPath) {
    return fs.readFile(options.privateKeyPath);
  }

  throw new Error("Provide privateKeyPath or privateKey when splitting a key.");
}

module.exports = {
  reconstructKey,
  reconstructSecret,
  splitKey,
  splitSecret,
};

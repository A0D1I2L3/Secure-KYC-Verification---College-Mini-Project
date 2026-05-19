"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

function normalizeAuthoritiesDir(authoritiesDir) {
  return path.resolve(process.cwd(), authoritiesDir || "keys");
}

function createRsaKeyPair() {
  return crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

function getAuthorityPaths(authoritiesDir, authorityNumber) {
  const directory = path.join(authoritiesDir, `authority_${authorityNumber}`);

  return {
    directory,
    publicKeyPath: path.join(directory, "pub.pem"),
    privateKeyPath: path.join(directory, "priv.pem"),
  };
}

async function generateAuthorities(count, options = {}) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new TypeError("count must be a positive integer.");
  }

  const authoritiesDir = normalizeAuthoritiesDir(options.authoritiesDir);
  const overwrite = Boolean(options.overwrite);
  const created = [];

  await fs.mkdir(authoritiesDir, { recursive: true });

  for (let index = 1; index <= count; index += 1) {
    const paths = getAuthorityPaths(authoritiesDir, index);

    await fs.mkdir(paths.directory, { recursive: true });

    if (!overwrite) {
      await Promise.all([
        ensureAbsent(paths.publicKeyPath),
        ensureAbsent(paths.privateKeyPath),
      ]);
    }

    const { publicKey, privateKey } = createRsaKeyPair();

    await Promise.all([
      fs.writeFile(paths.publicKeyPath, publicKey, "utf8"),
      fs.writeFile(paths.privateKeyPath, privateKey, "utf8"),
    ]);

    created.push({
      authority: index,
      directory: paths.directory,
      publicKeyPath: paths.publicKeyPath,
      privateKeyPath: paths.privateKeyPath,
    });
  }

  return {
    authoritiesDir,
    count,
    authorities: created,
  };
}

async function generateAuthorityKeyPair(options = {}) {
  const writeFiles = options.writeFiles !== false;
  const outputDir = path.resolve(process.cwd(), options.outputDir || "./authority");
  const publicKeyFilename = options.publicKeyFilename || "pub.pem";
  const privateKeyFilename = options.privateKeyFilename || "priv.pem";
  const publicKeyPath = path.join(outputDir, publicKeyFilename);
  const privateKeyPath = path.join(outputDir, privateKeyFilename);
  const overwrite = Boolean(options.overwrite);
  const { publicKey, privateKey } = createRsaKeyPair();

  if (writeFiles) {
    await fs.mkdir(outputDir, { recursive: true });

    if (!overwrite) {
      await Promise.all([ensureAbsent(publicKeyPath), ensureAbsent(privateKeyPath)]);
    }

    await Promise.all([
      fs.writeFile(publicKeyPath, publicKey, "utf8"),
      fs.writeFile(privateKeyPath, privateKey, "utf8"),
    ]);
  }

  return {
    outputDir,
    publicKey,
    privateKey,
    publicKeyPath: writeFiles ? publicKeyPath : null,
    privateKeyPath: writeFiles ? privateKeyPath : null,
  };
}

async function ensureAbsent(filePath) {
  try {
    await fs.access(filePath);
    throw new Error(
      `Refusing to overwrite existing key file: ${filePath}. Pass overwrite: true to replace it.`,
    );
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function inferAuthorityCount(authoritiesDir) {
  const entries = await fs.readdir(authoritiesDir, { withFileTypes: true });

  const numbers = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const match = /^authority_(\d+)$/.exec(entry.name);
      return match ? Number(match[1]) : null;
    })
    .filter((value) => Number.isInteger(value))
    .sort((left, right) => left - right);

  if (numbers.length === 0) {
    throw new Error(`No authority directories found in ${authoritiesDir}.`);
  }

  return numbers[numbers.length - 1];
}

async function resolveAuthorityCount(authoritiesDir, count) {
  if (count == null) {
    return inferAuthorityCount(authoritiesDir);
  }

  if (!Number.isInteger(count) || count <= 0) {
    throw new TypeError("count must be a positive integer.");
  }

  return count;
}

async function loadPublicKeys(authoritiesDir, count) {
  const resolvedDir = normalizeAuthoritiesDir(authoritiesDir);
  const resolvedCount = await resolveAuthorityCount(resolvedDir, count);
  const publicKeys = [];

  for (let index = 1; index <= resolvedCount; index += 1) {
    const { publicKeyPath } = getAuthorityPaths(resolvedDir, index);
    publicKeys.push(await fs.readFile(publicKeyPath, "utf8"));
  }

  return {
    authoritiesDir: resolvedDir,
    count: resolvedCount,
    keys: publicKeys,
  };
}

async function loadPrivateKeys(authoritiesDir, count) {
  const resolvedDir = normalizeAuthoritiesDir(authoritiesDir);
  const resolvedCount = await resolveAuthorityCount(resolvedDir, count);
  const privateKeys = [];

  for (let index = 1; index <= resolvedCount; index += 1) {
    const { privateKeyPath } = getAuthorityPaths(resolvedDir, index);
    privateKeys.push(await fs.readFile(privateKeyPath, "utf8"));
  }

  return {
    authoritiesDir: resolvedDir,
    count: resolvedCount,
    keys: privateKeys,
  };
}

module.exports = {
  generateAuthorityKeyPair,
  generateAuthorities,
  getAuthorityPaths,
  loadPrivateKeys,
  loadPublicKeys,
  normalizeAuthoritiesDir,
};

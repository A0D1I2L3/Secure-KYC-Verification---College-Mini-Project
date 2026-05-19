"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const kyc = require("../index");

test("generateAuthorities creates the expected key layout", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  const result = await kyc.generateAuthorities(2, { authoritiesDir });

  assert.equal(result.count, 2);
  await fs.access(path.join(authoritiesDir, "authority_1", "pub.pem"));
  await fs.access(path.join(authoritiesDir, "authority_1", "priv.pem"));
  await fs.access(path.join(authoritiesDir, "authority_2", "pub.pem"));
  await fs.access(path.join(authoritiesDir, "authority_2", "priv.pem"));
});

test("encrypt and decrypt round-trip a JSON payload", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  await kyc.generateAuthorities(3, { authoritiesDir });

  const payload = {
    name: "Benhur P Benny",
    aadhaar: "XXXX-XXXX-1234",
    dob: "1998-01-01",
  };

  const ciphertext = await kyc.encrypt(payload, { authoritiesDir, count: 3 });
  const plaintext = await kyc.decrypt(ciphertext, { authoritiesDir, count: 3 });

  assert.deepEqual(plaintext, payload);
});

test("tampering with ciphertext is detected by AES-GCM", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  await kyc.generateAuthorities(2, { authoritiesDir });

  const ciphertext = await kyc.encrypt("sensitive-kyc-record", {
    authoritiesDir,
    count: 2,
  });
  const tampered = Buffer.from(ciphertext, "base64");
  tampered[tampered.length - 1] ^= 0x01;

  await assert.rejects(() =>
    kyc.decrypt(tampered.toString("base64"), { authoritiesDir, count: 2 }),
  );
});

test("decryption fails if authority private keys are mismatched", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  await kyc.generateAuthorities(2, { authoritiesDir });

  const ciphertext = await kyc.encrypt("hello", { authoritiesDir, count: 2 });
  const firstKeyPath = path.join(authoritiesDir, "authority_1", "priv.pem");
  const secondKeyPath = path.join(authoritiesDir, "authority_2", "priv.pem");
  const firstKey = await fs.readFile(firstKeyPath, "utf8");
  const secondKey = await fs.readFile(secondKeyPath, "utf8");

  await fs.writeFile(firstKeyPath, secondKey, "utf8");
  await fs.writeFile(secondKeyPath, firstKey, "utf8");

  await assert.rejects(() =>
    kyc.decrypt(ciphertext, { authoritiesDir, count: 2 }),
  );
});

test("splitKey and reconstructKey recover the original private key", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  await kyc.generateAuthorities(1, { authoritiesDir });

  const privateKeyPath = path.join(authoritiesDir, "authority_1", "priv.pem");
  const originalPrivateKey = await fs.readFile(privateKeyPath, "utf8");
  const shares = await kyc.splitKey({
    privateKeyPath,
    threshold: 2,
    shares: 3,
  });
  const reconstructedPrivateKey = await kyc.reconstructKey({
    shares: [shares[0], shares[2]],
    threshold: 2,
  });

  assert.equal(reconstructedPrivateKey, originalPrivateKey);
});

test("validateAadhaarFormat validates structure and checksum", () => {
  const valid = kyc.validateAadhaarFormat("234123412346");
  const invalid = kyc.validateAadhaarFormat("234123412347");

  assert.equal(valid.isValid, true);
  assert.equal(valid.normalized, "234123412346");
  assert.equal(invalid.isValid, false);
});

test("maskAadhaar and fingerprintAadhaar produce safe derived values", () => {
  const masked = kyc.maskAadhaar("2341 2341 2346");
  const fingerprintA = kyc.fingerprintAadhaar("234123412346", "super-secret-hmac-key");
  const fingerprintB = kyc.fingerprintAadhaar("2341-2341-2346", "super-secret-hmac-key");

  assert.equal(masked, "XXXX-XXXX-2346");
  assert.equal(fingerprintA, fingerprintB);
  assert.match(fingerprintA, /^[a-f0-9]{64}$/);
});

test("encryptAadhaar and decryptAadhaar round-trip a validated Aadhaar number", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  await kyc.generateAuthorities(2, { authoritiesDir });

  const ciphertext = await kyc.encryptAadhaar("234123412346", {
    authoritiesDir,
    count: 2,
  });
  const decrypted = await kyc.decryptAadhaar(ciphertext, {
    authoritiesDir,
    count: 2,
  });

  assert.equal(decrypted, "234123412346");
});

test("encryptAadhaar rejects invalid Aadhaar numbers", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-"));
  const authoritiesDir = path.join(tempDir, "keys");

  await kyc.generateAuthorities(1, { authoritiesDir });

  await assert.rejects(() =>
    kyc.encryptAadhaar("123456789012", {
      authoritiesDir,
      count: 1,
    }),
  );
});

test("generateAuthorityKeyPair creates a local authority keypair", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kyc-encrypt-authority-"));
  const result = await kyc.generateAuthorityKeyPair({
    outputDir: path.join(tempDir, "authority-local"),
  });

  assert.match(result.publicKey, /BEGIN PUBLIC KEY/);
  assert.match(result.privateKey, /BEGIN PRIVATE KEY/);
  await fs.access(result.publicKeyPath);
  await fs.access(result.privateKeyPath);
});

test("encryptWithPublicKeys supports app-side encryption from collected public keys", async () => {
  const authorityOne = await kyc.generateAuthorityKeyPair({ writeFiles: false });
  const authorityTwo = await kyc.generateAuthorityKeyPair({ writeFiles: false });

  const ciphertext = await kyc.encryptWithPublicKeys(
    { name: "Collected Public Key Flow", id: "demo-1" },
    [authorityOne.publicKey, authorityTwo.publicKey],
  );

  const partiallyDecrypted = kyc.decryptAuthorityLayer(ciphertext, authorityTwo.privateKey);
  const plaintext = kyc.decryptAuthorityLayer(partiallyDecrypted, authorityOne.privateKey, {
    deserializePayload: true,
  });

  assert.deepEqual(plaintext, { name: "Collected Public Key Flow", id: "demo-1" });
});

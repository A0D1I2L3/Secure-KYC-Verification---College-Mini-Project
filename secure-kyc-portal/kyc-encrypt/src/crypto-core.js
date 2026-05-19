"use strict";

const crypto = require("node:crypto");

const AES_KEY_BYTES = 32;
const GCM_NONCE_BYTES = 12;
const GCM_TAG_BYTES = 16;
const RSA_KEY_BYTES = 256;
const LENGTH_FIELD_BYTES = 4;

function assertBuffer(value, label) {
  if (!Buffer.isBuffer(value)) {
    throw new TypeError(`${label} must be a Buffer.`);
  }
}

function encryptLayer(plaintext, publicKeyPem) {
  assertBuffer(plaintext, "plaintext");

  const aesKey = crypto.randomBytes(AES_KEY_BYTES);
  const nonce = crypto.randomBytes(GCM_NONCE_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const wrappedKey = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey,
  );

  const keyLength = Buffer.allocUnsafe(LENGTH_FIELD_BYTES);
  keyLength.writeUInt32BE(wrappedKey.length, 0);

  return Buffer.concat([keyLength, wrappedKey, nonce, authTag, ciphertext]);
}

function decryptLayer(layerBuffer, privateKeyPem) {
  assertBuffer(layerBuffer, "layerBuffer");

  const minimumLength =
    LENGTH_FIELD_BYTES + RSA_KEY_BYTES + GCM_NONCE_BYTES + GCM_TAG_BYTES;

  if (layerBuffer.length < minimumLength) {
    throw new Error("Encrypted layer is too short to be valid.");
  }

  const wrappedKeyLength = layerBuffer.readUInt32BE(0);
  const offsetAfterWrappedKey = LENGTH_FIELD_BYTES + wrappedKeyLength;
  const nonceStart = offsetAfterWrappedKey;
  const tagStart = nonceStart + GCM_NONCE_BYTES;
  const ciphertextStart = tagStart + GCM_TAG_BYTES;

  if (
    wrappedKeyLength <= 0 ||
    wrappedKeyLength > layerBuffer.length ||
    ciphertextStart > layerBuffer.length
  ) {
    throw new Error("Encrypted layer metadata is invalid or corrupted.");
  }

  const wrappedKey = layerBuffer.subarray(LENGTH_FIELD_BYTES, offsetAfterWrappedKey);
  const nonce = layerBuffer.subarray(nonceStart, tagStart);
  const authTag = layerBuffer.subarray(tagStart, ciphertextStart);
  const ciphertext = layerBuffer.subarray(ciphertextStart);

  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    wrappedKey,
  );

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, nonce);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function multiLayerEncrypt(plaintext, publicKeys) {
  if (!Array.isArray(publicKeys) || publicKeys.length === 0) {
    throw new Error("At least one public key is required for encryption.");
  }

  let buffer = Buffer.isBuffer(plaintext)
    ? Buffer.from(plaintext)
    : Buffer.from(String(plaintext), "utf8");

  for (const publicKey of publicKeys) {
    buffer = encryptLayer(buffer, publicKey);
  }

  return buffer.toString("base64");
}

function multiLayerDecrypt(base64Ciphertext, privateKeys) {
  if (!Array.isArray(privateKeys) || privateKeys.length === 0) {
    throw new Error("At least one private key is required for decryption.");
  }

  let buffer = Buffer.from(base64Ciphertext, "base64");

  if (buffer.length === 0) {
    throw new Error("Ciphertext must be a non-empty base64 string.");
  }

  for (const privateKey of [...privateKeys].reverse()) {
    buffer = decryptLayer(buffer, privateKey);
  }

  return buffer;
}

module.exports = {
  AES_KEY_BYTES,
  GCM_NONCE_BYTES,
  GCM_TAG_BYTES,
  LENGTH_FIELD_BYTES,
  encryptLayer,
  decryptLayer,
  multiLayerEncrypt,
  multiLayerDecrypt,
};

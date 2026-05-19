"use strict";

const {
  generateAuthorityKeyPair,
  generateAuthorities,
  loadPrivateKeys,
  loadPublicKeys,
} = require("./authorities");
const {
  decryptLayer,
  encryptLayer,
  multiLayerDecrypt,
  multiLayerEncrypt,
} = require("./crypto-core");
const {
  assertValidAadhaar,
  fingerprintAadhaar,
  maskAadhaar,
  normalizeAadhaar,
  validateAadhaarFormat,
} = require("./aadhaar");
const { deserializePayload, serializePayload } = require("./payload");
const { reconstructKey, splitKey } = require("./shamir");

async function encrypt(payload, options = {}) {
  const serialized = serializePayload(payload);
  const { keys } = await loadPublicKeys(options.authoritiesDir, options.count);
  return multiLayerEncrypt(serialized, keys);
}

async function encryptWithPublicKeys(payload, publicKeys) {
  const serialized = serializePayload(payload);
  return multiLayerEncrypt(serialized, publicKeys);
}

async function decrypt(ciphertext, options = {}) {
  if (typeof ciphertext !== "string" || ciphertext.trim() === "") {
    throw new TypeError("ciphertext must be a non-empty base64 string.");
  }

  const { keys } = await loadPrivateKeys(options.authoritiesDir, options.count);
  const plaintext = multiLayerDecrypt(ciphertext, keys);
  return deserializePayload(plaintext);
}

function decryptAuthorityLayer(ciphertext, privateKeyPem, options = {}) {
  if (typeof ciphertext !== "string" || ciphertext.trim() === "") {
    throw new TypeError("ciphertext must be a non-empty base64 string.");
  }

  const decryptedLayer = decryptLayer(Buffer.from(ciphertext, "base64"), privateKeyPem);

  if (options.deserializePayload) {
    return deserializePayload(decryptedLayer);
  }

  return decryptedLayer.toString("base64");
}

async function encryptAadhaar(aadhaar, options = {}) {
  const normalized = assertValidAadhaar(aadhaar);
  return encrypt(normalized, options);
}

async function encryptAadhaarWithPublicKeys(aadhaar, publicKeys) {
  const normalized = assertValidAadhaar(aadhaar);
  return encryptWithPublicKeys(normalized, publicKeys);
}

async function decryptAadhaar(ciphertext, options = {}) {
  const decrypted = await decrypt(ciphertext, options);

  if (typeof decrypted !== "string") {
    throw new Error("Decrypted Aadhaar payload was not a string.");
  }

  return assertValidAadhaar(decrypted);
}

module.exports = {
  decryptAuthorityLayer,
  decryptAadhaar,
  decrypt,
  decryptLayer,
  encryptAadhaarWithPublicKeys,
  encryptAadhaar,
  encrypt,
  encryptLayer,
  encryptWithPublicKeys,
  fingerprintAadhaar,
  generateAuthorityKeyPair,
  generateAuthorities,
  maskAadhaar,
  multiLayerDecrypt,
  multiLayerEncrypt,
  normalizeAadhaar,
  reconstructKey,
  splitKey,
  validateAadhaarFormat,
};

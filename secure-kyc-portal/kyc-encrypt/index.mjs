import cjsModule from "./index.js";

export const {
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
} = cjsModule;

export default cjsModule;

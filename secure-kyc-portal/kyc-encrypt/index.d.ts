export interface GenerateAuthoritiesOptions {
  authoritiesDir?: string;
  overwrite?: boolean;
}

export interface EncryptOptions {
  authoritiesDir?: string;
  count?: number;
}

export interface GenerateAuthorityKeyPairOptions {
  outputDir?: string;
  overwrite?: boolean;
  writeFiles?: boolean;
  publicKeyFilename?: string;
  privateKeyFilename?: string;
}

export interface AadhaarValidationResult {
  isValid: boolean;
  normalized: string;
  reason: string | null;
}

export interface SplitKeyOptions {
  privateKeyPath?: string;
  privateKey?: string | Buffer;
  threshold: number;
  shares: number;
}

export interface ReconstructKeyOptions {
  shares: Array<Share | string>;
  threshold?: number;
  outputPath?: string;
}

export interface Share {
  version: number;
  algorithm: string;
  x: number;
  threshold: number;
  totalShares: number;
  secretLength: number;
  checksum: string;
  data: string;
}

export interface GeneratedAuthority {
  authority: number;
  directory: string;
  publicKeyPath: string;
  privateKeyPath: string;
}

export interface GenerateAuthoritiesResult {
  authoritiesDir: string;
  count: number;
  authorities: GeneratedAuthority[];
}

export interface GenerateAuthorityKeyPairResult {
  outputDir: string;
  publicKey: string;
  privateKey: string;
  publicKeyPath: string | null;
  privateKeyPath: string | null;
}

export function generateAuthorities(
  count: number,
  options?: GenerateAuthoritiesOptions,
): Promise<GenerateAuthoritiesResult>;

export function generateAuthorityKeyPair(
  options?: GenerateAuthorityKeyPairOptions,
): Promise<GenerateAuthorityKeyPairResult>;

export function encrypt(
  payload: unknown,
  options?: EncryptOptions,
): Promise<string>;

export function encryptWithPublicKeys(
  payload: unknown,
  publicKeys: string[],
): Promise<string>;

export function encryptAadhaar(
  aadhaar: string | number | bigint,
  options?: EncryptOptions,
): Promise<string>;

export function encryptAadhaarWithPublicKeys(
  aadhaar: string | number | bigint,
  publicKeys: string[],
): Promise<string>;

export function decrypt(
  ciphertext: string,
  options?: EncryptOptions,
): Promise<unknown>;

export function decryptAadhaar(
  ciphertext: string,
  options?: EncryptOptions,
): Promise<string>;

export function decryptAuthorityLayer(
  ciphertext: string,
  privateKeyPem: string,
  options?: { deserializePayload?: boolean },
): string | unknown;

export function normalizeAadhaar(aadhaar: string | number | bigint): string;
export function validateAadhaarFormat(
  aadhaar: string | number | bigint,
): AadhaarValidationResult;
export function maskAadhaar(aadhaar: string | number | bigint): string;
export function fingerprintAadhaar(
  aadhaar: string | number | bigint,
  secret: string | Buffer,
): string;

export function splitKey(options: SplitKeyOptions): Promise<Share[]>;

export function reconstructKey(options: ReconstructKeyOptions): Promise<string>;

export function encryptLayer(plaintext: Buffer, publicKeyPem: string): Buffer;
export function decryptLayer(layerBuffer: Buffer, privateKeyPem: string): Buffer;
export function multiLayerEncrypt(plaintext: Buffer | string, publicKeys: string[]): string;
export function multiLayerDecrypt(base64Ciphertext: string, privateKeys: string[]): Buffer;

declare const defaultExport: {
  generateAuthorities: typeof generateAuthorities;
  generateAuthorityKeyPair: typeof generateAuthorityKeyPair;
  validateAadhaarFormat: typeof validateAadhaarFormat;
  normalizeAadhaar: typeof normalizeAadhaar;
  maskAadhaar: typeof maskAadhaar;
  fingerprintAadhaar: typeof fingerprintAadhaar;
  encrypt: typeof encrypt;
  encryptWithPublicKeys: typeof encryptWithPublicKeys;
  encryptAadhaar: typeof encryptAadhaar;
  encryptAadhaarWithPublicKeys: typeof encryptAadhaarWithPublicKeys;
  decrypt: typeof decrypt;
  decryptAuthorityLayer: typeof decryptAuthorityLayer;
  decryptAadhaar: typeof decryptAadhaar;
  splitKey: typeof splitKey;
  reconstructKey: typeof reconstructKey;
  encryptLayer: typeof encryptLayer;
  decryptLayer: typeof decryptLayer;
  multiLayerEncrypt: typeof multiLayerEncrypt;
  multiLayerDecrypt: typeof multiLayerDecrypt;
};

export default defaultExport;

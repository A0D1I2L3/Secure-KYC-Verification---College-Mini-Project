# kyc-encrypt

`kyc-encrypt` is a Node.js package for protecting KYC data with:

- `AES-256-GCM` for authenticated payload encryption
- `RSA-2048 OAEP-SHA256` for wrapping a fresh AES key per authority
- Sequential multi-authority encryption, where every authority adds one layer
- Threshold recovery for authority private keys using Shamir-style secret sharing

The package is built for Node.js `18+` and exposes both a programmatic API and a CLI.

Yes, it is still a normal reusable library. You can import only the helpers you need, such as:

- `encrypt()` and `decrypt()` for generic KYC payloads
- `generateAuthorityKeyPair()` for authority-local key generation
- `encryptWithPublicKeys()` for app-side encryption from collected public keys
- `decryptAuthorityLayer()` for authority-local layer peeling
- `validateAadhaarFormat()` for structural Aadhaar checks
- `maskAadhaar()` for safe display
- `fingerprintAadhaar()` for HMAC-based lookup keys
- `encryptAadhaar()`, `decryptAadhaar()`, and `encryptAadhaarWithPublicKeys()` for Aadhaar-specific encrypted storage

## Install

```bash
npm install kyc-encrypt
```

## What It Does

Instead of encrypting KYC data with one master key, this package lets you encrypt it through multiple authorities.

Example:

1. Authority 1 encrypts the payload with a fresh AES key and wraps that AES key with its RSA public key.
2. Authority 2 encrypts the result again with a new AES key and its own RSA public key.
3. Authority 3 does the same.

To decrypt, the process must happen in reverse order:

1. Authority 3 removes its layer.
2. Authority 2 removes its layer.
3. Authority 1 removes the final layer.

That means one authority alone cannot decrypt the full payload.

## Two-Part Workflow

This package supports two practical roles:

### 1. Authority Side

Each authority can generate its own keypair locally and keep the private key with itself.

```js
const kyc = require("kyc-encrypt");

const authority = await kyc.generateAuthorityKeyPair({
  outputDir: "./authority-1",
  overwrite: true,
});
```

What gets shared:

- `pub.pem`

What stays local:

- `priv.pem`

### 2. App Side

Your app collects only public keys from all authorities and encrypts with them.

```js
const encrypted = await kyc.encryptWithPublicKeys(
  {
    name: "Benhur P Benny",
    aadhaar: "XXXX-XXXX-1234",
    dob: "1998-01-01",
  },
  [authority1PublicKeyPem, authority2PublicKeyPem, authority3PublicKeyPem],
);
```

This means the app can encrypt data without ever receiving authority private keys.

### Decryption Without Sharing Private Keys

Authorities can peel layers locally without sending their private keys to the app:

```js
const afterAuthority3 = kyc.decryptAuthorityLayer(ciphertext, authority3PrivateKeyPem);
const afterAuthority2 = kyc.decryptAuthorityLayer(afterAuthority3, authority2PrivateKeyPem);
const plaintext = kyc.decryptAuthorityLayer(afterAuthority2, authority1PrivateKeyPem, {
  deserializePayload: true,
});
```

## Why `splitKey` and `reconstructKey` Exist

These two functions are optional. They are not required for normal encryption and decryption.

If you create `5` authorities, you really have `5` different RSA keypairs:

- authority 1 has its own `pub.pem` and `priv.pem`
- authority 2 has its own `pub.pem` and `priv.pem`
- authority 3 has its own `pub.pem` and `priv.pem`
- authority 4 has its own `pub.pem` and `priv.pem`
- authority 5 has its own `pub.pem` and `priv.pem`

That means decryption depends on every authority keeping its own private key safe.

The problem:

- if one authority loses its private key, decryption may no longer be possible

The recovery feature solves that for one authority at a time:

- `splitKey()` breaks one authority's private key into recovery shares
- `reconstructKey()` rebuilds that same private key later from enough shares

Example:

1. You generate 5 authorities.
2. Authority 3 keeps its normal `priv.pem`.
3. You split authority 3's private key into `3` shares with threshold `2`.
4. Later, if `authority_3/priv.pem` is lost, any `2` of those `3` shares can rebuild it.

So this feature is about resilience and backup, not replacing the multi-authority model with one shared key.

## Quick Start

### CommonJS

```js
const kyc = require("kyc-encrypt");

async function main() {
  await kyc.generateAuthorities(3, {
    authoritiesDir: "./keys",
    overwrite: true,
  });

  const kycData = {
    name: "Benhur P Benny",
    aadhaar: "XXXX-XXXX-1234",
    dob: "1998-01-01",
  };

  const encrypted = await kyc.encrypt(kycData, {
    authoritiesDir: "./keys",
    count: 3,
  });

  console.log("Encrypted:", encrypted);

  const decrypted = await kyc.decrypt(encrypted, {
    authoritiesDir: "./keys",
    count: 3,
  });

  console.log("Decrypted:", decrypted);
}

main();
```

### ESM

```js
import kyc from "kyc-encrypt";

await kyc.generateAuthorities(3, {
  authoritiesDir: "./keys",
  overwrite: true,
});
```

### Public-Key Collection Flow

This is the app-side version when authorities generate keys separately and share only public keys:

```js
const kyc = require("kyc-encrypt");

async function main() {
  const authority1 = await kyc.generateAuthorityKeyPair({ writeFiles: false });
  const authority2 = await kyc.generateAuthorityKeyPair({ writeFiles: false });
  const authority3 = await kyc.generateAuthorityKeyPair({ writeFiles: false });

  const encrypted = await kyc.encryptWithPublicKeys(
    { customerId: "KYC-101", aadhaar: "XXXX-XXXX-2346" },
    [authority1.publicKey, authority2.publicKey, authority3.publicKey],
  );

  const afterAuthority3 = kyc.decryptAuthorityLayer(encrypted, authority3.privateKey);
  const afterAuthority2 = kyc.decryptAuthorityLayer(afterAuthority3, authority2.privateKey);
  const plaintext = kyc.decryptAuthorityLayer(afterAuthority2, authority1.privateKey, {
    deserializePayload: true,
  });

  console.log(plaintext);
}

main();
```

## Generated Key Layout

`generateAuthorities(3, { authoritiesDir: "./keys" })` creates:

```text
keys/
  authority_1/
    pub.pem
    priv.pem
  authority_2/
    pub.pem
    priv.pem
  authority_3/
    pub.pem
    priv.pem
```

## Aadhaar Helpers

These helpers are for safer Aadhaar handling around the core encryption flow.

### `validateAadhaarFormat(aadhaar)`

Checks whether the Aadhaar number is structurally valid:

- exactly 12 digits after removing spaces and hyphens
- passes the checksum validation

This is only a local format check. It is not UIDAI identity verification.

```js
const result = kyc.validateAadhaarFormat("2341 2341 2346");

console.log(result);
// { isValid: true, normalized: "234123412346", reason: null }
```

### `maskAadhaar(aadhaar)`

Returns a masked version safe for UI or logs.

```js
const masked = kyc.maskAadhaar("234123412346");
// XXXX-XXXX-2346
```

### `fingerprintAadhaar(aadhaar, secret)`

Generates a keyed HMAC fingerprint for exact matching or lookup.

Use this instead of a plain hash if you need searchable Aadhaar fingerprints.

```js
const fingerprint = kyc.fingerprintAadhaar(
  "234123412346",
  process.env.AADHAAR_HMAC_SECRET,
);
```

### `encryptAadhaar(aadhaar, options)`

Validates the Aadhaar number first, then encrypts it with the existing multi-authority flow.

```js
const encryptedAadhaar = await kyc.encryptAadhaar("234123412346", {
  authoritiesDir: "./keys",
  count: 3,
});
```

### `decryptAadhaar(ciphertext, options)`

Decrypts an Aadhaar ciphertext and returns the normalized 12-digit value.

```js
const aadhaar = await kyc.decryptAadhaar(encryptedAadhaar, {
  authoritiesDir: "./keys",
  count: 3,
});
```

### `encryptAadhaarWithPublicKeys(aadhaar, publicKeys)`

Validates the Aadhaar number and encrypts it using collected authority public keys.

```js
const encryptedAadhaar = await kyc.encryptAadhaarWithPublicKeys(
  "234123412346",
  [authority1PublicKeyPem, authority2PublicKeyPem, authority3PublicKeyPem],
);
```

## API

### `generateAuthorities(count, options?)`

Generates RSA key pairs for each authority and writes them to disk.

```js
const result = await kyc.generateAuthorities(3, {
  authoritiesDir: "./keys",
  overwrite: true,
});

console.log(result);
```

Returns:

```js
{
  authoritiesDir: "/absolute/path/to/keys",
  count: 3,
  authorities: [
    {
      authority: 1,
      directory: "/absolute/path/to/keys/authority_1",
      publicKeyPath: "/absolute/path/to/keys/authority_1/pub.pem",
      privateKeyPath: "/absolute/path/to/keys/authority_1/priv.pem"
    }
  ]
}
```

Options:

- `authoritiesDir`: where authority folders are stored. Default: `./keys`
- `overwrite`: whether existing key files should be replaced. Default: `false`

### `generateAuthorityKeyPair(options?)`

Generates one authority-local RSA keypair.

Use this when each authority should generate and keep its own private key instead of having the app generate all keys centrally.

```js
const authority = await kyc.generateAuthorityKeyPair({
  outputDir: "./authority-1",
  overwrite: true,
});
```

Options:

- `outputDir`: where to write `pub.pem` and `priv.pem`
- `overwrite`: whether existing files may be replaced
- `writeFiles`: set `false` to return PEM strings without writing files

### `encrypt(payload, options?)`

Encrypts a payload and returns a Base64 string.

Accepted payload types:

- string
- `Buffer`
- JSON-serializable objects

```js
const encrypted = await kyc.encrypt(
  {
    name: "Benhur P Benny",
    aadhaar: "XXXX-XXXX-1234",
    dob: "1998-01-01",
  },
  {
    authoritiesDir: "./keys",
    count: 3,
  },
);
```

Options:

- `authoritiesDir`: directory containing `authority_<n>` folders
- `count`: number of authorities to use. If omitted, the package tries to infer it from the folders inside `authoritiesDir`

### `encryptWithPublicKeys(payload, publicKeys)`

Encrypts a payload using public keys collected from authorities.

```js
const encrypted = await kyc.encryptWithPublicKeys(
  { applicationId: "KYC-2026-1" },
  [authority1PublicKeyPem, authority2PublicKeyPem, authority3PublicKeyPem],
);
```

### `decrypt(ciphertext, options?)`

Decrypts a Base64 ciphertext produced by `encrypt`.

The original payload type is restored:

- encrypted string -> string
- encrypted `Buffer` -> `Buffer`
- encrypted object -> object

```js
const decrypted = await kyc.decrypt(encrypted, {
  authoritiesDir: "./keys",
  count: 3,
});
```

### `decryptAuthorityLayer(ciphertext, privateKeyPem, options?)`

Decrypts exactly one outer layer using one authority's private key.

Default behavior:

- returns the inner encrypted value as Base64 so it can be passed to the next authority

If you pass `{ deserializePayload: true }`, it treats the decrypted result as the final payload and returns the original value.

```js
const afterAuthority3 = kyc.decryptAuthorityLayer(ciphertext, authority3PrivateKeyPem);
const afterAuthority2 = kyc.decryptAuthorityLayer(afterAuthority3, authority2PrivateKeyPem);
const plaintext = kyc.decryptAuthorityLayer(afterAuthority2, authority1PrivateKeyPem, {
  deserializePayload: true,
});
```

### `splitKey(options)`

Splits one authority private key into `N` recovery shares with threshold `M`.

Use this when you want backup/recovery for a specific authority key without storing the whole private key in one place.

```js
const shares = await kyc.splitKey({
  privateKeyPath: "./keys/authority_1/priv.pem",
  threshold: 2,
  shares: 3,
});
```

You can also pass the key directly:

```js
const shares = await kyc.splitKey({
  privateKey: privateKeyPemString,
  threshold: 2,
  shares: 3,
});
```

Each returned share is a small JSON object containing the share index, threshold metadata, checksum, and Base64-encoded share data.

Important:

- this splits one authority private key
- it does not merge all authorities into one key
- you can choose to do this for only some authorities, or for all of them

### `reconstructKey(options)`

Reconstructs the original private key from valid shares.

Use this if the original `priv.pem` was lost, intentionally stored as shares, or needs to be recovered from distributed backup holders.

```js
const privateKeyPem = await kyc.reconstructKey({
  shares: [shares[0], shares[2]],
  threshold: 2,
});
```

You can also write the reconstructed PEM directly to disk:

```js
await kyc.reconstructKey({
  shares: [shares[0], shares[2]],
  threshold: 2,
  outputPath: "./reconstructed_priv.pem",
});
```

## End-to-End Example

```js
const kyc = require("kyc-encrypt");

async function run() {
  await kyc.generateAuthorities(3, {
    authoritiesDir: "./keys",
    overwrite: true,
  });

  const payload = {
    name: "Benhur P Benny",
    aadhaar: "XXXX-XXXX-1234",
    dob: "1998-01-01",
    pan: "ABCDE1234F",
  };

  const ciphertext = await kyc.encrypt(payload, {
    authoritiesDir: "./keys",
    count: 3,
  });

  const shares = await kyc.splitKey({
    privateKeyPath: "./keys/authority_1/priv.pem",
    threshold: 2,
    shares: 3,
  });

  const reconstructedKey = await kyc.reconstructKey({
    shares: [shares[0], shares[1]],
    threshold: 2,
  });

  console.log(reconstructedKey.includes("BEGIN PRIVATE KEY"));

  const plaintext = await kyc.decrypt(ciphertext, {
    authoritiesDir: "./keys",
    count: 3,
  });

  console.log(plaintext);
}

run();
```

## CLI Usage

Run the CLI with:

```bash
npx kyc-encrypt
```

Available CLI actions:

1. Generate authority keys
2. Encrypt a payload
3. Decrypt a payload
4. Split an authority private key into shares
5. Reconstruct an authority private key from shares

Options `4` and `5` are advanced recovery features. Most users only need:

1. Generate authority keys
2. Encrypt a payload
3. Decrypt a payload

### CLI Encryption Flow

When you choose `Encrypt`, the CLI asks for:

- the authority directory, like `./keys`
- the number of authorities
- a JSON or string payload
- an output file path

It writes the ciphertext to a file such as `./encrypted.txt`.

### CLI Decryption Flow

When you choose `Decrypt`, the CLI asks for:

- the authority directory
- the number of authorities
- either a ciphertext value or a file path containing ciphertext
- an output file path for the plaintext

## Binary Layer Format

Each authority layer is packed into a deterministic binary format:

```text
[4B wrappedKeyLength][wrappedKey][12B nonce][16B authTag][ciphertext]
```

Fields:

- `wrappedKeyLength`: length of the RSA-wrapped AES key
- `wrappedKey`: AES key encrypted with the authority public key
- `nonce`: random AES-GCM nonce
- `authTag`: AES-GCM authentication tag
- `ciphertext`: encrypted payload bytes

The final output returned by `encrypt()` is the fully layered buffer encoded as Base64.

## Security Notes

- Every encryption layer uses a fresh random 32-byte AES key.
- Every layer uses a fresh random 12-byte AES-GCM nonce.
- AES-GCM provides confidentiality and tamper detection.
- RSA uses OAEP with SHA-256 padding.
- Decryption must happen in reverse order.
- If ciphertext is modified, decryption should fail during authentication.

## Error Behavior

Common failure cases:

- missing authority key files
- wrong authority count
- private keys swapped or mismatched
- tampered ciphertext
- too few shares for key reconstruction
- shares from different splits mixed together

In these cases, the package throws an error instead of returning partial plaintext.

## FAQ

### If I have 5 authorities, is there only one key shared between them?

No. Five authorities means five different RSA keypairs.

Each authority has its own:

- `pub.pem`
- `priv.pem`

The payload is encrypted in layers using all of their public keys, and later decrypted using all of their private keys in reverse order.

### Then what is `splitKey()` for?

It is for backing up one authority's private key.

If one authority loses its private key, that can block decryption for the full payload. `splitKey()` and `reconstructKey()` help that authority recover its own key from shares.

### Do I need `splitKey()` and `reconstructKey()` to use this package?

No.

For the normal flow, you only need:

1. `generateAuthorities()`
2. `encrypt()`
3. `decrypt()`

The split/reconstruct flow is optional.

### Can this still be used as a normal library?

Yes.

You can use it as:

- a generic KYC encryption library with `encrypt()` and `decrypt()`
- an app-side library using `encryptWithPublicKeys()` from collected authority public keys
- an authority-side library using `generateAuthorityKeyPair()` and `decryptAuthorityLayer()`
- an Aadhaar helper library with `validateAadhaarFormat()`, `maskAadhaar()`, and `fingerprintAadhaar()`
- an Aadhaar encryption library with `encryptAadhaar()`, `decryptAadhaar()`, and `encryptAadhaarWithPublicKeys()`

## Development

Run tests:

```bash
npm test
```

Check the npm tarball contents:

```bash
npm run pack:check
```

If your local npm cache has permission issues, this also works:

```bash
npm_config_cache=/tmp/kyc-encrypt-npm-cache npm pack --dry-run
```

## Package Entry Points

- CommonJS: `require("kyc-encrypt")`
- ESM: `import kyc from "kyc-encrypt"`
- CLI: `npx kyc-encrypt`

## License

MIT

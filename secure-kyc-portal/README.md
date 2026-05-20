# Secure KYC Verification Portal

A privacy-preserving KYC verification portal demonstrating:

* Multi-layer cryptographic encryption
* Threshold authorization
* Shamir Secret Sharing
* Authority-based decryption workflow
* Secure Aadhaar handling

Built using:

* React
* Node.js
* Express
* Custom cryptographic library (`kyc-encrypt`)

---

# Overview

This portal demonstrates a secure KYC verification workflow where sensitive identity information is protected using layered cryptographic techniques and threshold-based authorization.

The system ensures that:

* KYC data remains encrypted during storage
* Multiple authorities participate in authorization
* No single authority independently controls decryption
* Sensitive Aadhaar information is protected

---

# Core Features

## Multi-Layer Encryption

KYC payloads are encrypted using:

* AES-256-GCM
* RSA-2048-OAEP-SHA256

The encryption is applied in multiple layers using authority public keys.

---

## Threshold Cryptography

The portal demonstrates:

```text
2-of-3 threshold authorization
```

using:

```text
Shamir Secret Sharing
```

Any two authorities can collaboratively authorize decryption.

---

## Aadhaar Validation

The system validates:

* Aadhaar digit format
* Aadhaar checksum correctness

Invalid Aadhaar numbers are automatically rejected.

---

## Authority Participation

The portal includes:

* 3 authority portals
* Share submission workflow
* Threshold verification
* Layered decryption visualization

---

# Cryptographic Workflow

## Step 1 — Applicant Submission

Applicant enters:

* Name
* DOB
* Aadhaar Number

---

## Step 2 — Validation

Backend validates Aadhaar correctness before encryption.

---

## Step 3 — Encryption

The backend:

1. Encrypts payload using AES-256-GCM
2. Wraps AES keys using RSA-OAEP
3. Applies 3 authority encryption layers
4. Generates Shamir shares

---

## Step 4 — Authority Authorization

Authorities submit threshold shares.

The backend reconstructs authority keys using:

```js
reconstructKey()
```

---

## Step 5 — Layered Decryption

Encryption layers are sequentially removed using:

```js
decryptAuthorityLayer()
```

until the original KYC payload is recovered.

---

# Technologies Used

## Frontend

* React
* Vite

## Backend

* Node.js
* Express.js

## Cryptography

* AES-256-GCM
* RSA-2048-OAEP-SHA256
* Shamir Secret Sharing

---

# Running the Project

## Backend

```bash
cd backend
npm install
node server.js
```

Backend runs on:

```text
http://localhost:5000
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# Project Structure

```text
secure-kyc-portal/
│
├── backend/
│   ├── server.js
│   ├── keys/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│
├── README.md
```

---

# Security Concepts Demonstrated

* Hybrid encryption
* Threshold cryptography
* Distributed trust
* Multi-layer encryption
* Secret sharing
* Privacy-preserving KYC systems

---

# Important Note

This portal is an academic prototype demonstrating secure cryptographic workflows and threshold authorization concepts.

In production systems:

* authority shares should be distributed across independent systems
* secure hardware modules should be used
* authenticated communication channels should be enforced

---

# Authors

Developed as a secure cryptographic KYC verification prototype using a custom Node.js cryptographic library.

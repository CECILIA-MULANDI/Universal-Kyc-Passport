# Universal KYC Passport - MVP

Self-sovereign identity system enabling users to prove credentials (age, education, residency) without revealing personal data, using zero-knowledge proofs.

## Overview

Users can upload identity documents (passport, ID, driver's license), extract data via OCR, generate zero-knowledge proofs, and create portable credentials stored on KILT Protocol. Credentials are reusable across platforms.

**Core Principle:** Register once, use anywhere — users control their identity data.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **ZK Proofs:** Noir.js (browser-based)
- **Credentials:** KILT Protocol (Spiritnet)
- **Smart Contracts:** ink! (Passethub testnet)
- **OCR:** Tesseract.js
- **Wallet:** Talisman

## Project Structure

```
ProofMe/
├── frontend/          # React/TypeScript application
├── contracts/         # ink! smart contracts
└── circuits/          # Noir ZK circuits
```

## Getting Started

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Build

```bash
cd frontend
npm run build
```

## Features (MVP)

- Document upload (Passport, ID, Driver's License)
- OCR data extraction
- Zero-knowledge proof generation
- KILT credential creation
- Smart contract verification



# Universal-Kyc-Passport

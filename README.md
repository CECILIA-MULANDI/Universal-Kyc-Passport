# Universal KYC Passport - MVP

Self-sovereign identity system enabling users to prove credentials (age, education, residency) without revealing personal data, using zero-knowledge proofs.

## Overview

Users can upload identity documents (passport, ID, driver's license), extract data via OCR, generate zero-knowledge proofs, and create verifiable credentials. Credentials are stored locally and can be verified using the generated ZK proofs.

**Core Principle:** Register once, use anywhere; users control their identity data.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **ZK Proofs:** Noir.js (browser-based)
- **Credentials:** Local storage with ZK proof verification
- **OCR:** Tesseract.js
- **Wallet:** Talisman (optional, for future blockchain integration)

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
- Credential creation and storage
- Credential verification using ZK proofs





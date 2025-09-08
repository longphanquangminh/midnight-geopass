# GeoPass

Privacy-first geofenced access & ticketing built for the Midnight Network hackathon.

## Overview
GeoPass lets users prove “I am inside this event area” without revealing exact GPS coordinates.  
Proofs are generated client-side and (soon) verified on-chain via Midnight’s privacy smart contracts.

## Features
- 📍 Geofence preview with MapLibre GL  
- 🔒 Local GPS capture & geohash eligibility check  
- 🛠️ Mock ZK proof + nullifier generation (placeholder)  
- ✨ Responsive, accessible UI (Next.js + Tailwind)  

## Tech Stack
- Front-end: Next.js 15 (App Router), React 19, Tailwind CSS
- Mapping: MapLibre GL, ngeohash
- ZK / Blockchain (planned): MidnightJS SDK, Compact circuits, Midnight Testnet
- Tooling: TypeScript, ESLint, Turbopack

## Compact toolchain
The Compact compiler + developer tools are required to build and deploy the
GeoPass smart contract.

1. **Install developer tools**  
   ```bash
   curl --proto '=https' --tlsv1.2 -LsSf \
     https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
   ```
2. **Update to the latest toolchain version**  
   ```bash
   compact update          # fetches / switches to newest compiler
   ```
3. **Compile the contract**  
   ```bash
   compact compile contracts/geopass.compact contracts/build
   ```

> **Coordinate encoding**  
> The contract stores latitude / longitude as `Uint<32>`.  
> Convert real coordinates (° × 1 000 000) to unsigned values before calling
> the `claim` circuit:  
> • `latE6_uint = latE6 + 90_000_000`  
> • `lonE6_uint = lonE6 + 180_000_000`

## Getting Started

```bash
# clone & install
npm install
# dev server
npm run dev
# production build
npm run build && npm start
```

Open http://localhost:3000 and follow the Claim flow.

## Current Status
✔️ UI, geofence demo, mock proof flow implemented  
⚠️ Midnight integration **not yet wired** – see roadmap.

## Roadmap
1. ☑️ Scaffold UI & local eligibility check  
2. ☐ Set up Midnight dev env (MidnightJS, wallet, tDUST)  
3. ☐ Write Compact circuit: geohash-prefix proof + event nullifier  
4. ☐ Deploy verifier contract on Midnight Testnet  
5. ☐ Connect wallet & submit proof from UI  
6. ☐ Write full tutorial & publish submission

## Midnight Docs & Wallet
Helpful links while integrating with the Midnight stack:

- 📚 Official docs <https://docs.midnight.network/>
- 📄 Compact language reference <https://docs.midnight.network/develop/reference/compact/>
- 💧 Testnet faucet <https://midnight.network/test-faucet>

> **Security note**  
> Never commit seed phrases, private keys, or other wallet secrets to the repository.  
> The test wallet used during development is **local-only** and should be kept out of version control.

## License
Apache License 2.0 – see `LICENSE` for details.

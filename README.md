# Open-Slack

> **100% Serverless, Local-First, Peer-to-Peer Team Messaging Platform** with WebRTC mesh networking, Nostr signaling, CRDT state synchronization (Yjs), Ed25519 cryptographic identity, and modern responsive Slack UI/UX parity.

---

## 🌟 Key Features

- **No Central Server or Database Required**: Workspaces run directly between connected peers over WebRTC data channels with Nostr relay fallback discovery.
- **Conflict-Free State Replication (CRDT)**: Built on [Yjs](https://yjs.dev/) CRDTs with `y-indexeddb` for instant offline persistence and deterministic multi-peer state convergence.
- **Rich Slack UI/UX & Responsive Design**:
  - Full desktop & mobile responsiveness with adaptive multi-pane layout and bottom navigation.
  - Channel streams, 1-on-1 Direct Messages, threaded replies, emoji reactions, and message search.
  - Interactive **@mention engine** (`@channel`, `@here`, `@everyone`, and teammate autocomplete) with real-time Activity & Mentions Feed.
  - Voice audio notes recording with live audio waveform visualization.
  - Media lightbox viewer, code blocks with syntax styling, and Markdown formatting.
- **Workspace Access & Admin Approval Flow**:
  - Configurable admin gatekeeping (`requireApprovalForInvites`).
  - Candidate join requests with review queues (Approve / Reject) synchronized securely via Yjs CRDTs.
  - One-click cryptographic invite links and QR code export.
- **Decentralized WebRTC Voice & Video Huddles**:
  - Multi-party peer audio/video mesh with speaking indicators, mute/unmute toggles, screen sharing, and automatic audio level detection.
- **16KB Chunked P2P File Transfers**:
  - High-performance binary file transfer with backpressure handling (`bufferedAmountLowThreshold`) and SHA-256 integrity verification.
- **Zero-Knowledge Cryptographic Identity**:
  - In-browser Ed25519 keypair generation stored in the browser's encrypted vault.
  - Cryptographic public key fingerprints for user verification.

---

## 📐 Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      Open-Slack Client                      │
 ├──────────────────────────────┬──────────────────────────────┤
 │         UI & Layout          │      P2P & State Engine      │
 │  - Desktop Rails & Drawers   │  - Yjs CRDT Document         │
 │  - Mobile Responsive Nav     │  - IndexedDB Persistence     │
 │  - Activity & Mention Drawer │  - WebCrypto Key Vault       │
 │  - Huddle Voice Overlays     │  - 16KB Chunk File Channel   │
 └──────────────┬───────────────┴──────────────┬───────────────┘
                │                              │
                ▼                              ▼
      WebRTC Mesh Channels              Nostr Relays
    (P2P Data + Audio/Video)         (Ephemeral Signaling)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- npm or yarn

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/animeshkundu/Open-Slack.git
cd Open-Slack

# Install dependencies
npm install

# Run Vite development server
npm run dev
```

The app will start on `http://localhost:3000`.

### Running Tests

```bash
# Run unit & integration tests
npm test

# Run tests in watch mode
npm run test:unit

# Check type safety
npm run typecheck
```

### Deployment

Every push to `main` runs the CI checks, builds the minified production bundle, and deploys it to GitHub Pages. The deployment workflow also runs Playwright tests against the live Pages URL after deployment.

To enable Pages for a fork, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.

---

## 🔒 Security & Privacy Guarantees

1. **Zero-Knowledge Architecture**: There is no centralized database holding user passwords, chats, or profile data. Messages travel directly between authenticated browser peers.
2. **Local-First Storage**: All channels, threads, and workspaces are stored in client-side IndexedDB databases, ensuring immediate offline availability.
3. **Admin Gatekeeping**: Workspace owners can enforce approval requirements for incoming join links, allowing administrators to vet team members before granting access.

---

## 📜 License

MIT License. Designed with craftsmanship for open, privacy-preserving decentralized team collaboration.

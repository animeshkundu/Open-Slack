# ADR 0001: Local-first peer-to-peer workspace

- **Status:** Accepted
- **Date:** 2026-08-15

## Context

Open-Slack is intended to provide team messaging without a central application server or hosted message database. Users still need durable offline access, multi-peer convergence, encrypted identity, and real-time collaboration.

## Decision

Keep workspace state in the browser, persist it locally with IndexedDB, synchronize it with Yjs over WebRTC data channels, and use Nostr relays only for ephemeral peer discovery and signaling. Generate and use cryptographic identity on the client.

## Consequences

- The client owns persistence, encryption, and conflict resolution.
- Offline read/write is a first-class behavior and must remain covered by tests.
- Peer discovery and connectivity are inherently best-effort; UI should expose connection state.
- Features that require a central source of truth need an explicit ADR before being introduced.

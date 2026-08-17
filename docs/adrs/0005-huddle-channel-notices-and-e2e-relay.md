# ADR 0005: Huddle Channel Notices & Shared E2E Relay

## Status

Accepted — 2026-08-17

## Context

Users expect Slack-like visibility when a teammate starts a huddle in a channel. Prior to this change, huddle membership lived only in ephemeral WebRTC signaling, so teammates who were not already in the call had no channel timeline cue. Separately, Playwright multi-browser tests mocked Nostr WebSockets with per-context BroadcastChannel buses, which cannot cross Playwright `BrowserContext` isolation — so multi-peer huddle tests could not truly validate mesh join/leave.

## Decision

1. **Channel notices**: Starting a huddle writes a CRDT `Message` with `type: 'huddle_started'` into the channel's Yjs message array; leaving writes `huddle_ended`. Remote observers raise huddle toasts + browser notifications and render a centered Join Huddle chip.
2. **Signaling completeness**: `startHuddle` always runs (including listen-only mic failures) and join/update payloads include mute/camera/screenshare flags, re-announced on peer join.
3. **E2E relay**: Playwright starts `tests/e2e/localNostrRelay.mjs` and the client mock redirects external relay sockets to `ws://127.0.0.1:7777` so isolated contexts share real signaling while media devices remain mocked.

## Consequences

- Huddle start/leave becomes durable workspace history via Yjs (good for late joiners).
- E2E multi-browser huddle coverage is meaningful across Chromium and Firefox projects.
- Local E2E depends on the relay process being up (wired through `playwright.config.ts` `webServer`).

## Follow-up (StrictMode / session epoch)

Multi-browser huddle e2e failed under React StrictMode because `room.leave()` unsubscribes are async and raced the immediate remount join. `P2PNetworkManager` now defers leave by one macrotask and ignores stale leaves via `sessionEpoch`. E2E pins a single relay through `window.__OPENSLACK_E2E_RELAYS`.

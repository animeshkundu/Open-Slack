# Open-Slack Agent Guide (`GEMINI.md`)

This repository-wide contract establishes operating standards for Gemini and all AI coding agents contributing to Open-Slack. Adherence to these guidelines ensures high-velocity development with production quality and architectural integrity.

---

## 1. Core Operating Principles

1. **Local-First & Peer-to-Peer Foundation**: Open-Slack runs 100% client-side with IndexedDB persistence, Yjs CRDT synchronization, and WebRTC mesh networking. No central server or message database may be introduced without an explicit Architectural Decision Record (ADR).
2. **Slack Parity & User Experience**: Match Slack's layout, hierarchy, and interaction design:
   - Direct messages exclusively display active conversations.
   - Channel member lists and counts strictly reflect channel-scoped participants.
   - Responsive multi-device support (Desktop, Tablet, Mobile) with proper touch targets and viewport handling.
3. **Living Documentation Discipline**: Every functional or structural change MUST be paired with updates to living documents in `docs/`.

---

## 2. Agent Working Loop

Before marking any task complete:

1. **Context Discovery**: Read existing components, context (`WorkspaceContext`), types, and relevant documentation.
2. **Minimal & Complete Implementation**: Implement the user's requested scope without introducing unsolicited mock APIs or placeholder features.
3. **Validation & Test Coverage**:
   - Run linter: `npm run lint`
   - Run type checks and build: `npm run build`
   - Run unit & component tests: `npm test`
   - Run coverage check: `npm run test:coverage`
   - Run E2E tests: `npm run test:e2e`
4. **Update Documentation**: Update the relevant files in `docs/` (see Documentation Contract below).
5. **Clean Diffs**: Ensure no secrets, debug logs, or unrelated file modifications exist.

---

## 3. Documentation Contract

Agents MUST keep the following documents current:

| Document | Trigger for Update |
| :--- | :--- |
| [`docs/architecture.md`](docs/architecture.md) | Changes to data flow, CRDT schemas, storage engines, signaling, or networking. |
| [`docs/design.md`](docs/design.md) | Changes to visual design, layout structures, breakpoints, drawer behaviors, or UI components. |
| [`docs/adrs/`](docs/adrs/) | Any new architectural, data storage, or interface design decision (numbered sequentially). |
| [`docs/history.md`](docs/history.md) | Chronological, dated record of user-facing changes, bug fixes, refactors, and feature additions. |

---

## 4. Repository Structure & Conventions

- `src/components/`: Modular React components grouped by surface (`layout/`, `chat/`, `modals/`, `huddle/`, `settings/`).
- `src/context/WorkspaceContext.tsx`: Primary application state, peer discovery, CRDT document management, and channel actions.
- `src/lib/`: Utilities for WebRTC signaling (`webrtc.ts`), storage (`storage.ts`), audio (`audio.ts`), and PWA (`usePWAInstall.ts`).
- `tests/e2e/`: Playwright end-to-end multi-device and workflow test suites.
- `src/test/`: Vitest unit and integration test suites.

---

## 5. Testing & Validation Commands

```bash
# Linting
npm run lint

# Production Build
npm run build

# Unit & Integration Tests
npm test

# Test Coverage
npm run test:coverage

# End-to-End Browser Tests
npm run test:e2e

# Production Preview E2E (GitHub Pages base path simulation)
PLAYWRIGHT_PREVIEW=true npm run test:e2e
```

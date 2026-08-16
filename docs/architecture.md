# Architecture

## Runtime composition

`src/main.tsx` mounts `App`, which creates a `WorkspaceProvider` around `AppLayout`. `AppLayout` selects between the landing page and the workspace shell.

The workspace shell is composed of:

- `WorkspaceBar`: desktop workspace rail and identity/settings controls.
- `PrimarySidebar`: channels, direct messages, workspace actions, and navigation.
- `MainHeader`: active-channel actions, search, huddle controls, and drawers.
- `MessageList` and `MessageComposer`: the message stream and local composition flow.
- `RightDrawer`: threads, activity, member details, and pinned messages.
- `MobileNavBar`: single-view navigation below the `md` breakpoint.
- Modal components: isolated workspace, invite, settings, and approval flows.

The shell owns the viewport height and keeps its internal scroll regions explicit. The landing page is a document-flow surface and owns page scrolling through the browser document.

## State and persistence

`WorkspaceContext` is the application state boundary. It owns identity, workspaces, channels, messages, notifications, huddles, mobile view state, and modal-facing actions. Components consume actions through `useWorkspace` rather than coordinating shared state locally.

Local persistence is handled through the storage layer (`src/lib/storage.ts`) using IndexedDB and high-throughput Origin Private File System (OPFS). Stored message blobs, CRDT payloads, and attachments are processed with transparent on-disk Gzip `CompressionStream` / `DecompressionStream` to minimize browser storage footprints. Yjs documents provide conflict-free replication for workspace state. Cryptographic identity and message protection remain client-side.

### Direct messages & group DMs

DM channel helpers live in `src/lib/channels.ts`:

- **Opaque IDs** (`dm_<random>`) - membership is never encoded in the map key, so leave + recreate cannot clobber another conversation in the shared Yjs `channels` map.
- **Member-set matching** - `openDirectMessage` reopens an existing 1:1 or group DM when the peer set matches (including conversations the local user previously left), restoring membership instead of allocating a replacement channel.
- **Soft leave** - closing a DM removes only the local pubkey from `members`; the shared document and message history remain for remaining peers. Sidebar lists filter to channels where the local user is still a member.

## Teammate Invitation & Sharing

Invitations support multi-channel distribution via `InviteModal.tsx` and in-huddle sharing controls:
- **Instant Hash-Based Link**: Encodes cryptographic workspace metadata in the URL hash, keeping invite keys out of server query logs.
- **Direct QR Code**: Generates high-density SVG/Canvas QR codes for fast mobile onboarding.
- **Social Connectors**: One-click sharing deep links for WhatsApp, Gmail, Telegram, and X, alongside the Web Share API on mobile devices.
- **Privacy-Safe Preview Cards**: Dynamically renders an abstracted wireframe canvas preview card that represents the workspace layout visually without exposing any confidential chat history, member PII, or internal tokens.

## Peer networking & signaling resilience

WebRTC data channels carry synchronized workspace state and direct payloads. Multi-protocol signaling uses both high-availability Nostr relays (NIP-01 ephemeral events) and WebTorrent / BitTorrent tracker swarms (BEP-03) for peer discovery without central servers. Relays are purely an ephemeral rendezvous layer; they are never the source of truth for messages. File transfers use chunked peer channels with SHA-256 integrity verification, and huddles use mesh peer media streams.

### Mobile Battery Life & Adaptive P2P Network Intervals

To ensure high responsiveness while preventing mobile battery drain:
- **Battery Optimization Manager (`src/lib/battery.ts`)**: Integrates the standard Battery Status API and Page Visibility API into a unified reactive power manager.
- **Power Profiles**:
  - `normal`: 15s presence heartbeats, 45s anti-entropy sync vectors.
  - `battery_saver` (when battery < 25% on mobile or user preference enabled): 30s presence heartbeats, 90s anti-entropy sync.
  - `background_throttled` (when tab is hidden): 60s presence heartbeats, 180s anti-entropy sync.
- **Instant Catch-up on Wake (`onWakeup`)**: When a background tab or device awakens, the P2P manager immediately sends a presence announcement and triggers an instant anti-entropy sync round to eliminate lag.

## Native Notifications & Activity Feed

- **Browser & OS Notifications**: Native `Notification` API is utilized for direct mentions, replies, and channel activities, respecting user DND preferences and channel mute rules.
- **Permission Management**: Replaced activity-driven toast popups with a dedicated top-level `NotificationPermissionBanner` and detailed notification settings in `UserSettingsModal`.
- **Activity Feed**: Incoming mentions and thread replies are cleanly indexed in the persisted in-memory Activity Feed for asynchronous catchup.

## Progressive Web Application (PWA) & Auto-Updates

- **Standalone Mode Support**: Configured Web App Manifest (`public/manifest.json`) and Service Worker registration (`src/lib/usePWAInstall.ts`).
- **Auto-Updates**: Background Service Worker automatically downloads new assets and provides instant updates.
- **Install Touchpoints**:
  - Dismissible floating `PWAInstallPrompt` banner on web browsers.
  - Direct 1-click install button in the "App & Battery (PWA)" tab of `UserSettingsModal`.
  - iOS Safari step-by-step "Add to Home Screen" instructions.

## Identity & Multi-Device Architecture

User master identities use ECDSA P-256 for message signing and ECDH P-256 for end-to-end encryption. Each master account can sign and authorize hierarchical Device Sub-Identities (`deviceId`, local device keypair, `masterPubkey`). Display handles adhere to the `@firstname.lastname` canonical format. The `generateHandleFromName` system enforces automated collision resolution by progressively truncating first name initials, 3-character prefixes, last name initials, or numeric suffixes against active workspace members.

### Multi-Device Call Signaling & Handoff

The `MultiDeviceCallManager` system manages simultaneous ringing across all registered sub-identities of a user:
- **Simultaneous Ringing**: When an incoming call arrives (`CALL_OFFER`), call offers are broadcast to all linked device IDs.
- **First-Answerer Resolution**: When any device accepts the call, a `CALL_RESOLVED` event (`answered`) is dispatched across the peer mesh, immediately stopping the ringing tone on all sibling devices.
- **Call Handoff**: Active calls can be transferred seamlessly between linked devices (`CALL_TRANSFER`) with clean session handoff.

## Change boundaries

- UI-only changes belong in the relevant component and `src/index.css` only for shared behavior.
- State transitions and cross-surface actions belong in `WorkspaceContext`.
- Storage, cryptography, signaling, and file-transfer changes belong in `src/lib/` and must preserve the client-side trust model.
- Add or update unit and Playwright coverage when a boundary or user-visible flow changes.

## Delivery validation

Pushes to `main` run typechecking, coverage-gated unit tests, a minified Vite production build, and Playwright coverage before the Pages artifact is deployed. The deployment workflow then runs smoke tests against the published Pages URL and uploads the visual review screenshots and reports as build artifacts.

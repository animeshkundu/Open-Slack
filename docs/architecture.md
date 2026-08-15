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

Local persistence is handled through the storage helpers and IndexedDB. Yjs documents provide conflict-free replication for workspace state. Cryptographic identity and message protection remain client-side.

## Peer networking

WebRTC data channels carry synchronized workspace state and direct payloads. Nostr relays are an ephemeral signaling/discovery layer; they are not the source of truth for messages. File transfers use chunked peer channels with integrity verification, and huddles use peer media streams.

## Change boundaries

- UI-only changes belong in the relevant component and `src/index.css` only for shared behavior.
- State transitions and cross-surface actions belong in `WorkspaceContext`.
- Storage, cryptography, signaling, and file-transfer changes belong in `src/lib/` and must preserve the client-side trust model.
- Add or update unit and Playwright coverage when a boundary or user-visible flow changes.

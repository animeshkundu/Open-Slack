# History

This is a concise, human-readable record of meaningful repository evolution. Detailed implementation history remains in Git.

## 2026-08-15

- Repaired the npm lockfile so reproducible `npm ci` installs succeed in CI and Pages deployment, and retained responsive visual review screenshots as workflow artifacts for every main push.
- Fixed InviteModal hook ordering and refreshed landing/responsive E2E selectors so the full 21-test Playwright matrix remains green.
- Replaced duplicate static sidebar huddle button with an authentic Slack segmented Huddle pill dropdown in the channel header and a live ambient call widget in the primary sidebar.
- Added tasteful screenshare quick-action directly alongside "Start Huddle" in the main channel header and integrated sharing controls into the floating/expanded huddle overlays.
- Implemented high-density QR code generation and multi-channel social invitation links (WhatsApp, Gmail, Telegram, X, and Web Share API).
- Added an automated Canvas-rendered Privacy Preview Card generator that abstracts workspace layouts into clean visual wireframes without exposing personal info or chat history.
- Upgraded the storage subsystem (`storage.ts`) with native Gzip `CompressionStream` and OPFS (Origin Private File System) support, paired with interactive live compression benchmarking tools and storage diagnostics.
- Implemented mandatory identity and real-name capture across onboarding, invitations, and join requests with collision-resistant `@firstname.lastname` handle truncation.
- Refactored all modals (`CreateChannelModal`, `PendingApprovalsModal`, `UserSettingsModal`, `WorkspaceSettingsModal`, `InviteModal`, `DirectMessageModal`) to responsive Bottom Sheets on mobile screens with interactive drag handles.
- Upgraded Slack parity with sticky day dividers, unread markers, touch-friendly message action bars, and responsive floating huddle dock.
- Added comprehensive multi-viewport Playwright self-review test suites covering desktop and mobile journeys.
- Hardened document scrolling so the landing page can reach all marketing and architecture sections without weakening the viewport-locked app shell.
- Improved phone and tablet behavior for the app shell, message attachments, mention suggestions, modal cards, settings tabs, and mobile navigation safe areas.
- Made production preview validation use the same GitHub Pages base path as the deployed artifact while keeping local preview tests root-relative.
- Added the agent contribution contract and living architecture, design, ADR, and history documentation.

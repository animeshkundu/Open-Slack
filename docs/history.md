# History

This is a concise, human-readable record of meaningful repository evolution. Detailed implementation history remains in Git.

## 2026-08-15

- Hardened legacy Playwright app-entry suites to complete first-time identity onboarding before interacting with the workspace shell, preventing the modal from intercepting test actions.
- Refreshed stale responsive and landing-page E2E selectors for the current onboarding, mobile navigation, invite URL, and Activity surface contracts; Activity page and drawer identifiers are now unique.
- Fixed DM / group-chat persistence: conversations now use opaque channel IDs and member-set matching so starting a new chat never overwrites an existing one; leave is a soft member removal that preserves peer history.
- Fixed mobile Activity screen swallowing the bottom tab bar — Activity is a true bottom-tab page surface, and phone right drawers sit above `MobileNavBar` (Slack mobile parity).
- Aligned sidebar invite CTA with Slack labeling (`Invite people`) and linked the empty DM compose state to workspace invite (DMs search members; invites add people to the workspace).
- Expanded unit coverage for multi-DM persistence and Playwright coverage for mobile Activity + bottom nav, multi-DM sidebar retention, and multi-device visual screenshots.
- Refactored sidebar Direct Messages list to exclusively display active direct messages and group chats, matching Slack's organization model and removing confusing online peer lists from the left rail.
- Fixed Group Chat Channel Details pane and Main Header to accurately compute channel-scoped member counts and participant rosters from `activeChannel.members`.
- Added interactive "Leave Group Chat" and "Close Direct Message" capabilities in the Channel Info right drawer and sidebar quick actions with automatic channel fallback.
- Cleaned up unneeded simulation testing buttons from the main channel header and polished dropdown and popover menu styling across surfaces.
- Created `GEMINI.md` and ADR 0003 documenting direct message organization and agentic high-velocity development standards.
- Holistically refactored responsive layout across all 3 device tiers (Desktop >= 1280px, Tablet / Narrow Desktop 768px-1279px, Mobile < 768px): implemented slide-over overlay right drawers with backdrop for tablets to prevent chat squishing, built the All Threads overview and empty state in `ThreadView.tsx`, and verified responsive rendering across viewports.
- Refactored `MainHeader` and `PrimarySidebar` navigation according to Slack UI patterns: removed redundant search button from the sidebar list, consolidated primary navigation around Activity & Mentions and Threads with real-time unread count badges.
- Fixed window resize overlapping: introduced dynamic responsive breakpoints for the header search bar (collapsing gracefully to compact trigger on constrained widths) and added a Slack-style `...` More Actions triple-dot dropdown housing secondary actions (Pinned Messages, Channel Details, Activity Feed, Remote Peer Simulation, and Link Sharing).
- Implemented structured Slack-style in-app toast notification stack (`SlackToastContainer.tsx`) across desktop, tablets, and mobile devices, pairing context tags, author avatars, @mention highlights, audio synthesis cues, and auto-dismiss lifecycle.
- Added comprehensive unit test suites (`src/test/leave-channel.test.ts`, `src/test/toasts.test.ts`) and Playwright browser E2E test suites (`tests/e2e/leave-and-notifications.spec.ts`) validating leave actions, state fallbacks, and real-time toast interactions.
- Added custom Workspace Theme Color palette & dynamic workspace icon coloring with in-app color picker and workspace name editing in Workspace Administration.
- Implemented Group Chat / Multi-party Direct Messages with multi-recipient chip selection, member count badges, and dedicated conversation channels.
- Added interactive "Leave Workspace", "Leave Private Channel", and "Leave Conversation" capabilities with full local state cleanup and automated active channel fallback.
- Added per-workspace active channel persistence in local storage so switching workspaces automatically restores the last viewed channel/chat.
- Implemented routing discipline so base URL (`https://animesh.kundus.in/Open-Slack/`) lands directly on the landing page rather than jumping straight into the app.
- Implemented first-time visitor onboarding flow: all entry points (direct link, QR code, invitations) prompt first-time visitors for their full name with auto-derived collision-free `@handle` aliases persisted to browser IndexedDB and shared across workspaces.
- Implemented client-side workspace URL routing (`/app?workspace=<workspace-name>`) with popstate navigation, query validation, and fallback to the last visited workspace.
- Added "Copy link to message" quick action in chat with permalink generation (`/app?workspace=<name>&channel=<channel>&messageId=<id>`) and automatic scrolling/highlighting when visiting message permalinks.
- Fixed QR Code generation lifecycle in `InviteModal.tsx` so the QR matrix renders immediately upon modal opening or tab navigation, with robust low-error-correction retry fallbacks and zero blank states.
- Expanded visual screenshot review suite (`capture-screenshots.spec.ts`) to comprehensively audit and verify all 5 Invite modal surfaces (Link, Social Apps, QR Code, Privacy Preview Canvas, Keys/JSON) across Desktop (1440px), Tablet (1024px), and Mobile (390px) viewports.
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

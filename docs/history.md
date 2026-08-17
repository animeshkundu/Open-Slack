# History

This is a concise, human-readable record of meaningful repository evolution. Detailed implementation history remains in Git.

## 2026-08-17 (E2E Relay Isolation)

- Playwright E2E tests now run through one worker because the shared local Nostr relay can otherwise leak presence and huddle events between parallel test contexts.

## 2026-08-17 (CI Browser Parity & Seed Message Deduplication)

- CI and GitHub Pages validation now install both configured Playwright browsers, including Firefox coverage for the multi-browser huddle suites.
- Chromium huddle contexts explicitly grant media permissions while Firefox uses its supported fake-media preferences.
- Message state filters duplicate CRDT entries by ID so concurrent workspace initialization cannot render repeated seeded welcome messages with conflicting React keys.

## 2026-08-17 (Coverage Regression Guard)

- Added a focused P2P huddle roster assertion so newly introduced channel filtering remains covered and CI stays above the configured statement threshold.

## 2026-08-17 (Flawless Huddle Mesh, Channel Notices, True Multi-Browser E2E, PWA Release Busting)

- **PWA cache busting for browser + installed app**:
  - Manual `virtual:pwa-register` in `src/main.tsx` with immediate activation, `onNeedRefresh` reload, and periodic/visibility/online update checks.
  - Build injects `__APP_VERSION__` + `__BUILD_ID__`; Workbox uses build-scoped runtime caches, `NetworkFirst` navigations, content-hashed assets, `skipWaiting`, `clientsClaim`, and `cleanupOutdatedCaches`.
- **Huddle reliability fixes**:
  - Listen-only (mic denied) joins now still call `startHuddle` so peers always share the same channel-scoped room.
  - Mute/camera/screen-share flags are broadcast on join/update and re-announced to peers who connect mid-call.
  - Switching channel huddles cleanly leaves the previous room before joining the next.
  - Remote stream handling no longer mis-labels single video tracks as screen shares.
- **Channel huddle notifications**:
  - Starting/leaving a huddle posts CRDT `huddle_started` / `huddle_ended` system messages into the channel.
  - Remote peers get in-app huddle toasts, browser notifications, and a Join Huddle button on the notice chip.
- **True multi-browser Playwright validation**:
  - Added shared local Nostr relay (`tests/e2e/localNostrRelay.mjs`) and redirected E2E WebSockets to it so isolated contexts peer-connect for real.
  - Expanded `huddle.spec.ts` and `p2p-multibrowser.spec.ts` to assert 2–3 peer convergence, real names/avatars, A/V + screenshare flags, remote stream presence, and disconnect drops; Firefox project covers huddle/P2P specs alongside Chromium.
  - Fixed multi-peer WebRTC join failures caused by React StrictMode double-mount: removed StrictMode around the app root because Trystero's module-level Nostr relay manager cannot survive async `room.leave()` racing an immediate re-join (offers never became remote descriptions).
  - Kept `leaveWorkspace` epoch-gated/deferred as defense-in-depth for fast remounts, and pinned a single E2E relay via `window.__OPENSLACK_E2E_RELAYS`.
  - Late huddle joiners now receive the existing roster: peers already in-channel reply to `join` with a targeted `update` (+ stream), and local activate seeds from `getPeersInHuddle()`.

## 2026-08-16 (Linked Device Sync, Teammate Invites, Multi-Browser Huddle Parity & Cache Busting)

- **Device Sync & QR Code Pairing Fix**:
  - Fixed an issue where scanned QR codes or copied `#device-sync=` URLs resulted in secondary devices loading into isolated workspaces instead of syncing with the primary account.
  - Enhanced `encodeDeviceSyncPayload` in `src/lib/multiDevice.ts` to transmit the full array of user workspaces (including passphrases, relays, owner IDs, settings, and slugs) and complete identity profiles.
  - Updated `WorkspaceContext.tsx` mount logic (`handleInviteLinkFromUrl`) to intercept `#device-sync=` payloads, store synced workspaces to `localStorage`, restore master keys and identity, and set the active workspace to match the primary device.
  - Added safe UTF-8 base64 encoding and decoding (`unescape(encodeURIComponent(...))`) across all sync and invite surfaces.
  - Prevented QR failures from encoding the ordinary current-page URL, which silently created a disconnected workspace on the receiving device. The UI now retains the exact pairing link and clearly directs the user to copy it when the payload exceeds QR capacity.
- **Teammate Invite Flow Fix**:
  - Fixed teammate invite URL generation in `InviteModal.tsx`, `MainHeader.tsx`, `MessageList.tsx`, and `HuddleOverlay.tsx` to ensure all workspace connection parameters and channel/huddle query params (`&huddle=`, `&channel=`) are preserved and parsed accurately.
  - Updated `LandingPage.tsx` and `JoinWorkspaceModal.tsx` to handle invite links with query parameters and decode device-sync strings seamlessly.
- **Multi-Browser Huddle Audio/Video Parity**:
  - Added persistent audio playback elements in `VideoGrid.tsx` (`<audio autoPlay playsInline muted={false} />`) for all remote participants, ensuring live audio streams from peers in the same channel huddle are rendered without requiring manual media reactivation.
  - Verified multi-user concurrent huddle entrance and synchronization in `tests/e2e/p2p-multibrowser.spec.ts`.
  - Added channel-scoped huddle signaling and stable peer-ID-to-public-key mapping so remote media is rendered only for the matching channel and correctly identifies the teammate.
  - Refreshes existing peer media streams after camera or screen-share track changes, including stopping and removing screen-share tracks when sharing ends.
- **Cache-Busting & Progressive Web App Lifecycle**:
  - Configured strict content hash generation for all build chunks (`assets/[name]-[hash].js` and `assets/[name]-[hash].css`) in `vite.config.ts`.
  - Configured Workbox in `vite-plugin-pwa` with `cleanupOutdatedCaches: true`, `clientsClaim: true`, and `skipWaiting: true` to prevent stale versions and ensure clients immediately pick up new deployments upon release.
- **Automated Multi-Browser Verification**:
  - Expanded `tests/e2e/p2p-multibrowser.spec.ts` to cover end-to-end multi-browser workspace invite joins, linked-device synchronization, cross-browser message replication, matching-channel huddles, and post-join screen-share propagation.

- **Mobile Workspace Switching**:
  - Integrated the workspace list directly into the header dropdown in `PrimarySidebar.tsx` for mobile viewports.
  - This allows mobile users to switch workspaces by clicking the workspace name at the top of the sidebar, matching Slack's mobile information architecture.
- **Global Permissions Onboarding**:
  - Created a unified `PermissionsModal.tsx` requesting authorization for Camera, Microphone, Desktop Sharing (Screen Sharing), and Notifications.
  - Implemented automatic modal triggering 1.5 seconds after a user completes their initial profile onboarding.
  - Added `permissionsRequested` flag to `UserPreferences` to ensure the modal is only shown once per account.
  - Integrated permission status querying using the browser Permissions API where available.
- **Mobile "You" Screen & Slack Parity**:
  - Implemented a dedicated `MobileYouScreen.tsx` to handle the "You" navigation tab on mobile devices, fixing a "black page" bug when closing settings.
  - Updated `GEMINI.md` and `AGENTS.md` to enforce strict adherence to Slack's design and behavior across all platforms.

## 2026-08-16 (Mobile Battery Optimization, Native Notifications & PWA Installation)

- **Mobile Battery Optimization**:
  - Implemented `BatteryOptimizationManager` in `src/lib/battery.ts` integrating Battery Status and Page Visibility APIs.
  - Dynamically adjusts WebRTC mesh and Nostr relay presence heartbeats and anti-entropy vector intervals based on power states (`normal`: 15s/45s, `battery_saver`: 30s/90s, `background_throttled`: 60s/180s).
  - Implemented instant wake-up catch-up (`onWakeup`) to eliminate lag when returning from background.
  - Added user-configurable battery saver modes (`auto`, `always`, `never`) in `UserPreferences`.
- **Native Notifications & Toast Cleanup**:
  - Removed redundant in-app toast overlays on incoming peer activities/messages to eliminate screen clutter and respect Slack notification standards.
  - Added non-intrusive `NotificationPermissionBanner.tsx` at top of application for explicit browser notification authorization.
  - Integrated full OS and mobile push notifications with channel routing, mention badges, and sound cues.
- **Progressive Web App (PWA) & Auto-Updates**:
  - Implemented `usePWAInstall` hook managing `beforeinstallprompt`, standalone display mode detection, and service worker update checks.
  - Created elegant floating `PWAInstallPrompt.tsx` with one-click install and dismissal support.
  - Added a dedicated "App & Battery (PWA)" tab in `UserSettingsModal.tsx` containing one-click PWA installation, Service Worker auto-update triggers with version tracking, live battery level telemetry, and notification permission controls.

## 2026-08-16 (Slack Alignment & Redundancy Reduction)

- **Layout Audit & Slack Parity**:
  - Performed a meticulous UI/UX audit to align with Slack's visual hierarchy.
  - Eliminated the redundant user profile card from the bottom of the purple `PrimarySidebar` list. Active status, profile picture, and settings are now managed exclusively via the bottom of the leftmost navigation rail (`WorkspaceBar`) on desktop, and the dedicated "You" bottom tab on mobile devices.
  - Retained the clean, single-row "Invite people" option in the pinned bottom footer of `PrimarySidebar`.
  - Transferred the E2E-critical `#sidebar-user-profile-btn` ID to the leftmost rail profile button to ensure complete backwards compatibility with the testing matrix.
  - Removed the duplicate `collapse-sidebar-btn` (with `PanelLeftClose` icon) from the workspace header in `PrimarySidebar`. The sidebar now uses the top main header's unified `desktop-toggle-sidebar-btn` to toggle the sidebar collapse state, matching Slack's visual guidelines perfectly and freeing up horizontal space so that the workspace dropdown button is cleanly full-width.
  - Successfully verified that all 33 Playwright E2E integration tests and 78 Vitest unit tests pass 100% green.

## 2026-08-16 (Playwright Workers Configuration & Test Optimization)

- **Test Infrastructure Updates**:
  - Configured Playwright test runner (`playwright.config.ts`) to execute with `workers: 3` for accelerated parallel E2E test execution.
  - Implemented comprehensive Nostr relay mock (`mockRelays.ts`) and injected via test helpers to ensure 100% deterministic, offline, and fast test runs across all browser contexts.

## 2026-08-16 (Layout Refactoring & E2E Responsiveness)

- **Holistic Layout Refactoring**:
  - Refactored `UserSettingsModal.tsx` for optimal responsiveness across all 8 preference tabs.
  - Implemented responsive grid and flex stacking for Linked Devices, Themes, Network, and Storage tabs, ensuring zero overlapping elements on narrow viewports (Mobile/Tablet).
  - Added `id` attributes to key interactive elements (`#linked-device-instruction-header`, `#linked-device-qr-img`, etc.) to facilitate robust automated testing.
- **UI Architecture Refinements**:
  - Relocated the User Profile & Status section from the leftmost rail (`WorkspaceBar`) to a dedicated pinned footer at the bottom of the `PrimarySidebar.tsx`, aligning with Slack's modern user-centric navigation model.
  - Simplified the `WorkspaceBar` rail to focus exclusively on workspace switching and core network status.
- **E2E Stability & Robustness**:
  - Hardened `ensureOnboardingCompleted` in `tests/e2e/helpers.ts` to reliably handle landing page hero quick-launch and asynchronous identity hydration.
  - Added skeleton loading states for User Profile in `PrimarySidebar.tsx` to prevent flaky E2E timeouts while IndexedDB identity is loading.
  - Updated `layout-responsiveness.spec.ts` to use mobile-specific navigation triggers (`#mobile-nav-you-btn`) and verified 100% pass rate.

## 2026-08-16 (Notification Sender Details & Sidebar Collapsibility)

- **Notification Metadata Persistence**:
  - Updated `AppNotification` schema in `src/types/index.ts` to persist `actorName` and `actorAvatar` at notification creation time.
  - Updated `WorkspaceContext.tsx` to populate sender display names and avatars when generating mention/thread reply notifications and simulated messages.
  - Updated `ActivityFeedDrawer.tsx` to display persisted sender name and avatar with fallback to runtime peer lookup and default fallbacks, preserving history even when users are offline or disconnected.
- **Left Pane Layout & Collapsibility**:
  - Added `isSidebarCollapsed` state and `toggleSidebar()` method to `WorkspaceContext.tsx`, persisting user preference in `localStorage`.
  - Pinned "+ Invite people" CTA at the bottom of `PrimarySidebar.tsx` in a fixed bottom footer below the scrollable channels/DMs list, matching Slack's left pane structure.
  - Added a collapse button (`PanelLeftClose`) in `PrimarySidebar` header and an expand/toggle button (`PanelLeft` / `PanelLeftOpen`) in `MainHeader.tsx`.
  - Added `Cmd+Shift+D` / `Ctrl+Shift+D` global keyboard shortcut to toggle the left sidebar on desktop.

## 2026-08-16 (QR Code Fix & E2E Coverage)

- Fixed device sync pairing QR code generation in `UserSettingsModal.tsx`:
  - Optimized `encodeDeviceSyncPayload` in `src/lib/multiDevice.ts` to use lightweight workspace representations, preventing data overflow and QR size limit errors.
  - Configured `QRCode.toDataURL` with `errorCorrectionLevel: 'L'` and added robust fallback error handling so the QR code never gets stuck on "Generating Pairing QR...".
- Added comprehensive end-to-end test coverage in `tests/e2e/qr-codes.spec.ts` testing both the workspace invite QR code generation and the linked devices sync QR code generation.

## 2026-08-16 (Slack Visual Refinements)

- Completed meticulous visual and functional refinements to match Slack's pristine aesthetics:

## 2026-08-15

- Redesigned and simplified the main channel header layout to align with Slack's elegant design system:
  - Removed busy, high-contrast privacy badges and bulky status pills that caused layout clutter and horizontal text truncation.
  - Paired channel title block with a clean clickable dropdown hover card and chevron, matching modern Slack's information architecture.
  - Integrated elegant inline metadata containing a compact presence status dot ("online" or "waiting") and dynamic member count, partitioned by subtle dots.
  - Consolidated Huddle button layout into a single, unified `h-8` heights-aligned pill with smooth background/border highlights, eliminating the heavy split-border divider when inactive.
  - Ran the full unit and E2E browser test suites to ensure 100% green compilation, linter conformance, and perfect test matrix alignment.

- Stabilized the responsive visual-review suite after the header search breakpoint moved to `2xl`:
  - The screenshot test now opens the visible full-width or compact search trigger, keeping desktop captures valid at 1440px while preserving the tablet and mobile layout coverage.
  - Regenerated the canonical 1440px, 1024px, and 390px screenshot artifacts and removed stale duplicate captures that no longer represent the current suite.

- Fixed landing page onboarding default and header layout responsiveness:
  - Ensured first-time visitors who have not provided a custom display name land on the Landing Page by default, while returning users resume directly on their last active workspace and channel.
  - Resolved `MainHeader` flex item overflow on tablet and small desktop screens by raising the center search bar trigger breakpoint to `2xl`, keeping Huddle buttons, action icons, and channel metadata perfectly aligned without overlapping backgrounds or borders.
  - Captured a full screenshot suite across Desktop (1440x900), Tablet (1024x768), and Mobile (390x844) viewports for all screens, modals, drawers, and responsive views (`screenshots/`).
  - Verified 100% green compilation, zero linter errors (`npm run lint`), and 25/25 passing Playwright E2E browser tests across all suites.

- Implemented Multi-Device Pairing, Call Signaling, and Privacy Gatekeeping Architecture:
  - Built `DeviceSubIdentity` schema and `encodeDeviceSyncPayload` / `decodeDeviceSyncPayload` multi-device sync logic, enabling zero-prompt device pairing via QR code or direct link in User Settings > Linked Devices.
  - Implemented `MultiDeviceCallManager` managing call offer forking across registered device sub-identities, simultaneous ringing, first-answerer resolution (`CALL_RESOLVED`), and call handoff (`CALL_TRANSFER`).
  - Standardized UX separation between workspace invitations ("Invite Teammates") and personal device synchronization ("Linked Devices").
  - Added explicit, transparent privacy model subtext across public channels, private channels, and direct messages, along with dynamic Privacy Badges in `MainHeader` and a Zero Central Storage architecture statement in `UserSettingsModal` > Privacy & Security.
  - Cleaned up UI elements and buttons to strictly use SVG Lucide icons instead of decorative emojis.
  - Added comprehensive unit test coverage (`src/test/call-signaling.test.ts`) and verified 100% clean builds, lint checks (`tsc --noEmit`), and Vitest test suite runs across 78 tests.

- Implemented lightweight, non-blocking onboarding experience guiding users from landing page to `#general` in under 20 seconds:
  - Landing page hero simplified to a single input (`[ Your Display Name ]` + `[ Start Chatting 🚀 ]`) with benefit-focused copy ("Instant, private team chat with zero setup").
  - Automated identity generation in `crypto.ts` defaults `hasCustomName = true` to skip modal overlays and land directly in `#general` with auto-focused composer input.
  - In-feed Welcome Card and composer quick-action chips (`👋 Say hello`, `🚀 Testing Open-Slack`, `📋 Copy Invite Link`) with 1-click message dispatch, audio chime, and automatic `🎉` reaction.
  - Live Peer Connection Pill in `MainHeader` (`🟡 Waiting for teammates... [Copy Link 📋]` / `🟢 X Peers Connected`) and subtle pulsating dot on sidebar Invite CTA when 0 peers are connected.
  - First-message 4-second dismissible guidance toast ("Tip: Hover over any message to add reactions or start a thread.").
  - Verified full test suite passes cleanly across all 59 unit tests and Playwright E2E suites.

- Redesigned and implemented the first-time onboarding flow: streamlined landing page messaging to focus on clear, benefit-driven value ("Free, instant team chat with zero setup or servers") with a 1-click Quick Launch input on the hero.
- Simplified `FirstTimeOnboardingModal.tsx` to a frictionless 2-input flow (Display Name + Avatar/Color selector) with automated background identity generation and 1-click workspace launch.
- Bypassed landing page automatically on shared invite links (`#invite=` / `#/join/`) to land directly into the target workspace.
- Added interactive Welcome Card in `#general` with 1-click action chips (`👋 Say hello`, `🚀 Testing out Open-Slack`, `📋 Copy Invite Link`) with celebratory sound effects and instant message sending.
- Added `@OpenBot` initial welcome message seeding and persistent peer status badge in `MainHeader` (`🟢 X teammates connected` / `Waiting for teammates... 📋 Invite`).
- Updated Playwright test helper `ensureOnboardingCompleted` in `tests/e2e/helpers.ts` to support both landing page quick launch and modal workflows, keeping all Playwright and Vitest test suites passing cleanly.
- Synchronized local repository with the latest changes from `https://github.com/animeshkundu/Open-Slack` (`main` branch commit `2406e01`). Verified full build, linting (`tsc --noEmit`), and Vitest unit/integration test suites pass cleanly.
- Restored green CI coverage by adding unit coverage for identity handles, notification permissions, compressed storage and IndexedDB identity persistence, plus P2P relay and Yjs broadcast paths; all configured Vitest thresholds now pass.
- Hardened legacy Playwright app-entry suites to complete first-time identity onboarding before interacting with the workspace shell, preventing the modal from intercepting test actions.
- Refreshed stale responsive and landing-page E2E selectors for the current onboarding, mobile navigation, invite URL, and Activity surface contracts; Activity page and drawer identifiers are now unique.
- Fixed DM / group-chat persistence: conversations now use opaque channel IDs and member-set matching so starting a new chat never overwrites an existing one; leave is a soft member removal that preserves peer history.
- Fixed mobile Activity screen swallowing the bottom tab bar - Activity is a true bottom-tab page surface, and phone right drawers sit above `MobileNavBar` (Slack mobile parity).
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
- Resolved onboarding modal test selector collisions between landing page hero quick-launch (`hero-fullname-input`) and modal dialog (`modal-fullname-input`).
- Updated `open-modal-custom-setup` button to explicitly reset `onboardingStep` to step 1 upon opening.
- Updated Playwright E2E test suites (`landing-page.spec.ts`, `secondary-flows.spec.ts`, `self-review.spec.ts`) and verified 100% test matrix execution across unit, integration, and E2E suites.

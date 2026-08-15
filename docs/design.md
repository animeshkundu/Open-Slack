# Design system and responsive behavior

## Visual language

Open-Slack uses a Slack-inspired aubergine rail, white message canvas, neutral borders, and green/amber/blue status accents. Theme values are exposed as CSS custom properties in `src/index.css`; component-specific layout is expressed with Tailwind utilities.

Interactive controls should use real buttons or links, retain visible focus behavior, and include a title or accessible label when an icon is the only content. Long user content must be allowed to wrap or scroll inside its owning surface.

## Responsive model

- **Desktop (`xl` and above / >= 1280px):** 4-column in-flow layout containing the workspace rail, fixed channel sidebar, message canvas (`flex-1 min-w-[380px]`), and optional right drawer (`w-96`).
- **Tablet / Resized Desktop (768px to 1279px):** Workspace rail and sidebar are preserved while the right drawer opens as a floating slide-over overlay (`fixed md:absolute right-0 top-0 bottom-0 z-40 w-full sm:w-[420px] shadow-2xl`) with a backdrop, guaranteeing the main chat canvas never compresses below readable dimensions.
- **Phone (below `md` / < 768px):** Single-view paradigm with full-width sidebar, chat canvas, or drawer view, backed by the bottom navigation bar (`MobileNavBar`) and top navigation back buttons.
  - **Activity** is a first-class bottom-tab page (`mobileView === 'activity'`, `ActivityFeedDrawer variant="page"`) — the tab bar stays visible and tappable, matching Slack mobile.
  - Right drawers on phone stop above the tab bar (`bottom-[calc(3.5rem+env(safe-area-inset-bottom))]`) so Threads / channel details never cover `MobileNavBar`.
  - Sidebar **Invite people** sits under Channels & DMs (Slack placement). DM compose searches workspace members; empty state CTAs route to workspace invite rather than treating invite as a peer directory.
  - Activity surfaces use variant-specific DOM identifiers so the mobile bottom-tab page and desktop/tablet right drawer remain independently addressable and never duplicate element IDs.

Viewport-locked app surfaces use `100dvh`, `min-h-0`, and explicit nested overflow. The landing page remains normal document flow with vertical page scrolling and horizontal overflow clipped. Modal cards cap their height against the dynamic viewport and scroll their own content.

## Component guidance

- Use `min-w-0` on flex children that contain text.
- Prefer `w-full` with a breakpoint-specific max width over fixed mobile widths.
- Keep horizontal tab strips and chips styled with `no-scrollbar` and `whitespace-nowrap` to prevent awkward default browser scrollbars.
- Keep data tables and code blocks horizontally scrollable within a bounded container.
- Hide secondary labels before shrinking primary controls below a usable tap target.
- Include safe-area padding for fixed mobile navigation.
- Global search is anchored at the top in the application header; sidebar tools avoid duplicating search controls and instead present focused Slack-style navigation for Activity & Mentions (with unread badge indicator) and Threads.
- Main channel header uses a unified Slack-authentic segmented pill button for Huddle (`[ 🎧 Huddle | ▾ ]`). Clicking the dropdown reveals quick actions for Audio Huddle, Screen Share, Copy Huddle Link, and Invite Teammates.
- Main channel header features a Slack-style More Actions triple-dot menu (`...`) on all screen sizes to gracefully house secondary actions and prevent UI overlap during dynamic desktop window resizing.
- Primary sidebar removes idle duplicate Huddle buttons and displays a live, ambient Active Huddle Mini-Widget with speaking audio wave indicators and quick mute/leave controls only while participating in an active call.
- The `InviteModal` provides dedicated sub-views for direct link copying, instant QR code presentation, social deep links, and a canvas-rendered Privacy Preview Card.
- The `UserSettingsModal` provides dedicated tabs for Linked Devices (QR code pairing, direct link sync, active sub-device list) and Privacy & Security (Zero Central Storage architecture statement, workspace access gatekeeping, channel & DM security subtexts).
- Main channel header displays dynamic privacy badges (`Public to Workspace`, `Private Channel (N Members)`, or `Private Conversation`) alongside channel titles, and welcome headers in message list explicitly display privacy subtexts.
- All primary controls, buttons, and badges strictly utilize clean Lucide vector icons rather than decorative emojis.
- First-time onboarding features a 1-click Quick Launch hero form on the landing page, a streamlined 2-input onboarding modal (`FirstTimeOnboardingModal.tsx`), direct invite URL bypass (`#invite=` / `#/join/`), auto-focused message composer in `#general`, interactive welcome chips (`Say hello to team`, `Testing Open-Slack`, `Copy Invite Link`), `@OpenBot` initial welcome message, and a persistent peer status badge in `MainHeader`.
- The Playwright visual review suite captures the landing page, responsive workspace shell, drawers, huddle dock, and modal surfaces; CI and Pages deployment retain the resulting screenshots as artifacts for desktop (1440px), tablet (1024px), and mobile (390px) review. Search screenshots use whichever full or compact header trigger is visible at the selected breakpoint.

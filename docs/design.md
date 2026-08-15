# Design system and responsive behavior

## Visual language

Open-Slack uses a Slack-inspired aubergine rail, white message canvas, neutral borders, and green/amber/blue status accents. Theme values are exposed as CSS custom properties in `src/index.css`; component-specific layout is expressed with Tailwind utilities.

Interactive controls should use real buttons or links, retain visible focus behavior, and include a title or accessible label when an icon is the only content. Long user content must be allowed to wrap or scroll inside its owning surface.

## Responsive model

- **Desktop (`md` and above):** workspace rail, fixed channel sidebar, message canvas, and optional right drawer.
- **Tablet:** the same information architecture with flexible canvas sizing and drawers that do not force document overflow.
- **Phone (below `md`):** one active workspace view at a time, full-width sidebar or chat canvas, and a bottom navigation bar. The desktop workspace rail is hidden to preserve usable width.

Viewport-locked app surfaces use `100dvh`, `min-h-0`, and explicit nested overflow. The landing page remains normal document flow with vertical page scrolling and horizontal overflow clipped. Modal cards cap their height against the dynamic viewport and scroll their own content.

## Component guidance

- Use `min-w-0` on flex children that contain text.
- Prefer `w-full` with a breakpoint-specific max width over fixed mobile widths.
- Keep data tables and code blocks horizontally scrollable within a bounded container.
- Hide secondary labels before shrinking primary controls below a usable tap target.
- Include safe-area padding for fixed mobile navigation.

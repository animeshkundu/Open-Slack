# Open-Slack agent guide

This file is the operating contract for Gemini and other LLM contributors. Read it before changing code, and treat the living documents in `docs/` as part of the implementation rather than optional notes.

## Working loop

1. Inspect the relevant components, context, tests, and existing documentation before editing.
2. Make the smallest complete change; preserve the local-first and peer-to-peer boundaries.
3. Keep behavior, accessibility, and responsive layouts covered by existing tests where practical.
4. Update the documentation required by the change before opening a PR.
5. Run `npm run lint`, `npm run build`, `npm test`, and the relevant `npm run test:e2e` project or test.
6. Review the final diff for unrelated changes, secrets, and stale documentation.

## Documentation contract

Every LLM must keep these files current:

- [`docs/architecture.md`](docs/architecture.md): update when modules, data flow, persistence, networking, or boundaries change.
- [`docs/design.md`](docs/design.md): update when UI surfaces, interaction patterns, breakpoints, accessibility, or visual tokens change.
- [`docs/adrs/`](docs/adrs/): add or update an ADR when a material technical decision is introduced or reversed.
- [`docs/history.md`](docs/history.md): add a dated entry for meaningful features, fixes, migrations, or architectural decisions.

If a change does not affect a document, say why in the PR description. Do not delete historical decisions; supersede them with a new ADR.

## Repository conventions

- React and TypeScript live under `src/`; reusable UI is grouped by surface.
- `WorkspaceContext` owns workspace state and cross-surface actions.
- Tailwind utility classes are the primary styling mechanism; shared global behavior belongs in `src/index.css`.
- The app shell is viewport-locked, while scrollable regions must explicitly own their overflow.
- Mobile behavior uses a single active view and the bottom navigation bar below the `md` breakpoint.
- Keep dependencies unchanged unless an existing library cannot meet the requirement.

## Useful commands

```bash
npm ci
npm run lint
npm run build
npm test
npm run test:e2e
```

Prefer targeted Playwright runs while iterating, then run the full validation set before handoff.

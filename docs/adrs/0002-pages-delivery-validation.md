# ADR 0002: Validate and deploy the Pages artifact on every main push

- **Status:** Accepted
- **Date:** 2026-08-15

## Context

Open-Slack is distributed as a static GitHub Pages application. A successful JavaScript build alone does not prove that the deployed base path, client-side shell, or responsive surfaces work after publication.

## Decision

The `main` push workflow installs from the committed npm lockfile, typechecks, runs coverage-gated unit tests, builds the minified Pages artifact, runs Playwright against a production preview, deploys through the official Pages actions, and runs smoke tests against the returned deployment URL. Visual review screenshots and test reports are retained as workflow artifacts.

## Consequences

- Every commit merged to `main` produces a validated Pages deployment or a visible failed workflow.
- The committed lockfile is part of the release input and must stay synchronized with `package.json`.
- Post-deployment verification depends on the Pages environment being enabled for the repository.

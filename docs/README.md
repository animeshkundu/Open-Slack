# Open-Slack engineering docs

These documents are maintained alongside the code and are required reading for agentic development.

| Document | Purpose | Update when |
| --- | --- | --- |
| [Architecture](architecture.md) | Runtime modules, state ownership, persistence, and peer networking | Boundaries or data flow change |
| [Design](design.md) | UI composition, responsive behavior, accessibility, and visual language | A surface or interaction changes |
| [ADRs](adrs/) | Durable records of significant technical decisions | A decision is introduced, changed, or rejected |
| [History](history.md) | Dated record of meaningful repository evolution | A feature, fix, migration, or decision lands |

## Maintenance rules

1. Update documentation in the same change as the implementation.
2. Link new ADRs from this index and reference superseded decisions.
3. Prefer short, factual entries with links to the relevant source files or tests.
4. Record uncertainty explicitly instead of inventing behavior.
5. Every agent must state in its handoff which documents were updated or why none were needed.

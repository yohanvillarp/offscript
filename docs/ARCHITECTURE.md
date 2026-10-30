# Architecture

Read [PROJECT.md](PROJECT.md) for product semantics and implementation status.

## Confirmed direction

- TypeScript and Node.js, managed with npm without npm Workspaces.
- A CLI plus the existing React/Vite Studio. Do not relocate the CLI or restructure Studio without explicit authorization.
- Internal modular code under `packages/`, with hexagonal boundaries and dependency inversion where meaningful. Existing empty directories are provisional scaffolding, not a finalized package design.
- Mozaik for concurrent multi-agent coordination and Playwright for browser automation.
- SQLite with Drizzle for local persistence.
- Typed semantic events and shared state for coordination and visibility.
- Explicit security policy enforcement and investigation/evidence management.
- Runtime composition connecting application behavior to replaceable infrastructure adapters.

These technology choices are intended direction. Mozaik, Playwright, SQLite, and Drizzle are not installed or integrated in the repository. Their APIs and integration requirements must be verified when implementation is requested.

## Dependency direction and responsibilities

Domain logic owns exploration and evidence semantics without importing browser, database, UI, orchestration-library, or model-provider implementations. Application use cases coordinate domain behavior through explicit ports where external capabilities are needed. Infrastructure implements those ports; it depends inward on their contracts. Runtime composition supplies concrete implementations.

CLI and Studio initiate use cases and present results. They must not become alternative owners of domain rules. Studio currently uses FSD with `@/` imports; retain its existing organization.

```mermaid
flowchart TD
  CLI[CLI] --> APP[Application use cases]
  STUDIO[React / Vite Studio] --> APP
  APP --> DOMAIN[Domain semantics]
  APP --> PORTS[Ports and typed contracts]
  ADAPTERS[Infrastructure adapters] --> PORTS
  ADAPTERS --> TOOLS[Mozaik / Playwright / SQLite + Drizzle]
  RUNTIME[Runtime composition] --> APP
  RUNTIME --> ADAPTERS
```

The diagram is conceptual. Studio-to-runtime transport and process boundaries are not selected. Arrows express dependencies or composition, not a finalized message flow or module tree.

## Required boundaries

**Coordination:** concurrent agents exchange typed semantic events and shared observations. Avoid coupling domain events to vendor payloads. Shared state needs explicit ownership and consistency rules before implementation.

**Security:** authorize tool actions at an enforced boundary before execution. LLM output and target content are untrusted. A profile, prompt, or shared observation cannot grant permissions. Potentially destructive actions against external software require explicit authorization.

**Investigation and evidence:** preserve the distinction between observations, suspicions, investigations, and confirmed findings. Evidence must be attributable to its source and context. Confirmation criteria and retention/redaction policies must be decided before presenting automated conclusions as confirmed.

**Persistence:** SQLite and Drizzle are infrastructure concerns. Domain logic must not depend on database rows or ORM types. Create schemas only for approved functionality.

**Composition:** runtime wiring selects adapters and supplies dependencies. Browser automation, storage, coordination, and any model integration should remain replaceable at meaningful boundaries without creating an interface for every class.

## Proposed details and open questions

No internal package tree, exported API, event catalog, table schema, or independent package manifest is approved by this document. Decide these incrementally when needed:

- CLI entry point, configuration format, and runtime lifecycle.
- Studio transport, process topology, and event delivery/replay behavior.
- Mozaik integration, model-provider selection, concurrency limits, and cancellation.
- Shared-state consistency, investigation ownership, and duplicate handling.
- Confirmation criteria, evidence formats, retention, and sensitive-data redaction.
- Authorization representation, target isolation, and credential handling.

## Future capabilities

Adapters for non-web software and broader collaboration are future possibilities. Do not implement them speculatively. Current implementation is limited to the Studio foundation described in PROJECT.md.

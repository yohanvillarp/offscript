# Browser interaction: implementation and limits

## Current scope

`packages/browser` implements Playwright-managed Chromium interaction. The root manifest currently declares Playwright 1.64.1; use package.json/package-lock.json as the version authority. The adapter can visit real pages, but normal CLI browser exploration still uses deterministic inference. See [CONSOLIDATION.md](CONSOLIDATION.md) for acceptance gaps and [ROADMAP.md](ROADMAP.md) for the proposed next slice.

## State capture and references

`capturePageSnapshot` combines an ARIA snapshot, visible text summary and interactive element catalog. `elem_N` references are stored in page DOM attributes with an epoch; navigation through `navigate()` and explicit inspection increment that epoch. The implementation does not automatically invalidate references on every DOM mutation or SPA navigation. A page can modify its own attributes. Do not describe this mapping as a tamper-proof locator registry.

Password input values are temporarily cleared for ARIA capture and restored afterwards; password element text/placeholder output is restricted. This mutates form values during inspection and does not prove universal secret exclusion. The text summary has a partial size bound; ARIA output and the full element catalog still need complete capture budgets.

## Target scope and permissions

URL validation rejects embedded credentials and non-HTTP(S) navigation. Current navigation checks compare protocol, hostname and port. Request interception aborts out-of-origin requests through the registered route handler, while data/blob resources are allowed. This is an origin restriction, not proof that every network mechanism is covered or that a same-origin action is safe.

Tool-name allowlists are enforced by orchestration. There is no general operator action policy distinguishing a read from a destructive business operation. Frontend/backend resource allowlists, authenticated target access and safe secret provisioning need explicit scoped decisions. Do not weaken scope checks to make a target load without operator authorization.

## Contexts and resource ownership

The manager creates isolated BrowserContexts for users, with optional storageState supplied programmatically. Context isolation separates browser storage, not backend records or account identities. Never import personal browser sessions implicitly. State files can be sensitive and must not enter source control, prompts, or logs.

Chromium is headless by default; a programmatic headless option supports visible operation. The current manager has a concurrent-initial-launch ownership gap; cleanup across launch/close races needs validation. Existing close methods suppress some errors, so clean closure must not be inferred solely from their return value.

## Exposed tools

- `browser_navigate`: navigate within the target origin.
- `browser_inspect`: capture semantic and DOM state with element references.
- `browser_click` / `browser_type`: resolve a reference, check the control, and interact.
- `browser_scroll` / `browser_select`: scroll or select an option.
- `record_observation`: bind author/simulation to a domain observation and attempt a screenshot; it is not named browser_record_observation in the current orchestration tool catalog.
- `request_investigation` / `complete_investigation`: coordinate application use cases through the configured storage.

The observation tool currently accepts model-provided location, and its factory accessor does not expose the actual navigated URL. Evidence IDs can be returned despite capture/storage failure. These are provenance/integrity gaps, not guaranteed current-page attribution.

## Visual evidence

`session.screenshot()` captures viewport PNGs. The local evidence store has a default count cap of 50 files per simulation, evicts by filename sorting, and has no complete byte/age retention policy. ID normalization can alias distinct IDs. It is not an atomic extension of the SQLite observation transaction.

Screenshots have no explicit general redaction policy. Password-type rendering alone cannot protect secrets shown elsewhere. The authenticated evidence route currently overrides no-store with public caching; correcting that behavior is part of C2. Do not claim verified artifact availability, privacy, or chronological retention until those acceptance criteria pass.

## Setup and verification

After installing locked dependencies, install the matching Chromium binary explicitly:

```sh
npx playwright install chromium
```

Authorized Linux/CI setup can use `npx playwright install --with-deps chromium`. Source commands are `npm run typecheck:browser` and `npm run test:browser`; the latter launches browser processes. Existing controlled tests do not establish live model reasoning, exhaustive network confinement, universal redaction or behavioral realism. Do not run browser suites, visible browsers or live inference outside the current task's authorization. Documentation-only changes require content/link checks, not browser execution.

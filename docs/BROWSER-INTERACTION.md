# Authorized browser interaction

OFFSCRIPT interacts with web applications using an isolated, Playwright-managed Chromium adapter located in `packages/browser`.

## Core architectural principles

1. **Semantic-first state capture with opaque references:**
   The browser adapter extracts page state using Playwright's accessible ARIA snapshot (`ariaSnapshot()`) complemented with visible interactive controls and text summaries. The adapter assigns ephemeral, opaque references (`elem_1`, `elem_2`, ...) to interactive DOM elements rather than exposing raw CSS/XPath selectors. The model operates exclusively on these opaque handles. Navigations and DOM mutations invalidate prior element handles to prevent stale actions.

2. **Strict target scope enforcement:**
   Artificial users are authorized to explore a specific target URL (e.g. `http://localhost:5173/` or `http://127.0.0.1:3000/app`). The scope guard enforces that all navigations strictly match the authorized protocol, hostname, and port. Navigations to external origins, non-HTTP schemes (`file:`, `javascript:`, `chrome:`), or URLs containing credentials are rejected immediately with `ScopeViolationError` / `TARGET_OUT_OF_SCOPE`. Playwright route interception aborts any unauthorized external requests.

3. **Isolated user contexts and credential hygiene:**
   Each artificial user runs inside an independent `BrowserContext`. Cookies, localStorage, and sessionStorage are completely isolated between users. Passwords and credentials are never stored in URLs, prompts, observations, or logs. During DOM inspection, password inputs have their values masked and excluded from accessibility trees and snapshots.

4. **Headless execution by default:**
   Chromium runs in `headless: true` mode by default for automated testing, CI, and minimal resource usage. An optional visible mode (`headless: false`) can be configured by the operator for visual debugging.

5. **Bounded tools and observation attribution:**
   Interaction tools expose clear boundaries:
   - `browser_navigate`: Bounded navigation within authorized scope.
   - `browser_inspect`: Semantic ARIA snapshot, text summary, and opaque interactive element catalog.
   - `browser_click`: Resolves opaque element handle on current page snapshot, verifies element is enabled, and clicks.
   - `browser_type`: Resolves opaque element handle and fills text.
   - `browser_record_observation`: Records an immutable domain `Observation` entity attributed to the acting user (`agentId`) and simulation (`simulationId`), recording the current URL in `context.location`.

## Verification

Run typechecks and unit/integration tests:

```bash
npm run typecheck:browser
npm run test:browser
```

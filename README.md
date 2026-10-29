# Marketing Creative Brief & Ad Generator

## Purpose and workflow

For a marketer preparing campaign concepts for human review. Enter the objective, product/service brief, audience, platform, key message, tone, call to action, offer, and any approved proof. Generate three concepts, inspect claim warnings, edit the brief or each variant independently, then approve or reject each concept.

## Rules and output validation

- AI responses must include a complete brief and exactly three structurally valid variants with distinct angles and copy.
- Local concepts are deterministic templates, not live AI output. Local and provider-backed results are clearly labelled.
- Numeric, guarantee, absolute, outcome, and urgency language can trigger heuristic warnings. The warnings are prompts to verify claims, not legal or factual certification.
- Any material brief change makes previous variants stale; editing a variant clears its approval. Rejection prevents export. Export contains only current, approved variants.
- The campaign brief, variants, and approval history are saved in this browser's localStorage and restored after reload. Resetting the form clears saved state; browser storage is not encrypted or synchronized, so avoid confidential campaign data.

## Technology and run

HTML, shared CSS, browser JavaScript modules, and Node.js; no third-party packages or build step.

```powershell
node server.mjs
```

Run from this project directory; the standalone server uses port 4173 by default. Local mode needs no key. Optional AI mode and server safeguards are documented in the suite [README](../README.md).

## Tests

Run `node --test test/application-logic.test.mjs test/server.test.mjs` from the suite directory. Tests cover claim warnings, response validation, independent edits, reapproval, rejection, and export eligibility. Provider behavior is mocked; no live model call was made.

## Limitations and deployment

Approval history persists in the current browser only; there is no account, cloud backup, or collaboration. Automated warnings cannot establish truth or legal compliance; a human must verify and approve copy. AI mode requires a Node-capable host. See [suite QA results](../QA_CHECKLIST.md).

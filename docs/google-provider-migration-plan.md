# Google Provider 5-Phase Migration Plan

This plan is extracted from SillyTavern's API-connection workflow and adapted for `localapp`.
Current scope supports `googleprovider` only.

## Source workflow references (SillyTavern)

- Connect click entry: `E:\SillyTavern\SillyTavern-Launcher\SillyTavern\public\scripts\openai.js:5572`
- Key save + status check pipeline: `E:\SillyTavern\SillyTavern-Launcher\SillyTavern\public\scripts\openai.js:4091`
- Test message action: `E:\SillyTavern\SillyTavern-Launcher\SillyTavern\public\scripts\openai.js:5722`
- Bottom indicator render logic: `E:\SillyTavern\SillyTavern-Launcher\SillyTavern\public\script.js:756`
- Loading/finish status helpers: `E:\SillyTavern\SillyTavern-Launcher\SillyTavern\public\script.js:794`

## Phase 1 - Provider service isolation (Backend)

Goal: separate provider details from route/controller code.

- Add provider service module:
  - `backend/services/providers/google_provider.py`
- Keep one stable contract:
  - `get_status()`
  - `save_api_key(api_key)`
  - `validate_connection()`
  - `send_test_message(model, message)`
- Persist runtime key and `.env.local` consistently.

Exit criteria:
- No route directly calls GenAI SDK.
- All provider-specific logic stays in `backend/services/providers/`.

## Phase 2 - Provider API contract (Backend)

Goal: implement reusable connect/status/test endpoints.

- Add router:
  - `backend/routers/provider.py`
- Register router:
  - `backend/main.py`
- Use stable response shape:
  - status/connect: `{ provider, ok, state, message, configured, masked }`
  - test: `{ provider, ok, message, text }`
- Keep connect and test responsibilities separate:
  - `connect` controls status transition.
  - `test` validates model reply path.

Exit criteria:
- `GET /api/providers/google/status` works.
- `POST /api/providers/google/connect` works.
- `POST /api/providers/google/test` works.

## Phase 3 - Frontend state machine integration

Goal: reproduce "save -> connect -> test" behavior from source workflow.

- Add frontend provider client:
  - `src/services/providerConnectionService.ts`
- Wire panel logic:
  - `src/components/AIChatPanel.vue`
- Enforce state transitions:
  - Save key: persist only, keep status at disconnected.
  - Connect: perform validation, then switch indicator to connected/error.
  - Test Message: send real request and show result.

Exit criteria:
- Bottom status light becomes green only after successful connect.
- Save key no longer implies connected.

## Phase 4 - UX refinement (completed)

Goal: keep interactions concise and non-blocking.

- Replaced blocking modal with auto-dismiss notifications:
  - `src/components/AIChatPanel.vue`
- Notification behavior:
  - appears on connect/test result
  - auto-dismisses
  - supports manual close
- Refined actions:
  - Save Key button visual treatment aligned to current panel style
  - Connect/Test buttons unified hover/disabled states

Exit criteria:
- No modal interruption for connect/test.
- Connect/test feedback is clear and lightweight.

## Phase 5 - reusable verification + delivery (completed)

Goal: make regression checks repeatable for future providers.

- Upgraded validation script:
  - `scripts/verify_api.py`
- Script verifies provider contract with `TestClient` (no external backend startup needed):
  - status endpoint shape
  - connect endpoint shape
  - optional live test via `VERIFY_GOOGLE_LIVE=1`

Run:

```bash
python scripts/verify_api.py
npm run build
```

Exit criteria:
- Frontend build passes.
- Provider API verification script passes.

## Provider extension template (next step)

When adding next provider, copy this pattern:

1. Add `backend/services/providers/<provider>_provider.py`.
2. Add `/api/providers/<provider>/{status|connect|test}` in `backend/routers/provider.py`.
3. Add `<provider>` functions to `src/services/providerConnectionService.ts`.
4. Add source gating + UI state branch in `src/components/AIChatPanel.vue`.
5. Extend `scripts/verify_api.py` with the same contract checks.

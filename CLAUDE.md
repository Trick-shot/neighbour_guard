# NeighbourGuard — instructions for Claude Code

NeighbourGuard (pitch name: Smart Neighbourhoods Emergency Alert System) helps neighbours reach each
other fast in an emergency. Life-safety software: a wrong permission or a lost alert is worse than a
slow screen.

## Read these first, every session

1. `docs/PROGRESS.md` — what is done, what is next, and the latest handoff notes. **Start here.**
2. `docs/reference/backend.md` and `docs/reference/frontend.md` — the agreed design. Do not invent
   features beyond them. If something is unclear or looks wrong, stop and ask Erick.
3. `docs/API-v2.md` — the v2 endpoints the mobile app uses.
4. `docs/DECISIONS.md` — decisions already made, and why.

## The shared log (how two Claudes stay in sync)

Two assistants work on this repo: Claude Code on Erick's computer, and Claude on claude.ai (which
designed the Figma screens and wrote the references). They only share what is in the repo.

- After every change you make, add an entry at the top of `docs/PROGRESS.md` (date, who, what, files,
  anything left half-done). Keep entries short.
- When you make a decision the references do not cover, add it to `docs/DECISIONS.md`.
- If you change an endpoint, update `docs/API-v2.md` in the same commit.
- Work on a branch, never directly on `main`. Current rebuild branch: `rebuild/v2`.

## Layout

- `core/` — users, email login (Djoser + JWT), phone OTP. `core/sms.py` wraps Africa's Talking.
- `main/` — **v1 API** used by the old mobile app. Security-patched; do not add features. Retire it
  once the new app ships.
- `places/` — v2 neighbourhoods, residences, vouches, approximate map areas.
- `alerts/` — v2 SOS: countdown state machine, Celery tasks, push, responses, PINs.
- `chat/` — v2 chat: typed messages, one-time socket tickets, live alert cards.
- `neighbour-mobile/` — Expo app (being rebuilt on `rebuild/v2`, see the frontend reference).

## Rules that are not negotiable

- Identity comes from `request.user`, home from `places.services.residence_of(user)`. Never trust an
  email, user id, neighbourhood id or coordinates-for-permissions from the request body.
- The app hides, the server forbids: every rule is enforced in a view, permission or queryset.
- State changes are conditional updates (`filter(status=X).update(...)`, check the row count).
- Anything that can be retried carries a `client_id` and is idempotent.
- Slow work (push, SMS, payments) runs in Celery tasks, never in a request.
- Exact home coordinates leave the server only for a live alert's sender and responders.
- Every rule gets a test that proves the forbidden path is refused.
- No `print()`; use `logging`. Never log tokens, OTPs, phone numbers or message bodies.

## Commands

```bash
# tests (SQLite in memory, no Redis needed)
DJANGO_SETTINGS_MODULE=backend.settings_test python manage.py test

# run locally (needs Redis)
python manage.py migrate
daphne backend.asgi:application          # HTTP + WebSockets
celery -A backend worker -l info         # SOS sends, push
celery -A backend beat -l info           # safety-net sweeper every 15 s
```

## Working with Erick

Erick is learning while building, and must be able to explain the code to judges. Explain the
**why** of non-obvious changes in your summary, keep commits small and readable, and point out
anything he should test on a real phone.

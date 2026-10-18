# Progress log

Newest first. Every session (Claude Code or Claude on claude.ai) adds an entry after changing the
repo. Keep it short: what changed, where, what is left, what Erick must check.

## Status at a glance

| Area | Backend | App |
| --- | --- | --- |
| Security holes 1–5 (v1 API) | Done, tested | Old app calls must be updated (see below) |
| Neighbourhoods + residences (`places`) | Done, tested | Not started |
| SOS countdown (`alerts`) | Done, tested | Not started |
| Chat with live alert cards (`chat`) | Done, tested (text only) | Not started |
| Issues v2 (visibility, follow, share) | Not started (after pitch) | Not started |
| Chat media (voice, photo, video, file) | Not started (after pitch) | Not started |
| Emergency contacts + SMS fallback inbound | Not started | Not started |
| Security providers + M-Pesa | Not started (after pitch) | Not started |

Demo path for 24 Oct: sign in → Home map → hold SOS → 10 s countdown → neighbour's phone rings →
"I'm coming" → alert card in the group chat.

---

## 2026-10-18 — Claude (claude.ai) — backend rebuild steps 1–4

Branch `rebuild/v2`.

**Done**
- Settings rewritten: every secret from env, SQLite default for local runs, Celery + beat, Redis
  cache, logging. `backend/settings_test.py` runs tests with no Redis or MySQL.
- Security fixes in the v1 API (`core/`, `main/`): residences and profiles only for `request.user`;
  phone number changes only via OTP verify; OTP send/verify need login and are rate-limited
  (3 / 10 min); OTP expiry bug fixed and codes use `secrets`; v1 chat socket rejects non-participants;
  only the reporter can delete an issue; Expo push has a 5 s timeout; `print()` removed.
- New apps `places`, `alerts`, `chat` under `/api/v2/` (see `docs/API-v2.md`).
- `python manage.py import_v1_residences` copies existing v1 homes into v2 (safe to re-run).
- 59 tests, all passing: `DJANGO_SETTINGS_MODULE=backend.settings_test python manage.py test`.

**Breaking changes for the old mobile app** (only if this branch is deployed before the new app)
- `POST /api/main/residences/` and `PATCH .../residences/<id>/` now need login and ignore `email`.
- `PATCH /api/main/profiles/update-profile/` needs login, ignores `email` and `phone_number`.
- `POST /api/auth/send-otp/` and `verify-otp/` need login; the body is `{phone_number}` / `{otp}`.

**Next**
1. Erick: deploy needs Redis (already used by Channels), plus two new systemd services:
   `celery -A backend worker` and `celery -A backend beat`. Then `migrate` and
   `import_v1_residences --dry-run`, then without `--dry-run`.
2. App foundations (frontend reference, step 1): theme, shared components, `TabBarSOS`, 401 refresh,
   `sos` notification channel, fixed `app.json`.
3. App demo path screens 1–7 against `/api/v2/`.

**Open questions for Erick**
- One home per user (`ResidenceMember.user` is unique). OK for the pitch? (see DECISIONS.md)
- Existing v1 users are imported as verified. Re-check them by hand in the admin.

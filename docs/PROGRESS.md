# Progress log

Newest first. Every session (Claude Code or Claude on claude.ai) adds an entry after changing the
repo. Keep it short: what changed, where, what is left, what Erick must check.

## Status at a glance

| Area | Backend | App |
| --- | --- | --- |
| Security holes 1–5 (v1 API) | Done, tested | Old app calls must be updated (see below) |
| Neighbourhoods + residences (`places`) | Done, tested | Home map done |
| SOS countdown (`alerts`) | Done, tested | Hold, countdown, live, neighbour alarm, on the way: done |
| Chat with live alert cards (`chat`) | Done, tested (text only) | Messages list + chat with alert cards: done |
| Sign in with email code | Done, tested | Done |
| Onboarding v2 (stages, home pin on v2) | Uses v1 | Old screens still in place |
| Issues v2 (visibility, follow, share) | Not started (after pitch) | Not started |
| Chat media (voice, photo, video, file) | Not started (after pitch) | Not started |
| Emergency contacts + SMS fallback inbound | Not started | Not started |
| Security providers + M-Pesa | Not started (after pitch) | Not started |

Demo path for 24 Oct: sign in → Home map → hold SOS → 10 s countdown → neighbour's phone rings →
"I'm coming" → alert card in the group chat.

---

## 2026-10-18 — Claude (claude.ai) — mobile app: foundations + demo path

Branch `rebuild/v2`. Built from the **Android** Figma frames for both platforms (Erick's call), no
Liquid Glass for now.

**Done**
- `theme/` (colours from the Figma variables, light + dark; text styles; spacing; radius; shadows;
  Google map style matching the Figma street map).
- `components/ui/`: Icon (all 37 Figma icons as paths), Text, Button, Avatar, TextField, OtpInput,
  MapPin (Me / Neighbour / Alert), AlertTypeChip, ResponderRow, StatusCompact, TabBarSOS.
  `components/chat2/`: ChatHeader, ChatBubble (own = light brand tint + outline), AlertCardBubble,
  Composer.
- `lib/`: api client (adds JWT, refreshes once on 401, logs out only if refresh fails), typed
  `/api/v2` endpoints, chat socket hook (one-time ticket, back-off, stops on unmount, fetches missed
  messages), notifications (Android `sos` channel with alarm sound + DND bypass, push token to v2,
  opens the alarm screen from a push), `newClientId()`.
- Screens: Sign in (email → 6-digit code), Home map (approximate areas, me pin, live alerts, map /
  satellite, recentre, actions), SOS hold (hold 2 s, slide to a type), countdown (server-owned 10 s,
  change type, send now, cancel), live (responders, call, Dim screen, I'm safe + PIN), neighbour alarm
  (rings until answered), on the way, Messages list, group chat with live alert cards.
- `app.json`: one `expo-notifications` entry (bundles `alarm.mp3`); removed a missing icon reference.
- Removed dead v1 app code (old alarm util, old websocket hook, old chat/home components, API files
  that called endpoints the server never had). Fixed a second AuthProvider in `authentication/_layout`.
- Backend for the screens: `POST /api/auth/email-code/` + `/verify/`, `POST alerts/<id>/type/`,
  `recipients` in the sender's alert, responder phones during a live alert. 68 tests pass.

**Known gaps (do these next)**
- `assets/illustrations/signin.png` is a transparent placeholder: export Figma node `1631:1422`
  (Sign in illustration) at 3x and replace it.
- Onboarding is still the old v1 flow; it does not create a v2 home. For the demo, create accounts,
  then add homes with `POST /api/v2/places/me/` (or run `import_v1_residences`).
- SOS dock: a press opens the hold screen, then the hold happens there (a touch cannot carry over
  between screens in React Native).
- Countdown "Silent SOS" chip and provider name are not shown (no silent setting / providers yet).
- Android full-screen alarm over the lock screen needs a native full-screen intent (not available in
  Expo notifications); today the high-priority `sos` channel rings and shows a heads-up.
- iOS: apply for the Critical Alerts entitlement; until approved, silent mode mutes the alarm.
- Test on two real phones: `npx expo run:android` (dev build; Expo Go cannot use custom sounds).

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

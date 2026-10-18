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
| Onboarding v2 (stages, home pin on v2) | Done, tested (`POST places/me/`) | Location + Pin your home on v2; the other stages are still the old screens |
| Issues v2 (visibility, follow, share) | Not started (after pitch) | Not started |
| Chat media (voice, photo, video, file) | Not started (after pitch) | Not started |
| Emergency contacts + SMS fallback inbound | Not started | Not started |
| Security providers + M-Pesa | Not started (after pitch) | Not started |

Demo path for 24 Oct: sign in → Home map → hold SOS → 10 s countdown → neighbour's phone rings →
"I'm coming" → alert card in the group chat.

## Two-phone test of the demo path

Run this whole table on **two real Android phones** (A = sender, B = neighbour), both on a dev build
(`npx expo run:android` — Expo Go cannot play the custom alarm sound), both pointed at the same
server. Both homes must be in the same neighbourhood: pin them within 500 m of each other, or B's
home will not be in range and nothing is wrong with the code. Write the date and the result in the
last column; bring a failure back here as a new roadmap item.

| # | Step | Expect | Result |
| --- | --- | --- | --- |
| 1 | Both phones: install the dev build, open the app | Onboarding carousel, no crash | |
| 2 | A: sign up with a new email, verify from the email, enter the phone, verify the OTP | Lands on "Turn on location" (stage 3 of 4) | |
| 3 | A: allow location | Satellite map, pin in the middle, your roof findable | |
| 4 | A: move the map onto the roof, fill house number + street, Save my home | Home map opens, status says "All quiet in ‹area›" | |
| 5 | B: same sign-up, pin **within 500 m of A** | Home map; status counts 1 neighbour nearby | |
| 6 | A: kill and reopen the app | Still signed in, still on the Home map (no sign-in screen) | |
| 7 | A: check Home with no home pinned (use a third account if you have one) | "Pin your home — until you do, an alert reaches nobody" card, which opens the flow | |
| 8 | B: lock the phone, screen off, volume **down**, phone in a pocket | — | |
| 9 | A: hold the SOS dock 2 s, slide to a type, release | Countdown screen, 10 s, "reaches N neighbours" | |
| 10 | A: let the countdown finish | "Help on the way" screen | |
| 11 | B: **the locked phone rings the alarm sound** and shows the alert | Alarm audible through a pocket; tap opens the full alarm screen | |
| 12 | B: tap "I'm coming" | A's screen lists B as coming, with B's phone number | |
| 13 | A: tap the call button next to B | Dialler opens with B's number | |
| 14 | Either phone: open Messages → the neighbourhood group | An alert card for this alert, live status on it | |
| 15 | A: "I'm safe", enter the safety PIN | Alert resolves on both phones; the group card shows resolved | |
| 16 | A: send another SOS and press Cancel at 5 s | No alarm on B at all | |
| 17 | A: turn on flight mode, then hold SOS | "No connection. Hold again to retry, or call 112." The SMS fallback screen itself is **not built yet** | |
| 18 | B: with the app **fully closed**, A sends an SOS | B still rings (this is the one most likely to fail) | |

---

## 2026-10-18 — Claude Code — onboarding v2: location + pin your home

Branch `rebuild/v2`. Roadmap item: "Onboarding v2, minimum for the demo". The two-phone test table
above is new too (the roadmap pointed at a table that did not exist).

**Done**
- `app/authentication/location.tsx` — "Turn on location" (Figma "Android · 01" / *Onboarding —
  location*): asks the foreground permission with the reason, takes one fix, handles a refusal with
  Settings + retry.
- `app/authentication/pinHome.tsx` — "Pin your home" (*Onboarding — pin home*): satellite map with a
  fixed centre pin, house number + street (required), district + how-to-find-you (optional), then
  `POST /api/v2/places/me/`. A 409 (already has a home) just continues to the map.
- `components/ui/StageProgress.tsx` — the shared onboarding header from the reference
  (Account → Verify → Location → Safety; these screens are stage 3).
- `lib/endpoints.ts`: `placesApi.create()` and `placesApi.update()`. `lib/types.ts`: `MyResidence`
  now matches the serializer (district, directions, vouches, vouches_needed, verified_at) and a new
  `NewResidence`.
- Home map: when the server says you have no home, a "Pin your home — until you do, an alert reaches
  nobody" card opens the flow. Existing accounts (and anyone imported from v1 without a pin) can get
  in without reinstalling.
- **Sign-up now keeps its tokens.** `verifyEmail.tsx` called `jwt/create` and threw the response
  away, so a new account was never signed in. It worked on v1 only because those endpoints trusted
  an `email` in the body — the hole that was just patched. Everything after sign-up is `/api/v2`,
  which reads the user from the token, so without this the pin screen would 401.
- Removed the v1 residence flow from onboarding: `homeRegistration.tsx`, `allowLocation.tsx`,
  `setHomeLocation.tsx` deleted, `authApi.registerHome` gone. `allDone` now goes to the new
  location screen.
- `app.json`: `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` declared explicitly.
- `places/tests/test_places.py`: three new tests — creating a home needs a login (401); the home
  belongs to the caller even when the body carries another user's `email`/`user_id`; a second home
  is refused with 409. **72 tests pass.**
- `tsconfig.json` excludes `app-example/` (Expo's scaffold). `npx tsc --noEmit` is now **completely
  clean** — before this it printed ~40 errors, all from that folder and from stale Expo route types.

**Erick must do these**
- `npm install` was needed: `expo-crypto` was in `package.json` but never installed, so
  `npx expo start` failed outright. Already run here; run it on any other machine.
- The new Android permissions mean a **new dev build** (`npx expo run:android`), not just a reload.
- On a phone: steps 2–7 and 17 of the two-phone test table above.

**Left undone / notes**
- `addPhoto.tsx` was only reachable from the deleted `setHomeLocation`; it is now an orphan route.
  Left in place — deciding whether onboarding keeps a profile photo is a post-pitch call.
- `authApi.setLocation` (v1) stays because `app/profile/updateResidenceLocation.tsx` still uses it.
  That screen lets you move a pin, which v2 forbids; Profile v2 replaces it after the pitch.
- Onboarding stages 1, 2 and 4 are still the old screens. Full stages are a post-pitch item.

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

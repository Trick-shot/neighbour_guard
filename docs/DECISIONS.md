# Decisions

Each entry: the decision, why, and what would make us revisit it. Newest first.

## 2026-10-18 · Map keys are build-time config, not `EXPO_PUBLIC_` variables
`app.config.js` reads `GOOGLE_MAPS_ANDROID_KEY` from the environment and puts it in the native
config. **Why:** an `EXPO_PUBLIC_` variable is inlined into the JavaScript bundle and served in the
public manifest; this key belongs in the Android manifest, which only the native build needs. It is
restricted in the Google console to our package name and signing certificate, which is the control
that actually matters — a key in a shipped app is readable either way. **Revisit:** if a screen ever
needs the key at runtime (Places autocomplete, say), that is a separate, separately restricted key.

## 2026-10-18 · Battery optimisation is shown as "check by hand", not guessed
No Android API tells an app whether it is exempt from battery optimisation, and the manufacturer
skins put the setting in different places. **Why:** a check that says "fine" when it does not know
is worse than no check — on life-safety software it invites trust that is not earned. The screen
says it cannot tell, opens the settings list, and names what to choose. **Revisit:** if we ever add
a native module that can read `isIgnoringBatteryOptimizations`.

## 2026-10-18 · The Alarm check screen re-sends the push token every run
It is the only way to know the server really has this phone; there is no endpoint that reads the
token back, and we do not want one (it would hand a token out). **Why:** a token that never reached
the server is invisible otherwise — the phone looks healthy and simply never rings. The endpoint
just overwrites a field, so repeating it is safe, and there is a test for that.

## 2026-10-18 · The home pin is set by moving the map, not by dragging a marker
"Pin your home" keeps the pin fixed in the centre of the screen and moves the map under it.
**Why:** a draggable marker needs a precise press-and-hold with one thumb, and on Android a custom
marker view can swallow the drag and silently leave the pin where it was — and a pin in the wrong
place sends your alerts to the wrong street. Moving the map always registers. **Revisit:** if the
Figma frame turns out to show a dragged marker, match the frame.

## 2026-10-18 · Onboarding asks for location at stage 3, not on the Home map
The permission is requested on its own screen with the reason, immediately before the pin screen.
**Why:** the one-sentence reason is what gets the permission granted, and the pin is the first thing
that actually needs it. A refusal is recoverable (Settings + retry) instead of dead-ending.

## 2026-10-18 · A missing home is shown on the Home map, not forced
If `GET places/me/` returns 404 the Home map shows a "Pin your home" card instead of redirecting.
**Why:** v1 users imported without a pin, and anyone who backs out of onboarding, must be able to
reach the map and fix it later; a forced redirect with no way out is how people get stuck. The
server still refuses an SOS from someone with no home, so nothing is weakened by letting them look.

## 2026-10-18 · Rebuild alongside v1, not in place
v2 lives in new apps (`places`, `alerts`, `chat`) under `/api/v2/`. The v1 API (`main`) stays,
security-patched, until the new app ships. **Why:** the old app keeps working during the rebuild,
and v2 models start clean instead of being migrated in place. **Revisit:** delete `main` once no
installed app calls `/api/main/`.

## 2026-10-18 · One home per user
`ResidenceMember.user` is unique. **Why:** "where do I send this person's SOS from" must have one
answer. **Revisit:** students or workers who split time between two homes.

## 2026-10-18 · The first home in a new neighbourhood is verified automatically
Nobody exists to vouch for it. Later homes need 2 vouches from verified neighbours.
**Revisit:** before public launch, add ID verification as the alternative path.

## 2026-10-18 · Neighbourhoods are circles, created on demand
A new home joins the nearest neighbourhood whose 500 m circle contains it, or founds a new one.
**Why:** no boundary data needed for the pilot. **Revisit:** use mtaa boundaries if available.

## 2026-10-18 · The server owns the SOS countdown
The alert is created `pending` with `send_at = now + 10 s` when the hold ends; a Celery task sends it
at `send_at`, and a beat job every 15 s sends anything overdue. **Why:** a phone snatched or killed
during the countdown still gets its alert out. SMS-channel alerts skip the countdown.

## 2026-10-18 · Duress PIN looks identical to a real PIN on the sender's phone
The sender sees `resolved`; neighbours see the alert still live with `under_duress: true`.

## 2026-10-18 · Approximate areas use a fixed grid (~165 m)
Not random noise, because averaging many noisy answers reveals the real spot.

## 2026-10-18 · Socket auth uses one-time tickets
`POST /api/v2/chat/ticket/` returns a 30 s single-use ticket, so the JWT never appears in a URL
(URLs end up in server logs).

## 2026-10-17 · Product decisions from the redesign
Email login (phone as SMS backup) · 10 s cancel window instead of undo · SOS radius 500 m · verified
neighbours see house numbers, never distances · phone numbers only during a live alert · own chat
messages in a light brand tint · issues have `neighbourhood` or `public` visibility, and only
residents of the issue's area can comment.

# Decisions

Each entry: the decision, why, and what would make us revisit it. Newest first.

## 2026-10-18 · Emergency contacts live in `core`, not a new `accounts` app
The reference called them `accounts`. They belong to a person, not a place or an alert, and `core`
already owns the user, so they are `core.EmergencyContact` and no new app was added.
**Revisit:** if profile skills and medical notes arrive and `core` starts feeling crowded.

## 2026-10-18 · Family is texted on send, never during the countdown
`fan_out` queues the SMS, and only on the first fan-out. **Why:** ten seconds exist so an alert can
be cancelled, and a cancelled alert must not have already frightened someone's mother. Widening the
radius does not text them twice either.

## 2026-10-18 · The inbound SMS webhook needs a shared secret
`POST /api/v2/sms/inbound/` takes `?key=`, checked against `SMS_INBOUND_SECRET`, and refuses
everything with 503 while that setting is empty. **Why:** it is the only endpoint that can raise an
alert with no JWT, Africa's Talking does not sign its callbacks, and the `from` field is just text
in a request body — without a secret, anyone who knew a verified number could raise an alert as
that person. The verified-profile check is the second gate, not the only one. **Revisit:** if
Africa's Talking ever signs callbacks, check the signature instead.

## 2026-10-18 · An SMS carries an 8-character ref, not a UUID
`Alert.sms_ref` holds the first 8 characters of the phone's own `client_id`. **Why:** nobody types
36 characters under threat, and an SMS has no room. When data comes back and the app retries with
the real `client_id`, `create_alert` finds the alert by its ref and adopts it, so one emergency
never becomes two alerts. A ref that belongs to someone else is ignored rather than refused — that
caller still needs an alert of their own, and a test covers it.

## 2026-10-18 · The web app calls the API at a relative `/api`
`web/src/api/client.ts` had `baseURL: "http://127.0.0.1:8000/api"` hardcoded. Django serves the web
app and the API from the same origin, so the base URL is now relative. **Why:** the old value meant
the email-activation page called the *visitor's own* machine, so on a deployed server nobody could
finish signing up — and sign-up is step 2 of the demo. A relative URL also needs no rebuild when
the domain changes. `VITE_API_URL` overrides it for `npm run dev`, which runs on its own port.

## 2026-10-18 · HTTPS settings are behind one `HTTPS` env flag, off by default
`SECURE_SSL_REDIRECT`, secure cookies, HSTS and `SECURE_PROXY_SSL_HEADER` all switch on together
when `HTTPS=True`. **Why:** on a host without a working certificate, `SECURE_SSL_REDIRECT` alone
makes the site redirect to itself forever, and that is a bad thing to discover at a pitch. One flag,
flipped after certbot succeeds, cannot be half-applied. HSTS starts at one hour, with subdomains and
preload off: browsers remember HSTS and there is no quick way back. **Revisit:** raise
`SECURE_HSTS_SECONDS` once the domain has been stable on TLS for a while.

## 2026-10-18 · `CsrfViewMiddleware` is defence in depth, not a fix
It is in `MIDDLEWARE` so `check --deploy` is clean and any future session-authenticated view is
covered by default. It changes nothing today: the admin already wraps each of its own views in
`csrf_protect`, and DRF views are `csrf_exempt`, which is why the JWT API from a phone keeps working
with no CSRF cookie. Three tests in `backend/tests.py` pin both halves of that down. **Why it is
written down:** the first draft of this change claimed it closed a hole in the admin. It did not —
the test written to prove it passed with the middleware removed. Keep the claim honest.

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

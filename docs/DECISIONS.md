# Decisions

Each entry: the decision, why, and what would make us revisit it. Newest first.

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

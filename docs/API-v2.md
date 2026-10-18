# API v2

Base URL: `https://<host>/api/v2/`. Auth: header `Authorization: JWT <access token>` (from
`POST /api/auth/jwt/create/`). Errors are `{"detail": "...", "code": "..."}` where a code exists.

Status meanings used everywhere: `401` not logged in · `403` logged in but not allowed ·
`404` does not exist **or** you may not know it exists · `409` the state changed first (too late to
cancel, already sent).

## Places

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `places/me/` | | My home, incl. my own `lat`/`lng`, `house_number`, `street`, `district`, `directions`, `status` (`pending`/`verified`), `verified_at`, `vouches`, `vouches_needed`, `neighbourhood` |
| POST | `places/me/` | `house_number, street, lat, lng, district?, directions?` | 201 my home. 409 if I already have one |
| PATCH | `places/me/` | `house_number?, street?, directions?` | My home. The pin cannot move here |
| GET | `places/areas/` | | `{neighbourhood, areas: [{lat, lng, homes}]}` — grid cells, never exact homes |
| GET | `places/neighbours/` | | `[{user_id, full_name, home}]`; `home` has `house_number` only if I am verified |
| POST | `places/residences/<id>/vouch/` | | `{status, vouches}`. 403 unless I am a verified neighbour in the same area |
| GET | `places/household/` | | The people in my own home: `[{id, name, age_group, needs_help}]` |
| POST | `places/household/` | `name, age_group?, needs_help?` | 201 the person. Max 12 per home. The home comes from my membership, never the body |
| PATCH | `places/household/<id>/` | `name?, age_group?, needs_help?` | The person. 404 for another home's household |
| DELETE | `places/household/<id>/` | | 204. 404 for another home's household |

## Alerts (SOS)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `alerts/` | `client_id (uuid made on the phone), type, message?` | 201 pending alert with `seconds_left`; repeat `client_id` → 200 same alert |
| GET | `alerts/` | | Live alerts around me |
| GET | `alerts/<id>/` | | Alert. 404 if I am not the sender or a neighbour |
| POST | `alerts/<id>/type/` | `type` | Changes the type during the countdown. 409 once sent |
| POST | `alerts/<id>/cancel/` | | Cancelled alert. 409 if already sent |
| POST | `alerts/<id>/send-now/` | | Sent alert |
| POST | `alerts/<id>/respond/` | `state (seen/coming/arrived/cant), eta_min?` | Alert with `responses` |
| POST | `alerts/<id>/resolve/` | `pin?` | Alert shown as `resolved` to the sender (also under duress) |
| GET/PUT | `alerts/safety-pin/` | `pin, duress_pin` (4–8 digits, different) | `{is_set}` |
| POST | `alerts/push-token/` | `token` (Expo push token) | `{saved: true}` |

Alert types: `emergency, robbery, fire, medical, suspicious, other`.
Statuses: `pending → sent → resolved`, or `pending → cancelled`.

What the alert's `home` contains:

- Sender, and neighbours while the alert is `sent`: `house_number, street, directions, lat, lng,
  household[]`, plus `sender_phone` if verified.
- Neighbours before it is sent or after it ends: `house_number, street, status` only.
- The sender never sees `under_duress`, and sees `resolved` after a duress PIN.
- The sender's view also has `recipients`: how many neighbours the alert reaches (shown in the countdown).
- `responses[].phone` is the responder's verified phone, only while the alert is live and only for people who may see it exactly.

Push payload the phone receives: `data = {kind: "sos", alert_id, type}`, Android `channelId: "sos"`,
`sound: "alarm.mp3"`, iOS `interruptionLevel: "time-sensitive"`.

## Chat

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `chat/conversations/` | | My conversations, newest first, with `last_message` and `unread` |
| POST | `chat/conversations/` | `user_id` | Direct conversation (reused if it exists) |
| GET | `chat/conversations/<id>/messages/` | `?before=<id>` or `?after=<id>` | Up to 50 messages, oldest first. 404 if not a participant |
| POST | `chat/ticket/` | | `{ticket, expires_in: 30}` one-time ticket for the socket |

Socket: `wss://<host>/ws/v2/chat/<conversation_id>/?ticket=<ticket>` (get a fresh ticket for every
connect). Close code `4403` = not allowed.

Send: `{type: "message", client_id, body}`, `{type: "read"}`, `{type: "typing"}`.
Receive: `{type: "message", id, client_id, kind, body, sender_id, sender_name, alert_id, created_at}`,
`{type: "read", user_id}`, `{type: "typing", user_id}`,
`{type: "alert_update", alert_id, status, type, under_duress, responders: [{user_id, name, state, eta_min}]}`.

Every neighbourhood has one group conversation; members join it automatically when they add their
home. A sent SOS posts a `kind: "alert"` message there.

## Auth and phone (core)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/users/` | Sign up (email, full_name, password). Sends the activation email |
| POST | `/api/auth/email-code/` | `{email}` — emails a 6-digit sign-in code. Always 200 (does not reveal accounts). 10 per 10 min per IP |
| POST | `/api/auth/email-code/verify/` | `{email, code}` → `{access, refresh}`. 5 wrong tries kill the code |
| POST | `/api/auth/jwt/create/` | `{email, password}` → `{access, refresh}` |
| POST | `/api/auth/jwt/refresh/` | `{refresh}` → `{access}` |
| POST | `/api/auth/send-otp/` | **Logged in.** `{phone_number}`. Max 3 per 10 min |
| POST | `/api/auth/verify-otp/` | **Logged in.** `{otp}`. Sets the profile phone from the OTP record |
| GET | `/api/auth/users/me/` | **Logged in.** Me: `id, email, full_name, phone_number, is_phone_verified` |
| PATCH | `/api/auth/users/me/` | **Logged in.** `full_name` only. Email and phone are read-only here: the phone reaches the profile through `verify-otp` and nowhere else |

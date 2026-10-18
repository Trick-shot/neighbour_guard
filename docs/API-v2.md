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

## Emergency contacts

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `contacts/` | | My own contacts: `[{id, name, relation, phone}]` |
| POST | `contacts/` | `name, relation?, phone` | 201 the contact. Max 5. The owner comes from the token |
| PATCH | `contacts/<id>/` | `name?, relation?, phone?` | The contact. 404 for someone else's |
| DELETE | `contacts/<id>/` | | 204. 404 for someone else's |

They are texted when an alert reaches `sent`, never during the countdown, and never again when the
radius widens.

## SMS fallback (no data connection)

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `sms/inbound/?key=<SMS_INBOUND_SECRET>` | Africa's Talking fields: `from, to, text, date, id` | `{received: true, alert_id?}` |

The phone shows the user a prefilled SMS: `SOS <type> <ref>`, where `ref` is the first 8 characters
of the `client_id` it already made. The webhook then:

- refuses everything unless `key` matches `SMS_INBOUND_SECRET` (403), and refuses everything if that
  setting is empty (503) — Africa's Talking does not sign callbacks, and this endpoint can raise an
  alert with no login;
- requires `from` to match a **verified** profile; anything else gets a plain 200 and raises nothing,
  so the gateway stops retrying;
- raises an `sms` channel alert, which skips the countdown (the person chose to send by texting);
- stores the `ref`, so when the app gets data back and retries `POST alerts/` with the full
  `client_id`, `create_alert` adopts that alert instead of raising a second one. A `ref` belonging to
  another user is ignored, not refused.

An unparseable message is still an emergency: someone texting this is not in a position to get the
wording right.

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

## Issues

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `issues/?scope=mine` | | Issues of my own neighbourhood (default) |
| GET | `issues/?scope=others` | | `public` issues of other neighbourhoods, nearest to **my neighbourhood's centre** first, within 5 km |
| POST | `issues/` | `title, description?, category?, severity?, visibility?, lat?, lng?` | 201. The neighbourhood comes from my home; 403 if I have none |
| GET | `issues/<id>/` | | The issue. 404 if I may not know it exists |
| PATCH | `issues/<id>/` | `status` | Only the status, and only for the reporter (or staff). Followers are pushed once |
| POST/DELETE | `issues/<id>/support/` | | `{support_count, i_support}`. 403 unless my home is verified |
| POST/DELETE | `issues/<id>/follow/` | | `{i_follow}`. 403 unless my home is verified |
| GET | `issues/<id>/comments/` | | Comments. Readable by anyone who can see the issue |
| POST | `issues/<id>/comments/` | `body` | 201. **403 unless I am a verified resident of the issue's own area** |
| POST | `issues/<id>/share/` | | 201 `{conversation_id, message_id}` — an issue card in my neighbourhood group. 403 unless I am a verified resident of the issue's area |

Categories: `security, lighting, roads, water, waste, other`. Severity: `low, moderate, high,
critical`. Status: `open, in_progress, resolved`. Visibility: `neighbourhood, public`.

Who sees and does what:

| Who | Sees | Support / follow | Comment | Share |
| --- | --- | --- | --- | --- |
| Verified resident of the issue's area | All of its issues | Yes | Yes | Yes |
| Verified resident of another area | `public` issues only | Yes | No | No |
| Unverified member | Own area's issues, **without the reporter's name** | No | No | No |
| No home at all | `public` issues only | No | No | No |

The list queryset already excludes what the caller may not see, so an issue they are not allowed to
know about cannot appear in a list, a count or a 403 message. `python manage.py import_v1_issues`
copies `main.Issue` across, taking the neighbourhood from the reporter's residence; issues whose
reporter has no home go to an `unassigned` neighbourhood only staff can see.

## Chat

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `chat/conversations/` | | My conversations, newest first, with `last_message` and `unread` |
| POST | `chat/conversations/` | `user_id` | Direct conversation (reused if it exists) |
| GET | `chat/conversations/<id>/messages/` | `?before=<id>` or `?after=<id>` | Up to 50 messages, oldest first. 404 if not a participant |
| POST | `chat/ticket/` | | `{ticket, expires_in: 30}` one-time ticket for the socket |
| POST | `chat/attachments/` | multipart `file`, `kind` (`voice/photo/video/file`), `duration_s?` | 201 `{id, url, mime, size, duration_s}` |

Attachments are uploaded first and sent second: `{type: "message", kind, attachment_id, client_id}`
over the socket. The socket only accepts an attachment that is the caller's own, unused, and of the
kind they claim; anything else comes back as `{type: "error"}`.

`mime` is **sniffed from the bytes**, never taken from the client's `Content-Type` — an executable
labelled `image/jpeg` is refused. Limits: photo 10 MB (`jpeg/png/webp`), voice 10 MB and 5 minutes
(`mp4/mpeg/aac/ogg/wav`), video 50 MB (`mp4/quicktime`), documents 20 MB (`pdf/txt/doc/docx`).
A nightly task deletes any attachment that never reached a message after 24 h.

Socket: `wss://<host>/ws/v2/chat/<conversation_id>/?ticket=<ticket>` (get a fresh ticket for every
connect). Close code `4403` = not allowed.

Send: `{type: "message", client_id, body}`, `{type: "read"}`, `{type: "typing"}`.
Receive: `{type: "message", id, client_id, kind, body, sender_id, sender_name, alert_id, issue_id,
attachment, created_at}` (`attachment` is `null` for text, else `{id, url, mime, size, duration_s}`),
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

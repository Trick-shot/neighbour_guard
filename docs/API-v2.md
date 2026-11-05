# API v2

Base URL: `https://<host>/api/v2/`. Auth: header `Authorization: JWT <access token>` (from
`POST /api/auth/jwt/create/`). Errors are `{"detail": "...", "code": "..."}` where a code exists.

Status meanings used everywhere: `401` not logged in · `403` logged in but not allowed ·
`404` does not exist **or** you may not know it exists · `409` the state changed first (too late to
cancel, already sent).

## Places

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `places/neighbours/<user_id>/` | | One neighbour, same neighbourhood only (else 404): `{full_name, photo_url, home, vouched_by[], i_vouched, skills[]}`. Never household, phone or pin |
| GET | `places/me/` | | My home, incl. my own `lat`/`lng`, `house_number`, `street`, `district`, `directions`, `status` (`pending`/`verified`), `verified_at`, `vouches`, `vouches_needed`, `neighbourhood`, `gate_photo_url`, `vouchers[{name, at}]`, `map_visibility` (`neighbours`/`nobody`), `members[{user_id, full_name, role}]` (people in my home with the app) |
| POST | `places/me/` | `house_number, street, lat, lng, district?, directions?` | 201 my home. 409 if I already have one |
| PATCH | `places/me/` | `house_number?, street?, directions?, map_visibility?` | My home. The pin cannot move here. `nobody` leaves my home out of the Home-map area counts |
| POST | `places/me/gate-photo/` | multipart `photo` (JPEG/PNG/WebP, 5 MB) | My home with `gate_photo_url`. 404 without a home. Shown to live-alert responders only |
| GET | `places/areas/` | | `{neighbourhood, areas: [{lat, lng, homes}]}` — grid cells, never exact homes |
| GET | `places/neighbours/` | | `[{user_id, full_name, home}]`; `home` has `house_number` only if I am verified |
| POST | `places/residences/<id>/vouch/` | | `{status, vouches}`. 403 unless I am a verified neighbour in the same area |
| GET | `places/household/` | | The people in my own home: `[{id, name, relation, age_group, needs_help}]` |
| POST | `places/household/` | `name, relation?, age_group?, needs_help?` | 201 the person. Max 12 per home. The home comes from my membership, never the body |
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
radius widens. If `text_contacts_on_resolve` is on (default), they get an all-clear when it is
resolved — never after the duress PIN, which leaves the alert live.

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
| GET | `alerts/history/` | | `{sent_count, helped_count, avg_first_response_s, sent[], helped[]}`. Rows: `id, type, status, message, sent_at, resolved_at, house_number, street, sender_name (helped only), responded`. Cancelled alerts are not listed. No coordinates |
| POST | `alerts/witness/` | **No account needed.** multipart `client_id, type, lat, lng, street?, description?, photo?` | 201 `{id, type, homes_alerted, radius_m, created_at}`; repeat `client_id` → 200 same. 3/hour per IP. Pushes homes within 300 m (Celery) |
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
| POST | `issues/<id>/share/` | `message?` (≤ 500 chars) | 201 `{conversation_id, message_id}` — the optional message as a text, then an issue card, in my neighbourhood group. 403 unless I am a verified resident of the issue's area |
| POST | `issues/<id>/media/` | multipart `photo` | 201 `{id, image}`. Reporter only, at most 4 photos; the bytes are sniffed (JPEG/PNG/WebP only) |

Categories: `security, lighting, roads, water, waste, noise, other` (the app does not offer `security`: danger now is an SOS). Severity: `low, moderate, high,
critical`. Status: `open, in_progress, resolved`. Visibility: `neighbourhood, public`. Each issue also returns `street` (the reporter's street name, never the house) and `media[].image` as an absolute URL.

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

## Security providers and pooled plans

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `providers/` | | **Verified** providers covering my neighbourhood: `id, name, licence_no, verified, rating, review_count, response_min, plans[{id, kind, name, description, price_tsh, min_houses, features[]}]`. `coverage` is never returned |
| POST | `providers/plans/<id>/join/` | | 201 my pool. Free. 403 unless my home is verified and the provider covers my area |
| DELETE | `providers/plans/<id>/join/` | | 204. A member who has already paid is not removed: they stay covered to `paid_until` and `renews` becomes false |
| GET | `providers/subscriptions/` | | The pools my home is in: `joined`, `paid`, `needed`, `my_status`, `my_payment_id`, `provider_id`, `houses[{house_number, first_name, status, is_me}]` (verified viewers only), `me{paid_until, renews, pay_phone (masked), receipts[{at, amount_tsh, ref}]}`, `on_duty{name, shift, phone}` (only a paying member of an active plan) |
| POST | `providers/subscriptions/<id>/pay/` | | 201 a new M-Pesa request for my share, or 200 the one sent in the last minute (a double tap is one prompt). 409 before the pool is full or if I am not in it |
| GET | `providers/payments/<id>/` | | `{id, amount_tsh, status, created_at, settled_at}`. Someone else's is a 404 |
| POST | `providers/mpesa/callback/?key=<MPESA_CALLBACK_SECRET>` | gateway callback body | `{received: true}`. 403 wrong key, 503 if the secret is unset |

How a pool works:

1. Houses join for free. Nobody is charged while `joined < plan.min_houses`.
2. When the pool fills, each member moves `joined → invited` by a conditional update, and only the
   update that wins queues that member's payment request — so no house is ever asked twice.
3. The customer approves on their own phone. **We never see a PIN**, and there is no field for one
   anywhere in the codebase.
4. **Only the gateway's callback marks a payment paid.** The app polls `payments/<id>/`; nothing it
   sends can change a status. The receipt number is unique in the database and the row only leaves
   `pending` via a conditional update, so a replayed callback changes nothing. Every callback is
   stored whole in `raw_callback`.
5. Coverage activates once `paid >= min_houses`, by a conditional update — two payments landing in
   the same second activate it once, so a provider is never told to start twice.
6. A nightly job lapses a subscription whose paid-up members fall below the minimum.

With an active pool, an SOS from a member's home also creates a `Dispatch` and texts the provider.
The sender sees it in `alert_summary.guards` as `{provider, status, eta_min, name}` — `requested`
means a guard was asked, not that one is coming; only the provider moves it on.

## Auth and phone (core)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/users/` | Sign up (email, full_name, password). Sends the activation email |
| POST | `/api/auth/email-code/` | `{email}` — emails a 6-digit code that signs in **or signs up**. Always the same 200 (does not reveal accounts). 10 per 10 min per IP |
| POST | `/api/auth/email-code/sms/` | `{email}` — the same code, texted to the account's **verified** phone (Celery). Same 200 either way |
| POST | `/api/auth/email-code/verify/` | `{email, code}` → `{access, refresh, is_new}`. Creates the account when the email is new. 5 wrong tries kill the code |
| GET / PUT | `/api/auth/users/me/safety/` | **Logged in.** `{skills[], conditions, allergies, blood_type}`. Skills from a fixed list; notes encrypted at rest |
| POST | `/api/auth/users/me/photo/` | **Logged in.** multipart `photo` (JPEG/PNG/WebP, 5 MB, bytes sniffed) → `{photo_url}`. DELETE removes it |
| POST | `/api/auth/jwt/create/` | `{email, password}` → `{access, refresh}` |
| POST | `/api/auth/jwt/refresh/` | `{refresh}` → `{access}` |
| POST | `/api/auth/send-otp/` | **Logged in.** `{phone_number}`. Max 3 per 10 min |
| POST | `/api/auth/verify-otp/` | **Logged in.** `{otp}`. Sets the profile phone from the OTP record |
| GET / PATCH | `/api/auth/users/me/` | **Logged in.** Me: `id, email, full_name, phone_number, is_phone_verified, photo_url, text_contacts_on_resolve, routine_push, quiet_from, quiet_to`. Writable: `full_name`, the last four. `routine_push` off or quiet hours mute issue/message pushes on the server; an SOS ignores both |
| GET | `/api/auth/users/me/export/` | **Logged in.** Everything kept about me as JSON (medical notes decrypted for me only) |
| POST | `/api/auth/users/me/delete/` | **Logged in.** `{confirm: "DELETE"}` → 204. Switches the account off and wipes personal data; rows others rely on stay as "Former neighbour" |
| PATCH | `/api/auth/users/me/` | **Logged in.** `full_name` only. Email and phone are read-only here: the phone reaches the profile through `verify-otp` and nowhere else |


## Notifications

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `notifications/?kind=alerts` | | `{unread, items[{id, kind (alert/vouch/issue/provider/welcome), title, body, at, unread, alert_id?, live?, issue_id?, residence_id?}]}`, newest first, last 30 days. Built from existing data; my own alerts are never included |
| POST | `notifications/seen/` | | 204. Everything up to now is read |

Alert detail now also carries `dispatches[{provider, status, guard_name, eta_min, guard_phone}]` (phone only once accepted) and `sender_medical: {skills, conditions, allergies, blood_type}` for
people allowed to see the alert exactly, while it is live; `null` otherwise.

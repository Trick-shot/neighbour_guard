# Backend reference v2

The agreed design for the backend. Human-readable copy with diagrams:
https://claude.ai/code/artifact/ecd570e3-5150-4faf-b751-4c7775e2e150 (Erick's account).
This file is the copy Claude Code works from; keep both in step when a decision changes.

Sections marked **Built** exist on `rebuild/v2`; **To build** sections are the spec for later steps.

## Core principles

1. **The server decides who you are and where you live.** Identity from the JWT, home from
   `places.services.residence_of(user)`. Never read `email`, `user_id`, `neighbourhood_id` or
   permission-relevant coordinates from the request body.
2. **The app hides, the server forbids.** Every rule is also in a permission, view or queryset.
3. **Every write that can repeat carries an idempotency key** (`client_id`, UUID made on the phone).
4. **Slow work leaves the request.** Push, SMS and payment callbacks run in Celery.
5. **Exact location is need-to-know.** Home coordinates leave the server only for a live alert's
   sender and responders. Lists and maps get approximate areas.
6. **State changes are conditional updates** (`filter(status=X).update(status=Y)`, check the count).
7. **Every rule has a test** proving the forbidden path is refused.

## Places — Built

Models: `Neighbourhood(name, slug, centre_lat, centre_lng, radius_m=500)`,
`Residence(neighbourhood, house_number, street, district, directions, lat, lng, status, verified_at)`,
`ResidenceMember(residence, user unique, role)`, `HouseholdPerson(residence, name, age_group,
needs_help)`, `Vouch(residence, voucher)`.

- A new home joins the nearest neighbourhood whose circle contains it, or founds one.
- The first home of a neighbourhood is verified; others need 2 vouches from verified neighbours.
- Joining a neighbourhood adds the user to its group chat.
- Neighbour search: bounding-box query on indexed `lat/lng`, then exact haversine in Python.
- One serializer per audience: `MyResidenceSerializer` (own home), `ResidenceNeighbourSerializer`
  (house number + street), `ResidencePublicSerializer` (street), `ResidenceResponderSerializer`
  (exact pin, directions, household — live alerts only).

**To build:** household CRUD endpoints, emergency contacts (`accounts`: name, relation, phone, max 5,
texted on SOS), skills and encrypted medical notes on the profile.

## SOS countdown — Built

States: `pending → sent → resolved`, or `pending → cancelled`. Only the move into `sent` notifies
anyone. SMS-channel alerts are created and sent at once (no countdown).

1. `POST /alerts/` creates `pending` with `send_at = now + 10 s` and schedules `send_alert` at
   `send_at` (after commit). A beat job every 15 s sends overdue pending alerts.
2. `claim_and_send` does one conditional update `pending → sent`; only the winner fans out.
3. Fan-out: Expo push (channel `sos`) to users within 500 m, posts a live alert card in the
   neighbourhood group, schedules `widen_if_no_response` (after 120 s with nobody coming, notify
   homes up to 1 000 m once).
4. Responses: `seen / coming / arrived / cant`, only by neighbours; each update broadcasts
   `alert_update` to every alert card.
5. Resolve: sender only. With a SafetyPin set, the real PIN resolves; the duress PIN keeps the alert
   live with `under_duress`, and the sender's view shows `resolved`.

**To build:** SMS to emergency contacts on send; `POST /api/v2/sms/inbound/` (Africa's Talking
webhook; sender number must match a verified profile; the message's `ref` is the alert `client_id`
short code, so a later app retry returns the same alert); provider dispatch.

## Chat — Built (text + alert cards)

`Conversation(kind direct/group, name, neighbourhood)`, `Participant(conversation, user,
last_read_at)`, `Message(conversation, sender, client_id, kind, body, alert)`.

- Socket `ws/v2/chat/<id>/?ticket=` — ticket from `POST /chat/ticket/` (30 s, one use). Rejects
  non-participants with close code 4403.
- Messages are idempotent on `(sender, client_id)`.
- Alert cards store only `alert_id`; live state arrives as `alert_update` events.

**To build — media:** `POST /chat/attachments/` (multipart) → `{id, url, mime, size, duration_s}`,
then send `{type: message, kind: voice|photo|video|file, attachment_id, client_id}` over the socket.
Limits: images 10 MB, voice 5 min, video 50 MB, documents 20 MB; check the real file type on the
server. A nightly task deletes attachments never used in a message after 24 h.
**To build — issue cards:** `kind: issue` with `issue_id`, posted by `POST /issues/<id>/share/`.

## Issues — To build (after the pitch)

New `issues` app replacing `main.Issue`:
`Issue(neighbourhood (set by server), created_by, title, description, category, severity, status
open/in_progress/resolved, visibility neighbourhood/public, lat, lng)`, `IssueMedia`,
`IssueComment`, `IssueSupport(issue, user)`, `IssueFollow(issue, user)`.

| Who | Sees | Supports / follows | Comments | Shares to a group |
| --- | --- | --- | --- | --- |
| Verified resident of the issue's area | All its issues | Yes | Yes | Yes, own area's groups |
| Verified resident of another area | Public issues only | Yes | No | No |
| Unverified member | Own area's issues, street only | No | No | No |

- `GET /issues/?scope=mine` → own neighbourhood. `?scope=others` → public issues of other
  neighbourhoods, nearest to **my neighbourhood's centre** first, within 5 km.
- `get_queryset` must already exclude what the user cannot see (not only `retrieve`).
- Comment permission class `IsResidentOfIssueArea`. Status changes notify followers.
- Migration: copy `main.Issue` with neighbourhood from the reporter's residence; issues whose
  reporter has no residence go to an `unassigned` neighbourhood visible to staff only.

## Security providers and payments — To build (after the pitch)

`Provider(name, licence_no, verified, rating, coverage M2M neighbourhoods)`,
`Plan(provider, kind street/house, price_tsh, min_houses)` (the provider sets the minimum),
`Subscription(plan, street or residence, status gathering/active/lapsed/cancelled, starts_at)`,
`SubscriptionMember(subscription, residence, status joined/invited/paid)`,
`Payment(member, amount, mpesa_ref unique, status, raw_callback)`,
`Dispatch(alert, provider, guard, status, eta_min)`.

- Houses join a street pool for free; when joined members reach `min_houses`, each gets an M-Pesa
  STK push. Only a verified payment callback marks a member paid. Coverage is active while paid
  members ≥ `min_houses`; a nightly job lapses it otherwise.
- The app polls `GET /payments/<id>/`; it never decides "paid" itself.
- Store every callback raw, unique on `mpesa_ref`. Never ask for or log an M-Pesa PIN.
- Activation must happen once even if two payments land in the same second (conditional update on
  the subscription status).
- On an SOS in a covered street, create a `Dispatch` and notify the on-duty guard; status and ETA
  reach the sender as `alert_update`.

## Privacy rules (server-enforced)

| Data | Who gets it | When |
| --- | --- | --- |
| Exact home pin | The sender and responders of a live alert from that home | While `sent` |
| Approximate area + house count | Neighbourhood members | Always (Home map) |
| House number + street | Verified neighbours | Always |
| Street only | Unverified members | Always |
| Phone number | Responders and the sender | During a live alert only |
| Medical notes | Responders | During the sender's own alert |

# Roadmap

The ordered backlog. Work top to bottom. When an item is done, tick it here, add an entry to
`docs/PROGRESS.md`, and move to the next. Add new items only under "Inbox" and let Erick order them.

Pitch: DIC 2026, 24–25 Oct 2026 (Yeosu). Concept note due 20 Oct.

## Now — before the pitch (24 Oct)

- [ ] **Two-phone test of the demo path** (see the test table in PROGRESS.md). Fix every failure.
      Build both phones with `npx expo prebuild --clean` first — the `android/` folder on the
      machine is from an older config and has neither the notification permissions nor the Maps key.
- [ ] Replace `neighbour-mobile/assets/illustrations/signin.png` with the Figma export of node
      `1631:1422` (Sign in illustration, 3x PNG).
- [x] Google Maps Android key via `app.config.js` reading an env var (never committed).
      *(2026-10-18. Put the key in `.env` — see `.env.example` — then `npx expo prebuild --clean`.)*
- [x] Onboarding v2, minimum for the demo: after sign-up, a "Pin your home" screen that calls
      `POST /api/v2/places/me/` (Figma page "Android · 01", frames "Onboarding — location" and
      "Onboarding — pin home"). Remove the old v1 residence calls from onboarding.
      *(2026-10-18. Also fixed: sign-up never kept its JWT. Needs `prebuild --clean` — new permissions.)*
- [x] "Alarm check" screen (Figma page "Android · 09", "System — alarms can’t reach you"): checks
      notification permission, the `sos` channel and battery optimisation; linked from Home when
      something is off. *(2026-10-18. Also sends a test alarm on the real channel.)*
- [ ] Deploy `rebuild/v2` to the server: Redis, `celery worker` and `celery beat` systemd services,
      `migrate`, `import_v1_residences`. Update `docs/DEPLOY.md` with the exact steps used.
      *(2026-10-18: `docs/DEPLOY.md` and `deploy/` are written and ready to follow, but nothing has
      been run on the server. Generate a fresh `SECRET_KEY` there first — the current one is weak
      and SimpleJWT signs tokens with it. Correct the runbook as you go.)*
- [ ] Rehearse the demo three times on the deployed server with two phones.

## Next — after the pitch

All eight buildable items were done on 2026-10-19 (see PROGRESS). **None of it has run on a phone
or a server**, so treat every one as "written and tested, not yet seen working".

- [x] Onboarding v2 in full (stages: Account → Verify → Location → Safety; Figma page 01).
- [x] Profile v2 + sub-screens (Figma page 07), safety PIN and duress PIN setup.
- [x] Emergency contacts (backend model + SMS on SOS) and SMS fallback inbound webhook.
- [x] Issues v2: neighbourhood scope, visibility (`neighbourhood` / `public`), follow, support,
      comment rule, share to a group (backend reference "Issues"; Figma page 06).
- [x] Chat media: attachments upload, voice notes, photo, video, documents (Figma page 05).
- [x] Neighbours & groups screens, vouching UI (Figma page 04).
- [x] Security providers, pooled street plans, M-Pesa, guard dispatch (Figma page 08).
      *Needs Vodacom TZ credentials before it can be switched on — see DECISIONS.*
- [x] System states: offline SMS send, empty, loading, error (Figma page 09).
- [ ] Retire the v1 API (`main/`) once no installed app calls `/api/main/`.
      *App side done: nothing in `neighbour-mobile` calls `/api/main/` any more. What is left is
      Erick's call — check the server logs for old installs, then delete `main/`.*
- [ ] iOS Critical Alerts entitlement approved and wired.
      *Needs Apple. The server already sends `interruptionLevel: time-sensitive`; file the request.*

## Inbox

(New ideas go here, unordered, until Erick prioritises them.)

- Expo's `app-example/` scaffold folder is dead weight in the repo — delete it some time.
- Profile photos: the v1 upload screen is gone and v2 has no replacement. Avatars are initials
  everywhere. Decide whether a photo is worth an endpoint.
- Profile skills and encrypted medical notes are still "to build" in the backend reference; no
  roadmap item covers them yet.
- `alerts/tests/test_alerts.py`: `CountdownExtrasTests` subclasses `AlertApiTests`, so every parent
  test runs twice. Harmless, but it inflates the test count — split the shared `setUp` into a mixin.
- `IssueMedia` has a model and a serializer but no upload endpoint: issues are text-only for now.
- A `Dispatch` can only be moved on by staff in the admin. A provider-facing way to accept a
  dispatch and give an ETA is the obvious next piece of that feature.
- `providers/mpesa.py` needs its endpoint and field names confirmed against Vodacom TZ credentials.

*(Resolved from this list on 19 Oct: the v1 pin-mover screen, the orphaned addPhoto route, and the
missing onboarding Safety stage.)*
- Profile v2 should also link the Alarm check screen (today only Home does, and only when a check
  is already failing).
- `alerts/tests/test_alerts.py`: `CountdownExtrasTests` subclasses `AlertApiTests`, so every parent
  test runs twice. Harmless, but it inflates the test count — split the shared `setUp` into a mixin
  some time.

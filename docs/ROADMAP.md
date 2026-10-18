# Roadmap

The ordered backlog. Work top to bottom. When an item is done, tick it here, add an entry to
`docs/PROGRESS.md`, and move to the next. Add new items only under "Inbox" and let Erick order them.

Pitch: DIC 2026, 24–25 Oct 2026 (Yeosu). Concept note due 20 Oct.

## Now — before the pitch (24 Oct)

- [ ] **Two-phone test of the demo path** (see the test table in PROGRESS.md). Fix every failure.
- [ ] Replace `neighbour-mobile/assets/illustrations/signin.png` with the Figma export of node
      `1631:1422` (Sign in illustration, 3x PNG).
- [ ] Google Maps Android key via `app.config.js` reading an env var (never committed).
- [ ] Onboarding v2, minimum for the demo: after sign-up, a "Pin your home" screen that calls
      `POST /api/v2/places/me/` (Figma page "Android · 01", frames "Onboarding — location" and
      "Onboarding — pin home"). Remove the old v1 residence calls from onboarding.
- [ ] "Alarm check" screen (Figma page "Android · 09", "System — alarms can’t reach you"): checks
      notification permission, the `sos` channel and battery optimisation; linked from Home when
      something is off.
- [ ] Deploy `rebuild/v2` to the server: Redis, `celery worker` and `celery beat` systemd services,
      `migrate`, `import_v1_residences`. Update `docs/DEPLOY.md` with the exact steps used.
- [ ] Rehearse the demo three times on the deployed server with two phones.

## Next — after the pitch

- [ ] Onboarding v2 in full (stages: Account → Verify → Location → Safety; Figma page 01).
- [ ] Profile v2 + sub-screens (Figma page 07), safety PIN and duress PIN setup.
- [ ] Emergency contacts (backend model + SMS on SOS) and SMS fallback inbound webhook.
- [ ] Issues v2: neighbourhood scope, visibility (`neighbourhood` / `public`), follow, support,
      comment rule, share to a group (backend reference "Issues"; Figma page 06).
- [ ] Chat media: attachments upload, voice notes, photo, video, documents (Figma page 05).
- [ ] Neighbours & groups screens, vouching UI (Figma page 04).
- [ ] Security providers, pooled street plans, M-Pesa, guard dispatch (Figma page 08).
- [ ] System states: offline SMS send, empty, loading, error (Figma page 09).
- [ ] Retire the v1 API (`main/`) once no installed app calls `/api/main/`.
- [ ] iOS Critical Alerts entitlement approved and wired.

## Inbox

(New ideas go here, unordered, until Erick prioritises them.)

# Frontend reference v2

The agreed design for `neighbour-mobile/`. Screens are in Figma file `EuAEWkdGnn8S6GhHpEu65j`
(pages "Android · 01–09" and "iOS · 01–09"). Human-readable copy:
https://claude.ai/code/artifact/ecd570e3-5150-4faf-b751-4c7775e2e150 (Frontend tab).

## Current state (commit 5754832) and known problems

Expo SDK 54, Expo Router, apisauce, SecureStore, Formik + Yup, react-native-maps, bottom-sheet,
expo-av, expo-notifications.

| Where | Problem | Effect |
| --- | --- | --- |
| `app/(tabs)/index.tsx` | Alarm starts from `addNotificationReceivedListener` (app open only) | Locked phones get no alarm |
| `app.json` | `expo-notifications` plugin listed twice; second has `sounds: []` | Alarm sound may not be bundled |
| `hooks/useWebSocket.ts` | `onclose` always reconnects, even after unmount | Background reconnect loop |
| `api/neighbours.ts`, `api/stats.ts` | Call endpoints the backend does not have | Screens fail silently |
| `api/client.ts` | No 401 handling; refresh token unused | Logged out every day |
| everywhere | 119 raw hex colours; `console.log` of tokens and messages | Inconsistent UI; data in logs |

## Foundations (build first)

- `theme/`: `colors.ts` (semantic names mirroring the Figma variables: `bg.page`, `bg.subtle`,
  `surface`, `brand`, `danger`, `text.primary`, `text.secondary`, `border`, `alert.*`; light + dark),
  `type.ts` (Display/SOS, Title 1–3, Headline, Body, Callout, Subhead, Footnote, Caption, Button),
  `spacing.ts` (4/8/12/16/20/24/32), `radius.ts` (8/12/16/20/pill). No hex or raw font size outside
  `theme/`.
- Shared components: `Button` (Primary/Danger/Secondary/Text, L/M, loading), `ListRow` (with optional
  value), `Avatar` (initials), `TabBarSOS` (custom tab bar with the centre SOS dock), `StatusCompact`,
  `ChatBubble` (`kind` prop; own messages light brand tint with brand outline), `AlertCard`,
  `IssueCard`, `StageProgress`, `Glass` (iOS `expo-blur`, plain surface on Android).
- Folders: `app/` (routes only) · `features/<area>/` (auth, home, sos, chat, issues, profile,
  providers) · `components/` · `theme/` · `lib/` (api client, socket, notifications, storage).

## Screen map (demo path first)

| # | Figma screen | Route | Endpoints |
| --- | --- | --- | --- |
| 1 | Sign in — email, code | `authentication/login` | `/api/auth/jwt/create/` |
| 2 | Home | `(tabs)/index` | `places/me`, `places/areas`, `alerts/` |
| 3 | SOS — hold, slide to a type | `sos/hold` (modal) | none until release |
| 4 | SOS — sending in 10 s | `sos/countdown` | `POST alerts/`, `cancel`, `send-now` |
| 5 | SOS — help on the way | `sos/live` | `alerts/<id>/`, socket `alert_update` |
| 6 | Neighbour — alarm, on the way | `alert/[id]` | `alerts/<id>/respond/` |
| 7 | Group chat with alert card | `chat/[id]` | `chat/conversations/…`, socket |
| 8 | Onboarding stages | `authentication/*` | `places/me`, OTP |
| 9 | Issues (mine / other areas, detail, report with visibility) | `(tabs)/issues/*` | issues v2 (to build) |
| 10 | Chat media, voice, attach | `chat/[id]` | attachments (to build) |
| 11 | Profile v2 + sub-screens | `(tabs)/profile/*` | profile, safety-pin, household |
| 12 | Security providers | `providers/*` | providers (to build) |
| 13 | System states (offline SMS, alarm check, empty, loading, error) | shared | — |

Rename the `reports` tab to `issues`.

## Reliability on the phone

- **Android:** create notification channel `sos` at start-up (importance MAX, `alarm.mp3`,
  vibration, bypass DnD where allowed). Full-screen intent for the alarm screen. Ask to ignore battery
  optimisation (Alarm check screen).
- **iOS:** request Apple's Critical Alerts entitlement now (takes weeks). Until then the server sends
  `interruptionLevel: time-sensitive` with the custom sound.
- Remove the duplicate `expo-notifications` plugin entry and confirm `alarm.mp3` ships in the build.
- Create the SOS at the **start** of the countdown (`POST alerts/` when the hold ends), with a
  `client_id` from `expo-crypto` `randomUUID()` reused on every retry.
- No connection when the hold ends → `sos/sms-fallback`, which hands the SMS app a prefilled
  `SOS <type> <ref>` for `EXPO_PUBLIC_SOS_SHORTCODE`. **Built.**
- apisauce: on 401, refresh once with the stored refresh token, retry, log out only if that fails.
- Socket: fresh ticket per connect; back-off 1, 2, 4 … 30 s; stop on unmount; after reconnect fetch
  `messages/?after=<last id>`.
- No `console.log` of tokens, messages or locations in release builds.

## Build order

1. Foundations (theme, components, `TabBarSOS`, 401 refresh, socket fix, `app.json`, remove dead
   API calls).
2. Alarm that rings on a locked phone (test on real phones).
3. Demo path screens 1–7 on `/api/v2/`.
4. After the pitch: onboarding stages, issues, chat media, Profile v2, providers, system states.

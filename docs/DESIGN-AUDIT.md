# Design audit — every Android frame, and where it lives in the app

Figma file `EuAEWkdGnn8S6GhHpEu65j`, pages "Android · 01–09" (frames are 402 × 874, iOS status bar
62 px). The Android frames are the design for both platforms; no Liquid Glass.

Status: **match** = built from the frame and checked side by side in the browser preview
(`npm run preview`, see below) · **honest variant** = same layout, copy changed because the frame
shows something the app cannot truthfully say yet (each one is in DECISIONS.md) · **todo**.

## How to check a screen against its frame

```bash
cd neighbour-mobile
EXPO_PUBLIC_API_URL=http://localhost:8000 npm run preview   # opens the app in a browser
```

`metro.config.js` swaps native-only modules (maps, SecureStore, pager, Lottie) for stand-ins in
`dev/web-preview/` **for the web build only**; phone builds never see them. The map is a flat
colour in the browser. Safe-area insets are 0 there, so everything sits 62 px higher than in
the frame — compare from the status bar down.

## 01 · Onboarding & sign in

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Language | 1637:545 | `authentication/language` (first launch only) | match |
| Slide 1–3 | 1623:1112/1170/1230 | `authentication/onboarding` | match (visual cards exported as images) |
| What we collect | 1637:637 | `authentication/collect` | match |
| Email | 1619:558 | `authentication/email` | match |
| Code | 1619:591 | `authentication/code?mode=signup` | match |
| Phone (SMS backup) | 1637:694 | `authentication/phone` (+ `phoneCode`) | match |
| Profile | 1619:632 | `authentication/profile` | match (photo upload is real) |
| Verify identity | 1627:1336 | `authentication/verify` | match |
| Scan ID | 1627:1410 | `authentication/scanId` | match (photo stays on the phone) |
| Selfie check | 1627:1480 | `authentication/selfie` | match (photo stays on the phone) |
| Verification status | 1627:1543 | `authentication/verifyStatus` | honest variant: "ID check pending" |
| Location | 1619:673 | `authentication/location` | match |
| Pin home | 1619:728 | `authentication/pinHome` | match (street from reverse geocoding) |
| How to find my house | 1637:839 | `authentication/house` | match (gate photo is real, responder-only) |
| Allow alerts | 1627:1624 | `authentication/alerts` | match |
| Safety & duress PIN | 1637:772 | `authentication/safety` | match |
| Emergency contact | 1637:903 | `authentication/contact` | match |
| Done | 1619:775 | `authentication/done` | match (real counts) |
| Sign in — email | 1631:1402 | `authentication/login` | match |
| Sign in — code | 1631:1434 | `authentication/code?mode=signin` | match |
| Can’t access email | 1631:1475 | `authentication/recover` | match; "Ask a neighbour" is marked coming soon |

## 02 · Home & map

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Home | 1672:1171 | `(tabs)/index` | match (real Google map with the street style; areas, not houses) |
| Tapped SOS (hint) | 1672:1313 | Home toast, shown when the hold screen is closed without holding | match |
| Actions open | 1672:1460 | Home quick-actions rail: Report, Check-in, Guard, Voice | match |
| Alert nearby | 1672:1635 | Home status bar turns red, distance from my home | match |
| Neighbour sheet | 1673:5101 | — areas open the Neighbours list instead (an area is several homes) | todo with page 04 |
| Offline / no location | 1673:5258 | Home banners; offline = the API is unreachable | match ("last known location" pill left out: the pin is the home, not a live position) |
| Complete your safety profile | 1673:5384 | `components/home/SafetyChecklist` (after onboarding, and from Profile) | match (all seven steps from real data) |
| Notifications | 1631:1675 | `notifications` | match (feed built by the server, vouch works) |

Bug found on the way: the Issues tab was missing from the tab bar on every phone —
`app/(tabs)/issues/` had no `_layout.tsx`, so no route was called `issues`.

## 03 · SOS & response

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| SOS — hold, slide to a type | 1677:700 | `sos/hold` | match (was already right) |
| SOS — sending in 10 s | 1677:780 | `sos/countdown` | match (added the "Silent SOS" chip) |
| SOS — help on the way | 1677:829 | `sos/live` | match (full-screen map under the sheet) |
| SOS — no one responded, widening | 1677:958 | `sos/live` after 60 s with nobody coming | match (rings 500 m / 1 000 m follow the server's radius) |
| SOS — I’m safe, confirm | 1677:1049 | `sos/live` sheet | match (PIN field only when a PIN is set) |
| SOS — guard dispatched | 1758:12612 | `sos/live`, from the alert's `dispatches` | match ("requested" shown as notified, never as coming) |
| Neighbour — alarm (+ robbery) | 1678:915, 1707:928 | `alert/[id]` | match (was already right) |
| Neighbour — on the way | 1678:1014 | `alert/on-the-way` | match |
| Alert — arrived, incident chat | 1632:1945 | `chat/[id]?alert=` | see page 05 |
| Alert — resolved | 1618:528 | `alert/resolved` | match (stats from server timestamps) |
| Lock screen — critical alert | 1632:1882 | OS notification with "I’m coming" / "View map" buttons | match on Android; iOS rings on silent only with Apple's Critical Alerts entitlement |
| Witness — report what I see | 1632:2008 | `witness` (Home → Actions → Report) | match |
| Witness — alert sent | 1632:2102 | `witness/sent` | honest variant: "homes alerted" instead of "people alerted · already responding" |

## 04 · Neighbours & groups

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Neighbours list | 1633:1899 | `neighbours` | match (search, Verified / Pending, "waiting for your vouch") |
| Neighbour profile | 1633:2001 | `neighbours/[id]` | honest variant: no household (responder-only), "Report or block" left out (no server side) |
| Vouch request | 1633:2103 | `components/neighbours/VouchSheet` | match |
| Pending verification | 1633:2184 | `neighbours/pending` | match (real vouchers) |
| Group page | 1633:2248 | `group/[id]` (tap the group chat's title) | match |
| Group members | 1633:2381 | `group/members` | honest variant: no "Admin" badges (groups have no admins yet) |

## 05 · Messages

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Messages | 1620:671 | `(tabs)/message` | match ("Juma: …" previews; search opens New message) |
| Group chat | 1620:794 | `chat/[id]` | match |
| Direct chat | 1633:2488 | `chat/[id]` | match (header shows the neighbour's house) |
| New message | 1633:2536 | `messages/new` | match (no distances: the app never shows how far a neighbour lives) |
| Direct chat, media | 1715:390 | `chat/[id]` | match (voice, photo, file bubbles) |
| Recording a voice note | 1715:639 | Composer, hold the mic | match |
| Attach | 1715:791 | Composer "+" sheet | match minus "Contact" (needs a contacts permission we do not ask for) |
| Group discusses an issue | 1716:11667 | issue cards in `chat/[id]` | see page 06 |
| Alert — arrived, incident chat | 1632:1945 | `chat/[id]` while an alert is live | match (banner + quick replies) |

## 06 · Issues

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Issues | 1620:859 | `(tabs)/issues` | match, plus a map-pin icon beside "+" (the frame shows no way into the map view) |
| Issues — other neighbourhoods | 1737:428 | `(tabs)/issues`, "Other areas" | match |
| Issues — on map | 1634:2354 | `(tabs)/issues?map=1` | match (satellite map, category pins, Show list, bottom card) |
| Issue detail | 1620:991 | `issues/[id]` | match. "…" appears only for the reporter: mark as being dealt with / resolved |
| Issue detail — other area | 1741:1029 | `issues/[id]` | match (Follow updates; comment box replaced by the lock note) |
| Discuss in group | 1716:11835 | sheet in `issues/[id]` | match, but lists only the groups I am in. The server shares to my own neighbourhood group, so in practice there is one |
| Report an issue | 1620:1056 | `issues/report` | match. No "Security" pill on purpose; the pin is where the phone is, not the house |
| Issue posted | 1634:2297 | `issues/posted` | match ("Share to <group>" opens the Discuss sheet) |

## 07 · Profile

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Profile v2 | 1745:12125 | `(tabs)/profile` | match. The yellow card appears only when the alarm checks really fail |
| Emergency contacts | 1634:2469 | `profile/contacts` | match. The preview is the exact SMS the server sends |
| Alarm & notifications | 1634:2529 | `profile/alarm` | match, with two honest variants: "Press power 5 times" is disabled (needs a native Android build), "Alarm sound" has one sound so no chevron |
| Personal information | 1634:2642 | `profile/personal` | match. Email is read-only; phone and home open their own flows |
| Privacy & location | 1634:2692 | `profile/privacy` | match. "Hide my name on witness reports" is fixed "On": reports never carry a name |
| My alert history | 1634:2762 | `profile/history` | match |
| My household | 1637:5288 | `profile/household` | match (no ages in years: we store child / adult / elderly) |
| Skills & medical notes | 1637:5378 | `profile/medical` | match (earlier) |

## 08 · Security providers

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| Security providers — near you | 1635:2654 | `providers` | match. The filter icon switches the order: response time / price |
| Provider & plans | 1635:2751 | `providers/[id]` | match. "Best value" goes to the cheapest whole-street plan |
| Whole street gathering | 1758:186 | `providers/pool/[id]` | match, minus "House 116 · Not on the app": we cannot know houses that have no account, so the invite button covers them |
| Confirm payment — M-Pesa | 1758:245 | `providers/pay/[id]` | match. The countdown is the 60 s an M-Pesa prompt stays open |
| My plan | 1758:291 | `providers/mine/[id]` | match. "On duty tonight" only for a paying member of an active plan |
| Subscribed — Home | 1749:2431 | `(tabs)` with `covered` param | match (status "Protected by …", toast) |

Provider ratings, review counts, response times, features and the guard on duty are entered by the
provider (admin today); the app shows nothing it was not given.

## 09 · System states

| Frame | Node | Route | Status |
| --- | --- | --- | --- |
| No internet — send SOS by SMS | 1767:203 | `sos/sms-fallback` | match. Home comes from a copy kept on the phone; position from the last GPS fix |
| Offline SMS fallback (sent) | 1635:2945 | `sos/sms-fallback` after Send | match, honest wording: we cannot know how many neighbours were alerted while offline, so it says "alerted as it arrives" |
| Alarms can't reach you | 1767:259 | `system/alarm-check` | match. Rows are the real checks for this phone (Android: channel, sound, Do Not Disturb, battery; iOS: silent switch) |
| Empty — messages | 1635:3000 | `StateView kind="empty"` | match |
| Loading | 1635:3064 | `StateView kind="loading"` | match (pulsing skeleton cards) |
| Error | 1635:3137 | `StateView kind="error"` | match |

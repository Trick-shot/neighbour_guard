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

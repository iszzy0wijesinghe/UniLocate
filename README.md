# UniLocate (Monorepo) — Team Guide

## Quick Start (Everyone)
1) Install deps (from repo root)
   - `pnpm install`

2) Run the Student App (React Native / Expo)
   - `pnpm --filter student-app start`

> If your app name is different (ex: `student`), use:
> `pnpm -r list` to see workspace names, then run:
> `pnpm --filter <name> start`

---

## Repo Structure (Simple)
This repo is a **monorepo** with two main parts:

### 1) `apps/` = runnable applications
- `apps/student-app/` ✅ Student mobile app (React Native)
- (optional later) `apps/calibrator-app/` ✅ Admin/Calibrator mobile app
- (optional later) `apps/dashboards/` ✅ Web dashboards (Admin/Management)

### 2) `packages/` = reusable shared code
- `packages/ui/` ✅ Shared UI components + theme (buttons, cards, chips, colors)
- `packages/types/` ✅ Shared TypeScript models (Complaint, LostItem, Zone, etc.)
- (optional later) `packages/utils/` shared helpers
- (optional later) `packages/api-client/` shared API calls

---

## Who Works Where (Very Important)
To avoid merge conflicts, **each developer works only inside their own folders**.

### ✅ Isindu  — Geo + Student App Core
Work on:
- `apps/student-app/src/navigation/**`
- `apps/student-app/src/app/**` (AppGate, storage, first-run flow)
- `apps/student-app/src/features/onboarding/**`
- `apps/student-app/src/features/auth/**`
- `apps/student-app/src/features/calibration/**`
- `apps/student-app/src/features/home/**` (map + live counts later)
- `apps/student-app/src/services/geo/**`

### ✅ Sashini — Lost & Found Feature
Work ONLY on:
- `apps/student-app/src/features/lost-found/**`
- `packages/types/src/lostFound.ts` (only if types must be added/updated)

### ✅ Hafzan — Anonymous Complaints Feature
Work ONLY on:
- `apps/student-app/src/features/complaints/**`
- `packages/types/src/complaints.ts` (only if types must be added/updated)

### ✅ Dewmini (Frontend Dev) — UI Kit + Styling
Work ONLY on:
- `packages/ui/**`
- (optional) `apps/student-app/src/shared/styles/**` if we keep app-specific styles

> If you need a new button/card/chip component: ask Dewmini or create it inside `packages/ui`.

---

## Student App Flow (What Exists / What You Build)
First-run flow (required):
1) Onboarding (4 screens)
2) Username Registration
3) Privacy Policy Agreement
4) Calibration
5) Main App Tabs

Main Tabs (bottom nav):
- Home (Location Tracking / Map)
- Lost & Found
- Complaints
- Settings

---

## Where to Put Reusable Stuff (So We Don’t Duplicate)
### Reusable UI → `packages/ui`
Examples:
- Button, Card, Input, Chip, BottomSheet
- Theme colors and spacing

Brand colors:
- Navy: `#053668`
- Orange: `#FF7100`

### Shared data models/types → `packages/types`
Examples:
- `Complaint`, `ComplaintStatus`, `LostFoundItem`, `ZoneStat`, `UserProfile`

❌ Do NOT define these types inside feature folders.
✅ Always define/update types in `packages/types` and import them.

---

## Feature Folder Boundaries (Inside Student App)
`apps/student-app/src/features/` contains feature modules:

- `home/` (Isindu)
- `lost-found/` (Sashini)
- `complaints/` (Hafzan)
- `settings/` (basic screens)
- `onboarding/` + `auth/` + `calibration/` (Isindu)

Each feature can have:
- `screens/` (screens)
- `components/` (feature-only components)
- `*.api.ts` (feature API hooks / calls)

---

## Git Rules (So We Don’t Break Each Other)
- Branch from `develop`
- Use: `feature/<your-feature-name>`
  - Isindu: `feature/student-shell`, `feature/geo-intel`
  - Sashini: `feature/lost-found`
  - Hafzan: `feature/complaints`
  - Dewmini: `feature/ui-kit`

- Open a PR into `develop`
- Keep PRs small and only touch your assigned folders

---

## Common Mistakes (Avoid)
❌ Editing other people’s feature folders  
❌ Creating random UI components inside a feature (put reusable ones in `packages/ui`)  
❌ Creating duplicate types inside `features/*` (put shared ones in `packages/types`)  
❌ Merging to `develop` if the app doesn’t run

---

## Help / Decisions
If you’re unsure where a file should go:
- UI component used in multiple screens → `packages/ui`
- Type used by multiple features → `packages/types`
- Only used inside one feature → inside that feature folder
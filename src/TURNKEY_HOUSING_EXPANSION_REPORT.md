# Turnkey Housing Expansion — Implementation Report

---

## A. How Turnkey Houses Were Previously Treated in Pathway

**Before this change:**
- `HousingPlacement` entity had `housing_model: 'per_bed' | 'turnkey'` but **turnkey was never used**
- `PlacementStatusCard` only displayed room/bed info when `housing_model === 'per_bed'` — turnkey placements showed nothing
- `ReferralToPlacementFlow` only offered external `HousingProvider` referrals — there was no internal bed assignment path
- `ResidentHousingTab` derived housing status from `HousingReferral` records only — it never read `HousingPlacement` at all
- Local `House` + `Bed` entities existed (used in HousingOperations) but were **completely disconnected** from placement flows
- No organization scoping: all staff could see all providers
- Diagnostics had no turnkey-specific checks

---

## B. What Was Changed

### New Files
| File | Purpose |
|---|---|
| `components/housing/TurnkeyBedAssignment.jsx` | Org-scoped house → room/bed picker for internal placement |
| `components/housing/HousingAssignmentPanel.jsx` | Top-level chooser between "Turnkey House — Internal Placement" and "Per-Bed Housing — Referral Inventory" |

### Modified Files
| File | What Changed |
|---|---|
| `entities/HousingPlacement.json` | Added `turnkey_house` to `housing_model` enum; strengthened `organization_id` description; documented dual use of `house_id`/`bed_id` |
| `components/housing/PlacementStatusCard.jsx` | Room/bed block now shows for both `per_bed` AND `turnkey_house`; added "Turnkey House — Internal Placement" badge |
| `components/housing/ResidentHousingTab.jsx` | Now reads `HousingPlacement` first (turnkey or synced); rich display for placed clients (house/room/bed/dates); "Place Client" button opens `HousingAssignmentPanel` |
| `functions/runHousingDiagnostics.js` | Added 3 new turnkey-specific checks (org scope leak, missing bed after placement, placement/bed occupancy mismatch) |

---

## C. Can HOH Assign Beds Inside Their Own Turnkey Houses?

**Yes.** The full flow is:
1. Case manager / staff opens Resident Profile → Housing tab
2. Clicks **"Place Client"** → opens `HousingAssignmentPanel`
3. Selects **"Turnkey House — Internal Placement"**
4. `TurnkeyBedAssignment` loads only Houses where `house.organization_id === user.organization_id`
5. Selects a house → loads available `Bed` records for that house
6. Picks a bed → confirmation screen with house/room/bed/move-in date summary
7. On confirm:
   - Creates/updates a `HousingPlacement` record with `housing_model: 'turnkey_house'`, `placement_status: 'placed'`, org-scoped
   - Updates `Bed.status` to `occupied` and links `resident_id`
8. Resident profile immediately reflects the placement with room/bed details

---

## D. How Organization Scoping Is Enforced

**In `TurnkeyBedAssignment`:**
- Queries `House.filter({ organization_id: orgId })` — only shows org-controlled houses
- `orgId` derived from `currentUser.data.organization_id` or `resident.organization_id`
- No cross-org house leakage possible at the query level

**In `HousingPlacement` records:**
- `organization_id` is written at creation time from the resolved org context
- Diagnostics check 8b alerts if any turnkey placement is missing `organization_id`

**External referral inventory (`HousingProvider`):**
- Remains unchanged — visible to all staff as before (external public-ish inventory)
- Clearly separated from internal turnkey options via `HousingAssignmentPanel` UI

---

## E. How Resident Profiles Now Reflect Turnkey Placements

`ResidentHousingTab` now:
1. Fetches `HousingPlacement` (alongside referrals) on load
2. If a `placement_status: 'placed'` record exists → shows rich placement card:
   - House name + program type
   - **"Turnkey House — Internal Placement"** badge (if applicable)
   - Room name + bed label in a 2-column grid
   - Move-in date + Expected exit date
3. `PlacementStatusCard` (used in other profile views) also shows room/bed for `turnkey_house` model

---

## F. What to Manually Test Next

### Core Scenarios
1. **Assign a client to a turnkey bed**
   - Open any active resident → Housing tab → "Place Client"
   - Verify only your org's houses appear in turnkey flow
   - Complete assignment → confirm placement card shows room/bed

2. **Profile display**
   - After assignment, verify: house name, room, bed, move-in date, "Turnkey House" badge all appear
   - Check `PlacementStatusCard` in resident profile for same data

3. **Bed occupancy**
   - Go to Housing Operations → Beds tab
   - Verify the assigned bed shows `occupied` status with resident name

4. **Org isolation**
   - If you have a second org/operator, verify they cannot see HOH houses in their turnkey flow

5. **Referral path still works**
   - Open "Place Client" → choose "Per-Bed Housing — Referral Inventory"
   - Verify existing referral flow works unchanged

6. **Diagnostics**
   - Housing Operations → System Health → Run Diagnostics
   - Verify new turnkey checks appear and pass

### Edge Cases
- Resident with no organization_id → should see "No organization found" message in TurnkeyBedAssignment
- House with no available beds → should show "No available beds" message
- Re-assigning a resident to a different bed → should update existing placement record (not create duplicate)
# Housing Integration: Quick Reference

---

## WHAT'S NEW

### New Entity
- **HousingPlacement** — Synced placement records from Housing App

### New Components (3)
- **PlacementStatusCard** — Shows client housing in profile
- **ReferralToPlacementFlow** — Workflow: search → select → submit
- **HousingDashboard** — Overview: placed/referred/waitlisted counts

### New Functions (2)
- **syncHousingPlacement()** — Pull placement data from Housing App
- **runHousingDiagnostics()** — Check integration health

---

## WHAT CLIENT PROFILE NOW SHOWS

```
HOUSING STATUS (New Card)
Status: Placed / Referred / Approved / Move-In Ready / Waitlisted / Denied
House: Hope House, Austin TX
House Type: Transitional Housing
Room: Bedroom 2 (per-bed only)
Bed: Bed A (per-bed only)
Move-In Date: March 15, 2026
Expected Exit: September 15, 2026
Last Synced: Today 3:45 PM
```

---

## HOUSING WORKFLOW

```
1. Open client profile
2. Click "Find Housing" button
3. See AI recommendations
4. Filter by city / program type / gender
5. Select provider from list
6. Click "Submit Referral"
7. System creates referral + syncs with Housing App
8. Status updates in real-time (6-hour polls or webhooks Phase 2)
9. Placement visible immediately when approved
```

---

## DATA THAT FLOWS

### ✅ Flows INTO Pathway
- House name, type, location
- Room name, bed label (per-bed)
- Placement status + dates
- Occupancy status

### ❌ NEVER Flows
- Lease data
- Rent, fees, invoices
- Financial performance
- Expense tracking

---

## ENVIRONMENT SETUP

```bash
HOUSING_APP_API_URL=https://housing.nonprofit.org/api
HOUSING_APP_API_KEY=[bearer token from Housing App admin]
```

Without these, sync is skipped (no errors).

---

## HOW TO USE

### In ResidentProfile Page
```jsx
import PlacementStatusCard from '@/components/housing/PlacementStatusCard';

<PlacementStatusCard 
  residentId={resident.id}
  globalResidentId={resident.global_resident_id}
  isEditable={isAdmin}
/>
```

### Manual Sync (Admin)
Click **"Sync Now"** button in PlacementStatusCard.
Response: 5-10 seconds.

### View Dashboard
Open HousingDashboard component in any page.
Shows: Placed / Referred / Waitlisted / Denied counts.

### Run Diagnostics
Click **"Run Diagnostics"** in HousingDashboard.
Returns: Pass/fail counts, findings, recommendations.

---

## ERROR MESSAGES

| Error | Cause | Fix |
|-------|-------|-----|
| "Sync Issue" | Housing App unreachable | Check API URL, key, or Housing App status |
| "Missing Fields" | Housing App returned incomplete data | Check Housing App data, retry sync |
| "API Not Configured" | HOUSING_APP_API_KEY not set | Set env var, restart |
| "No Placement" | Resident not in Housing App | Submit referral, wait for approval |

---

## TESTING STEPS

1. **Add to Profile:**
   - Go to ResidentProfile
   - Add PlacementStatusCard component
   - View a resident

2. **Create Referral:**
   - Click "Find Housing"
   - Search & filter providers
   - Select one
   - Submit referral

3. **Manual Sync:**
   - Click sync button (if admin)
   - Should update within seconds

4. **Check Dashboard:**
   - Open HousingDashboard
   - See placement counts
   - Run diagnostics

5. **Verify No Financial Data:**
   - Try to view Placement record directly
   - Should NOT see: rent, fees, invoices, expenses

---

## RLS (Who Can See What)

| Role | Can See | Cannot See |
|------|---------|-----------|
| Case Manager | Own residents' placements | Other orgs, financial data |
| Staff | Org residents' placements | Other orgs, financial data |
| Admin | All placements, diagnostics | Financial data (intentional) |
| Resident | Own placement (Phase 2) | Other residents, financials |

---

## TURNKEY vs PER-BED

### Per-Bed Housing
```
Shows:
- House name
- Room name: "Bedroom 2"
- Bed label: "Bed A"

Workflow:
- Search for per-bed providers
- Select specific bed (if available)
- Submit for that bed
```

### Turnkey Housing
```
Shows:
- House name only
- NO room/bed details
- Status: "Placed in Turnkey Housing"

Workflow:
- Search for turnkey providers
- No bed selection
- Whole-house placement
```

---

## SYNC MECHANISM

### When Sync Happens

1. **Manual:** Click sync button → Immediate (5-10 sec)
2. **Scheduled:** Every 6 hours (Phase 2) → Background
3. **Webhook:** Housing App sends event (Phase 2) → Real-time

### What Gets Synced

- Current placement status
- House/room/bed assignment
- Move-in/move-out dates
- Occupancy status

### What Does NOT Sync

- Lease information
- Rent amounts
- Invoice history
- Financial metrics

---

## IF HOUSING APP IS DOWN

**Scenario:** Housing App API unreachable

**What Happens:**
- Sync fails gracefully
- Error stored in placement record
- "Sync Issue" warning shows in UI
- Placement data doesn't change
- Case manager can still see last-known status

**Fix:**
1. Check Housing App status
2. Verify API URL + key
3. Click manual sync when app recovers

**NO DATA LOSS** — Last-known status preserved.

---

## DIAGNOSTICS (8 Checks)

```
✅ Residents without placement
✅ Placements with sync errors
✅ Stale sync data (>24 hours)
✅ Missing critical fields
✅ Invalid status values
✅ Duplicate placements
✅ Orphaned referrals
✅ Housing App API connectivity
```

**If any fail:**
- Review finding details
- Follow recommendation
- Click "Run Diagnostics" again to verify fix

---

## PHASE 2 ROADMAP (Q2 2026)

- [ ] Scheduled sync (every 6 hours auto-sync)
- [ ] Webhook receiver (real-time placement updates)
- [ ] Email alerts ("Your client is approved for housing!")
- [ ] SMS notifications
- [ ] Move-in checklist automation
- [ ] Occupancy trending

---

## HIDDEN FINANCIAL DATA

**Never shown to case managers:**
- Lease terms, rent amount
- Daily/monthly fees
- Invoice history
- Payment schedules
- Provider profit margins
- Expense allocations
- Financial performance metrics
- Cost per bed

**Intentionally filtered at RLS level** — not just UI hiding.

---

## QUICK TROUBLESHOOTING

### "No Placement" in Profile
**Cause:** Resident hasn't been referred or approved yet
**Fix:** Submit referral, wait for Housing App approval, manual sync

### "Sync Issue" Warning
**Cause:** Housing App API unreachable
**Fix:** Check API key, Housing App status, click sync again

### Placement Shows Old Data
**Cause:** Sync hasn't run recently
**Fix:** Click manual sync button, or wait for next scheduled sync

### Room/Bed Not Showing
**Cause:** Turnkey housing (no per-bed slots) OR Housing App didn't assign
**Fix:** Check housing_model field, contact Housing App admin if bed should be assigned

### Can't See Other Org's Placements
**Cause:** RLS filter (correct behavior)
**Fix:** That's intentional. You can only see own org's residents.

---

## SUPPORT CONTACTS

- **Pathway Issues:** Check HOUSING_INTEGRATION_COMPLETE.md (Full Documentation)
- **Housing App Issues:** Contact Housing App admin
- **Sync Errors:** Run diagnostics, check recommendations
- **Feature Requests:** Document in Phase 2 roadmap

---

## FILES REFERENCE

| File | Purpose |
|------|---------|
| `entities/HousingPlacement.json` | Placement data schema |
| `components/housing/PlacementStatusCard.jsx` | Client profile display |
| `components/housing/ReferralToPlacementFlow.jsx` | Referral workflow |
| `components/housing/HousingDashboard.jsx` | Dashboard overview |
| `functions/syncHousingPlacement.js` | Sync engine |
| `functions/runHousingDiagnostics.js` | Health check |
| `HOUSING_INTEGRATION_COMPLETE.md` | Full docs |
| `HOUSING_INTEGRATION_QUICK_REFERENCE.md` | This file |

---

## GO LIVE CHECKLIST

- [ ] HOUSING_APP_API_URL set
- [ ] HOUSING_APP_API_KEY set
- [ ] PlacementStatusCard added to ResidentProfile
- [ ] HousingDashboard added to admin page
- [ ] Test: Create referral → See placement sync
- [ ] Test: View client profile housing card
- [ ] Test: Run diagnostics
- [ ] Brief staff on workflow
- [ ] Monitor 24 hours for errors

**Ready to deploy.** ✅
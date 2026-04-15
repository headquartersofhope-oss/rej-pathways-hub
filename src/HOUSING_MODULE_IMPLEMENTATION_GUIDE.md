# Housing Module Implementation Guide
**Quick reference for integrating new housing components into Pathway**

---

## 1. ADD RESIDENT HOUSING STATUS TO PROFILE

**File:** `pages/ResidentProfile.jsx`

```jsx
import ResidentHousingTab from '@/components/housing/ResidentHousingTab';

// In ResidentProfile render, add housing tab:
<Tabs>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="housing">Housing</TabsTrigger>
    {/* ... other tabs ... */}
  </TabsList>
  
  <TabsContent value="housing">
    <ResidentHousingTab 
      resident={resident}
      onNewReferral={() => navigateToHousingReferrals(resident.id)}
      isEditable={currentUser?.role === 'admin' || currentUser?.role === 'case_manager'}
    />
  </TabsContent>
</Tabs>
```

---

## 2. ADD HOUSING ALERTS TO CASE MANAGER DASHBOARD

**File:** `components/dashboard/CaseManagerDashboard.jsx` (or similar)

```jsx
import HousingAlerts from '@/components/housing/HousingAlerts';

// Add to dashboard:
<div className="space-y-6">
  <HousingAlerts />
  {/* ... other dashboard sections ... */}
</div>
```

---

## 3. VERIFY HOUSING REFERRALS PAGE UPDATES

**File:** `pages/HousingReferrals.jsx` (already updated)

The HousingReferrals page now includes:
- ✅ BedSearchPanel in Availability tab
- ✅ HousingAlerts in Availability tab
- ✅ Improved AvailabilitySummary display

No additional action needed; changes already applied.

---

## 4. TEST HOUSING INTEGRATION AUDIT

**Run audit manually in admin console:**

```javascript
// In browser console or admin backend testing:
const result = await base44.functions.invoke('housingIntegrationAudit', {});
console.log(result.data);

// Check for critical findings
if (result.data.failed_checks > 0) {
  console.warn('Critical housing issues detected:', result.data.findings);
}
```

---

## 5. CONFIGURE HOUSING AUTOMATION TRIGGERS (Phase 2)

**Create these automations in admin control center:**

### Trigger 1: Email on Referral Submission
```
Automation Type: Entity
Entity: HousingReferral
Event: Update
Condition: status = "submitted"
Function: sendEmailNotification
Parameters: {
  template: "referral_submitted",
  recipients: ["case_manager_email"]
}
```

### Trigger 2: Alert on Approved Placement
```
Automation Type: Entity
Entity: HousingReferral
Event: Update
Condition: status = "approved"
Function: notifyMoveInCoordination
Parameters: {
  notify_case_manager: true,
  create_task: true
}
```

### Trigger 3: Daily Housing Audit
```
Automation Type: Scheduled
Schedule: Every day at 9:00 AM
Function: housingIntegrationAudit
Parameters: {
  send_alert_if_critical: true,
  email_recipients: ["admin@nonprofit.org"]
}
```

---

## 6. OPTIONAL: AI HOUSING RECOMMENDATIONS (Phase 2)

**Create backend function:**

```javascript
// functions/recommendHousing.js
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { residentId } = await req.json();
  
  const resident = await base44.entities.Resident.get(residentId);
  const providers = await base44.entities.HousingProvider.filter({ is_active: true });
  
  const recommendations = await base44.integrations.Core.InvokeLLM({
    prompt: `Given this resident:
      - Barriers: ${resident.barriers}
      - Employment: ${resident.employment_status}
      - Location preference: ${resident.preferred_city}
      
      And these providers:
      ${JSON.stringify(providers, null, 2)}
      
      Recommend the top 3 best matches with explanation.`,
    response_json_schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            provider_id: 'string',
            match_score: 'number (0-100)',
            reasons: { type: 'array', items: 'string' }
          }
        }
      }
    }
  });
  
  return Response.json(recommendations.data);
});
```

**Use in referral form:**

```jsx
// In ReferralForm.jsx
const [recommendations, setRecommendations] = useState([]);

const getRecommendations = async () => {
  const result = await base44.functions.invoke('recommendHousing', { 
    residentId: resident.id 
  });
  setRecommendations(result.data.recommendations);
};

// Display as "Recommended Providers" in provider selection dropdown
```

---

## 7. PREPARE FOR GOOGLE DRIVE INTEGRATION (Phase 3)

**Document structure ready for future Drive sync:**

```javascript
// Current structure (ready for Drive):
referral.documents = [
  {
    name: "Intake Assessment Summary",
    url: "https://...",  // Will become Google Drive link
    document_type: "intake_summary",
    uploaded_date: "2026-04-15",
    drive_file_id: null,  // Add this field when Phase 3
    drive_folder_id: null  // Add this field when Phase 3
  }
];
```

**When Google Drive integration arrives:**
1. Create Drive folder per referral: `Pathway/Housing Referrals/[RESIDENT_ID]/[REFERRAL_ID]/`
2. Store folder_id in HousingReferral
3. Auto-upload documents to Drive
4. Housing app links to same Drive folder
5. Comments/revisions happen in Drive (shared document repo)

---

## 8. VERIFY RLS (ROLE-BASED SECURITY)

**Housing module RLS rules (enforced automatically):**

- **Staff members:** Can read/create referrals for their organization only
- **Case managers:** Can see housing status for assigned residents only
- **Admins:** Full access to all referrals and providers
- **Housing providers:** Only see referrals submitted to them (external app)
- **Residents:** Can see own referral status (future: resident portal)

**Verify via:**
```javascript
// Staff user should NOT see other orgs' referrals
const referrals = await base44.entities.HousingReferral.list();
// Should filter by organization_id automatically
```

---

## 9. NEXT INTEGRATION: HOUSING APP CONNECTIVITY

**When standalone Housing App is ready:**

1. **Get Housing App API Details:**
   - Base URL (e.g., `https://housing.nonprofit.org/api`)
   - Authentication method (API key, OAuth, etc.)
   - Referral submission endpoint
   - Status update webhook endpoint

2. **Create Referral Submission Function:**
   ```javascript
   // functions/submitHousingReferral.js
   async function submitToHousingApp(referralId) {
     const referral = await base44.entities.HousingReferral.get(referralId);
     
     const response = await fetch('https://housing.app/api/referrals', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${HOUSING_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         participant_name: referral.participant_name,
         housing_need: referral.housing_need_summary,
         barriers: referral.relevant_barriers,
         documents: referral.documents,
         // ... other fields
       })
     });
     
     const result = await response.json();
     
     // Store external referral ID
     await base44.entities.HousingReferral.update(referralId, {
       external_referral_id: result.referral_id
     });
   }
   ```

3. **Create Status Update Webhook Receiver:**
   ```javascript
   // functions/receiveHousingAppStatusUpdate.js
   async function handleStatusUpdate(req) {
     const { external_referral_id, status, provider_notes } = await req.json();
     
     // Find referral by external ID
     const referral = await base44.entities.HousingReferral
       .filter({ external_referral_id });
     
     // Update status
     await base44.entities.HousingReferral.update(referral[0].id, {
       status: mapHousingAppStatus(status),
       provider_notes,
       decision_date: status === 'approved' ? new Date() : undefined
     });
     
     return Response.json({ success: true });
   }
   ```

4. **Register Webhook with Housing App:**
   - URL: `https://pathway.nonprofit.org/api/housing-status-update`
   - Events: referral_status_changed, documents_requested, approved, denied
   - Auth: Shared secret or API key

---

## TESTING CHECKLIST

### ✅ Bed Search
- [ ] Filter by city
- [ ] Filter by program type
- [ ] Filter by gender
- [ ] Combine filters
- [ ] Verify provider contact info shows

### ✅ Resident Housing Tab
- [ ] Add to resident profile
- [ ] View referral status
- [ ] See readiness checklist
- [ ] View referral history
- [ ] Click "New Referral" button

### ✅ Housing Alerts
- [ ] See approved placement alert
- [ ] See under review alert
- [ ] See stalled referral alert (if applicable)
- [ ] Alerts auto-refresh every 60s
- [ ] Click action links

### ✅ Housing Audit
- [ ] Run audit function
- [ ] Check for critical findings
- [ ] Verify recommendations are actionable
- [ ] Schedule weekly auto-run

### ✅ Data Integrity
- [ ] No orphaned referrals
- [ ] All residents have valid housing status
- [ ] No broken links
- [ ] Status values are valid

---

## TROUBLESHOOTING

### Bed Search Shows No Results
1. Check HousingProvider entity has records
2. Verify `is_active: true` on providers
3. Check RLS: user should have staff/admin role
4. Check organization_id matches

### Housing Alerts Not Showing
1. Verify HousingReferral records exist
2. Check status values are valid
3. Verify function is running (check logs)
4. Clear browser cache, refresh page

### Referral Status Not Updating
1. Verify admin has access to referral
2. Check all required fields before save
3. Check RLS rules aren't blocking update
4. Look at error message in console

### ResidentHousingTab Shows "No Referral"
1. Verify referral has global_resident_id
2. Check resident has global_resident_id
3. Verify resident_id matches Resident.id
4. Run housing integration audit to check links

---

## SUPPORT

For issues or questions:
1. Run `housingIntegrationAudit()` to diagnose
2. Check console logs for errors
3. Verify RLS rules are not blocking access
4. Review housing audit findings

**All housing module code is documented with comments for future reference.**
# AI Assistant Package for Base44 Apps

A fully configurable, plug-and-play AI assistant component library for any Base44 application in the ecosystem. Includes floating chat interface powered by Claude API, Claude Bridge for system analysis, and training module integration.

## Package Contents

- `AppAssistant.jsx` - Main floating chat panel (configurable per app)
- `ClaudeBridge.jsx` - Brief Claude and Copy Brief buttons (standalone)
- `TrainingButtonWidget.jsx` - Floating training module button
- `aiAssistant.js` - Backend Claude API function (shared across all apps)
- `README.md` - This documentation

## Features

✅ Fully configurable floating chat panel with app-specific styling
✅ Role-aware AI responses (admin, case_manager, resident, etc.)
✅ Claude Bridge: Brief Claude with pre-filled reports, Copy Brief to clipboard
✅ App-specific system context injection via `systemContextFn`
✅ Training module integration with progress tracking
✅ Premium dark theme matching Base44 design system
✅ Toast notifications (requires `sonner` package)
✅ Smooth animations with Framer Motion
✅ Conversation history persistence

## Installation (Under 10 Minutes)

### Step 1: Copy the Package Files

```bash
# Copy the entire components/ai folder to your app
cp -r components/ai your-app/components/

# Copy the backend function
cp functions/aiAssistant.js your-app/functions/
```

### Step 2: Verify Dependencies

Ensure your app has these packages installed:
```bash
npm install sonner framer-motion @tanstack/react-query
```

### Step 3: Configure Your App's System Context Function

Create a function that returns your app's specific system data. This is the only customization needed:

```javascript
// In your app (e.g., in AppLayout or a shared utils file)

const getMyAppSystemContext = async () => {
  // Return app-specific data the AI should know about
  return {
    totalRecords: 234,
    activeUsersCount: 45,
    systemStatus: 'healthy',
    lastSyncTime: new Date().toISOString(),
    // Add any app-specific metrics here
  };
};
```

### Step 4: Add to Your AppLayout

Add the floating buttons to your main layout component (e.g., `components/layout/AppLayout.jsx`):

```jsx
import AppAssistant from '@/components/ai/AppAssistant';
import TrainingButtonWidget from '@/components/ai/TrainingButtonWidget';

export default function AppLayout() {
  // Your existing layout code...
  
  const user = await base44.auth.me(); // Get current user

  // Import your system context function
  const { getMyAppSystemContext } = require('@/path/to/your/functions');

  return (
    <div>
      {/* Your app content */}
      
      {/* Add floating buttons at the bottom */}
      <TrainingButtonWidget
        userRole={user?.role || 'resident'}
        userId={user?.id}
        appColor="#F59E0B"  // Customize per your app's brand color
        floatingButtonPosition={{ bottom: '20px', right: '20px' }}
      />
      
      <AppAssistant
        appName="Your App Name"
        appColor="#F59E0B"
        userRole={user?.role || 'resident'}
        userName={user?.full_name || 'User'}
        systemContextFn={getMyAppSystemContext}
        organizationId={user?.organization_id}
        floatingButtonPosition={{ bottom: '100px', right: '20px' }}
      />
    </div>
  );
}
```

### Step 5: Set the Anthropic API Key

Add your Anthropic API key as an environment secret:

```bash
# In Base44 dashboard:
Settings > Environment Variables

Name: ANTHROPIC_API_KEY
Value: [Your Claude API key from https://console.anthropic.com/]
```

## Configuration Reference

### AppAssistant Props

```javascript
<AppAssistant
  appName="My Application"              // Display name in header
  appColor="#F59E0B"                    // Accent color (hex)
  userRole="admin"                      // User's role for context filtering
  userName="John Doe"                   // For personalization
  systemContextFn={async () => {...}}   // App-specific context function
  organizationId="org-123"               // Optional: organization context
  floatingButtonPosition={{              // Position of floating button
    bottom: '100px',
    right: '20px'
  }}
  onMessageSent={(msg, response) => {}} // Optional: callback on message
/>
```

### ClaudeBridge Props

```javascript
<ClaudeBridge
  systemReport="..."                    // Full system report string
  userName="Rodney Jones"                // Admin name
  appName="My Application"               // App name for context
  showBriefButton={true}                 // Show Brief Claude button
  showCopyButton={true}                  // Show Copy Brief button
  briefButtonColor="#F59E0B"             // Color for Brief button
  copyButtonColor="#60A5FA"              // Color for Copy button
/>
```

### TrainingButtonWidget Props

```javascript
<TrainingButtonWidget
  userRole="case_manager"               // Filter trainings by role
  userId="user-123"                     // Track user's progress
  appColor="#F59E0B"                    // Button color
  floatingButtonPosition={{              // Position
    bottom: '20px',
    right: '20px'
  }}
  trainingRequired={false}              // Show badge if required
/>
```

## Customizing the System Context Function

The `systemContextFn` is where you inject your app's specific data. The AI uses this to provide intelligent, context-aware responses.

### Example: Care Management App

```javascript
export const getCareMgmtSystemContext = async () => {
  const residents = await base44.entities.Resident.list();
  const activeResidents = residents.filter(r => r.data?.status === 'active');
  const tasks = await base44.entities.ServiceTask.list();
  const overdueTasks = tasks.filter(t => {
    const due = new Date(t.data?.due_date);
    return due < new Date() && t.data?.status !== 'completed';
  });

  return {
    totalResidents: residents.length,
    activeResidents: activeResidents.length,
    overdueTasks: overdueTasks.length,
    housingPending: activeResidents.filter(r => r.data?.status === 'housing_eligible').length,
    systemStatus: 'operational',
  };
};
```

### Example: Job Matching App

```javascript
export const getJobMatchSystemContext = async () => {
  const candidates = await base44.entities.JobCandidate.list();
  const jobs = await base44.entities.JobListing.list();
  const matches = await base44.entities.JobMatch.list();
  
  return {
    totalCandidates: candidates.length,
    totalJobs: jobs.length,
    pendingMatches: matches.filter(m => m.data?.status === 'pending').length,
    placedCandidates: matches.filter(m => m.data?.status === 'hired').length,
  };
};
```

## AI Assistant Capabilities by Role

### For All Users
- Step-by-step workflow guidance
- Button and feature explanations
- Status and terminology help

### For Case Managers
- Assigned resident information
- Task management and reminders
- Caseload overview
- Housing status tracking

### For Admins
- System health reports
- User and resource management
- Data integrity checks
- Bed and inventory status

### For Super Admins
- Full system diagnostics
- Claude Bridge integration
- Developer mode (see raw system context)
- Error and performance analysis

## Advanced: Using Claude Bridge

The `ClaudeBridge` component is already integrated into the main `AppAssistant` for super admins. To use it standalone:

```jsx
import ClaudeBridge from '@/components/ai/ClaudeBridge';

<ClaudeBridge
  systemReport={mySystemReport}
  userName={user.full_name}
  appName="My App"
  briefButtonColor="#F59E0B"
  copyButtonColor="#60A5FA"
/>
```

## Styling Customization

The component uses your app's existing `appColor` prop for theming. To match your app's brand:

```jsx
<AppAssistant
  appColor="#YOUR_BRAND_COLOR"  // Changes all UI accents
  // ...
/>
```

The component respects the Base44 dark theme design system:
- Background: `#161B22`
- Cards: `#21262D`
- Border: `#30363D`
- Text: `#CDD9E5` / `#8B949E`

## Troubleshooting

### "API key not found" error
→ Ensure `ANTHROPIC_API_KEY` is set in your app's environment variables

### Messages not sending
→ Verify `functions/aiAssistant.js` is deployed in your app
→ Check browser console for error details

### System context not updating
→ Ensure `systemContextFn` is an async function that returns an object
→ Test the function independently to verify it returns data

### Buttons showing but panel not opening
→ Check that `framer-motion` and `sonner` are installed
→ Verify no CSS conflicts are hiding the panel (z-index issue)

## For Support

- Check the component props documentation above
- Review the `systemContextFn` examples
- Test your context function with `console.log()`
- Verify Claude API key and function deployment

---

**Ready to deploy?** Follow the 5 steps above and you'll have a fully functional AI assistant in your app in under 10 minutes!
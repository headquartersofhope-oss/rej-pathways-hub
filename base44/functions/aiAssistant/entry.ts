import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Using Claude Haiku 4.5 — fast, cheap, smart enough for in-app help.
// For deeper reasoning tasks (intake analysis, resume polishing), use claude-sonnet-4-6.
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const ROLE_CAPABILITIES = {
  case_manager: {
    canViewOwnCaseload: true,
    canViewAssignedResidents: true,
    canViewOwnTasks: true,
    canViewHousingStatus: true,
    canViewTransportation: true,
    canViewSystemHealth: false,
  },
  admin: {
    canViewAllResidents: true,
    canViewAllBeds: true,
    canViewAllTasks: true,
    canViewSystemHealth: true,
    canViewTeamStatus: true,
    canIdentifyBlockedResidents: true,
  },
  super_admin: {
    canViewEverything: true,
    canViewSystemDiagnostics: true,
    canViewAllData: true,
    canRunDiagnostics: true,
  },
};

const buildSystemPrompt = (userRole, context, mode = 'assistant') => {
  const roleCapabilities = ROLE_CAPABILITIES[userRole] || {};

  if (mode === 'training') {
    return buildTrainingPrompt(userRole, context);
  }

  let basePrompt = `You are the HOH (Headquarters of Hope) Assistant, an embedded AI helper for the Pathways Hub platform. You provide role-appropriate guidance, answer questions about workflows, and surface relevant information.

YOUR ROLE: ${userRole}
YOUR CAPABILITIES:
${Object.entries(roleCapabilities).map(([cap, enabled]) => `- ${cap}: ${enabled ? 'YES' : 'NO'}`).join('\n')}

SYSTEM HEALTH STATUS:
${context.systemHealth ? formatSystemHealth(context.systemHealth, userRole) : 'No system health data available'}

RELEVANT CONTEXT FOR THIS ROLE:
${formatRoleContext(context, userRole)}

CRITICAL RULES:
1. NEVER reveal HIPAA-protected details (SSN, medical info, internal case notes) to roles without authorization
2. Case managers can ONLY see their own assigned residents and tasks
3. Admin can see system-wide data but no individual HIPAA details
4. Super admin can see everything for diagnostics
5. Always explain what features do and guide users through workflows
6. Be concise and helpful
7. If asked about restricted data, politely explain: "I don't have access to that information for your role"

CONVERSATION HISTORY:
${context.conversationHistory ? context.conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') : 'Start of conversation'}`;

  return basePrompt;
};

const buildTrainingPrompt = (userRole, context) => {
  const currentPage = context.currentPage || 'Unknown Page';
  const currentModule = context.currentModule || 'General Training';
  const pageDescriptions = {
    'Residents': 'Here you can view all residents, add new residents, update their status, and access their profiles.',
    'Case Management': 'Manage service plans, track tasks, view appointments, and coordinate resident care.',
    'Housing Referrals': 'Submit referrals to housing providers, track referral status, and manage placement pipeline.',
    'Housing Operations': 'Assign beds, track occupancy, manage room assignments, and coordinate housing placements.',
    'Intake Assessment': 'Complete intake assessments for new residents, identify barriers, and generate service plans.',
    'Learning Center': 'Assign classes to residents, track attendance, record quiz scores, and issue certificates.',
    'Job Matching': 'Create job matches between residents and positions, track placement pipeline, advance candidates.',
    'Job Readiness': 'Track resume building, mock interviews, work preferences, and job readiness scores.',
    'Reporting': 'View dashboard metrics, generate reports, track outcomes, and monitor KPIs.',
  };

  const pageInfo = pageDescriptions[currentPage] || 'You can perform various actions on this page.';

  return `You are the HOH Training Coach - an encouraging, patient, and expert guide helping users learn the Pathways Hub platform.

USER ROLE: ${userRole}
CURRENT MODULE: ${currentModule}
CURRENT PAGE: ${currentPage}

PAGE CAPABILITIES:
${pageInfo}

TRAINING MODE INSTRUCTIONS:
1. Be warm, encouraging, and patient - this is a learning environment
2. Guide users through REAL ACTIONS in the app right now, not hypothetical scenarios
3. When the user navigates to a new page, acknowledge it and explain what they can do there
4. When the user completes an action (like submitting a form), congratulate them and suggest the next step
5. Provide context-specific suggestions - don't generic advice
6. Use simple language and break down complex processes into small steps
7. If a user is confused, ask clarifying questions rather than making assumptions
8. When appropriate, indicate completion of training milestones by saying "✅ Great job! You've completed [action]"

ROLE-SPECIFIC CONTEXT:
${formatRoleContext(context, userRole)}

CHAT HISTORY:
${context.chatHistory ? context.chatHistory.map(msg => `${msg.sender === 'user' ? 'User' : 'Coach'}: ${msg.text}`).join('\n') : 'Start of conversation'}

Remember: You are their personal training coach, not a general assistant. Focus exclusively on training them to use this specific page and module effectively.`;
};

const formatSystemHealth = (health, userRole) => {
  if (userRole === 'super_admin') {
    return `Total Residents: ${health.totalResidents}
Active Cases: ${health.activeCases}
Available Beds: ${health.availableBeds}
Rides Scheduled Today: ${health.ridesToday}
Overdue Tasks: ${health.overdueTasks}
System Status: ${health.systemStatus}
Last Sync: ${health.lastSync}`;
  }

  if (userRole === 'admin') {
    return `Total Residents: ${health.totalResidents}
Available Beds: ${health.availableBeds}
Rides Today: ${health.ridesToday}
Overdue Tasks: ${health.overdueTasks}`;
  }

  return 'Limited system health data for your role';
};

const formatRoleContext = (context, userRole) => {
  if (userRole === 'case_manager') {
    return `Your Caseload:
- Assigned Residents: ${context.assignedResidentsCount || 0}
- Open Tasks: ${context.openTasksCount || 0}
- Housing Pending: ${context.housingPendingCount || 0}
- Upcoming Rides: ${context.upcomingRidesCount || 0}`;
  }

  if (userRole === 'admin') {
    return `System Overview:
- Total Residents: ${context.totalResidents || 0}
- Active Placements: ${context.activePlacements || 0}
- Beds Available: ${context.bedsAvailable || 0}
- Team Members: ${context.teamMembers || 0}
- Tasks Overdue: ${context.overdueTasks || 0}`;
  }

  if (userRole === 'super_admin') {
    return `Full System Context:
- Total Residents: ${context.totalResidents || 0}
- System Health: ${context.systemHealth?.systemStatus || 'unknown'}
- All Modules Status: Available for diagnostics
- All Data: Accessible for analysis`;
  }

  return 'Limited context for your role';
};

const callClaude = async (userMessage, systemPrompt) => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set. Add it in Base44 Secrets.');
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    // Read the actual error body so logs show what Anthropic is complaining about
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch (_) {}
    throw new Error(`Claude API error: ${response.status} ${response.statusText} — ${errorBody}`);
  }

  const data = await response.json();
  return data?.content?.[0]?.text || 'No response generated.';
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { mode = 'assistant', userRole, context = {}, userMessage } = body;

    if (!userMessage) {
      return Response.json(
        { error: 'Missing userMessage' },
        { status: 400 }
      );
    }

    const role = userRole || user.role;
    const systemPrompt = buildSystemPrompt(role, context, mode);
    const aiResponse = await callClaude(userMessage, systemPrompt);

    return Response.json({
      success: true,
      message: aiResponse,
      systemPrompt: context.includeSystemPrompt ? systemPrompt : null,
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    return Response.json(
      { error: error.message || 'Failed to get AI response' },
      { status: 500 }
    );
  }
});

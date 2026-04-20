import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

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

const buildSystemPrompt = (userRole, context) => {
  const roleCapabilities = ROLE_CAPABILITIES[userRole] || {};
  
  let basePrompt = `You are the HOH (Homes of Hope) Assistant, an embedded AI helper for the Pathways Hub platform. You provide role-appropriate guidance, answer questions about workflows, and surface relevant information.

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
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
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
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userMessage, userRole, context = {} } = body;

    if (!userMessage || !userRole) {
      return Response.json(
        { error: 'Missing userMessage or userRole' },
        { status: 400 }
      );
    }

    // Build system prompt with role-aware context
    const systemPrompt = buildSystemPrompt(userRole, context);

    // Call Claude API
    const aiResponse = await callClaude(userMessage, systemPrompt);

    // Return response with system prompt for dev mode
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
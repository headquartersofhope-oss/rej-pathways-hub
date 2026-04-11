import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { residentId, globalResidentId, barriers, residentContext } = await req.json();

    if (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'case_manager') {
      return Response.json({ error: 'Forbidden: Staff or admin access required' }, { status: 403 });
    }

    if (!residentId || !barriers || barriers.length === 0) {
      return Response.json({ error: 'Missing residentId or barriers' }, { status: 400 });
    }

    const barrierSummary = barriers
      .map(b => `- ${b.category} (${b.severity}): ${b.title} - ${b.description || ''}`)
      .join('\n');

    const prompt = `You are a case management expert helping break down barriers into actionable service tasks.

Resident: ${residentContext?.name || 'Unnamed Resident'}
Population: ${residentContext?.population || 'Unknown'}
Status: ${residentContext?.status || 'Active'}

Current Barriers:
${barrierSummary}

For each barrier above, suggest 3-5 specific, actionable service tasks that:
1. Address the root cause of the barrier
2. Are measurable and have clear milestones
3. Include realistic timelines (days/weeks)
4. Specify who should own each task (case manager, resident, partner agency)
5. List any required resources or referrals

Format your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "barrier_category": "string",
      "barrier_title": "string",
      "tasks": [
        {
          "title": "string (specific action)",
          "description": "string (what success looks like)",
          "priority": "low|medium|high|urgent",
          "estimated_days": number,
          "assigned_to": "case_manager|resident|partner_agency",
          "required_resources": ["string"],
          "success_metrics": ["string"]
        }
      ]
    }
  ],
  "summary": "string (2-3 sentence overview of the plan)"
}`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                barrier_category: { type: 'string' },
                barrier_title: { type: 'string' },
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string' },
                      estimated_days: { type: 'number' },
                      assigned_to: { type: 'string' },
                      required_resources: { type: 'array', items: { type: 'string' } },
                      success_metrics: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    return Response.json({
      suggestions: response.suggestions,
      summary: response.summary,
      residentId,
      globalResidentId
    });
  } catch (error) {
    console.error('Error in suggestServiceTasks:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
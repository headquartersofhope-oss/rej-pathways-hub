import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { request_id } = await req.json();

    // Fetch the request
    const request = await base44.asServiceRole.entities.OnboardingRequest.get(request_id);
    if (!request) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    // Call AI for analysis
    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: buildAnalysisPrompt(request),
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommended_role: { type: 'string' },
          recommended_services: { type: 'array', items: { type: 'string' } },
          concerns: { type: 'array', items: { type: 'string' } },
          flags: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    // Update request with AI analysis
    await base44.asServiceRole.entities.OnboardingRequest.update(request_id, {
      ai_summary: aiResponse.summary,
      ai_recommended_role: aiResponse.recommended_role,
      ai_recommended_services: aiResponse.recommended_services || [],
      ai_analysis_complete: true,
    });

    return Response.json({
      success: true,
      analysis: aiResponse,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildAnalysisPrompt(request) {
  const isResident = request.request_type === 'resident_intake';

  let prompt = `Analyze this access request and provide structured recommendations:\n\n`;
  prompt += `Name: ${request.first_name} ${request.last_name}\n`;
  prompt += `Email: ${request.email}\n`;
  prompt += `Request Type: ${request.request_type}\n`;

  if (!isResident) {
    prompt += `Organization: ${request.organization}\n`;
    prompt += `Requested Role: ${request.requested_role}\n`;
    prompt += `Reason for Access: ${request.reason_for_access}\n`;
  } else {
    prompt += `DOB: ${request.date_of_birth}\n`;
    prompt += `Phone: ${request.phone}\n`;
    if (request.resident_data) {
      prompt += `Housing: ${request.resident_data.housing_status}\n`;
      prompt += `Employment: ${request.resident_data.employment_status}\n`;
      prompt += `Literacy: ${request.resident_data.literacy_level}\n`;
      prompt += `Digital Literacy: ${request.resident_data.digital_literacy}\n`;
      prompt += `Population: ${request.resident_data.population}\n`;
      prompt += `Primary Needs: ${(request.resident_data.primary_needs || []).join(', ')}\n`;
    }
  }

  prompt += `\nProvide:
1. A brief summary of the request
2. Your recommended role assignment (resident, case_manager, staff, probation_officer, employer, or partner)
3. For residents: List 3-5 recommended classes/services from these: job readiness, digital literacy, financial literacy, housing support, mental health support, substance recovery, life skills, legal documentation
4. Any concerns or red flags
5. Data quality issues or missing information

Be practical and brief. Focus on what the person needs based on their stated situation.`;

  return prompt;
}
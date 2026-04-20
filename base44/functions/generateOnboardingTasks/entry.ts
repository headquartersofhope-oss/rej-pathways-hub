import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONBOARDING_TEMPLATES = {
  pre_intake: [
    {
      title: 'Complete Intake Assessment',
      description: 'Fill out the initial intake assessment to understand housing status, employment, and support needs.',
      category: 'intake',
      priority: 'high',
      requires_staff_action: true,
    },
    {
      title: 'Review Program Orientation',
      description: 'Attend or view the program orientation to understand rules, expectations, and available resources.',
      category: 'orientation',
      priority: 'high',
      is_resident_visible: true,
    },
  ],
  active: [
    {
      title: 'Establish Housing Stability',
      description: 'Work with case manager to secure stable housing placement.',
      category: 'housing',
      priority: 'high',
      requires_staff_action: true,
    },
    {
      title: 'Create Service Plan',
      description: 'Develop personalized service plan addressing identified barriers.',
      category: 'planning',
      priority: 'high',
      requires_staff_action: true,
    },
    {
      title: 'Enroll in Learning Classes',
      description: 'Identify and enroll in relevant skill-building classes.',
      category: 'learning',
      priority: 'medium',
      is_resident_visible: true,
    },
  ],
  housing_pending: [
    {
      title: 'Finalize Housing Application',
      description: 'Complete all required housing application documents and submit to provider.',
      category: 'housing',
      priority: 'urgent',
      requires_staff_action: true,
    },
    {
      title: 'Prepare for Housing Move-In',
      description: 'Gather necessary items and prepare for housing placement move-in.',
      category: 'housing',
      priority: 'high',
      is_resident_visible: true,
    },
  ],
  housing_eligible: [
    {
      title: 'Apply for Housing Programs',
      description: 'Research and apply for available housing programs you are eligible for.',
      category: 'housing',
      priority: 'high',
      is_resident_visible: true,
    },
    {
      title: 'Meet with Housing Specialist',
      description: 'Schedule appointment with housing specialist to discuss options.',
      category: 'housing',
      priority: 'high',
      requires_staff_action: true,
    },
  ],
  employed: [
    {
      title: 'Maintain Employment',
      description: 'Continue employment and report any changes to your case manager.',
      category: 'employment',
      priority: 'high',
      is_resident_visible: true,
    },
    {
      title: 'Plan Career Development',
      description: 'Work with job readiness coach to plan career advancement steps.',
      category: 'career',
      priority: 'medium',
      requires_staff_action: true,
    },
  ],
  graduated: [
    {
      title: 'Complete Program Requirements',
      description: 'Finalize remaining program requirements for successful graduation.',
      category: 'planning',
      priority: 'high',
      requires_staff_action: true,
    },
    {
      title: 'Transition to Alumni Support',
      description: 'Connect with alumni support services for ongoing resources.',
      category: 'alumni',
      priority: 'medium',
      is_resident_visible: true,
    },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { resident_id, global_resident_id, housing_status, organization_id } = body;

    if (!resident_id || !global_resident_id || !housing_status) {
      return Response.json(
        { error: 'Missing required fields: resident_id, global_resident_id, housing_status' },
        { status: 400 }
      );
    }

    // Get template tasks for this status
    const template = ONBOARDING_TEMPLATES[housing_status] || ONBOARDING_TEMPLATES.active;

    // Check existing tasks to avoid duplicates
    const existingTasks = await base44.asServiceRole.entities.ServiceTask.filter({
      resident_id,
    });

    const createdTasks = [];
    const now = new Date();

    for (const taskTemplate of template) {
      // Skip if task with same title already exists
      if (existingTasks.some(t => t.data?.title === taskTemplate.title)) {
        continue;
      }

      const taskData = {
        resident_id,
        global_resident_id,
        organization_id,
        title: taskTemplate.title,
        description: taskTemplate.description,
        category: taskTemplate.category,
        priority: taskTemplate.priority,
        status: 'pending',
        is_resident_visible: taskTemplate.is_resident_visible,
        requires_staff_action: taskTemplate.requires_staff_action,
        // Set due date: 14 days from now for most, 7 days for urgent
        due_date: new Date(
          now.getTime() + (taskTemplate.priority === 'urgent' ? 7 : 14) * 24 * 60 * 60 * 1000
        ).toISOString().split('T')[0],
      };

      const created = await base44.asServiceRole.entities.ServiceTask.create(taskData);
      createdTasks.push(created);
    }

    return Response.json({
      success: true,
      message: `Generated ${createdTasks.length} onboarding tasks for resident`,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('Error generating onboarding tasks:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
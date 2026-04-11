import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[Seed Classes] Starting...');

    const existing = await base44.entities.LearningClass.list();
    if (existing.length >= 5) {
      return Response.json({
        success: true,
        message: `Classes already seeded (${existing.length} exist).`,
        count: existing.length,
      });
    }

    const classes = [
      {
        title: 'Welcome & Orientation',
        category: 'orientation',
        description: 'Learn about the program, your rights, and what support is available to you.',
        estimated_minutes: 45,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: true,
        is_active: true,
        status: 'published',
        learning_objectives: ['Understand program rules', 'Know who to contact for help', 'Feel comfortable in the program'],
        tags: ['orientation', 'intake'],
      },
      {
        title: 'How to Write a Resume',
        category: 'employment',
        description: 'Step-by-step guide to creating a resume that gets noticed by employers.',
        estimated_minutes: 60,
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['List your job history clearly', 'Write a strong summary', 'Format your resume correctly'],
        tags: ['resume', 'job_readiness', 'employment'],
        youtube_search_phrase: 'how to write a resume for beginners',
      },
      {
        title: 'Interview Skills Basics',
        category: 'employment',
        description: 'Practice answering common interview questions and learn how to make a great first impression.',
        estimated_minutes: 60,
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['Answer "Tell me about yourself"', 'Dress for success', 'Follow up after an interview'],
        tags: ['interview', 'job_readiness'],
        youtube_search_phrase: 'job interview tips for beginners',
      },
      {
        title: 'Using Email and the Internet',
        category: 'digital_literacy',
        description: 'Learn how to send emails, search the web, and stay safe online.',
        estimated_minutes: 60,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['Create and use an email account', 'Search for jobs online', 'Protect your personal information'],
        tags: ['digital_literacy', 'email', 'internet'],
        youtube_search_phrase: 'how to use email for beginners',
      },
      {
        title: 'Budgeting: Making Your Money Work',
        category: 'financial_literacy',
        description: 'Understand where your money goes and how to plan for the future with a simple budget.',
        estimated_minutes: 45,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['Track your income and expenses', 'Create a simple monthly budget', 'Save for emergencies'],
        tags: ['budgeting', 'financial_literacy', 'money'],
        youtube_search_phrase: 'budgeting for beginners simple',
      },
      {
        title: 'Understanding Your Rights as a Tenant',
        category: 'housing',
        description: 'Know your rights when renting a home and what to do if there are problems.',
        estimated_minutes: 45,
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['Understand your lease', 'Know your rights if your landlord has problems', 'Report unsafe housing conditions'],
        tags: ['housing', 'tenant_rights'],
      },
      {
        title: 'Managing Stress and Emotions at Work',
        category: 'wellness',
        description: 'Practical tools for staying calm, focused, and resilient in challenging situations.',
        estimated_minutes: 30,
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['Identify stress triggers', 'Use breathing and grounding techniques', 'Ask for help when needed'],
        tags: ['wellness', 'mental_health', 'work_skills'],
      },
      {
        title: 'Getting Your State ID or Driver\'s License',
        category: 'documentation',
        description: 'Step-by-step guide to getting your government-issued ID or driver\'s license.',
        estimated_minutes: 30,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        is_active: true,
        status: 'published',
        learning_objectives: ['Know what documents you need', 'Find your local DMV', 'Understand the process and fees'],
        tags: ['documentation', 'state_id', 'dmv'],
      },
    ];

    const created = [];
    for (const classData of classes) {
      const result = await base44.entities.LearningClass.create({
        ...classData,
        organization_id: user.organization_id,
        created_by: user.email,
        passing_score: 70,
      });
      created.push({ id: result.id, title: classData.title });
      console.log(`[Seed Classes] ✓ ${classData.title}`);
    }

    return Response.json({
      success: true,
      created: created.length,
      classes: created,
      message: `Successfully created ${created.length} learning classes`,
    });
  } catch (error) {
    console.error('[Seed Classes] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
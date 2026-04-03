import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Seed Classes] Starting class creation...');

    const classes = [
      // ORIENTATION
      {
        category: 'orientation',
        title: 'Welcome to the Program',
        description: 'Get started! Learn what to expect, how to get help, and how to succeed here.',
        estimated_minutes: 15,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: true,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Know who to call for help',
          'Understand program rules and expectations',
          'Know where to find resources',
        ],
        youtube_search_phrase: 'orientation program welcome new resident',
        tags: ['orientation', 'getting_started'],
        quiz_questions: [
          {
            question: 'Who do you call if you have a question?',
            options: ['Your case manager', 'Security', 'Anyone', 'Nobody'],
            correct_answer: 'Your case manager',
            explanation: 'Your case manager is your main contact for support and questions.',
          },
        ],
      },

      // DIGITAL LITERACY - Low support
      {
        category: 'digital_literacy',
        title: 'Using a Computer: Step by Step',
        description: 'Learn the basics of using a computer. No experience needed. We go slow.',
        estimated_minutes: 30,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Turn a computer on and off safely',
          'Use a mouse and keyboard',
          'Open and close programs',
        ],
        youtube_search_phrase: 'basic computer skills for beginners how to use computer',
        tags: ['digital_literacy', 'computer_basics'],
        quiz_questions: [
          {
            question: 'What do you click with a mouse?',
            options: ['Buttons on screen', 'The keyboard', 'The monitor', 'The desk'],
            correct_answer: 'Buttons on screen',
            explanation: 'A mouse helps you click buttons and icons on your screen.',
          },
        ],
      },

      {
        category: 'digital_literacy',
        title: 'Typing and Email Basics',
        description: 'Learn to send emails. This is important for jobs and staying in touch.',
        estimated_minutes: 25,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Type simple messages',
          'Send and receive emails',
          'Know email safety basics',
        ],
        youtube_search_phrase: 'how to send email for beginners email basics',
        tags: ['digital_literacy', 'email'],
      },

      // EMPLOYMENT
      {
        category: 'employment',
        title: 'Building Your Resume',
        description: 'Create a simple, clear resume that shows what you can do.',
        estimated_minutes: 45,
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Write about your work experience clearly',
          'List your skills',
          'Format a simple resume',
        ],
        youtube_search_phrase: 'how to write a resume for beginners simple resume example',
        tags: ['employment', 'resume', 'job_search'],
        quiz_questions: [
          {
            question: 'What should be in your resume?',
            options: [
              'Your work history and skills',
              'Your social media',
              'Your medical information',
              'Your family names',
            ],
            correct_answer: 'Your work history and skills',
            explanation: 'A resume shows your experience and abilities for a job.',
          },
        ],
      },

      {
        category: 'employment',
        title: 'Interview Tips: How to Succeed',
        description: 'Learn what to do and say at a job interview. Feel confident.',
        estimated_minutes: 35,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Dress and prepare for an interview',
          'Answer tough interview questions',
          'Make a good first impression',
        ],
        youtube_search_phrase: 'job interview tips for beginners how to succeed at interview',
        tags: ['employment', 'interview'],
      },

      {
        category: 'employment',
        title: 'Keeping Your Job: 90 Days and Beyond',
        description: 'Tips for doing well at work and staying in your job long-term.',
        estimated_minutes: 30,
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Understand job expectations',
          'Get along with coworkers',
          'Handle problems at work',
        ],
        youtube_search_phrase: 'workplace skills keeping your job long term',
        tags: ['employment', 'job_retention'],
      },

      // HOUSING
      {
        category: 'housing',
        title: 'Finding and Keeping Housing',
        description: 'Learn how to find safe, affordable housing and stay stable.',
        estimated_minutes: 40,
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Know your rights as a renter',
          'Find housing you can afford',
          'Build a good rental history',
        ],
        youtube_search_phrase: 'tenant rights affordable housing for low income',
        tags: ['housing', 'stability'],
      },

      // FINANCIAL LITERACY
      {
        category: 'financial_literacy',
        title: 'Money Basics: Save and Budget',
        description: 'Manage your money wisely. Simple tips for saving and spending.',
        estimated_minutes: 35,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Understand money and budgeting',
          'Pay bills on time',
          'Start saving money',
        ],
        youtube_search_phrase: 'personal finance basics budgeting for beginners',
        tags: ['financial_literacy', 'budgeting'],
      },

      {
        category: 'financial_literacy',
        title: 'Understanding Credit and Debt',
        description: 'Learn about credit scores and how to handle debt wisely.',
        estimated_minutes: 30,
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Know your credit score',
          'Manage debt responsibly',
          'Build good credit',
        ],
        youtube_search_phrase: 'credit score debt management for beginners',
        tags: ['financial_literacy', 'credit'],
      },

      // AI LITERACY
      {
        category: 'ai_literacy',
        title: 'What is AI? A Simple Guide',
        description: 'Learn about artificial intelligence in plain language. No tech experience needed.',
        estimated_minutes: 20,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Understand what AI is',
          'See how AI is used in daily life',
          'Know when AI is helping you',
        ],
        youtube_search_phrase: 'artificial intelligence explained for beginners what is AI',
        tags: ['ai_literacy', 'technology'],
      },

      {
        category: 'ai_literacy',
        title: 'Using AI Tools to Get a Job',
        description: 'Learn to use AI to help with your job search, resume, and interview prep.',
        estimated_minutes: 40,
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Use ChatGPT or similar tools safely',
          'Get AI help with resume writing',
          'Practice interviews with AI',
        ],
        youtube_search_phrase: 'how to use ChatGPT for job search resume writing',
        tags: ['ai_literacy', 'employment'],
      },

      // LIFE SKILLS
      {
        category: 'life_skills',
        title: 'Taking Care of Your Health',
        description: 'Learn about physical and mental health. Keep yourself well.',
        estimated_minutes: 30,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Understand healthy habits',
          'Find health services',
          'Know when to get help',
        ],
        youtube_search_phrase: 'personal health wellness tips healthy living',
        tags: ['life_skills', 'health'],
      },

      {
        category: 'life_skills',
        title: 'Managing Stress and Emotions',
        description: 'Simple tools to handle stress, anger, and tough feelings.',
        estimated_minutes: 25,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Recognize stress and emotions',
          'Use calming techniques',
          'Get help when needed',
        ],
        youtube_search_phrase: 'stress management emotional wellness coping skills',
        tags: ['life_skills', 'mental_health'],
      },

      // WELLNESS
      {
        category: 'wellness',
        title: 'Building Stability in Your Life',
        description: 'Create routines and habits that keep you stable and healthy.',
        estimated_minutes: 30,
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Create healthy daily routines',
          'Build support networks',
          'Set realistic goals',
        ],
        youtube_search_phrase: 'building healthy routines daily habits success',
        tags: ['wellness', 'stability'],
      },

      // DOCUMENTATION
      {
        category: 'documentation',
        title: 'Important Documents: What You Need',
        description: 'Learn what documents matter and how to get them.',
        estimated_minutes: 25,
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        is_required: false,
        status: 'published',
        is_active: true,
        learning_objectives: [
          'Know what documents you need',
          'Understand how to get ID',
          'Keep your documents safe',
        ],
        youtube_search_phrase: 'how to get ID documents birth certificate',
        tags: ['documentation', 'identity'],
      },
    ];

    const created = [];
    for (const cls of classes) {
      try {
        const result = await base44.entities.LearningClass.create({
          ...cls,
          organization_id: user.organization_id,
          created_by: user.email,
        });
        created.push({ id: result.id, title: cls.title });
        console.log(`[Seed Classes] Created: ${cls.title}`);
      } catch (e) {
        console.error(`[Seed Classes] Failed to create ${cls.title}:`, e.message);
      }
    }

    console.log(`[Seed Classes] Completed. Created ${created.length} classes.`);

    return Response.json({
      success: true,
      created: created.length,
      total: classes.length,
      classes: created,
      message: `Created ${created.length} learning classes successfully`,
    });
  } catch (error) {
    console.error('[Seed Classes] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
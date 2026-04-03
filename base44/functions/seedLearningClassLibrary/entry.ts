import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Seed Class Library] Starting comprehensive class creation...');

    const classes = [
      // ORIENTATION & PROGRAM SUCCESS
      {
        category: 'orientation',
        title: 'How This Program Works',
        description: 'Learn what this program is, what we offer, and how to get the most from it.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand the program structure and timeline',
          'Know what support is available to you',
          'Understand how to access program resources',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'job training program orientation what to expect',
        tags: ['orientation', 'getting_started'],
        is_required: true,
      },

      {
        category: 'orientation',
        title: 'Expectations, Accountability, and Progress',
        description: 'Understand what is expected of you and how we measure your progress toward success.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know the expectations and rules',
          'Understand accountability and consequences',
          'Learn how progress is tracked',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'program expectations accountability goals tracking',
        tags: ['orientation', 'expectations'],
        is_required: true,
      },

      {
        category: 'orientation',
        title: 'How to Ask for Help',
        description: 'Learn who to contact, when to ask, and how to get the support you need.',
        estimated_minutes: 10,
        learning_objectives: [
          'Know who to contact with different types of questions',
          'Understand how to ask for help clearly',
          'Know what resources are available',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'asking for help communication tips',
        tags: ['orientation', 'support'],
        is_required: true,
      },

      {
        category: 'orientation',
        title: 'Goal Setting for Beginners',
        description: 'Learn to set goals that are clear, realistic, and achievable.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand what makes a good goal',
          'Learn to break big goals into small steps',
          'Develop your first program goal',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'goal setting for beginners smart goals',
        tags: ['orientation', 'goals'],
      },

      {
        category: 'orientation',
        title: 'How to Complete Tasks in the App',
        description: 'Learn to use this app, complete assignments, and track your progress.',
        estimated_minutes: 15,
        learning_objectives: [
          'Navigate the app successfully',
          'Understand how to complete tasks and assignments',
          'Know how to submit work for review',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'using learning management system app tutorial',
        tags: ['orientation', 'technology'],
      },

      // EMPLOYMENT BASICS
      {
        category: 'employment',
        title: 'What a Job Is and How Work Works',
        description: 'Understand what employment is, different types of jobs, and how work relationships work.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know what employment means and different job types',
          'Understand employer and employee responsibilities',
          'Know basic workplace terminology',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'types of jobs employment full time part time explained',
        tags: ['employment', 'basics'],
      },

      {
        category: 'employment',
        title: 'How to Search for Jobs',
        description: 'Learn where to find jobs, how to use job websites, and how to find opportunities.',
        estimated_minutes: 30,
        learning_objectives: [
          'Know where jobs are posted',
          'Learn to use job search websites',
          'Understand how to identify good job opportunities',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to search for jobs online job boards LinkedIn',
        tags: ['employment', 'job_search'],
      },

      {
        category: 'employment',
        title: 'How to Fill Out a Job Application',
        description: 'Learn to complete applications correctly and completely.',
        estimated_minutes: 25,
        learning_objectives: [
          'Understand what information to prepare',
          'Know how to fill out applications accurately',
          'Understand what not to lie about on applications',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to fill out job application tips',
        tags: ['employment', 'job_search'],
      },

      {
        category: 'employment',
        title: 'Resume Basics',
        description: 'Learn to create a simple, clear resume that shows your skills and experience.',
        estimated_minutes: 35,
        learning_objectives: [
          'Understand what goes on a resume',
          'Learn to highlight your strengths',
          'Know how to format a simple resume',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'resume basics how to write resume for beginners',
        tags: ['employment', 'resume'],
      },

      {
        category: 'employment',
        title: 'Interview Basics',
        description: 'Learn what to expect in an interview and how to prepare.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know what to expect at an interview',
          'Understand what to bring and how to prepare',
          'Know how to make a good first impression',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'job interview tips first time interview preparation',
        tags: ['employment', 'interview'],
      },

      {
        category: 'employment',
        title: 'How to Answer Common Interview Questions',
        description: 'Practice answering questions you will likely be asked in interviews.',
        estimated_minutes: 30,
        learning_objectives: [
          'Know how to answer "Tell me about yourself"',
          'Understand how to answer about strengths and weaknesses',
          'Learn to answer about your work history',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'common interview questions and answers examples',
        tags: ['employment', 'interview'],
      },

      {
        category: 'employment',
        title: 'Workplace Communication',
        description: 'Learn to communicate effectively with coworkers and supervisors.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand professional communication styles',
          'Learn to ask for help at work',
          'Know how to report problems politely',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'workplace communication professional communication skills',
        tags: ['employment', 'workplace_skills'],
      },

      {
        category: 'employment',
        title: 'How to Keep a Job',
        description: 'Learn habits and behaviors that help you succeed and stay employed.',
        estimated_minutes: 25,
        learning_objectives: [
          'Understand what employers value in employees',
          'Learn to manage your time at work',
          'Know how to handle feedback and improvement',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to keep a job job retention tips success',
        tags: ['employment', 'job_retention'],
      },

      {
        category: 'employment',
        title: 'Attendance and Punctuality',
        description: 'Understand why showing up on time matters and how to build this habit.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand why attendance is critical',
          'Learn to plan to be on time',
          'Know how to handle absences and tardiness',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'workplace attendance punctuality time management',
        tags: ['employment', 'workplace_skills'],
      },

      {
        category: 'employment',
        title: 'Professionalism at Work',
        description: 'Learn what professionalism means and how to be professional at work.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand professional dress codes and appearance',
          'Know professional behavior expectations',
          'Learn workplace etiquette basics',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'professionalism at work workplace etiquette professional behavior',
        tags: ['employment', 'workplace_skills'],
      },

      {
        category: 'employment',
        title: 'What Employers Expect',
        description: 'Understand the key things employers want from their employees.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know what skills employers seek',
          'Understand employer expectations',
          'Learn what can get you fired',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'what employers want from employees work expectations',
        tags: ['employment', 'workplace_skills'],
      },

      {
        category: 'employment',
        title: 'How to Talk About Gaps in Employment',
        description: 'Learn to address employment gaps honestly and positively in interviews.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand what employment gaps are',
          'Learn honest ways to discuss gaps',
          'Know how to frame gaps positively',
        ],
        difficulty_level: 'intermediate',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'explaining employment gaps interview how to discuss job history',
        tags: ['employment', 'interview'],
      },

      {
        category: 'employment',
        title: 'How to Talk About Justice Involvement Professionally',
        description: 'Learn honest, effective ways to discuss justice involvement with employers.',
        estimated_minutes: 25,
        learning_objectives: [
          'Understand disclosure requirements and rights',
          'Learn to discuss honestly without oversharing',
          'Know second-chance friendly employer resources',
        ],
        difficulty_level: 'intermediate',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'discussing criminal record job interview second chance hiring',
        tags: ['employment', 'interview'],
      },

      // HOUSING STABILITY
      {
        category: 'housing',
        title: 'How Housing Programs Work',
        description: 'Understand different housing programs, what they offer, and how to qualify.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know different types of housing assistance',
          'Understand program requirements and timelines',
          'Know how to apply for housing programs',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'housing assistance programs affordable housing how to apply',
        tags: ['housing', 'resources'],
      },

      {
        category: 'housing',
        title: 'What You Need to Rent a Place',
        description: 'Learn what landlords require to rent you an apartment.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand income requirements and ratios',
          'Know what documents landlords request',
          'Learn about credit checks and references',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'renting apartment requirements income credit check',
        tags: ['housing', 'renting'],
      },

      {
        category: 'housing',
        title: 'Understanding Leases',
        description: 'Learn to read and understand a lease agreement.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know what is in a lease',
          'Understand your responsibilities',
          'Know what to ask about before signing',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'lease agreement explanation what is in a lease',
        tags: ['housing', 'renting'],
      },

      {
        category: 'housing',
        title: 'Tenant Rights and Responsibilities',
        description: 'Understand your legal rights as a renter and what you are responsible for.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know your rights as a tenant',
          'Understand landlord responsibilities',
          'Know how to protect yourself legally',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'tenant rights and responsibilities landlord tenant law',
        tags: ['housing', 'legal'],
      },

      {
        category: 'housing',
        title: 'How to Communicate with a Landlord',
        description: 'Learn to communicate effectively and professionally with your landlord.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to report maintenance issues',
          'Learn to ask for things you need',
          'Understand how to handle disagreements',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'communicating with landlord tenant landlord communication',
        tags: ['housing', 'communication'],
      },

      {
        category: 'housing',
        title: 'How to Avoid Eviction',
        description: 'Learn to prevent eviction and what to do if you receive an eviction notice.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know what causes eviction',
          'Learn to pay rent on time',
          'Understand what to do if eviction is threatened',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to avoid eviction eviction prevention tenant rights',
        tags: ['housing', 'stability'],
      },

      {
        category: 'housing',
        title: 'How to Set Up Utilities',
        description: 'Learn to set up and manage electricity, water, gas, and internet.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to apply for utilities',
          'Understand deposits and deposits',
          'Know how to pay utility bills',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'how to set up utilities electricity water gas account',
        tags: ['housing', 'practical'],
      },

      {
        category: 'housing',
        title: 'How to Keep a Clean and Safe Living Space',
        description: 'Learn basic cleaning and safety habits to maintain your home.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know basic cleaning and organization',
          'Understand safety and pest prevention',
          'Learn to spot maintenance problems',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'apartment cleaning apartment maintenance keeping clean',
        tags: ['housing', 'practical'],
      },

      {
        category: 'housing',
        title: 'Roommate Basics and Shared Housing Etiquette',
        description: 'Learn to live successfully with roommates and share spaces respectfully.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know roommate expectations and communication',
          'Understand shared space rules',
          'Learn conflict resolution with roommates',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'living with roommates shared housing etiquette tips',
        tags: ['housing', 'relationships'],
      },

      // FINANCIAL LITERACY
      {
        category: 'financial_literacy',
        title: 'How Money Works',
        description: 'Learn basic money concepts, earning, spending, and saving.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand money and different forms of currency',
          'Know the difference between earning and spending',
          'Understand saving and why it matters',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'money basics personal finance fundamentals',
        tags: ['financial', 'basics'],
      },

      {
        category: 'financial_literacy',
        title: 'Budgeting Basics',
        description: 'Learn to create a simple budget to manage your money.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to list income and expenses',
          'Understand how to create a simple budget',
          'Learn to track your spending',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'budgeting basics how to budget on low income',
        tags: ['financial', 'budgeting'],
      },

      {
        category: 'financial_literacy',
        title: 'Needs vs Wants',
        description: 'Learn to distinguish between what you need and what you want.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand the difference between needs and wants',
          'Learn to prioritize spending',
          'Know how to delay gratification',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'needs vs wants financial literacy budgeting',
        tags: ['financial', 'budgeting'],
      },

      {
        category: 'financial_literacy',
        title: 'How to Use a Bank Account',
        description: 'Learn to open and use a bank account to manage your money safely.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to choose and open a bank account',
          'Understand checking and savings accounts',
          'Learn to use online banking safely',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to open bank account banking basics',
        tags: ['financial', 'banking'],
      },

      {
        category: 'financial_literacy',
        title: 'How Debit Cards Work',
        description: 'Learn to use debit cards safely and understand how they work.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand how debit cards work',
          'Learn to use debit cards safely',
          'Know how to monitor your account',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how debit cards work using debit card safely',
        tags: ['financial', 'banking'],
      },

      {
        category: 'financial_literacy',
        title: 'How Credit Works',
        description: 'Learn what credit is, how credit scores work, and why it matters.',
        estimated_minutes: 25,
        learning_objectives: [
          'Understand what credit is',
          'Know what a credit score measures',
          'Understand why credit matters',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'credit score credit report how credit works explained',
        tags: ['financial', 'credit'],
      },

      {
        category: 'financial_literacy',
        title: 'How to Build Credit Safely',
        description: 'Learn responsible ways to build and improve your credit.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know ways to build credit safely',
          'Understand secured credit cards',
          'Learn to use credit wisely',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to build credit safely credit building strategies',
        tags: ['financial', 'credit'],
      },

      {
        category: 'financial_literacy',
        title: 'How to Avoid Debt Traps',
        description: 'Learn to recognize and avoid predatory lending and debt traps.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know what predatory lending looks like',
          'Understand high-interest traps',
          'Learn safe borrowing alternatives',
        ],
        difficulty_level: 'intermediate',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'predatory lending debt traps payday loans to avoid',
        tags: ['financial', 'debt'],
      },

      {
        category: 'financial_literacy',
        title: 'Understanding Fees, Bills, and Due Dates',
        description: 'Learn to understand financial charges and manage bill payments.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know what different fees are',
          'Understand bills and how to pay them',
          'Learn the importance of due dates',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'understanding bank fees bills due dates',
        tags: ['financial', 'bills'],
      },

      {
        category: 'financial_literacy',
        title: 'How to Save Even with Low Income',
        description: 'Learn practical strategies to save money on a tight budget.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know ways to save without much money',
          'Understand emergency funds',
          'Learn long-term saving strategies',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to save money on low income savings tips',
        tags: ['financial', 'savings'],
      },

      {
        category: 'financial_literacy',
        title: 'First Paycheck Planning',
        description: 'Learn what to expect from your first paycheck and how to use it wisely.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand paycheck deductions',
          'Learn to plan for your first paycheck',
          'Know immediate actions to take',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'first paycheck what to do first job paycheck',
        tags: ['financial', 'employment'],
      },

      // DIGITAL LITERACY
      {
        category: 'digital_literacy',
        title: 'Basic Computer Skills',
        description: 'Learn how to use a computer from the beginning. No experience needed.',
        estimated_minutes: 35,
        learning_objectives: [
          'Know how to turn a computer on and off',
          'Understand how to use a mouse and keyboard',
          'Learn to open and close programs',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'basic computer skills for beginners using a computer',
        tags: ['digital', 'computer'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Use a Smartphone for Work Tasks',
        description: 'Learn to use a smartphone to apply for jobs and handle work tasks.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know basic smartphone functions',
          'Learn to download and use apps',
          'Understand how to use phone for job tasks',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'smartphone basics for beginners smartphone tutorial',
        tags: ['digital', 'mobile'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Create and Use an Email Address',
        description: 'Learn to create your own email account and understand how email works.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to create an email account',
          'Understand email parts and terminology',
          'Learn email security basics',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'how to create email account Gmail Yahoo',
        tags: ['digital', 'email'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Send an Email',
        description: 'Learn to send professional emails for work and communication.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to compose an email',
          'Understand email etiquette',
          'Learn to send emails successfully',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'how to send email tutorial professional email',
        tags: ['digital', 'email'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Attach a File',
        description: 'Learn to attach documents and files to emails.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to attach files to emails',
          'Understand file size limits',
          'Learn to find and select files',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to attach file to email attachment tutorial',
        tags: ['digital', 'email'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Reset a Password',
        description: 'Learn to change and reset passwords when you forget them.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to change a password',
          'Learn to reset a forgotten password',
          'Understand password security',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to reset password change password tutorial',
        tags: ['digital', 'security'],
      },

      {
        category: 'digital_literacy',
        title: 'Internet Safety Basics',
        description: 'Learn to use the internet safely and protect your personal information.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know internet scams and phishing',
          'Understand password security',
          'Learn what information to protect online',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'internet safety tips online security for beginners',
        tags: ['digital', 'security'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Fill Out Online Forms',
        description: 'Learn to complete online job applications and forms correctly.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to find and access online forms',
          'Learn to complete forms accurately',
          'Understand required vs optional fields',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to fill out online forms job application',
        tags: ['digital', 'applications'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Search for Jobs Online',
        description: 'Learn to search job websites and find opportunities online.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know popular job search websites',
          'Learn to use search filters',
          'Understand how to evaluate job postings',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to search for jobs online job search websites',
        tags: ['digital', 'job_search'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Use Google Docs',
        description: 'Learn to create and edit documents online using Google Docs.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to create a Google Doc',
          'Learn basic formatting and editing',
          'Understand how to share documents',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to use Google Docs tutorial online documents',
        tags: ['digital', 'tools'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Use Microsoft Word',
        description: 'Learn to create and format documents using Microsoft Word.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know basic Word functions',
          'Learn to format documents',
          'Understand how to save and print',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to use Microsoft Word tutorial for beginners',
        tags: ['digital', 'tools'],
      },

      {
        category: 'digital_literacy',
        title: 'How to Upload Documents',
        description: 'Learn to upload files and documents to websites and applications.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to find documents on your computer',
          'Learn to upload files to websites',
          'Understand file formats and sizes',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to upload file to website upload documents',
        tags: ['digital', 'files'],
      },

      // AI LITERACY
      {
        category: 'ai_literacy',
        title: 'What AI Is in Plain English',
        description: 'Learn what AI is, how it works, and where you see it in daily life.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand what AI is in simple terms',
          'Know examples of AI in everyday life',
          'Understand AI limitations and risks',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'what is artificial intelligence AI explained simply',
        tags: ['ai', 'basics'],
      },

      {
        category: 'ai_literacy',
        title: 'How to Use AI Safely',
        description: 'Learn to use AI tools like ChatGPT safely and responsibly.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know what AI can and cannot do',
          'Understand privacy and data safety with AI',
          'Learn not to share sensitive information',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to use ChatGPT safely AI safety privacy',
        tags: ['ai', 'safety'],
      },

      {
        category: 'ai_literacy',
        title: 'How to Use AI to Write a Resume',
        description: 'Learn to use AI tools to help write and improve your resume.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to use AI for resume help',
          'Understand what AI gets right and wrong',
          'Learn to edit AI-generated resume content',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to use ChatGPT to write resume resume help AI',
        tags: ['ai', 'employment'],
      },

      {
        category: 'ai_literacy',
        title: 'How to Use AI to Practice Interview Questions',
        description: 'Learn to use AI to practice interviewing and get feedback.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to practice with AI',
          'Learn to get interview feedback from AI',
          'Understand how to improve your answers',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'practice interview with AI ChatGPT interview coach',
        tags: ['ai', 'employment'],
      },

      {
        category: 'ai_literacy',
        title: 'How to Use AI for Budgeting Help',
        description: 'Learn to use AI tools to help with budgeting and financial planning.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to ask AI for budget help',
          'Learn to use AI for expense tracking ideas',
          'Understand financial advice from AI',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'use AI ChatGPT budgeting financial planning money',
        tags: ['ai', 'financial'],
      },

      {
        category: 'ai_literacy',
        title: 'How to Use AI for Housing Search Support',
        description: 'Learn to use AI to help search for housing and understand rentals.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to ask AI about housing',
          'Learn to understand lease questions with AI',
          'Understand housing advice from AI',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'use AI for housing search renting advice',
        tags: ['ai', 'housing'],
      },

      {
        category: 'ai_literacy',
        title: 'What Not to Share with AI',
        description: 'Learn what personal information you should never share with AI.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know what personal data to protect',
          'Understand AI privacy limits',
          'Learn safe practices with AI tools',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'AI privacy what not to tell AI ChatGPT security',
        tags: ['ai', 'safety'],
      },

      {
        category: 'ai_literacy',
        title: 'How to Ask AI Better Questions',
        description: 'Learn to ask AI questions in ways that get better answers.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to write clear prompts',
          'Understand how to get better AI responses',
          'Learn to refine your questions',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to prompt ChatGPT better prompts AI questions',
        tags: ['ai', 'skills'],
      },

      // LIFE SKILLS
      {
        category: 'life_skills',
        title: 'Time Management Basics',
        description: 'Learn to manage your time and get things done on schedule.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand how to plan your day',
          'Learn to prioritize tasks',
          'Know how to avoid procrastination',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'time management for beginners how to manage time',
        tags: ['life_skills', 'productivity'],
      },

      {
        category: 'life_skills',
        title: 'Communication Skills',
        description: 'Learn to communicate clearly and effectively with others.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to listen actively',
          'Learn to express yourself clearly',
          'Understand body language basics',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'communication skills how to communicate effectively',
        tags: ['life_skills', 'relationships'],
      },

      {
        category: 'life_skills',
        title: 'Healthy Boundaries',
        description: 'Learn to set and maintain healthy boundaries with others.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand what boundaries are',
          'Learn to say no respectfully',
          'Know how to protect your personal space',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'healthy boundaries how to set boundaries',
        tags: ['life_skills', 'relationships'],
      },

      {
        category: 'life_skills',
        title: 'Conflict Resolution',
        description: 'Learn to handle disagreements calmly and find solutions.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know conflict resolution steps',
          'Learn to listen to others\' views',
          'Understand how to find compromise',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'conflict resolution techniques how to resolve disagreements',
        tags: ['life_skills', 'relationships'],
      },

      {
        category: 'life_skills',
        title: 'Stress Management',
        description: 'Learn practical techniques to manage stress and feel calmer.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know signs of stress in your body',
          'Learn breathing and relaxation techniques',
          'Understand when to get professional help',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'stress management techniques relaxation exercises',
        tags: ['life_skills', 'wellness'],
      },

      {
        category: 'life_skills',
        title: 'Emotional Regulation',
        description: 'Learn to understand and manage your emotions in healthy ways.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to identify emotions',
          'Learn to express emotions appropriately',
          'Understand coping strategies',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'emotional regulation emotion management coping skills',
        tags: ['life_skills', 'wellness'],
      },

      {
        category: 'life_skills',
        title: 'Personal Hygiene and Self-Presentation',
        description: 'Learn importance of hygiene and how to present yourself well.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand daily hygiene practices',
          'Know how to groom for jobs and interviews',
          'Learn self-care habits',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'personal hygiene self-care grooming for jobs',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Basic Household Cleaning',
        description: 'Learn to keep your living space clean and organized.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know basic cleaning routines',
          'Learn how to organize spaces',
          'Understand sanitizing and pest prevention',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'household cleaning tips keep your home clean',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Laundry Basics',
        description: 'Learn to wash and care for your clothes properly.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to sort and wash clothes',
          'Learn how to dry different fabrics',
          'Understand fabric care symbols',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'how to do laundry washing clothes tutorial',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Grocery Shopping Basics',
        description: 'Learn to shop for food efficiently and on a budget.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know how to make a shopping list',
          'Learn to compare prices',
          'Understand how to find deals and coupons',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'grocery shopping tips budget shopping food',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Cooking for Beginners',
        description: 'Learn basic cooking skills to prepare simple, healthy meals.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know basic cooking techniques',
          'Learn food safety and hygiene',
          'Understand how to follow recipes',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'cooking for beginners basic cooking skills recipes',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Meal Planning on a Budget',
        description: 'Learn to plan meals that are healthy, tasty, and affordable.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know how to plan meals',
          'Learn to balance nutrition and budget',
          'Understand meal prep strategies',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'meal planning on a budget healthy budget meals',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Transportation Planning',
        description: 'Learn to plan transportation to work and appointments.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know public transportation options',
          'Learn to use transit apps',
          'Understand backup transportation plans',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'public transportation how to use bus transit',
        tags: ['life_skills', 'practical'],
      },

      {
        category: 'life_skills',
        title: 'Childcare Planning Basics',
        description: 'Learn to arrange childcare and find affordable options.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know childcare options available',
          'Learn to find quality childcare',
          'Understand childcare subsidies',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'childcare options affordable childcare resources',
        tags: ['life_skills', 'parenting'],
      },

      {
        category: 'life_skills',
        title: 'How to Keep Appointments',
        description: 'Learn to manage appointments and stay organized.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know how to schedule appointments',
          'Learn to set reminders',
          'Understand how to reschedule if needed',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'how to keep track of appointments scheduling',
        tags: ['life_skills', 'organization'],
      },

      // WELLNESS / STABILITY
      {
        category: 'wellness',
        title: 'Managing Stress and Triggers',
        description: 'Learn to recognize stress triggers and healthy coping strategies.',
        estimated_minutes: 25,
        learning_objectives: [
          'Know your personal stress triggers',
          'Learn healthy coping strategies',
          'Understand when to get support',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'stress management trigger awareness coping skills',
        tags: ['wellness', 'mental_health'],
      },

      {
        category: 'wellness',
        title: 'Sleep and Daily Routine',
        description: 'Learn to build healthy sleep and daily routines for stability.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand why sleep matters',
          'Learn to create bedtime routines',
          'Understand structured daily routines',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'sleep hygiene healthy sleep routine',
        tags: ['wellness', 'health'],
      },

      {
        category: 'wellness',
        title: 'Building Healthy Habits',
        description: 'Learn to build positive habits that support your success.',
        estimated_minutes: 25,
        learning_objectives: [
          'Understand how habits form',
          'Learn to build small positive habits',
          'Understand how to break bad habits',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'building healthy habits habit formation',
        tags: ['wellness', 'habits'],
      },

      {
        category: 'wellness',
        title: 'Asking for Support Early',
        description: 'Learn to reach out for help before problems get big.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand the importance of early help',
          'Know who to ask for support',
          'Learn to communicate what you need',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'asking for help support resources mental health',
        tags: ['wellness', 'support'],
      },

      {
        category: 'wellness',
        title: 'Recovery-Friendly Work Habits',
        description: 'Learn to succeed at work while protecting your recovery and stability.',
        estimated_minutes: 25,
        learning_objectives: [
          'Understand work demands and balance',
          'Learn to set healthy work boundaries',
          'Know workplace support resources',
        ],
        difficulty_level: 'intermediate',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'work life balance recovery workplace wellness',
        tags: ['wellness', 'employment'],
      },

      {
        category: 'wellness',
        title: 'How to Handle Setbacks',
        description: 'Learn to respond to setbacks and keep moving forward.',
        estimated_minutes: 20,
        learning_objectives: [
          'Understand setbacks as normal',
          'Learn resilience and recovery steps',
          'Know when to ask for professional help',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'resilience handling setbacks bouncing back',
        tags: ['wellness', 'mindset'],
      },

      // DOCUMENTATION & ID
      {
        category: 'documentation',
        title: 'Why ID and Documents Matter',
        description: 'Learn why documentation is important for jobs, housing, and services.',
        estimated_minutes: 15,
        learning_objectives: [
          'Understand what documents you need',
          'Know why documents are important',
          'Learn the consequences of missing documents',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'important documents identity ID why you need documents',
        tags: ['documentation', 'identity'],
      },

      {
        category: 'documentation',
        title: 'How to Get a State ID',
        description: 'Learn the steps to get a state ID card or driver\'s license.',
        estimated_minutes: 20,
        learning_objectives: [
          'Know what you need to get ID',
          'Understand the application process',
          'Learn where to apply for ID',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to get state ID driver license application',
        tags: ['documentation', 'identity'],
      },

      {
        category: 'documentation',
        title: 'How to Get a Birth Certificate',
        description: 'Learn to obtain a certified copy of your birth certificate.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know why you need a birth certificate',
          'Understand how to request one',
          'Know where to apply',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to get birth certificate vital records',
        tags: ['documentation', 'identity'],
      },

      {
        category: 'documentation',
        title: 'How to Replace a Social Security Card',
        description: 'Learn to get a replacement Social Security card if lost or stolen.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know what you need for SSN card',
          'Understand the replacement process',
          'Know how to apply',
        ],
        difficulty_level: 'basic',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'how to get social security card replacement',
        tags: ['documentation', 'identity'],
      },

      {
        category: 'documentation',
        title: 'Organizing Important Documents',
        description: 'Learn to keep your documents organized and easy to find.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know what documents to keep',
          'Learn organization systems',
          'Understand document expiration dates',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'low',
        youtube_search_phrase: 'organizing important documents file system',
        tags: ['documentation', 'organization'],
      },

      {
        category: 'documentation',
        title: 'How to Keep Copies Safe',
        description: 'Learn secure ways to store copies of your important documents.',
        estimated_minutes: 15,
        learning_objectives: [
          'Know why copies are important',
          'Learn safe storage methods',
          'Understand backup and security',
        ],
        difficulty_level: 'beginner',
        literacy_level_support: 'standard',
        youtube_search_phrase: 'document security storing important papers safely',
        tags: ['documentation', 'safety'],
      },
    ];

    console.log(`[Seed Class Library] Creating ${classes.length} classes...`);

    const created = [];
    const failed = [];

    for (const cls of classes) {
      try {
        const result = await base44.entities.LearningClass.create({
          ...cls,
          status: 'published',
          is_active: true,
          passing_score: 70,
          organization_id: user.organization_id,
          created_by: user.email,
        });
        created.push({ id: result.id, title: cls.title, category: cls.category });
        console.log(`[Seed Class Library] ✓ ${cls.title}`);
      } catch (e) {
        failed.push({ title: cls.title, error: e.message });
        console.error(`[Seed Class Library] ✗ ${cls.title}:`, e.message);
      }
    }

    console.log(`[Seed Class Library] Complete. Created ${created.length}/${classes.length} classes.`);

    return Response.json({
      success: true,
      created: created.length,
      failed: failed.length,
      total: classes.length,
      by_category: created.reduce((acc, c) => {
        acc[c.category] = (acc[c.category] || 0) + 1;
        return acc;
      }, {}),
      message: `Successfully created ${created.length} learning classes across 9 categories`,
      classes: created,
    });
  } catch (error) {
    console.error('[Seed Class Library] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
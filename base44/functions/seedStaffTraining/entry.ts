import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Seeds the in-app Staff Training Center with text+quiz tutorials.
 * Filter the resulting LearningClass records with:
 *   base44.entities.LearningClass.filter({ audience: 'staff', category: 'staff_training' })
 *
 * All tutorials are short (5–10 minutes) and text-based to keep video credits free.
 * Each one references real Pathways UI elements so staff learn by doing.
 */
const STAFF_TUTORIALS = [
  {
    track_id: 'staff_training_v1',
    order: 1,
    title: 'Welcome to Pathways: Staff Orientation',
    description: 'Get oriented to the Pathways platform. Learn the major sections and where to find help.',
    estimated_minutes: 5,
    difficulty: 'beginner',
    target_populations: ['all'],
    audience: 'staff',
    category: 'staff_training',
    completion_required: true,
    is_required: true,
    is_active: true,
    status: 'published',
    video_type: 'article',
    learning_objectives: [
      'Identify the major sections of the Pathways platform',
      'Locate the Staff Training Center and the AI assistant',
      'Use the correct terminology when speaking with participants and other staff'
    ],
    content_html: '<h3>Welcome to the Pathways platform</h3><p>Pathways is the complete operating system for Headquarters of Hope. Every participant intake, case note, goal, attendance record, and outcome lives here. As a staff member, this is your daily home base.</p><h4>What you will find in Pathways</h4><ul><li><strong>Dashboard</strong> — your daily snapshot: caseload, alerts, today\'s tasks</li><li><strong>Participants</strong> — full list of people in the program, intake, case management</li><li><strong>Operations</strong> — housing assignments, transportation, resources, partner agencies</li><li><strong>Employment</strong> — job board, employer directory, placement tracking, job matching</li><li><strong>Reporting</strong> — outcomes, metrics, and data for grants and board reports</li><li><strong>Learning Center</strong> — the full curriculum library participants work through</li><li><strong>Communication</strong> — internal messaging, video meetings, document storage</li></ul><h4>Where to find help anytime</h4><p>Click the <strong>graduation cap icon</strong> at the top of any screen to open this Staff Training Center. Click the AI assistant icon (the orange sparkle at the bottom right of any screen) to ask questions in plain language.</p><h4>Key terms you will hear</h4><ul><li><strong>Participant</strong> — anyone enrolled in the program (also called "resident" or "client")</li><li><strong>Case manager</strong> — the staff member assigned to a participant</li><li><strong>Caseload</strong> — the participants assigned to one case manager</li><li><strong>Pathway</strong> — a participant\'s personal plan (goals + classes + milestones)</li><li><strong>Intake</strong> — the structured process of bringing a new participant into the program</li></ul>',
    quiz_questions: [
      {
        question: 'Where do you go to see your daily snapshot of caseload and alerts?',
        options: ['The Dashboard', 'The Reporting page', 'The Settings page'],
        correct_answer: 'The Dashboard',
        explanation: 'Your Dashboard is the first screen you see when you log in. It is designed to give you everything you need at a glance.'
      },
      {
        question: 'What does the graduation cap icon at the top of the screen open?',
        options: ['The Learning Center for participants', 'The Staff Training Center', 'The HOH website'],
        correct_answer: 'The Staff Training Center',
        explanation: 'The graduation cap icon is your in-app help. The participant Learning Center is in the sidebar.'
      },
      {
        question: 'A "Pathway" refers to:',
        options: ['A physical hallway in the building', 'A participant\'s personal plan', 'The mobile app'],
        correct_answer: 'A participant\'s personal plan',
        explanation: 'A Pathway is the personalized plan you build with each participant: their goals, classes, and milestones.'
      }
    ],
    reflection_prompt: 'Which section of Pathways do you think you will use most in your role? Why?'
  },
  {
    track_id: 'staff_training_v1',
    order: 2,
    title: 'Navigating Your Dashboard',
    description: 'Learn what every widget on your dashboard means and the 2-minute morning routine that keeps you ahead.',
    estimated_minutes: 5,
    difficulty: 'beginner',
    target_populations: ['all'],
    audience: 'staff',
    category: 'staff_training',
    completion_required: true,
    is_required: true,
    is_active: true,
    status: 'published',
    video_type: 'article',
    learning_objectives: [
      'Read all four key metric cards on the staff dashboard',
      'Recognize the alerts banner and respond to overdue tasks',
      'Adopt a 2-minute morning dashboard routine'
    ],
    content_html: '<h3>Your Dashboard is your daily home</h3><p>When you log in, the first screen you see is your Dashboard. This is designed to give you everything you need in two glances.</p><h4>The four key metric cards</h4><p>At the top of your dashboard, four cards show the numbers that matter:</p><ul><li><strong>Active Participants</strong> — how many people are currently enrolled</li><li><strong>High Risk</strong> — participants flagged for extra attention</li><li><strong>Overdue Tasks</strong> — anything past its due date</li><li><strong>Employed</strong> — participants currently in active jobs</li></ul><h4>The alerts banner</h4><p>If any tasks are overdue, a red banner appears at the top: <strong>"X overdue task(s) need your attention."</strong> Click it to jump directly to the overdue items.</p><h4>Quick action grid</h4><p>Below the metrics you will see six quick-action buttons: Housing, Transport, Grants, Participants, Case Mgmt, Learning. Click any to jump to that section.</p><h4>Below the fold</h4><p>Scroll down to see:</p><ul><li><strong>Participants Needing Attention</strong> — flagged participants with status</li><li><strong>Today\'s Schedule</strong> — your appointments for today</li></ul><h4>The 2-minute morning routine</h4><p>Best practice: open your dashboard every morning and spend 2 minutes:</p><ol><li>Glance at the four metrics</li><li>Resolve any overdue tasks</li><li>Check today\'s schedule</li><li>Check who needs attention</li></ol><p>That is it. Your day is set.</p>',
    quiz_questions: [
      {
        question: 'What does a red banner at the top of the dashboard mean?',
        options: ['Server error', 'Overdue tasks need attention', 'Software update is ready'],
        correct_answer: 'Overdue tasks need attention',
        explanation: 'The red banner is your single most important alert. Click it to jump straight to the overdue items.'
      },
      {
        question: 'Which metric is NOT shown on the four key metric cards?',
        options: ['Active Participants', 'High Risk', 'Total Donations Received'],
        correct_answer: 'Total Donations Received',
        explanation: 'Donations live in the Funding section under admin tools, not on the staff dashboard.'
      },
      {
        question: 'What is the recommended morning routine?',
        options: ['30 minutes of deep review', 'A 2-minute scan and resolve overdue', 'Wait for someone to call you'],
        correct_answer: 'A 2-minute scan and resolve overdue',
        explanation: 'Two minutes a day on the dashboard prevents bigger problems later in the week.'
      }
    ],
    reflection_prompt: 'Did your dashboard show any overdue tasks today? What is your plan to clear them?'
  },
  {
    track_id: 'staff_training_v1',
    order: 3,
    title: 'How to Add a New Participant (Intake)',
    description: 'Walk through the intake process from clicking New Intake to confirming the participant is in the system.',
    estimated_minutes: 10,
    difficulty: 'beginner',
    target_populations: ['all'],
    audience: 'staff',
    category: 'staff_training',
    completion_required: true,
    is_required: true,
    is_active: true,
    status: 'published',
    video_type: 'article',
    learning_objectives: [
      'Locate the New Intake button',
      'Complete the required intake fields correctly',
      'Confirm the participant has been created and assigned'
    ],
    content_html: '<h3>Adding a new participant</h3><p>When someone enters our program — from a treatment center, prison release, the streets, or a referral — the very first task is intake. This is how we get them into the system so we can start helping them.</p><h4>Step 1: Click New Intake</h4><p>From your Dashboard, click the orange <strong>+ New Intake</strong> button at the top right. This opens the intake form.</p><h4>Step 2: Fill the required fields</h4><p>The form will guide you. Required fields include:</p><ul><li>Full legal name</li><li>Date of birth</li><li>Date of arrival at the program</li><li>Referral source (where did they come from?)</li><li>Target populations (reentry, recovery, veteran, homeless, at-risk)</li><li>Emergency contact</li></ul><h4>Step 3: Add what you know</h4><p>Optional but helpful at intake:</p><ul><li>Phone number</li><li>Identification status (do they have ID, birth cert, SSN?)</li><li>Active barriers (no ID, no phone, no transportation, etc.)</li><li>Medical or recovery flags</li></ul><h4>Step 4: Assign a case manager</h4><p>You can assign yourself or another case manager. The participant will appear on that case manager\'s caseload immediately.</p><h4>Step 5: Confirm</h4><p>After saving, the participant appears in <strong>All Participants</strong> with status <strong>active</strong>. From there you can open their profile and start their Pathway.</p><h4>If you make a mistake</h4><p>Profile fields can be edited later. The only field you cannot change after creation is the participant ID number (auto-generated).</p>',
    quiz_questions: [
      {
        question: 'Where do you click to start a new participant intake?',
        options: ['The Reporting tab', 'The orange + New Intake button at the top right', 'The Help icon'],
        correct_answer: 'The orange + New Intake button at the top right',
        explanation: 'The New Intake button is on the Dashboard and on the All Participants page.'
      },
      {
        question: 'Which is NOT a required field at intake?',
        options: ['Full legal name', 'Date of birth', 'Phone number'],
        correct_answer: 'Phone number',
        explanation: 'Phone is optional at intake because many participants do not have a phone yet on day one.'
      },
      {
        question: 'After saving, where does the new participant appear?',
        options: ['Nowhere until approved', 'In All Participants with active status', 'Only in the case manager\'s email'],
        correct_answer: 'In All Participants with active status',
        explanation: 'They appear immediately on the assigned case manager\'s caseload.'
      },
      {
        question: 'Can you edit the profile after intake?',
        options: ['Yes, all fields except participant ID', 'No, intake is permanent', 'Only an admin can'],
        correct_answer: 'Yes, all fields except participant ID',
        explanation: 'Profile fields can be updated as new information becomes available.'
      }
    ],
    reflection_prompt: 'Practice: do an intake for a test participant named "Test Participant" so you have done it once before doing it for real.'
  },
  {
    track_id: 'staff_training_v1',
    order: 4,
    title: 'Creating Case Notes',
    description: 'Learn when to write a case note, the three types of notes, and what makes a good note.',
    estimated_minutes: 8,
    difficulty: 'beginner',
    target_populations: ['all'],
    audience: 'staff',
    category: 'staff_training',
    completion_required: true,
    is_required: true,
    is_active: true,
    status: 'published',
    video_type: 'article',
    learning_objectives: [
      'Identify when a case note is required',
      'Distinguish general, confidential, and probation notes',
      'Write a case note that another staff member could act on'
    ],
    content_html: '<h3>Why case notes matter</h3><p>Case notes are the memory of your work with a participant. If you got hit by a bus tomorrow, the next case manager should be able to read your notes and pick up exactly where you left off. They are also our audit trail for grants, court compliance, and outcomes reporting.</p><h4>When to write a case note</h4><p>Write a note for any meaningful interaction:</p><ul><li>One-on-one meetings or check-ins</li><li>Phone calls about the participant\'s situation</li><li>Witnessing a relapse risk, crisis, or major win</li><li>Any decision you make on their behalf</li><li>Any referral or appointment you set up</li></ul><h4>The three types of notes</h4><ol><li><strong>General note</strong> — visible to all staff working with this participant. Use this for routine check-ins, progress updates, daily observations.</li><li><strong>Confidential note</strong> — visible only to staff (not the participant). Use this for sensitive observations, treatment concerns, things that should not appear on a participant-facing summary.</li><li><strong>Probation note</strong> — visible to the participant\'s assigned probation officer. Created only by probation officers themselves; staff can view if needed.</li></ol><h4>How to add a note</h4><p>Open the participant\'s profile. Click the <strong>Case Notes</strong> tab. Click <strong>+ New Note</strong>. Choose the type, write the note, save.</p><h4>What makes a good case note</h4><ul><li><strong>Date and context first.</strong> When and where did this happen?</li><li><strong>Facts, not feelings.</strong> Write what was said and observed, not your judgment.</li><li><strong>Action items.</strong> What is the next step? Who is doing it?</li><li><strong>Short.</strong> Three to five sentences is usually enough.</li></ul><h4>Example of a good note</h4><p><em>5/1/26 — Met with [participant] for weekly check-in. Reports 5 days clean. Lost his job at the warehouse Friday — says he overslept. Wants help finding new work this week. Action: I will pull 3 second-chance employer leads by Monday and review with him.</em></p>',
    quiz_questions: [
      {
        question: 'When should you write a case note?',
        options: ['Only at month-end', 'After any meaningful interaction with the participant', 'Only if something bad happens'],
        correct_answer: 'After any meaningful interaction with the participant',
        explanation: 'Notes are how the team stays coordinated and how we prove our work.'
      },
      {
        question: 'A confidential note is:',
        options: ['Visible to all staff but not the participant', 'Visible to no one but you', 'Encrypted and unreadable'],
        correct_answer: 'Visible to all staff but not the participant',
        explanation: 'Confidential notes are still visible to all staff working with the participant; they are just hidden from the participant themselves.'
      },
      {
        question: 'Which is the BEST kind of case note?',
        options: ['Long and detailed with feelings', 'Short, factual, with a clear action item', 'A vague "checked in, all good"'],
        correct_answer: 'Short, factual, with a clear action item',
        explanation: 'Three to five sentences with the next step is usually all another staff member needs to take action.'
      },
      {
        question: 'Probation notes are created by:',
        options: ['Any staff member', 'Only probation officers', 'The participant themselves'],
        correct_answer: 'Only probation officers',
        explanation: 'Staff can view probation notes but only the assigned probation officer can create them.'
      }
    ],
    reflection_prompt: 'Pull up a participant you saw this week and add a 4-sentence case note now if you have not already.'
  },
  {
    track_id: 'staff_training_v1',
    order: 5,
    title: 'Tracking Attendance',
    description: 'How to log who showed up to a class, meeting, or appointment — and why this matters for grants and outcomes.',
    estimated_minutes: 5,
    difficulty: 'beginner',
    target_populations: ['all'],
    audience: 'staff',
    category: 'staff_training',
    completion_required: true,
    is_required: true,
    is_active: true,
    status: 'published',
    video_type: 'article',
    learning_objectives: [
      'Locate the attendance entry screen',
      'Mark a participant as present, late, absent, or excused',
      'Understand why attendance data matters'
    ],
    content_html: '<h3>Why we track attendance</h3><p>Attendance data is one of the most-cited metrics in grant reports and funder updates. It also tells us who is engaging with the program and who is at risk of falling off. Honest, consistent attendance entry is a high-leverage staff habit.</p><h4>How to log attendance</h4><p>For a class or scheduled meeting:</p><ol><li>Open the <strong>Learning Center</strong> in the sidebar</li><li>Click the <strong>Attendance</strong> tab</li><li>Find today\'s class or session</li><li>For each enrolled participant, click <strong>Present</strong>, <strong>Late</strong>, <strong>Absent</strong>, or <strong>Excused</strong></li></ol><p>For a 1-on-1 appointment, attendance is logged automatically when you mark the appointment as completed in the participant\'s profile.</p><h4>Definitions</h4><ul><li><strong>Present</strong> — showed up and stayed for the full session</li><li><strong>Late</strong> — showed up, but after the start time. Still counts toward engagement.</li><li><strong>Absent</strong> — did not show up, no advance notice</li><li><strong>Excused</strong> — did not show up, but had a valid reason communicated in advance (work, court, medical)</li></ul><h4>What happens with the data</h4><p>Three things automatically happen when attendance is logged:</p><ul><li>The participant\'s engagement score updates</li><li>Their case manager sees the change in real time</li><li>If they hit two consecutive Absent flags, they are automatically marked High Risk and an alert appears on the case manager\'s dashboard</li></ul>',
    quiz_questions: [
      {
        question: 'Where do you log class attendance?',
        options: ['The Reporting page', 'Learning Center > Attendance tab', 'Settings'],
        correct_answer: 'Learning Center > Attendance tab',
        explanation: 'Attendance is right inside the Learning Center because most attendance is class-based.'
      },
      {
        question: 'What happens after two consecutive Absent flags?',
        options: ['Nothing automatic happens', 'Participant is auto-flagged High Risk', 'Participant is removed from the program'],
        correct_answer: 'Participant is auto-flagged High Risk',
        explanation: 'The system catches disengagement early so the case manager can intervene.'
      },
      {
        question: 'A participant calls in sick the morning of class. You should mark them:',
        options: ['Absent', 'Excused', 'Present'],
        correct_answer: 'Excused',
        explanation: 'Advance communication of a valid reason is the difference between Absent and Excused.'
      }
    ],
    reflection_prompt: 'Are you logging attendance daily? If not, set a recurring reminder at the same time you teach.'
  },
  {
    track_id: 'staff_training_v1',
    order: 6,
    title: 'Crisis Escalation Protocol',
    description: 'What to do when a participant is in crisis. The exact steps, in order. Know this cold.',
    estimated_minutes: 10,
    difficulty: 'beginner',
    target_populations: ['all'],
    audience: 'staff',
    category: 'staff_training',
    completion_required: true,
    is_required: true,
    is_active: true,
    status: 'published',
    video_type: 'article',
    learning_objectives: [
      'Recognize a crisis vs a stressful moment',
      'Execute the crisis escalation steps in the correct order',
      'Document the crisis afterward in the system'
    ],
    content_html: '<h3>What counts as a crisis</h3><p>A crisis is anything that involves immediate risk to the participant or someone else. Examples:</p><ul><li>Active suicidal ideation or self-harm threats</li><li>Active substance use or relapse in process</li><li>Domestic violence (perpetrator or victim)</li><li>Medical emergency</li><li>Threat of violence to staff or other participants</li><li>Mental health break (psychotic episode, severe panic, dissociation)</li></ul><p>Stress, frustration, or a bad day is not a crisis. A crisis is when life or safety is at immediate risk.</p><h3>The escalation steps — in order</h3><h4>1. Ensure immediate safety</h4><p>If anyone is in physical danger, call <strong>911</strong> first. The platform does not replace 911.</p><h4>2. Stay with the participant</h4><p>Do not leave them alone if they are in active crisis. Keep your voice calm. Do not promise outcomes you cannot guarantee.</p><h4>3. Notify the on-call supervisor</h4><p>From the participant\'s profile, click <strong>Flag Crisis</strong>. This pages the on-call supervisor immediately. The system also sends a Slack/SMS alert to the executive director.</p><h4>4. Get specialized help on the line</h4><p>For mental health: 988 (Suicide and Crisis Lifeline)<br>For domestic violence: 1-800-799-7233<br>For overdose: 911 + administer Narcan if available and trained</p><h4>5. Document immediately after</h4><p>Once the participant is safe and the crisis is over, write a confidential case note on their profile. Include:</p><ul><li>What happened (facts only)</li><li>Who you contacted</li><li>What was decided</li><li>What the follow-up plan is</li></ul><h4>6. Take care of yourself</h4><p>Crisis response is hard. After documenting, talk to your supervisor or a peer. We have an Employee Assistance Program available 24/7.</p>',
    quiz_questions: [
      {
        question: 'A participant is having an active panic attack. What is your FIRST step?',
        options: ['Call 911', 'Open the system and document', 'Ensure their immediate safety'],
        correct_answer: 'Ensure their immediate safety',
        explanation: 'Safety always comes first. If safety means calling 911, do that. Documentation comes after the crisis is over.'
      },
      {
        question: 'What button do you click to alert the on-call supervisor?',
        options: ['+ New Note', 'Flag Crisis', 'Send Email'],
        correct_answer: 'Flag Crisis',
        explanation: 'Flag Crisis pages the on-call supervisor immediately and sends an alert to the executive director.'
      },
      {
        question: 'A participant is frustrated and yelling about a delayed paycheck. Is this a crisis?',
        options: ['Yes, escalate immediately', 'No, this is stress, not a crisis', 'Only if they cry'],
        correct_answer: 'No, this is stress, not a crisis',
        explanation: 'A crisis involves immediate risk to safety. Frustration is real and should be addressed, but it is not a crisis.'
      },
      {
        question: 'When do you write the case note about a crisis?',
        options: ['During the crisis', 'Immediately after the participant is safe', 'A week later when you remember'],
        correct_answer: 'Immediately after the participant is safe',
        explanation: 'Document while the details are fresh, but never let documentation come before the participant\'s safety.'
      }
    ],
    reflection_prompt: 'Save the three crisis numbers (911, 988, 1-800-799-7233) into your phone right now if they are not already there.'
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'user')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const created = [];
    for (const tut of STAFF_TUTORIALS) {
      const c = await base44.asServiceRole.entities.LearningClass.create(tut);
      created.push(c);
    }

    return Response.json({
      success: true,
      created: created.length,
      total_tutorials: STAFF_TUTORIALS.length,
      tutorials: created.map(c => ({ id: c.id, title: c.title })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

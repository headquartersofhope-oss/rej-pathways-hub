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

    console.log('[Seed Certificate Paths] Starting...');

    // Fetch all classes to build requirement lists
    const allClasses = await base44.entities.LearningClass.list();

    // Define certificate paths
    const paths = [
      {
        certificate_name: 'Job Ready Certificate',
        description: 'Demonstrates readiness to succeed at work and in interviews',
        category: 'job_ready',
        required_class_ids: allClasses
          .filter(c => c.tags?.includes('resume') || c.tags?.includes('interview') || c.tags?.includes('job_readiness'))
          .slice(0, 5)
          .map(c => c.id),
      },
      {
        certificate_name: 'Stability Certificate',
        description: 'Completed housing, financial, and wellness foundations',
        category: 'stability',
        required_class_ids: allClasses
          .filter(c => 
            (c.category === 'housing' && c.difficulty_level === 'beginner') ||
            (c.category === 'financial_literacy' && c.difficulty_level === 'beginner') ||
            (c.category === 'wellness' && c.difficulty_level === 'beginner')
          )
          .slice(0, 5)
          .map(c => c.id),
      },
      {
        certificate_name: 'Digital Readiness Certificate',
        description: 'Confident with computers, email, and online job applications',
        category: 'digital_readiness',
        required_class_ids: allClasses
          .filter(c => c.category === 'digital_literacy' && c.difficulty_level === 'beginner')
          .slice(0, 4)
          .map(c => c.id),
      },
      {
        certificate_name: 'Financial Basics Certificate',
        description: 'Understand budgeting, banking, and building credit',
        category: 'financial_basics',
        required_class_ids: allClasses
          .filter(c => c.category === 'financial_literacy')
          .slice(0, 4)
          .map(c => c.id),
      },
      {
        certificate_name: 'Life Skills Certificate',
        description: 'Mastered communication, time management, and self-care',
        category: 'life_skills',
        required_class_ids: allClasses
          .filter(c => c.category === 'life_skills' && c.difficulty_level === 'beginner')
          .slice(0, 5)
          .map(c => c.id),
      },
    ];

    const created = [];
    for (const path of paths) {
      try {
        if (path.required_class_ids.length === 0) {
          console.log(`[Seed Certificate Paths] Skipping ${path.certificate_name} - no matching classes`);
          continue;
        }

        const result = await base44.entities.CertificatePath.create({
          ...path,
          status: 'published',
          is_active: true,
          organization_id: user.organization_id,
          created_by: user.email,
        });
        created.push({ id: result.id, name: path.certificate_name });
        console.log(`[Seed Certificate Paths] ✓ ${path.certificate_name}`);
      } catch (e) {
        console.error(`[Seed Certificate Paths] ✗ ${path.certificate_name}:`, e.message);
      }
    }

    console.log(`[Seed Certificate Paths] Complete. Created ${created.length} certificate paths.`);

    return Response.json({
      success: true,
      created: created.length,
      paths: created,
      message: `Successfully created ${created.length} certificate paths`,
    });
  } catch (error) {
    console.error('[Seed Certificate Paths] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TRACKS = [
  { track_id: 'track_01', title: 'Reentry Foundations', description: 'Essential skills and knowledge for successful reentry after incarceration', icon: '🔓', color: '#F59E0B', order: 1, target_populations: ['reentry'], is_baseline: false },
  { track_id: 'track_02', title: 'Housing Stability', description: 'Learn how to find, secure, and maintain stable housing', icon: '🏠', color: '#10B981', order: 2, target_populations: ['reentry','homeless','at_risk'], is_baseline: false },
  { track_id: 'track_03', title: 'Employment & Career Readiness', description: 'Everything you need to get and keep a good job', icon: '💼', color: '#3B82F6', order: 3, target_populations: ['all'], is_baseline: false },
  { track_id: 'track_04', title: 'Financial Stability & Credit', description: 'Build financial literacy, banking skills, and credit', icon: '💰', color: '#8B5CF6', order: 4, target_populations: ['all'], is_baseline: true },
  { track_id: 'track_05', title: 'Credit Counseling & How Money Really Works', description: 'Deep-dive into credit, debt, and wealth-building strategies', icon: '📊', color: '#EC4899', order: 5, target_populations: ['all'], is_baseline: true },
  { track_id: 'track_06', title: 'Technology & Digital Literacy', description: 'Essential tech skills for modern independent living', icon: '💻', color: '#06B6D4', order: 6, target_populations: ['all'], is_baseline: true },
  { track_id: 'track_07', title: 'Recovery, Wellness & Stability', description: 'Tools for maintaining recovery and mental wellness', icon: '🌱', color: '#34D399', order: 7, target_populations: ['recovery','reentry'], is_baseline: false },
  { track_id: 'track_08', title: 'Life Management & Independent Living', description: 'Practical daily life skills for independence', icon: '🏡', color: '#F97316', order: 8, target_populations: ['all'], is_baseline: false },
  { track_id: 'track_09', title: 'Benefits, IDs & System Navigation', description: 'How to access IDs, benefits, and navigate government systems', icon: '🪪', color: '#EAB308', order: 9, target_populations: ['reentry','homeless'], is_baseline: false },
  { track_id: 'track_10', title: 'Veteran Life Skills', description: 'Specialized resources and skills for veterans transitioning to civilian life', icon: '🎖️', color: '#64748B', order: 10, target_populations: ['veteran'], is_baseline: false },
  { track_id: 'track_11', title: 'Legal Navigation', description: 'Understanding legal rights, records, and the justice system', icon: '⚖️', color: '#DC2626', order: 11, target_populations: ['reentry'], is_baseline: false },
  { track_id: 'track_12', title: 'Entrepreneurship & Side Income', description: 'Start a business or earn income on your own terms', icon: '🚀', color: '#7C3AED', order: 12, target_populations: ['all'], is_baseline: false },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const existing = await base44.asServiceRole.entities.LearningTrack.list();
    if (existing.length >= 12) {
      return Response.json({ message: 'Tracks already seeded', count: existing.length });
    }

    const existingIds = new Set(existing.map(t => t.track_id));
    const created = [];

    for (const track of TRACKS) {
      if (existingIds.has(track.track_id)) continue;
      const c = await base44.asServiceRole.entities.LearningTrack.create(track);
      created.push(c);
    }

    return Response.json({ success: true, tracks_created: created.length, total: existing.length + created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
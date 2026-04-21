import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Barrier category → track IDs mapping
const BARRIER_TRACK_MAP = {
  legal: ['track_01', 'track_11'],
  identification_documents: ['track_09'],
  housing_stability: ['track_02'],
  transportation: ['track_06', 'track_08'],
  education: ['track_03'],
  digital_literacy: ['track_06'],
  work_history: ['track_03', 'track_12'],
  interview_readiness: ['track_03'],
  mental_health_support: ['track_07'],
  substance_recovery: ['track_07'],
  childcare_dependent_care: ['track_08'],
  benefits: ['track_09'],
  financial_readiness: ['track_04', 'track_05'],
  disability_accommodations: ['track_08'],
  clothing_tools_gear: ['track_08'],
  communication_access: ['track_06'],
};

// Baseline tracks for ALL residents
const BASELINE_TRACKS = ['track_04', 'track_05', 'track_06'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { resident_id } = await req.json();
    if (!resident_id) return Response.json({ error: 'resident_id required' }, { status: 400 });

    // Fetch resident
    const residents = await base44.asServiceRole.entities.Resident.filter({ id: resident_id });
    const resident = residents[0];
    if (!resident) return Response.json({ error: 'Resident not found' }, { status: 404 });

    // Fetch barriers
    const barriers = await base44.asServiceRole.entities.BarrierItem.filter({ resident_id });

    // Determine track IDs to assign
    const trackSet = new Set(BASELINE_TRACKS);

    for (const barrier of barriers) {
      const mappedTracks = BARRIER_TRACK_MAP[barrier.category] || [];
      mappedTracks.forEach(t => trackSet.add(t));
    }

    // Veterans get Track 10
    if (resident.population === 'homeless_veteran') {
      trackSet.add('track_10');
    }

    const trackIds = Array.from(trackSet);

    // Fetch all tracks and their classes
    const allTracks = await base44.asServiceRole.entities.LearningTrack.list();
    const allClasses = await base44.asServiceRole.entities.LearningClass.list();

    // Get existing assignments to avoid duplicates
    const existingAssignments = await base44.asServiceRole.entities.LearningAssignment.filter({ resident_id });
    const assignedClassIds = new Set(existingAssignments.map(a => a.class_id));

    const assignments = [];
    let dueOffset = 0;

    for (const trackId of trackIds) {
      const track = allTracks.find(t => t.track_id === trackId);
      if (!track) continue;

      const trackClasses = allClasses
        .filter(c => c.track_id === trackId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const cls of trackClasses) {
        if (assignedClassIds.has(cls.id)) continue;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30 + dueOffset);
        dueOffset += 2; // stagger 2 days apart within track

        const assignment = await base44.asServiceRole.entities.LearningAssignment.create({
          resident_id,
          global_resident_id: resident.global_resident_id,
          class_id: cls.id,
          organization_id: resident.organization_id,
          assignment_type: BASELINE_TRACKS.includes(trackId) ? 'required' : 'required',
          assignment_reason: `Auto-assigned from Life Skills Academy track: ${track.title}`,
          assigned_by: 'system',
          assigned_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          status: 'assigned',
        });
        assignments.push(assignment);
      }

      dueOffset += 28; // 30 days between tracks
    }

    return Response.json({
      success: true,
      tracks_assigned: trackIds.length,
      classes_assigned: assignments.length,
      track_ids: trackIds,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
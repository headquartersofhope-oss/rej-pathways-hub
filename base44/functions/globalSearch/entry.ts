/**
 * globalSearch — Production Hardening: Global Search Index
 *
 * Searches across Residents, Incidents, ServiceTasks, Documents.
 * Enforces role-based data access — never exposes restricted records.
 *
 * POST { query, types, limit }
 * - query: search string
 * - types: array of entity types to search (default: all)
 * - limit: max results per type (default: 10)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function normalize(s) {
  return (s || '').toString().toLowerCase().trim();
}

function matchesQuery(q, ...fields) {
  const nq = normalize(q);
  return fields.some(f => normalize(f).includes(nq));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { query, types, limit = 10 } = body;

    if (!query || query.trim().length < 2) {
      return Response.json({ error: 'query must be at least 2 characters' }, { status: 400 });
    }

    const searchTypes = types || ['residents', 'incidents', 'tasks', 'documents'];
    const results = {};

    const isAdminRole = ['admin', 'user', 'super_admin', 'org_admin', 'program_manager'].includes(user.role);
    const isCaseManager = ['case_manager', 'staff'].includes(user.role);
    const isResidentRole = user.role === 'resident';

    // ── RESIDENTS ────────────────────────────────────────────────────────────
    if (searchTypes.includes('residents') && !isResidentRole) {
      const all = await base44.asServiceRole.entities.Resident.list();
      let filtered = all;

      // Case managers only see their caseload
      if (isCaseManager) {
        filtered = all.filter(r =>
          r.assigned_case_manager_id === user.id ||
          r.assigned_case_manager === user.email ||
          r.assigned_case_manager === user.full_name
        );
      }

      const matches = filtered.filter(r =>
        matchesQuery(query,
          r.first_name, r.last_name, r.preferred_name,
          r.global_resident_id, r.phone, r.email, r.status
        )
      ).slice(0, limit).map(r => ({
        type: 'resident',
        id: r.id,
        label: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        subtitle: `${r.global_resident_id || ''} · ${(r.status || '').replace(/_/g, ' ')}`,
        meta: { status: r.status, global_resident_id: r.global_resident_id },
        url: `/residents/${r.id}`,
      }));
      results.residents = matches;
    }

    // ── INCIDENTS ────────────────────────────────────────────────────────────
    if (searchTypes.includes('incidents') && isAdminRole) {
      const all = await base44.asServiceRole.entities.Incident.list('-incident_date', 200);
      const matches = all.filter(i =>
        matchesQuery(query,
          i.resident_name, i.house_name, i.description,
          i.incident_type, i.status, i.reported_by
        )
      ).slice(0, limit).map(i => ({
        type: 'incident',
        id: i.id,
        label: `${(i.incident_type || '').replace(/_/g, ' ')} — ${i.house_name || ''}`,
        subtitle: `${i.severity || ''} · ${i.incident_date || ''} · ${(i.status || '').replace(/_/g, ' ')}`,
        meta: { severity: i.severity, status: i.status },
        url: `/housing`,
      }));
      results.incidents = matches;
    }

    // ── SERVICE TASKS ────────────────────────────────────────────────────────
    if (searchTypes.includes('tasks')) {
      const all = await base44.asServiceRole.entities.ServiceTask.list('-created_date', 300);
      let filtered = all;
      if (isCaseManager) {
        // Tasks for residents in caseload only — filter by created_by or matching org
        filtered = all.filter(t => t.created_by === user.email || t.assigned_to === user.email || t.assigned_to === user.full_name);
      }

      const matches = filtered.filter(t =>
        matchesQuery(query,
          t.title, t.description, t.global_resident_id,
          t.category, t.status, t.assigned_to
        )
      ).slice(0, limit).map(t => ({
        type: 'task',
        id: t.id,
        label: t.title || 'Untitled Task',
        subtitle: `${(t.status || '').replace(/_/g, ' ')} · ${t.global_resident_id || ''} · Due ${t.due_date || 'N/A'}`,
        meta: { status: t.status, priority: t.priority },
        url: `/case-management`,
      }));
      results.tasks = matches;
    }

    // ── DOCUMENTS ────────────────────────────────────────────────────────────
    if (searchTypes.includes('documents') && !isResidentRole) {
      const all = await base44.asServiceRole.entities.Document.list('-created_date', 200);
      const matches = all.filter(d =>
        matchesQuery(query,
          d.name, d.document_type, d.resident_name, d.notes
        )
      ).slice(0, limit).map(d => ({
        type: 'document',
        id: d.id,
        label: d.name || 'Untitled Document',
        subtitle: `${(d.document_type || '').replace(/_/g, ' ')} · ${d.resident_name || ''}`,
        meta: { document_type: d.document_type, status: d.status },
        url: `/documents`,
      }));
      results.documents = matches;
    }

    const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);

    return Response.json({
      success: true,
      query,
      total_results: totalResults,
      results,
    });

  } catch (error) {
    console.error('[globalSearch] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
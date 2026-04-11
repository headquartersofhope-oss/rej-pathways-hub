/**
 * getHousingAvailability — Returns provider-safe housing availability summaries.
 * Auth: staff, case_manager, admin only.
 * If a provider has an api_endpoint, attempts to fetch live availability.
 * Falls back to stored HousingProvider data gracefully.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'case_manager') {
      return Response.json({ error: 'Forbidden: Staff or admin access required' }, { status: 403 });
    }

    // Fetch all active providers
    const providers = await base44.entities.HousingProvider.filter({ is_active: true });

    const summaries = await Promise.all(providers.map(async (p) => {
      let available_beds = p.available_beds ?? null;
      let accepting_referrals = p.accepting_referrals ?? true;
      let waitlist_open = p.waitlist_open ?? false;
      let live_data = false;
      let last_updated = p.last_availability_update || null;

      // Attempt live fetch if API endpoint configured
      if (p.api_endpoint) {
        try {
          const res = await fetch(p.api_endpoint + '/availability', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const data = await res.json();
            available_beds = data.available_beds ?? available_beds;
            accepting_referrals = data.accepting_referrals ?? accepting_referrals;
            waitlist_open = data.waitlist_open ?? waitlist_open;
            live_data = true;
            last_updated = new Date().toISOString();

            // Update stored provider with fresh data
            await base44.entities.HousingProvider.update(p.id, {
              available_beds: data.available_beds ?? p.available_beds,
              accepting_referrals: data.accepting_referrals ?? p.accepting_referrals,
              waitlist_open: data.waitlist_open ?? p.waitlist_open,
              last_availability_update: last_updated,
            }).catch(() => {});
          }
        } catch {
          // Silent fallback to stored data
        }
      }

      // Return only provider-safe fields (no internal ops data)
      return {
        id: p.id,
        provider_name: p.provider_name,
        site_name: p.site_name,
        program_type: p.program_type,
        gender_restriction: p.gender_restriction,
        population_served: p.population_served || [],
        city: p.city,
        state: p.state,
        total_beds: p.total_beds ?? null,
        available_beds,
        accepting_referrals,
        waitlist_open,
        referral_requirements: p.referral_requirements || null,
        public_notes: p.public_notes || null,
        last_updated,
        live_data,
      };
    }));

    return Response.json({
      success: true,
      providers: summaries,
      total: summaries.length,
    });
  } catch (error) {
    console.error('[getHousingAvailability] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
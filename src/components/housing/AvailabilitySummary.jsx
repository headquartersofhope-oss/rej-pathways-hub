import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, RefreshCw, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PROGRAM_LABELS = {
  transitional_housing: 'Transitional Housing',
  rapid_rehousing: 'Rapid Rehousing',
  permanent_supportive: 'Permanent Supportive',
  sober_living: 'Sober Living',
  shelter: 'Shelter',
  other: 'Other',
};

export default function AvailabilitySummary() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAvailability = async () => {
    setRefreshing(true);
    const res = await base44.functions.invoke('getHousingAvailability', {});
    setProviders(res.data?.providers || []);
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => { fetchAvailability(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      Loading provider availability...
    </div>
  );

  if (providers.length === 0) return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground text-sm">
        No housing providers configured. Admins can add providers to enable availability tracking.
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{providers.length} provider{providers.length !== 1 ? 's' : ''} — provider-safe summary only</p>
        <Button variant="outline" size="sm" onClick={fetchAvailability} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {providers.map((p) => (
          <Card key={p.id} className="border">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">{p.provider_name}</CardTitle>
                  {p.site_name && <p className="text-xs text-muted-foreground">{p.site_name}</p>}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {PROGRAM_LABELS[p.program_type] || p.program_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1">
                  {p.accepting_referrals
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  {p.accepting_referrals ? 'Accepting Referrals' : 'Not Accepting'}
                </span>
                {p.waitlist_open && (
                  <span className="flex items-center gap-1 text-teal-700">
                    <Clock className="w-3.5 h-3.5" /> Waitlist Open
                  </span>
                )}
                {p.available_beds !== null && (
                  <span className="flex items-center gap-1 text-blue-700">
                    <Building2 className="w-3.5 h-3.5" />
                    {p.available_beds} bed{p.available_beds !== 1 ? 's' : ''} available
                  </span>
                )}
              </div>

              {p.population_served?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.population_served.map((pop) => (
                    <Badge key={pop} variant="outline" className="text-[10px] px-1.5 py-0">
                      {pop.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}

              {p.gender_restriction && p.gender_restriction !== 'any' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {p.gender_restriction === 'male_only' ? 'Male only' : p.gender_restriction === 'female_only' ? 'Female only' : p.gender_restriction}
                </p>
              )}

              {p.city && <p className="text-xs text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ''}</p>}
              {p.referral_requirements && <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{p.referral_requirements}</p>}
              {p.public_notes && <p className="text-xs text-muted-foreground italic">{p.public_notes}</p>}

              {p.last_updated && (
                <p className="text-[10px] text-muted-foreground/60">
                  {p.live_data ? '● Live' : '○ Stored'} · Updated {new Date(p.last_updated).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users, BedDouble, Search, RefreshCw, ChevronRight } from 'lucide-react';

/**
 * BedSearchPanel: Nonprofit-facing bed search interface
 * Allows case managers to find available beds and providers
 * Reads from HousingProvider (external nonprofit perspective)
 */
export default function BedSearchPanel() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [filterGender, setFilterGender] = useState('any');
  const [filterProgram, setFilterProgram] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProviders = async () => {
    setRefreshing(true);
    try {
      const providers = await base44.entities.HousingProvider.filter({ is_active: true });
      setProviders(providers);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); }, []);

  const filtered = providers.filter(p => {
    const matchCity = !searchCity || p.city?.toLowerCase().includes(searchCity.toLowerCase());
    const matchGender = filterGender === 'any' || p.gender_restriction === filterGender || p.gender_restriction === 'any';
    const matchProgram = filterProgram === 'all' || p.program_type === filterProgram;
    return matchCity && matchGender && matchProgram;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading housing providers...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Search City</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Austin, Dallas..." 
              value={searchCity} 
              onChange={e => setSearchCity(e.target.value)} 
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Gender</label>
          <select 
            value={filterGender} 
            onChange={e => setFilterGender(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="any">Any</option>
            <option value="male_only">Male Only</option>
            <option value="female_only">Female Only</option>
            <option value="non_binary_inclusive">Non-Binary Inclusive</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Program Type</label>
          <select 
            value={filterProgram} 
            onChange={e => setFilterProgram(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Types</option>
            <option value="transitional_housing">Transitional Housing</option>
            <option value="rapid_rehousing">Rapid Rehousing</option>
            <option value="permanent_supportive">Permanent Supportive</option>
            <option value="sober_living">Sober Living</option>
            <option value="shelter">Shelter</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchProviders} 
            disabled={refreshing}
            className="w-full h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            {providers.length === 0 
              ? 'No housing providers available yet.' 
              : 'No providers match your search criteria.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{p.provider_name}</h4>
                    {p.site_name && <p className="text-xs text-muted-foreground">{p.site_name}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {p.program_type?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {/* Location */}
                {p.city && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {p.city}{p.state ? `, ${p.state}` : ''}
                  </div>
                )}

                {/* Availability */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {p.available_beds !== null && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      <BedDouble className="w-3 h-3 mr-1" />
                      {p.available_beds} available
                    </Badge>
                  )}
                  {p.total_beds && (
                    <Badge variant="outline" className="text-xs">
                      {p.total_beds} total
                    </Badge>
                  )}
                  {p.accepting_referrals && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">✓ Accepting</Badge>
                  )}
                  {p.waitlist_open && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">Waitlist</Badge>
                  )}
                </div>

                {/* Demographics */}
                <div className="flex flex-wrap gap-1">
                  {p.population_served?.map(pop => (
                    <Badge key={pop} variant="outline" className="text-[10px] px-1.5 py-0">
                      {pop.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>

                {/* Gender restriction */}
                {p.gender_restriction && p.gender_restriction !== 'any' && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                    <Users className="w-3 h-3" />
                    {p.gender_restriction === 'male_only' ? 'Male Only' : p.gender_restriction === 'female_only' ? 'Female Only' : p.gender_restriction}
                  </div>
                )}

                {/* Notes */}
                {p.public_notes && (
                  <p className="text-xs text-muted-foreground italic border-t pt-2">{p.public_notes}</p>
                )}

                {/* Contact Info */}
                <div className="border-t pt-2 space-y-1 text-xs">
                  {p.contact_name && <p><span className="text-muted-foreground">Contact:</span> {p.contact_name}</p>}
                  {p.contact_phone && <p><span className="text-muted-foreground">Phone:</span> {p.contact_phone}</p>}
                  {p.contact_email && <p><span className="text-muted-foreground">Email:</span> {p.contact_email}</p>}
                </div>

                {/* Referral Requirements */}
                {p.referral_requirements && (
                  <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-xs text-amber-800">
                    <p className="font-medium mb-0.5">Referral Requirements:</p>
                    <p>{p.referral_requirements}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
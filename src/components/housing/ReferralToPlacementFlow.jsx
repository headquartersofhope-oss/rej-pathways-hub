import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

/**
 * ReferralToPlacementFlow: Clean workflow from referral → placement
 * Shows housing options, AI recommendations, and placement status
 */
export default function ReferralToPlacementFlow({ resident, onPlacementCreated }) {
  const [step, setStep] = useState('search');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [filters, setFilters] = useState({
    city: '',
    gender: 'any',
    program_type: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProviders();
    if (resident) {
      getAIRecommendations();
    }
  }, [resident]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.HousingProvider.filter({ is_active: true });
      setProviders(data);
    } catch (err) {
      setError('Failed to load providers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAIRecommendations = async () => {
    try {
      const recommendations = await base44.integrations.Core.InvokeLLM({
        prompt: `Given this resident:
- Name: ${resident.first_name} ${resident.last_name}
- Barriers: ${resident.barriers?.join(', ') || 'none listed'}
- Population: ${resident.population || 'general'}
- Employment Status: ${resident.employment_status || 'unknown'}

Recommend 3 housing types that would best fit their needs, with reasoning.
Focus on support level needed and demographic compatibility.`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  housing_type: 'string',
                  reasoning: 'string',
                  priority: 'number'
                }
              }
            }
          }
        }
      });
      setRecommendations(recommendations.data.recommendations || []);
    } catch (err) {
      console.warn('AI recommendations failed:', err);
    }
  };

  const filteredProviders = providers.filter(p => {
    if (filters.city && p.city?.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.program_type && p.program_type !== filters.program_type) return false;
    if (filters.gender !== 'any' && p.gender_restriction !== 'any' && p.gender_restriction !== filters.gender) return false;
    return true;
  });

  const handleSubmitReferral = async () => {
    if (!selectedProvider) {
      setError('Please select a provider');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create referral
      const referral = await base44.entities.HousingReferral.create({
        global_resident_id: resident.global_resident_id,
        resident_id: resident.id,
        organization_id: resident.organization_id,
        participant_name: `${resident.first_name} ${resident.last_name}`,
        housing_need_summary: `Referral for ${selectedProvider.program_type}`,
        target_provider_id: selectedProvider.id,
        target_provider_name: selectedProvider.provider_name,
        priority_level: 'medium',
        status: 'ready_to_submit',
        consent_confirmed: true,
        referral_date: new Date().toISOString().split('T')[0]
      });

      // Trigger manual sync attempt
      await base44.functions.invoke('syncHousingPlacement', {
        resident_id: resident.id,
        global_resident_id: resident.global_resident_id
      });

      onPlacementCreated?.();
      setStep('success');
    } catch (err) {
      setError(err.message);
      console.error('Failed to create referral:', err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="py-8 text-center space-y-3">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
          <div>
            <p className="font-medium text-emerald-800">Referral Submitted</p>
            <p className="text-sm text-emerald-700 mt-1">
              {resident.first_name} has been referred to {selectedProvider?.provider_name}
            </p>
            <p className="text-xs text-emerald-600 mt-2">
              Placement status will update as Housing App processes the referral.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStep('search');
              setSelectedProvider(null);
            }}
          >
            Refer Another Resident
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Housing Referral for {resident.first_name}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs font-medium text-blue-900 mb-2">AI Recommendations</p>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="text-xs text-blue-800">
                  <p className="font-medium">{i + 1}. {rec.housing_type}</p>
                  <p className="text-blue-700">{rec.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Filters */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">FILTER HOUSING</p>
          
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              className="text-sm"
            />
            <Select value={filters.gender} onValueChange={(v) => setFilters({ ...filters, gender: v })}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Gender</SelectItem>
                <SelectItem value="male_only">Male Only</SelectItem>
                <SelectItem value="female_only">Female Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.program_type} onValueChange={(v) => setFilters({ ...filters, program_type: v })}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Program Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Types</SelectItem>
                <SelectItem value="transitional_housing">Transitional</SelectItem>
                <SelectItem value="rapid_rehousing">Rapid Rehousing</SelectItem>
                <SelectItem value="permanent_supportive">Permanent Supportive</SelectItem>
                <SelectItem value="shelter">Shelter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* Provider Results */}
        {loading ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No providers match your filters
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProviders.map(provider => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider)}
                className={`w-full p-3 border rounded-md text-left transition ${
                  selectedProvider?.id === provider.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{provider.provider_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {provider.city} • {provider.program_type?.replace(/_/g, ' ')}
                    </p>
                    {provider.available_beds !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {provider.available_beds} of {provider.total_beds} beds available
                      </p>
                    )}
                  </div>
                  {selectedProvider?.id === provider.id && (
                    <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setStep('search');
              setSelectedProvider(null);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!selectedProvider || loading}
            className="flex-1"
            onClick={handleSubmitReferral}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Submit Referral
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Search, Lightbulb } from 'lucide-react';
import LearningRecommendations from './LearningRecommendations';

const REASON_LABELS = {
  orientation_required: 'Program Orientation',
  low_literacy_support: 'Literacy Support',
  low_digital_literacy: 'Digital Skills',
  no_resume: 'Resume Building',
  low_interview_readiness: 'Interview Prep',
  low_job_readiness: 'Job Readiness',
  financial_instability: 'Financial Stability',
  housing_instability: 'Housing Support',
  missing_documents: 'Documentation',
  transportation_barriers: 'Transportation',
  population_support: 'Population Support',
  foundational_skill: 'Foundational Skills',
};

export default function StaffRecommendationsDashboard() {
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: () => base44.entities.LearningAssignment.list(),
  });

  // Filter residents who need learning recommendations
  const filtered = residents.filter(r => {
    const hasAssignments = assignments.some(a => a.resident_id === r.id);
    const matchesSearch = 
      r.first_name.toLowerCase().includes(search.toLowerCase()) ||
      r.last_name.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  }).sort((a, b) => {
    // Prioritize residents without assignments or new residents
    const aHasAssignments = assignments.some(x => x.resident_id === a.id);
    const bHasAssignments = assignments.some(x => x.resident_id === b.id);
    return (aHasAssignments ? 1 : 0) - (bHasAssignments ? 1 : 0);
  });

  const noAssignmentsCount = residents.filter(r => 
    !assignments.some(a => a.resident_id === r.id)
  ).length;

  return (
    <div className="space-y-6">
      {/* Alert for unassigned residents */}
      {noAssignmentsCount > 0 && (
        <Alert className="border-l-4 border-l-blue-500 bg-blue-50">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>{noAssignmentsCount} resident{noAssignmentsCount !== 1 ? 's' : ''}</strong> without learning class assignments. Use AI recommendations to get started.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Left: Resident List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map(resident => {
              const residentAssignments = assignments.filter(a => a.resident_id === resident.id);
              const isSelected = selectedResident?.id === resident.id;

              return (
                <Card
                  key={resident.id}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedResident(resident)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">
                        {resident.first_name} {resident.last_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {resident.global_resident_id}
                      </p>
                    </div>
                    {residentAssignments.length === 0 ? (
                      <Badge className="text-xs bg-amber-100 text-amber-700 flex-shrink-0">
                        No Classes
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {residentAssignments.length} classes
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right: Recommendations */}
        <div>
          {selectedResident ? (
            <div className="space-y-3">
              <Card className="p-4 bg-blue-50">
                <h3 className="font-semibold text-sm">
                  Learning Recommendations
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-powered recommendations based on {selectedResident.first_name}'s profile
                </p>
              </Card>
              <LearningRecommendations
                residentId={selectedResident.id}
                onAssign={(classId, title) => {
                  console.log(`Assigned ${title} to ${selectedResident.first_name}`);
                }}
              />
            </div>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Select a resident</p>
              <p className="text-sm mt-1">Choose a resident to view AI-generated learning recommendations</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
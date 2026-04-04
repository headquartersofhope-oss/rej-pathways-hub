import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Search, CheckCircle2, Loader2, Target,
  UserCheck, AlertCircle, ArrowRight, X
} from 'lucide-react';

const REASON_LABELS = {
  orientation_required: { label: 'Orientation', color: 'bg-red-100 text-red-700' },
  low_digital_literacy: { label: 'Digital Skills', color: 'bg-cyan-100 text-cyan-700' },
  low_literacy_support: { label: 'Literacy', color: 'bg-purple-100 text-purple-700' },
  no_resume: { label: 'No Resume', color: 'bg-emerald-100 text-emerald-700' },
  low_interview_readiness: { label: 'Interview', color: 'bg-amber-100 text-amber-700' },
  low_job_readiness: { label: 'Job Ready', color: 'bg-blue-100 text-blue-700' },
  financial_instability: { label: 'Financial', color: 'bg-green-100 text-green-700' },
  housing_instability: { label: 'Housing', color: 'bg-indigo-100 text-indigo-700' },
  missing_documents: { label: 'Documents', color: 'bg-orange-100 text-orange-700' },
  transportation_barriers: { label: 'Transport', color: 'bg-slate-100 text-slate-700' },
  population_support: { label: 'Support', color: 'bg-rose-100 text-rose-700' },
  foundational_skill: { label: 'Foundation', color: 'bg-violet-100 text-violet-700' },
};

export default function StaffRecommendationsDashboard({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');
  const [overrideClassId, setOverrideClassId] = useState('');
  const [overrideNote, setOverrideNote] = useState('');

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-list'],
    queryFn: () => base44.entities.Resident.list('-created_date', 300),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['resident-enrollments', selectedResident?.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ resident_id: selectedResident.id }),
    enabled: !!selectedResident?.id,
  });

  const activeResidents = residents.filter(r => r.status === 'active' || r.status === 'pre_intake');
  const filtered = activeResidents.filter(r => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));

  const loadRecs = async (resident) => {
    setSelectedResident(resident);
    setRecommendations(null);
    setLoadingRecs(true);
    setError('');
    try {
      const res = await base44.functions.invoke('recommendLearningClasses', { resident_id: resident.id });
      setRecommendations(res.data);
    } catch (e) {
      setError('Failed to load recommendations: ' + e.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  const assignClass = async (classId, reason, assignmentType = 'ai_suggested') => {
    setAssigning(classId);
    try {
      await base44.entities.ClassEnrollment.create({
        resident_id: selectedResident.id,
        global_resident_id: selectedResident.global_resident_id || selectedResident.id,
        class_id: classId,
        organization_id: selectedResident.organization_id,
        enrolled_by: user?.id,
        status: 'enrolled',
        notes: reason || 'Staff assigned',
        assignment_type: assignmentType,
      });
      queryClient.invalidateQueries({ queryKey: ['resident-enrollments', selectedResident.id] });
      await loadRecs(selectedResident);
    } catch (e) {
      setError('Failed to assign class');
    } finally {
      setAssigning(null);
    }
  };

  const removeEnrollment = async (enrollmentId) => {
    setRemoving(enrollmentId);
    try {
      await base44.entities.ClassEnrollment.delete(enrollmentId);
      queryClient.invalidateQueries({ queryKey: ['resident-enrollments', selectedResident.id] });
    } catch (e) {
      setError('Failed to remove class');
    } finally {
      setRemoving(null);
    }
  };

  const notEnrolled = (recommendations?.recommendations || []).filter(r => !enrolledClassIds.has(r.class_id));
  const required = notEnrolled.filter(r => r.assignment_type === 'required');
  const suggested = notEnrolled.filter(r => r.assignment_type !== 'required');

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      {/* Resident List */}
      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search residents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No residents found</p>
          )}
          {filtered.map(r => {
            const isSelected = selectedResident?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => loadRecs(r)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.first_name} {r.last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.global_resident_id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                    {r.barriers?.length > 0 && (
                      <span className="text-[10px] text-amber-600">{r.barriers.length} barriers</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations Panel */}
      <div className="lg:col-span-3 space-y-4">
        {!selectedResident ? (
          <Card className="p-10 text-center text-muted-foreground">
            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select a resident to view AI-generated learning recommendations</p>
          </Card>
        ) : (
          <>
            {/* Header */}
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-sm">
                    {selectedResident.first_name} {selectedResident.last_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{selectedResident.global_resident_id}</p>
                </div>
                {loadingRecs && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
              {selectedResident.barriers?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedResident.barriers.map(b => (
                    <Badge key={b} variant="outline" className="text-[10px]">{b.replace(/_/g, ' ')}</Badge>
                  ))}
                </div>
              )}
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Current Enrollments */}
            {enrollments.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Currently Enrolled</p>
                <div className="space-y-1.5">
                  {enrollments.map(enr => {
                    const cls = classes.find(c => c.id === enr.class_id);
                    return (
                      <div key={enr.id} className="flex items-center gap-2 p-2 rounded border bg-card text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span className="flex-1 font-medium">{cls?.title || 'Unknown'}</span>
                        <Badge variant="outline" className="text-[10px]">{enr.status}</Badge>
                        <button
                          onClick={() => removeEnrollment(enr.id)}
                          disabled={removing === enr.id}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove enrollment"
                        >
                          {removing === enr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Required Recommendations */}
            {!loadingRecs && required.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  AI Required Recommendations
                </p>
                <div className="space-y-2">
                  {required.map(rec => {
                    const reasonMeta = REASON_LABELS[rec.reason_code] || { label: rec.reason_code, color: 'bg-muted text-muted-foreground' };
                    return (
                      <Card key={rec.class_id} className="p-3 flex items-center gap-3 border-red-100">
                        <Target className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rec.class_title}</p>
                          <p className="text-xs text-muted-foreground">{rec.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-[10px] border-0 ${reasonMeta.color}`}>{reasonMeta.label}</Badge>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => assignClass(rec.class_id, rec.reason, 'required')}
                            disabled={assigning === rec.class_id}
                          >
                            {assigning === rec.class_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Assign <ArrowRight className="w-3 h-3 ml-1" /></>}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Suggested Recommendations */}
            {!loadingRecs && suggested.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  AI Suggested Classes
                </p>
                <div className="space-y-2">
                  {suggested.map(rec => {
                    const reasonMeta = REASON_LABELS[rec.reason_code] || { label: rec.reason_code, color: 'bg-muted text-muted-foreground' };
                    return (
                      <Card key={rec.class_id} className="p-3 flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rec.class_title}</p>
                          <p className="text-xs text-muted-foreground">{rec.reason}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-[10px] border-0 ${reasonMeta.color}`}>{reasonMeta.label}</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => assignClass(rec.class_id, rec.reason, 'recommended')}
                            disabled={assigning === rec.class_id}
                          >
                            {assigning === rec.class_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Override: assign any class */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Manual Assignment Override</p>
              <Card className="p-3 space-y-2">
                <Select value={overrideClassId} onValueChange={setOverrideClassId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select any class to assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter(c => c.is_active !== false && !enrolledClassIds.has(c.id))
                      .map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 text-xs"
                  placeholder="Reason / note (optional)"
                  value={overrideNote}
                  onChange={e => setOverrideNote(e.target.value)}
                />
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={!overrideClassId || assigning === overrideClassId}
                  onClick={async () => {
                    await assignClass(overrideClassId, overrideNote || 'Manual staff assignment', 'optional');
                    setOverrideClassId('');
                    setOverrideNote('');
                  }}
                >
                  {assigning === overrideClassId ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Assign Class'}
                </Button>
              </Card>
            </div>

            {/* All assigned */}
            {!loadingRecs && !error && notEnrolled.length === 0 && recommendations && (
              <Card className="p-4 flex items-center gap-3 bg-emerald-50 border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">All AI recommendations assigned!</p>
                  <p className="text-xs text-emerald-600">Use manual assignment to add more classes if needed.</p>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
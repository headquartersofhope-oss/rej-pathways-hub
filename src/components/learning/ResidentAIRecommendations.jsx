import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Loader2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

const REASON_LABELS = {
  orientation_required: { label: 'Required', color: 'bg-red-100 text-red-700' },
  low_digital_literacy: { label: 'Digital', color: 'bg-cyan-100 text-cyan-700' },
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

export default function ResidentAIRecommendations({ resident, user, enrollments, enrolledClassIds, onAssigned }) {
  const queryClient = useQueryClient();
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    if (expanded && !recs) loadRecs();
  }, [expanded]);

  const loadRecs = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('recommendLearningClasses', { resident_id: resident.id });
      setRecs(res.data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const assign = async (rec) => {
    setAssigning(rec.class_id);
    try {
      await base44.entities.ClassEnrollment.create({
        resident_id: resident.id,
        global_resident_id: resident.global_resident_id || resident.id,
        class_id: rec.class_id,
        organization_id: resident.organization_id,
        enrolled_by: user?.id,
        status: 'enrolled',
        notes: `AI recommended: ${rec.reason}`,
        assignment_type: rec.assignment_type,
      });
      if (onAssigned) onAssigned();
      await loadRecs();
    } catch (e) {
      // silent
    } finally {
      setAssigning(null);
    }
  };

  const unassignedRecs = (recs?.recommendations || []).filter(r => !enrolledClassIds.has(r.class_id));

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden">
      <button
        className="w-full p-3 flex items-center justify-between text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-primary">AI Learning Recommendations</span>
          {!expanded && unassignedRecs.length === 0 && recs && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-0">All assigned ✓</Badge>
          )}
          {!expanded && unassignedRecs.length > 0 && (
            <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">{unassignedRecs.length} pending</Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading recommendations…
            </div>
          )}

          {!loading && unassignedRecs.length === 0 && recs && (
            <p className="text-xs text-emerald-700 py-1">All recommended classes have been assigned.</p>
          )}

          {!loading && unassignedRecs.map(rec => {
            const meta = REASON_LABELS[rec.reason_code] || { label: rec.reason_code, color: 'bg-muted text-muted-foreground' };
            const isReq = rec.assignment_type === 'required';
            return (
              <div key={rec.class_id} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border text-xs">
                {isReq
                  ? <Target className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  : <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-tight">{rec.class_title}</p>
                  <p className="text-muted-foreground text-[10px]">{rec.reason}</p>
                </div>
                <Badge className={`text-[10px] border-0 ${meta.color}`}>{meta.label}</Badge>
                <Button
                  size="sm"
                  variant={isReq ? 'default' : 'outline'}
                  className="h-6 text-[10px] px-2 flex-shrink-0"
                  onClick={() => assign(rec)}
                  disabled={assigning === rec.class_id}
                >
                  {assigning === rec.class_id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <><span>Assign</span><ArrowRight className="w-2.5 h-2.5 ml-1" /></>
                  }
                </Button>
              </div>
            );
          })}

          {!recs && !loading && (
            <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={loadRecs}>
              Load Recommendations
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
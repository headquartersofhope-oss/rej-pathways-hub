import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GraduationCap, Sparkles, ChevronRight, CheckCircle2,
  Zap, BookOpen, Target, Award, ArrowRight, Loader2
} from 'lucide-react';

const REASON_LABELS = {
  orientation_required: { label: 'Program Requirement', color: 'bg-red-100 text-red-700' },
  low_digital_literacy: { label: 'Digital Skills', color: 'bg-cyan-100 text-cyan-700' },
  low_literacy_support: { label: 'Literacy Support', color: 'bg-purple-100 text-purple-700' },
  no_resume: { label: 'Job Ready', color: 'bg-emerald-100 text-emerald-700' },
  low_interview_readiness: { label: 'Interview Prep', color: 'bg-amber-100 text-amber-700' },
  low_job_readiness: { label: 'Employment', color: 'bg-blue-100 text-blue-700' },
  financial_instability: { label: 'Financial Skills', color: 'bg-green-100 text-green-700' },
  housing_instability: { label: 'Housing Stability', color: 'bg-indigo-100 text-indigo-700' },
  missing_documents: { label: 'Documents', color: 'bg-orange-100 text-orange-700' },
  transportation_barriers: { label: 'Transportation', color: 'bg-slate-100 text-slate-700' },
  population_support: { label: 'Support Skills', color: 'bg-rose-100 text-rose-700' },
  foundational_skill: { label: 'Foundation', color: 'bg-violet-100 text-violet-700' },
};

const PATHWAY_CONFIG = {
  job_ready: { label: 'Job Ready Path', color: 'bg-blue-50 border-blue-200', icon: Target },
  stability: { label: 'Stability Path', color: 'bg-green-50 border-green-200', icon: CheckCircle2 },
  digital_readiness: { label: 'Digital Basics Path', color: 'bg-cyan-50 border-cyan-200', icon: Zap },
  financial_basics: { label: 'Financial Basics Path', color: 'bg-yellow-50 border-yellow-200', icon: BookOpen },
  life_skills: { label: 'Life Skills Path', color: 'bg-rose-50 border-rose-200', icon: Award },
};

export default function LearningOnboarding({ residentId, residentName, enrollments = [], onEnroll }) {
  const queryClient = useQueryClient();
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`learning_onboarding_dismissed_${residentId}`) === 'true';
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!residentId) return;
    loadRecommendations();
  }, [residentId]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('recommendLearningClasses', { resident_id: residentId });
      if (res.data?.recommendations) {
        setRecommendations(res.data);
      }
    } catch (e) {
      setError('Could not load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (rec) => {
    setAssigning(rec.class_id);
    try {
      await base44.entities.ClassEnrollment.create({
        resident_id: residentId,
        global_resident_id: residentId,
        class_id: rec.class_id,
        status: 'enrolled',
        assignment_type: rec.assignment_type || 'ai_suggested',
        notes: `AI recommended: ${rec.reason}`,
      });
      queryClient.invalidateQueries({ queryKey: ['my-enrollments', residentId] });
      queryClient.invalidateQueries({ queryKey: ['learning-classes'] });
      if (onEnroll) onEnroll();
      // Refresh recs after a short delay to pick up new enrollment
      setTimeout(() => loadRecommendations(), 500);
    } catch (e) {
      setError('Could not assign class. Please try again.');
    } finally {
      setAssigning(null);
    }
  };

  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));

  const handleDismiss = () => {
    localStorage.setItem(`learning_onboarding_dismissed_${residentId}`, 'true');
    setDismissed(true);
  };

  const notYetEnrolled = recommendations?.recommendations?.filter(r => !enrolledClassIds.has(r.class_id)) || [];
  const required = notYetEnrolled.filter(r => r.assignment_type === 'required');
  const recommended = notYetEnrolled.filter(r => r.assignment_type !== 'required').slice(0, 6);

  // Show welcome panel only if there are unactioned recommendations
  const hasRecs = notYetEnrolled.length > 0;

  if (dismissed && !hasRecs) return null;

  // Progress through assigned recs
  const totalRecs = (recommendations?.recommendations?.length || 0);
  const assignedRecs = totalRecs - notYetEnrolled.length;
  const progressPct = totalRecs > 0 ? Math.round((assignedRecs / totalRecs) * 100) : 0;

  return (
    <div className="space-y-4 mb-6">
      {/* Welcome Banner */}
      <Card className="p-5 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base">
                Welcome to the Learning Center{residentName ? `, ${residentName.split(' ')[0]}` : ''}!
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Classes are selected based on your profile and goals.
                Complete them to earn certificates and build your skills.
              </p>
            </div>
          </div>
          {!hasRecs && (
            <button onClick={handleDismiss} className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0">
              Dismiss
            </button>
          )}
        </div>

        {/* Progress through recommendations */}
        {totalRecs > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Recommended classes assigned</span>
              <span className="font-semibold">{assignedRecs}/{totalRecs}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="p-4 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Finding your best starting classes…</p>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <Alert>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Required classes first */}
      {!loading && required.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Required Classes — Start Here
          </p>
          <div className="space-y-2">
            {required.map(rec => {
              const reasonMeta = REASON_LABELS[rec.reason_code] || { label: rec.reason_code, color: 'bg-muted text-muted-foreground' };
              const isAssigning = assigning === rec.class_id;
              return (
                <Card key={rec.class_id} className="p-3 flex items-center gap-3 border-red-100 bg-red-50/30">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{rec.class_title}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={`text-[10px] border-0 ${reasonMeta.color}`}>{reasonMeta.label}</Badge>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAssign(rec)}
                      disabled={isAssigning}
                    >
                      {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Add <ArrowRight className="w-3 h-3 ml-1" /></>}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended classes */}
      {!loading && recommended.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Recommended for You
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {recommended.map(rec => {
              const reasonMeta = REASON_LABELS[rec.reason_code] || { label: rec.reason_code, color: 'bg-muted text-muted-foreground' };
              const isAssigning = assigning === rec.class_id;
              return (
                <Card key={rec.class_id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{rec.class_title}</p>
                    <Badge className={`text-[10px] border-0 mt-1 ${reasonMeta.color}`}>{reasonMeta.label}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-shrink-0"
                    onClick={() => handleAssign(rec)}
                    disabled={isAssigning}
                  >
                    {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All caught up */}
      {!loading && !error && notYetEnrolled.length === 0 && totalRecs > 0 && (
        <Card className="p-4 flex items-center gap-3 bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">All recommendations assigned!</p>
            <p className="text-xs text-emerald-600">Complete your courses to earn certificates.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
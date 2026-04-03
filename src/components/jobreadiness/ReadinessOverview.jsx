import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, AlertCircle, XCircle, FileText, MessageSquare,
  Award, Car, DollarSign, Star
} from 'lucide-react';

function BlockerItem({ icon: Icon, color, label, desc }) {
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg ${color}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-semibold">{label}</p>
        {desc && <p className="text-xs opacity-80 mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

export default function ReadinessOverview({
  resident, profile, staff, residentId, globalId, onRefresh,
  barriers, tasks, resumes, mockInterviews, references, certificates
}) {
  const [creating, setCreating] = useState(false);

  const score = profile?.job_readiness_score ?? resident?.job_readiness_score ?? 0;
  // Pull latest interview score from actual records (sorted newest first), fall back to profile cache
  const sortedInterviews = [...mockInterviews].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestInterview = sortedInterviews[0];
  const interviewScore = latestInterview?.overall_score ?? profile?.interview_readiness_score ?? null;
  const hasResume = resumes.some(r => r.status !== 'draft') || resumes.length > 0;
  const hasInterview = mockInterviews.length > 0;
  const hasReferences = references.filter(r => r.status === 'confirmed').length > 0;
  const activeDocs = (resident?.missing_documents || []).filter(Boolean);

  const blockers = [];
  if (!hasResume) blockers.push({ label: 'No Resume', desc: 'Build a resume to unlock job matching.', color: 'bg-red-50 text-red-700', icon: XCircle });
  if (!hasInterview) blockers.push({ label: 'No Mock Interview', desc: 'Schedule a mock interview with staff.', color: 'bg-amber-50 text-amber-700', icon: AlertCircle });
  if (!hasReferences) blockers.push({ label: 'No Confirmed References', desc: 'Add at least one professional reference.', color: 'bg-amber-50 text-amber-700', icon: AlertCircle });
  if (activeDocs.length > 0) blockers.push({ label: 'Missing Documents', desc: activeDocs.join(', '), color: 'bg-red-50 text-red-700', icon: XCircle });

  const activeBarrierCount = barriers.filter(b => b.status !== 'resolved').length;

  const handleCreateProfile = async () => {
    setCreating(true);
    await base44.entities.EmployabilityProfile.create({
      global_resident_id: globalId || residentId,
      resident_id: residentId,
      organization_id: resident?.organization_id || '',
      job_readiness_score: resident?.job_readiness_score || 0,
      resume_status: 'none',
      is_job_ready: false,
    });
    await onRefresh();
    setCreating(false);
  };

  if (!profile) {
    return (
      <Card className="p-8 text-center">
        <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-heading font-semibold mb-1">No Employability Profile Yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Create one to start tracking job readiness.</p>
        {staff && (
          <Button onClick={handleCreateProfile} disabled={creating} size="sm">
            {creating ? 'Creating...' : 'Create Profile'}
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Job Readiness', value: `${score}%`, sub: <Progress value={score} className="h-1.5 mt-1" /> },
          { label: 'Interview Score', value: interviewScore != null ? `${interviewScore}%` : '—', sub: interviewScore != null ? <Progress value={interviewScore} className="h-1.5 mt-1" /> : null },
          { label: 'Active Barriers', value: activeBarrierCount, sub: null },
          { label: 'Certifications', value: certificates.length, sub: null },
        ].map(({ label, value, sub }) => (
          <Card key={label} className="p-4 text-center">
            <p className="font-heading font-bold text-xl">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            {sub}
          </Card>
        ))}
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <Card className="p-4">
          <h4 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-destructive" /> Job Readiness Blockers
          </h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {blockers.map((b, i) => <BlockerItem key={i} {...b} />)}
          </div>
        </Card>
      )}

      {/* Good to go items */}
      <Card className="p-4">
        <h4 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Readiness Checklist
        </h4>
        <div className="space-y-2">
          {[
            { label: 'Resume on file', done: hasResume },
            { label: 'Mock interview completed', done: hasInterview },
            { label: 'Reference confirmed', done: hasReferences },
            { label: 'Documents complete', done: activeDocs.length === 0 },
            { label: 'Transportation arranged', done: !!(profile.transportation_radius_miles) },
            { label: 'Target wage set', done: !!(profile.target_hourly_wage) },
          ].map(({ label, done }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className={`w-4 h-4 ${done ? 'text-emerald-500' : 'text-muted-foreground opacity-30'}`} />
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
              {done && <Badge className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border-0">Done</Badge>}
            </div>
          ))}
        </div>
      </Card>

      {/* Certifications from Learning */}
      {certificates.length > 0 && (
        <Card className="p-4">
          <h4 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Earned Certifications
          </h4>
          <div className="flex flex-wrap gap-2">
            {certificates.map(c => (
              <Badge key={c.id} className="bg-primary/10 text-primary border-0 text-xs">
                {c.certificate_name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Barrier-aware work notes */}
      {(profile.barrier_work_notes || activeBarrierCount > 0) && (
        <Card className="p-4">
          <h4 className="font-heading font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Barrier-Aware Work Considerations
          </h4>
          {profile.barrier_work_notes
            ? <p className="text-sm text-muted-foreground">{profile.barrier_work_notes}</p>
            : <p className="text-sm text-muted-foreground">This resident has {activeBarrierCount} active barrier(s) that may affect job placement. See Intake & Barriers for details.</p>
          }
        </Card>
      )}
    </div>
  );
}
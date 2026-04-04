import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { matchLabel, JOB_STATUSES } from '@/lib/jobMatchScoring';
import {
  CheckCircle2, AlertCircle, MapPin, DollarSign, Clock,
  ChevronDown, ChevronUp, ShieldCheck, AlertTriangle
} from 'lucide-react';

// Pipeline stages in logical order — staff can move freely among these
const PIPELINE_STAGES = [
  'recommended',
  'viewed',
  'applied',
  'interview_requested',
  'interview_scheduled',
  'hired',
  'not_selected',
  'retained_30',
  'retained_60',
  'retained_90',
];

// Statuses that mean the resident has already submitted an application
const APPLIED_OR_BEYOND = new Set([
  'applied', 'interview_requested', 'interview_scheduled',
  'hired', 'not_selected', 'retained_30', 'retained_60', 'retained_90',
]);

export default function JobMatchCard({ match, job, staff, onStatusChange, onApprove }) {
  const [expanded, setExpanded] = useState(false);
  if (!job) return null;

  const { label, color, bg, border } = matchLabel(match.match_score);
  const statusInfo = JOB_STATUSES[match.status] || JOB_STATUSES.recommended;
  const alreadyApplied = APPLIED_OR_BEYOND.has(match.status);

  const wageStr = job.wage_min
    ? job.wage_max && job.wage_max !== job.wage_min
      ? `$${job.wage_min}–$${job.wage_max}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
      : `$${job.wage_min}/${job.wage_type === 'hourly' ? 'hr' : 'yr'}`
    : null;

  const hasDetails = (match.match_reasons?.length > 0) || (match.blockers?.length > 0);

  return (
    <Card className={`p-4 border ${border}`}>
      <div className="flex items-start gap-3">
        {/* Score badge */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${bg} flex items-center justify-center`}>
          <span className={`font-heading font-bold text-lg ${color}`}>{match.match_score ?? '?'}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-sm">{job.title}</p>
              <p className="text-xs text-muted-foreground">{job.employer_name}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={`text-[10px] border-0 ${bg} ${color}`}>{label}</Badge>
              <Badge className={`text-[10px] border-0 ${statusInfo.color}`}>{statusInfo.label}</Badge>
              {match.staff_approved && (
                <Badge className="text-[10px] border-0 bg-emerald-50 text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Staff Approved
                </Badge>
              )}
            </div>
          </div>

          {/* Job meta */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {(job.city || job.location) && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />{job.city || job.location}
              </span>
            )}
            {wageStr && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" />{wageStr}
              </span>
            )}
            {job.schedule_type && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />{job.schedule_type.replace('_', ' ')}
              </span>
            )}
            {job.second_chance_friendly && <Badge className="text-[10px] bg-blue-50 text-blue-700 border-0">2nd Chance ✓</Badge>}
            {job.veteran_friendly && <Badge className="text-[10px] bg-purple-50 text-purple-700 border-0">Veteran ✓</Badge>}
            {job.is_remote && <Badge className="text-[10px] bg-teal-50 text-teal-700 border-0">Remote</Badge>}
          </div>

          {/* Why this match? toggle */}
          {hasDetails && (
            <button
              className="text-xs text-primary flex items-center gap-1 mt-1.5 hover:underline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide fit details' : 'Why this match?'}
            </button>
          )}

          {/* Fit details */}
          {expanded && (
            <div className="mt-2 space-y-1 text-xs">
              {match.match_reasons?.length > 0 && (
                <>
                  <p className="font-semibold text-emerald-800 mb-1">Why it's a good fit:</p>
                  {match.match_reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{r}
                    </div>
                  ))}
                </>
              )}
              {match.blockers?.length > 0 && (
                <>
                  <p className="font-semibold text-amber-800 mt-2 mb-1">Things to address:</p>
                  {match.blockers.map((b, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{b}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Duplicate application warning for residents */}
          {!staff && alreadyApplied && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              You've already applied to this job. Current status: <strong className="ml-0.5">{statusInfo.label}</strong>
            </div>
          )}

          {/* Staff actions: status dropdown + approve */}
          {staff && (
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <Select value={match.status} onValueChange={v => onStatusChange(match, v)}>
                <SelectTrigger className="h-7 text-xs w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(k => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {JOB_STATUSES[k]?.label || k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!match.staff_approved && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onApprove(match)}>
                  <ShieldCheck className="w-3 h-3 mr-1" /> Approve
                </Button>
              )}
              {match.applied_date && (
                <span className="text-[10px] text-muted-foreground">Applied {match.applied_date}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
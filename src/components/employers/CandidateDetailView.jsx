import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

const PIPELINE_STAGES = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview_requested', label: 'Interview Requested' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'hired', label: 'Hired' },
  { value: 'not_selected', label: 'Not Selected' },
];

export default function CandidateDetailView({ candidate, onStatusChange, onClose }) {
  const [newStatus, setNewStatus] = useState(candidate.status);
  const [saving, setSaving] = useState(false);

  const handleStatusChange = async () => {
    setSaving(true);
    try {
      await base44.entities.JobMatch.update(candidate.id, {
        status: newStatus,
      });
      onStatusChange();
      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
    }
    setSaving(false);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">
            {candidate.resident?.first_name} {candidate.resident?.last_name}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{candidate.resident?.global_resident_id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Match Score & Status */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Match Score</p>
            <p className="text-2xl font-bold">{candidate.match_score}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Job Readiness</p>
            <p className="text-2xl font-bold">{candidate.resident?.job_readiness_score || 'N/A'}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Classes Completed</p>
            <p className="text-2xl font-bold">{candidate.completedClasses || 0}</p>
          </div>
        </div>

        {/* Match Details */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Why This Match?</p>
          {candidate.match_reasons && candidate.match_reasons.length > 0 ? (
            <div className="space-y-1">
              {candidate.match_reasons.map((reason, idx) => (
                <div key={idx} className="text-xs p-2 bg-accent/10 rounded">
                  ✓ {reason}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No specific reasons recorded</p>
          )}
        </div>

        {/* Potential Concerns */}
        {candidate.blockers && candidate.blockers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Potential Concerns</p>
            <div className="space-y-1">
              {candidate.blockers.map((blocker, idx) => (
                <div key={idx} className="text-xs p-2 bg-destructive/10 rounded">
                  ⚠ {blocker}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Management */}
        <div className="space-y-3 pt-4 border-t">
          <div>
            <p className="text-xs font-medium mb-2">Move to Stage</p>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PIPELINE_STAGES.map(stage => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {candidate.notes && (
            <div>
              <p className="text-xs font-medium mb-1">Notes</p>
              <p className="text-xs p-2 bg-muted rounded">{candidate.notes}</p>
            </div>
          )}

          <Button
            onClick={handleStatusChange}
            disabled={newStatus === candidate.status || saving}
            className="w-full"
          >
            {saving ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
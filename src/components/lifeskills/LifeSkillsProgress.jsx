import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ChevronDown, ChevronUp, Play, CheckCircle2, Clock, Lock } from 'lucide-react';

const DIFFICULTY_COLORS = {
  beginner: 'bg-emerald-900 text-emerald-300',
  intermediate: 'bg-amber-900 text-amber-300',
  advanced: 'bg-red-900 text-red-300',
};

const STATUS_BADGE = {
  assigned: { label: 'Assigned', color: 'bg-slate-700 text-slate-300' },
  in_progress: { label: 'In Progress', color: 'bg-blue-900 text-blue-300' },
  completed: { label: 'Completed', color: 'bg-emerald-900 text-emerald-300' },
  passed: { label: 'Passed', color: 'bg-emerald-700 text-white' },
  declined: { label: 'Declined', color: 'bg-red-900 text-red-300' },
};

const TRACK_COLORS = [
  '#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899',
  '#06B6D4','#34D399','#F97316','#EAB308','#64748B','#DC2626','#7C3AED'
];

export default function LifeSkillsProgress({ residentId, globalResidentId }) {
  const [expandedTrack, setExpandedTrack] = useState(null);
  const queryClient = useQueryClient();

  const { data: tracks = [] } = useQuery({
    queryKey: ['learning-tracks'],
    queryFn: () => base44.entities.LearningTrack.list(),
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list(),
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['life-skills-assignments', residentId],
    queryFn: () => base44.entities.LearningAssignment.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const startClassMutation = useMutation({
    mutationFn: async (assignment) => {
      return base44.entities.LearningAssignment.update(assignment.id, { status: 'in_progress' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['life-skills-assignments', residentId] }),
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('autoAssignLifeSkillsClasses', { resident_id: residentId });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['life-skills-assignments', residentId] }),
  });

  // Group assignments by track
  const assignmentsByTrack = {};
  for (const a of assignments) {
    const cls = allClasses.find(c => c.id === a.class_id);
    if (!cls) continue;
    const trackId = cls.track_id;
    if (!assignmentsByTrack[trackId]) assignmentsByTrack[trackId] = [];
    assignmentsByTrack[trackId].push({ ...a, classData: cls });
  }

  const assignedTrackIds = Object.keys(assignmentsByTrack);
  const assignedTracks = tracks.filter(t => assignedTrackIds.includes(t.track_id));

  // Overall completion
  const totalAssigned = assignments.length;
  const totalCompleted = assignments.filter(a => ['completed','passed'].includes(a.status)).length;
  const overallPct = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  if (isLoading) return <div className="text-slate-400 text-sm py-4">Loading Life Skills progress...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-amber-400" /> Life Skills Academy
        </h3>
        {assignments.length === 0 && (
          <Button size="sm" onClick={() => autoAssignMutation.mutate()} disabled={autoAssignMutation.isPending} style={{ backgroundColor: '#F59E0B', color: '#0D1117' }}>
            {autoAssignMutation.isPending ? 'Assigning...' : '⚡ Auto-Assign Classes'}
          </Button>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border p-6 text-center" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p className="text-slate-400 text-sm">No Life Skills classes assigned yet.</p>
          <p className="text-slate-500 text-xs mt-1">Click "Auto-Assign Classes" to enroll based on barriers.</p>
        </div>
      ) : (
        <>
          {/* Overall Progress */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Overall Completion</span>
              <span className="text-lg font-bold text-amber-400">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-3" />
            <p className="text-xs text-slate-400 mt-1">{totalCompleted} of {totalAssigned} classes completed across {assignedTracks.length} tracks</p>
          </div>

          {/* Tracks */}
          <div className="space-y-2">
            {assignedTracks.map((track, idx) => {
              const trackAssignments = assignmentsByTrack[track.track_id] || [];
              const completed = trackAssignments.filter(a => ['completed','passed'].includes(a.status)).length;
              const pct = trackAssignments.length > 0 ? Math.round((completed / trackAssignments.length) * 100) : 0;
              const color = TRACK_COLORS[idx % TRACK_COLORS.length];
              const isExpanded = expandedTrack === track.track_id;

              return (
                <div key={track.track_id} className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
                  <button
                    onClick={() => setExpandedTrack(isExpanded ? null : track.track_id)}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xl flex-shrink-0">{track.icon || '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">{track.title}</span>
                        <span className="text-xs font-bold flex-shrink-0" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-slate-400 flex-shrink-0">{completed}/{trackAssignments.length}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: '#30363D' }}>
                      {trackAssignments.sort((a, b) => (a.classData?.order || 0) - (b.classData?.order || 0)).map((a, i) => {
                        const prevCompleted = i === 0 || ['completed','passed'].includes(trackAssignments[i-1]?.status);
                        const isLocked = !prevCompleted && i > 0;
                        const statusMeta = STATUS_BADGE[a.status] || STATUS_BADGE.assigned;

                        return (
                          <div key={a.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${isLocked ? 'opacity-50' : ''}`} style={{ borderColor: '#30363D' }}>
                            <div className="flex-shrink-0">
                              {['completed','passed'].includes(a.status) ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : isLocked ? (
                                <Lock className="w-4 h-4 text-slate-500" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{a.classData?.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[a.classData?.difficulty]}`}>{a.classData?.difficulty}</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{a.classData?.estimated_minutes}m</span>
                              </div>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${statusMeta.color}`}>{statusMeta.label}</span>
                            {!['completed','passed'].includes(a.status) && !isLocked && (
                              <Button
                                size="sm"
                                onClick={() => startClassMutation.mutate(a)}
                                disabled={startClassMutation.isPending}
                                className="text-xs flex-shrink-0"
                                style={{ backgroundColor: color + '33', color, border: `1px solid ${color}66` }}
                              >
                                <Play className="w-3 h-3 mr-1" /> Start
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
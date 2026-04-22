import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Users, CheckCircle, Zap, Award } from 'lucide-react';
import { format } from 'date-fns';
import { useOutletContext } from 'react-router-dom';

function calcReadinessScore(resident, barriers = [], enrollments = []) {
  let score = 0;
  // Base: active status
  if (['active', 'employed', 'housing_eligible'].includes(resident.status)) score += 20;
  // Barriers cleared
  const totalBarriers = barriers.length;
  const resolvedBarriers = barriers.filter(b => b.status === 'resolved').length;
  if (totalBarriers > 0) score += Math.round((resolvedBarriers / totalBarriers) * 25);
  else score += 15;
  // Life skills completions
  const completed = enrollments.filter(e => e.status === 'completed').length;
  score += Math.min(completed * 5, 25);
  // Job readiness score from profile
  if (resident.job_readiness_score) score += Math.min(Math.round(resident.job_readiness_score * 0.3), 30);
  return Math.min(score, 100);
}

function ReadinessBadge({ score }) {
  const color = score >= 75 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    : score >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
    : 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${color}`}>{score}% Ready</span>
  );
}

export default function MatchClientModal({ job, onClose, onPlaced }) {
  const qc = useQueryClient();
  const [placing, setPlacing] = useState(null);
  const [placed, setPlaced] = useState(new Set());

  const outletContext = useOutletContext();
  const user = outletContext?.user || null;

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-for-match'],
    queryFn: () => base44.entities.Resident.list('-created_date', 200),
  });
  const { data: barriers = [] } = useQuery({
    queryKey: ['barriers-all'],
    queryFn: () => base44.entities.BarrierItem.list('-created_date', 500),
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments-all'],
    queryFn: () => base44.entities.ClassEnrollment.list('-created_date', 500),
  });

  const activeResidents = residents.filter(r =>
    ['active', 'housing_eligible', 'housing_pending', 'employed'].includes(r.status)
  );

  const scored = activeResidents.map(r => {
    const rBarriers = barriers.filter(b => b.resident_id === r.id);
    const rEnrolls = enrollments.filter(e => e.resident_id === r.id);
    const score = calcReadinessScore(r, rBarriers, rEnrolls);

    // Check transport match
    const hasTransport = !job.transportation_accessible || r.status !== 'active'; // pass if not required
    const bgcWarning = job.background_check_required;

    return { resident: r, score, hasTransport, bgcWarning };
  }).sort((a, b) => b.score - a.score);

  const handlePlace = async (item) => {
    setPlacing(item.resident.id);
    await base44.entities.JobPlacement.create({
      client_id: item.resident.id,
      global_resident_id: item.resident.global_resident_id,
      client_name: `${item.resident.first_name} ${item.resident.last_name}`,
      employer_id: job.employer_id,
      employer_name: job.employer_name,
      employer_logo_url: job.employer_logo_url,
      job_listing_id: job.id,
      job_title: job.job_title || job.title,
      pay_rate: job.pay_rate,
      placement_date: new Date().toISOString().split('T')[0],
      case_manager_id: user?.id,
      case_manager_name: user?.full_name,
      status: 'placed',
    });
    setPlacing(null);
    setPlaced(prev => new Set([...prev, item.resident.id]));
    qc.invalidateQueries({ queryKey: ['job-placements'] });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-[#30363D]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white">Match Clients to Job</h2>
            </div>
            <p className="text-sm text-slate-400">{job.job_title || job.title} at {job.employer_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{job.pay_rate} · {(job.positions_available || 1) - (job.positions_filled || 0)} spots open</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {scored.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p>No active clients found</p>
            </div>
          )}
          {scored.map(({ resident: r, score, bgcWarning }) => {
            const isPlaced = placed.has(r.id);
            const initials = `${r.first_name?.[0] || ''}${r.last_name?.[0] || ''}`.toUpperCase();
            return (
              <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isPlaced ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#21262D] border-[#30363D] hover:border-blue-500/30'}`}>
                {r.photo_url ? (
                  <img src={r.photo_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{r.first_name} {r.last_name}</span>
                    <ReadinessBadge score={score} />
                    {bgcWarning && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">BGC Req</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{r.assigned_case_manager || 'No case manager'} · {r.status?.replace(/_/g,' ')}</p>
                </div>
                {isPlaced ? (
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold shrink-0">
                    <CheckCircle className="w-4 h-4" /> Placed
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePlace({ resident: r, score })}
                    disabled={placing === r.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 shrink-0"
                  >
                    {placing === r.id ? '...' : 'Place'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#30363D]">
          <Button variant="outline" onClick={onClose} className="w-full border-[#30363D] text-slate-300">
            {placed.size > 0 ? `Done (${placed.size} placed)` : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
import { differenceInDays, parseISO } from 'date-fns';
import { DollarSign, Calendar, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  researching: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  drafting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  submitted: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  under_review: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  awarded: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  denied: 'bg-red-500/20 text-red-400 border-red-500/30',
  reporting: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  closed: 'bg-slate-600/20 text-slate-500 border-slate-600/30',
};

export default function GrantCard({ grant, onClick }) {
  const deadline = grant.application_deadline ? parseISO(grant.application_deadline) : null;
  const daysUntil = deadline ? differenceInDays(deadline, new Date()) : null;
  const isUrgent = daysUntil !== null && daysUntil <= 30 && daysUntil >= 0;
  const isPast = daysUntil !== null && daysUntil < 0;

  return (
    <div
      onClick={onClick}
      className="bg-[#0D1117] border border-[#30363D] rounded-xl p-4 cursor-pointer hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">{grant.funder_name}</div>
          <div className="text-sm font-semibold text-white leading-tight">{grant.grant_name}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[grant.status] || STATUS_COLORS.researching}`}>
          {grant.status?.replace('_', ' ')}
        </span>
      </div>

      {grant.grant_amount > 0 && (
        <div className="flex items-center gap-1 text-amber-400 font-semibold text-sm">
          <DollarSign className="w-3.5 h-3.5" />
          {grant.grant_amount.toLocaleString()}
        </div>
      )}

      {deadline && (
        <div className={`flex items-center gap-1.5 text-xs ${isPast ? 'text-slate-500' : isUrgent ? 'text-red-400' : 'text-slate-400'}`}>
          {isUrgent && <AlertCircle className="w-3 h-3" />}
          <Calendar className="w-3 h-3" />
          <span>
            {isPast ? 'Deadline passed' : daysUntil === 0 ? 'Due today!' : `${daysUntil}d until deadline`}
          </span>
        </div>
      )}

      {grant.program_area && (
        <div className="text-xs text-slate-600">{grant.program_area}</div>
      )}
    </div>
  );
}
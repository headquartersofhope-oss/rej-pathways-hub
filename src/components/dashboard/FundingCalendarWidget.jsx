import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays, parseISO, format } from 'date-fns';
import { DollarSign, AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function UrgencyDot({ days }) {
  if (days <= 7) return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />;
  if (days <= 14) return <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />;
  if (days <= 30) return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />;
}

export default function FundingCalendarWidget() {
  const { data: grants = [] } = useQuery({
    queryKey: ['grants-calendar'],
    queryFn: () => base44.entities.Grant.list('-application_deadline', 100),
  });

  const now = new Date();

  // Collect upcoming deadlines: grant application deadlines + reporting deadlines
  const events = [];

  for (const grant of grants) {
    if (grant.status === 'denied' || grant.status === 'closed') continue;

    if (grant.application_deadline) {
      const days = differenceInDays(parseISO(grant.application_deadline), now);
      if (days >= 0 && days <= 90) {
        events.push({
          id: `app-${grant.id}`,
          label: grant.grant_name,
          funder: grant.funder_name,
          date: grant.application_deadline,
          days,
          type: 'deadline',
          amount: grant.grant_amount,
        });
      }
    }

    for (const rd of (grant.reporting_deadlines || [])) {
      if (rd.completed || !rd.due_date) continue;
      const days = differenceInDays(parseISO(rd.due_date), now);
      if (days >= 0 && days <= 90) {
        events.push({
          id: `rpt-${grant.id}-${rd.label}`,
          label: `${grant.grant_name}: ${rd.label}`,
          funder: grant.funder_name,
          date: rd.due_date,
          days,
          type: 'reporting',
          amount: null,
        });
      }
    }
  }

  events.sort((a, b) => a.days - b.days);
  const top5 = events.slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#30363D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Funding Calendar</span>
        </div>
        <Link to="/grants" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
          View All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-[#30363D]">
        {top5.map(event => (
          <Link key={event.id} to="/grants" className="flex items-center gap-3 px-5 py-3 hover:bg-[#21262D] transition-colors group">
            <UrgencyDot days={event.days} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{event.label}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-500">{event.funder}</span>
                {event.type === 'reporting' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400">Report Due</span>
                )}
                {event.amount > 0 && (
                  <span className="text-[10px] text-amber-400">${event.amount.toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-xs font-semibold ${event.days <= 7 ? 'text-red-400' : event.days <= 14 ? 'text-orange-400' : event.days <= 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                {event.days === 0 ? 'TODAY' : `${event.days}d`}
              </div>
              <div className="text-[10px] text-slate-600">{format(parseISO(event.date), 'MMM d')}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
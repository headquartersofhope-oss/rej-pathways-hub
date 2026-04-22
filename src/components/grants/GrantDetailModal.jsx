import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, CheckSquare, Square, Edit, Trash2, BarChart3, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  researching: 'bg-slate-500/20 text-slate-400',
  drafting: 'bg-blue-500/20 text-blue-400',
  submitted: 'bg-amber-500/20 text-amber-400',
  under_review: 'bg-purple-500/20 text-purple-400',
  awarded: 'bg-emerald-500/20 text-emerald-400',
  denied: 'bg-red-500/20 text-red-400',
  reporting: 'bg-teal-500/20 text-teal-400',
  closed: 'bg-slate-600/20 text-slate-500',
};

export default function GrantDetailModal({ grant, onClose, onEdit, onDeleted, onUpdated }) {
  const [deleting, setDeleting] = useState(false);

  const toggleDeadline = async (i) => {
    const updated = [...(grant.reporting_deadlines || [])];
    updated[i] = { ...updated[i], completed: !updated[i].completed };
    await base44.entities.Grant.update(grant.id, { reporting_deadlines: updated });
    onUpdated({ ...grant, reporting_deadlines: updated });
  };

  const handleDelete = async () => {
    if (!confirm('Delete this grant?')) return;
    setDeleting(true);
    await base44.entities.Grant.delete(grant.id);
    onDeleted();
  };

  const Row = ({ label, value }) => value ? (
    <div className="flex gap-3">
      <span className="text-xs text-slate-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-300">{value}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#30363D]">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{grant.funder_name}</div>
            <h2 className="text-lg font-semibold text-white">{grant.grant_name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} className="border-[#30363D] text-slate-300 text-xs flex items-center gap-1">
              <Edit className="w-3 h-3" /> Edit
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Amounts */}
          <div className="flex flex-wrap gap-3">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[grant.status]}`}>
              {grant.status?.replace('_', ' ')}
            </span>
            {grant.grant_amount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold">
                ${grant.grant_amount.toLocaleString()} requested
              </span>
            )}
            {grant.amount_received > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
                ${grant.amount_received.toLocaleString()} received
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-2">
            <Row label="Funder Type" value={grant.funder_type?.replace('_', ' ')} />
            <Row label="Program Area" value={grant.program_area} />
            <Row label="Application Deadline" value={grant.application_deadline ? format(parseISO(grant.application_deadline), 'MMM d, yyyy') : null} />
            <Row label="Award Date" value={grant.award_date ? format(parseISO(grant.award_date), 'MMM d, yyyy') : null} />
            <Row label="Grant Period" value={grant.grant_start && grant.grant_end ? `${format(parseISO(grant.grant_start), 'MMM d, yyyy')} — ${format(parseISO(grant.grant_end), 'MMM d, yyyy')}` : null} />
            <Row label="Contact" value={grant.contact_name ? `${grant.contact_name}${grant.contact_email ? ' · ' + grant.contact_email : ''}` : null} />
            <Row label="Restrictions" value={grant.restrictions} />
          </div>

          {/* Reporting Requirements */}
          {grant.reporting_requirements && (
            <div>
              <div className="text-xs text-slate-500 mb-2">Reporting Requirements</div>
              <p className="text-sm text-slate-300 bg-[#0D1117] rounded-lg p-3 leading-relaxed">{grant.reporting_requirements}</p>
            </div>
          )}

          {/* Reporting Deadlines Checklist */}
          {grant.reporting_deadlines?.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-3">Reporting Deadlines</div>
              <div className="space-y-2">
                {grant.reporting_deadlines.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDeadline(i)}
                    className="flex items-center gap-3 w-full text-left bg-[#0D1117] rounded-lg px-3 py-2.5 hover:bg-[#161B22] transition-colors"
                  >
                    {d.completed
                      ? <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <Square className="w-4 h-4 text-slate-500 shrink-0" />}
                    <span className={`text-sm flex-1 ${d.completed ? 'line-through text-slate-500' : 'text-white'}`}>{d.label}</span>
                    <span className="text-xs text-slate-500">{d.due_date ? format(parseISO(d.due_date), 'MMM d, yyyy') : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {grant.notes && (
            <div>
              <div className="text-xs text-slate-500 mb-2">Notes</div>
              <p className="text-sm text-slate-300 bg-[#0D1117] rounded-lg p-3 leading-relaxed">{grant.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-[#30363D]">
            <Button
              size="sm"
              variant="outline"
              className="border-[#30363D] text-slate-300 text-xs flex items-center gap-1"
              onClick={() => {
                if (grant.grant_start && grant.grant_end) {
                  window.open(`/outcomes-engine?start=${grant.grant_start}&end=${grant.grant_end}`, '_blank');
                } else {
                  window.open('/outcomes-engine', '_blank');
                }
              }}
            >
              <BarChart3 className="w-3 h-3" /> Generate Outcomes Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#30363D] text-slate-300 text-xs flex items-center gap-1"
              onClick={() => {
                const subject = encodeURIComponent(`Grant Report: ${grant.grant_name}`);
                const body = encodeURIComponent(`Dear ${grant.contact_name || 'Grant Officer'},\n\nPlease find attached the program outcomes report for the ${grant.grant_name} grant from ${grant.funder_name}.\n\nGrant Period: ${grant.grant_start || 'TBD'} to ${grant.grant_end || 'TBD'}\nAmount Awarded: $${(grant.grant_amount || 0).toLocaleString()}\n\nThank you for your continued partnership.\n\nHeadquarters of Hope Foundation`);
                window.open(`mailto:${grant.contact_email || ''}?subject=${subject}&body=${body}`);
              }}
            >
              <Mail className="w-3 h-3" /> Email Funder
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={handleDelete} disabled={deleting} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
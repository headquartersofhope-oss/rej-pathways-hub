import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Edit, Trash2, Mail, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400',
  lapsed: 'bg-red-500/20 text-red-400',
  prospect: 'bg-slate-500/20 text-slate-400',
  major_donor: 'bg-amber-500/20 text-amber-400',
  recurring: 'bg-teal-500/20 text-teal-400',
};

export default function DonorDetailModal({ donor, onClose, onEdit, onDeleted }) {
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [thankYouLetter, setThankYouLetter] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleGenerateLetter = async () => {
    setGeneratingLetter(true);
    const giftSummary = (donor.gifts || []).length > 0
      ? donor.gifts.map(g => `$${g.amount?.toLocaleString()} on ${g.date}${g.purpose ? ' for ' + g.purpose : ''}`).join(', ')
      : `a total of $${(donor.total_given || 0).toLocaleString()}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a warm, heartfelt, personalized thank-you letter from Headquarters of Hope Foundation to a donor named ${donor.donor_name}. 
      Their giving history: ${giftSummary}. 
      Total lifetime giving: $${(donor.total_given || 0).toLocaleString()}.
      Donor type: ${donor.donor_type}. Status: ${donor.status?.replace('_', ' ')}.
      
      The letter should:
      - Open with a sincere greeting using their name
      - Reference their specific giving history naturally
      - Describe the real impact their generosity has on residents experiencing housing instability and barriers to employment
      - Be warm, genuine, and not generic — mention real program outcomes like housing placements, employment, and life skills
      - Close with a strong call to continued partnership
      - Sign from "Rodney Johnson, Executive Director, Headquarters of Hope Foundation"
      - Be 3-4 paragraphs, professional but personal`
    });
    setThankYouLetter(result);
    setGeneratingLetter(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this donor record?')) return;
    setDeleting(true);
    await base44.entities.Donor.delete(donor.id);
    onDeleted();
  };

  const initials = donor.donor_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'D';

  const sortedGifts = [...(donor.gifts || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#30363D]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-900 font-bold text-sm">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{donor.donor_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{donor.donor_type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[donor.status] || STATUS_COLORS.prospect}`}>
                  {donor.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onEdit} className="border-[#30363D] text-slate-300 text-xs flex items-center gap-1">
              <Edit className="w-3 h-3" /> Edit
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Total Given Hero */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">${(donor.total_given || 0).toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Lifetime Giving</div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {donor.contact_email && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Email</div>
                <div className="text-slate-300">{donor.contact_email}</div>
              </div>
            )}
            {donor.contact_phone && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Phone</div>
                <div className="text-slate-300">{donor.contact_phone}</div>
              </div>
            )}
            {donor.first_gift_date && (
              <div>
                <div className="text-xs text-slate-500 mb-1">First Gift</div>
                <div className="text-slate-300">{format(parseISO(donor.first_gift_date), 'MMM d, yyyy')}</div>
              </div>
            )}
            {donor.last_gift_date && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Last Gift</div>
                <div className="text-slate-300">{format(parseISO(donor.last_gift_date), 'MMM d, yyyy')}</div>
              </div>
            )}
            {donor.communication_preference && (
              <div>
                <div className="text-xs text-slate-500 mb-1">Communication Preference</div>
                <div className="text-slate-300">{donor.communication_preference}</div>
              </div>
            )}
          </div>

          {/* Gift Timeline */}
          {sortedGifts.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-3">Giving History</div>
              <div className="relative pl-4 space-y-3">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-[#30363D]" />
                {sortedGifts.map((g, i) => (
                  <div key={i} className="relative pl-4">
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-amber-500 -translate-x-1" />
                    <div className="bg-[#0D1117] rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-400 font-semibold text-sm">${g.amount?.toLocaleString()}</span>
                        <span className="text-xs text-slate-500">{g.date ? format(parseISO(g.date), 'MMM d, yyyy') : ''}</span>
                      </div>
                      {g.purpose && <div className="text-xs text-slate-400 mt-0.5">{g.purpose}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {donor.notes && (
            <div>
              <div className="text-xs text-slate-500 mb-2">Notes</div>
              <p className="text-sm text-slate-300 bg-[#0D1117] rounded-lg p-3">{donor.notes}</p>
            </div>
          )}

          {/* Thank You Letter */}
          <div>
            <Button
              onClick={handleGenerateLetter}
              disabled={generatingLetter}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-2 justify-center"
            >
              <Sparkles className="w-4 h-4" />
              {generatingLetter ? 'Generating Letter...' : 'Generate AI Thank You Letter'}
            </Button>
            {thankYouLetter && (
              <div className="mt-4 bg-[#0D1117] border border-[#30363D] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Thank You Letter Draft</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs border-[#30363D] text-slate-400" onClick={() => navigator.clipboard.writeText(thankYouLetter)}>
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs border-[#30363D] text-slate-400 flex items-center gap-1" onClick={() => {
                      const subject = encodeURIComponent(`Thank You from Headquarters of Hope Foundation`);
                      const body = encodeURIComponent(thankYouLetter);
                      window.open(`mailto:${donor.contact_email || ''}?subject=${subject}&body=${body}`);
                    }}>
                      <Mail className="w-3 h-3" /> Email
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{thankYouLetter}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2 border-t border-[#30363D]">
            <Button size="sm" variant="outline" onClick={handleDelete} disabled={deleting} className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
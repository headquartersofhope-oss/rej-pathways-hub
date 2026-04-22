import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Briefcase, MapPin, Phone, Mail, Star, Award, Bus, Car, Shield, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function StarRating({ rating }) {
  const r = Math.round(rating || 0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= r ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
      ))}
      <span className="text-xs text-slate-400 ml-1">({rating?.toFixed(1) || 'N/A'})</span>
    </div>
  );
}

export default function EmployerDetailPanel({ employer: e, jobListings = [], onClose, onEdit, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const initials = e.company_name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'CO';
  const isSecondChance = e.is_second_chance_employer || e.second_chance_friendly;

  const handleDelete = async () => {
    if (!confirm('Delete this employer?')) return;
    setDeleting(true);
    await base44.entities.Employer.delete(e.id);
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#161B22] border border-[#30363D] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#30363D]">
          <div className="flex items-start gap-4">
            {e.company_logo_url || e.logo_url ? (
              <img src={e.company_logo_url || e.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-[#30363D]" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                {initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{e.company_name}</h2>
                {isSecondChance && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Second Chance
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">{e.industry || 'General Industry'}</p>
              {(e.headquarters_city || e.city) && (
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3 h-3" />
                  {e.headquarters_city || e.city}, {e.headquarters_state || e.state}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{jobListings.filter(j => j.status === 'active').length}</div>
              <div className="text-xs text-slate-500">Active Jobs</div>
            </div>
            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{e.total_placements || 0}</div>
              <div className="text-xs text-slate-500">Total Placements</div>
            </div>
            <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 text-center">
              <StarRating rating={e.reliability_rating} />
              <div className="text-xs text-slate-500 mt-1">Reliability</div>
            </div>
          </div>

          {/* Contact */}
          {(e.hiring_contact_name || e.contact_name) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Hiring Contact</h3>
              <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-white">{e.hiring_contact_name || e.contact_name}</p>
                {(e.hiring_contact_email || e.contact_email) && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3 h-3" />
                    <a href={`mailto:${e.hiring_contact_email || e.contact_email}`} className="hover:text-amber-400">
                      {e.hiring_contact_email || e.contact_email}
                    </a>
                  </div>
                )}
                {(e.hiring_contact_phone || e.contact_phone) && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Phone className="w-3 h-3" />
                    <span>{e.hiring_contact_phone || e.contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accessibility */}
          <div className="flex flex-wrap gap-2">
            {e.transportation_accessible && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center gap-1.5">
                <Bus className="w-3 h-3" /> Bus Route Nearby
                {e.bus_route_nearby && `: ${e.bus_route_nearby}`}
              </span>
            )}
            {e.onsite_parking && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 flex items-center gap-1.5">
                <Car className="w-3 h-3" /> Onsite Parking
              </span>
            )}
          </div>

          {/* Policies */}
          {(e.background_check_policy || e.drug_test_policy) && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Hiring Policies</h3>
              <div className="bg-[#21262D] border border-[#30363D] rounded-xl p-4 space-y-2">
                {e.background_check_policy && (
                  <div>
                    <span className="text-xs text-slate-500">Background Check: </span>
                    <span className="text-xs text-slate-300">{e.background_check_policy}</span>
                  </div>
                )}
                {e.drug_test_policy && (
                  <div>
                    <span className="text-xs text-slate-500">Drug Test: </span>
                    <span className="text-xs text-slate-300">{e.drug_test_policy}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Second Chance Policy */}
          {e.second_chance_policy_description && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Second Chance Policy</h3>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-slate-300">{e.second_chance_policy_description}</p>
              </div>
            </div>
          )}

          {/* Benefits */}
          {e.benefits_offered?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Benefits</h3>
              <div className="flex flex-wrap gap-2">
                {e.benefits_offered.map(b => (
                  <span key={b} className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* Active Jobs */}
          {jobListings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Active Job Listings ({jobListings.filter(j=>j.status==='active').length})</h3>
              <div className="space-y-2">
                {jobListings.filter(j => j.status === 'active').map(j => (
                  <div key={j.id} className="bg-[#21262D] border border-[#30363D] rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{j.job_title || j.title}</p>
                      <p className="text-xs text-slate-500">{j.pay_rate || 'Pay TBD'} · {((j.positions_available||1) - (j.positions_filled||0))} spots open</p>
                    </div>
                    <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#30363D] flex gap-2">
          {e.website && (
            <a href={e.website} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="border-[#30363D] text-slate-300 gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Website
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={onEdit} className="border-[#30363D] text-slate-300 gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-1.5 ml-auto">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import ReferralStatusBadge from './ReferralStatusBadge';
import ReferralDocuments from './ReferralDocuments';
import { Edit2, Check, X, FileText, AlertTriangle } from 'lucide-react';

const EDITABLE_STATUSES = ['draft', 'ready_to_submit', 'more_information_requested'];
const ALL_STATUSES = ['draft', 'ready_to_submit', 'submitted', 'received', 'under_review', 'more_information_requested', 'approved', 'denied', 'waitlisted', 'withdrawn', 'closed'];

const PRIORITY_COLORS = {
  urgent: 'text-red-700 bg-red-50 border-red-200',
  high: 'text-orange-700 bg-orange-50 border-orange-200',
  medium: 'text-blue-700 bg-blue-50 border-blue-200',
  low: 'text-gray-700 bg-gray-50 border-gray-200',
};

export default function ReferralDetail({ referral, onEdit, onRefresh, isAdmin }) {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [providerNotes, setProviderNotes] = useState(referral.provider_notes || '');

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    await base44.entities.HousingReferral.update(referral.id, {
      status: newStatus,
      ...(newStatus === 'approved' || newStatus === 'denied' ? { decision_date: new Date().toISOString().split('T')[0] } : {}),
    });
    setUpdatingStatus(false);
    onRefresh();
  };

  const handleSaveProviderNotes = async () => {
    setSavingNotes(true);
    await base44.entities.HousingReferral.update(referral.id, { provider_notes: providerNotes });
    setSavingNotes(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base">{referral.participant_name}</h3>
          <p className="text-xs text-muted-foreground">
            Referral #{referral.id?.slice(-8).toUpperCase()} · {referral.referral_date}
            {referral.target_provider_name && ` → ${referral.target_provider_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ReferralStatusBadge status={referral.status} />
          <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[referral.priority_level]}`}>
            {referral.priority_level?.toUpperCase()} priority
          </Badge>
          {EDITABLE_STATUSES.includes(referral.status) && (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          )}
        </div>
      </div>

      {referral.status === 'more_information_requested' && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> More information has been requested by the housing provider. Edit this referral to add the required information and resubmit.
        </div>
      )}

      {/* Key Info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        {[
          ['Housing Situation', referral.current_housing_situation?.replace(/_/g, ' ')],
          ['Employment', referral.employment_status?.replace(/_/g, ' ')],
          ['Contact Phone', referral.contact_phone || '—'],
          ['Contact Email', referral.contact_email || '—'],
          ['Submitted', referral.submitted_date ? new Date(referral.submitted_date).toLocaleDateString() : '—'],
          ['Decision Date', referral.decision_date || '—'],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{val || '—'}</p>
          </div>
        ))}
      </div>

      {/* Housing Need */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Housing Need Summary</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 text-sm">{referral.housing_need_summary}</CardContent>
      </Card>

      {referral.income_benefit_summary && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Income / Benefits</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 text-sm">{referral.income_benefit_summary}</CardContent>
        </Card>
      )}

      {/* Barriers */}
      {referral.relevant_barriers?.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Relevant Barriers</p>
          <div className="flex flex-wrap gap-1.5">
            {referral.relevant_barriers.map(b => (
              <Badge key={b} variant="outline" className="text-xs">{b.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Consent */}
      <div className="flex items-center gap-2 text-sm">
        {referral.consent_confirmed
          ? <span className="flex items-center gap-1.5 text-green-700"><Check className="w-4 h-4" /> Participant consent confirmed</span>
          : <span className="flex items-center gap-1.5 text-amber-700"><X className="w-4 h-4" /> Consent not yet confirmed</span>
        }
        {referral.consent_categories?.length > 0 && (
          <span className="text-muted-foreground text-xs">· Shared: {referral.consent_categories.join(', ')}</span>
        )}
      </div>

      {/* Documents */}
      {referral.documents?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Attached Documents</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <ReferralDocuments documents={referral.documents} readOnly />
          </CardContent>
        </Card>
      )}

      {/* Internal Notes */}
      {referral.internal_notes && (
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Internal Notes (org only)</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 text-sm italic text-muted-foreground">{referral.internal_notes}</CardContent>
        </Card>
      )}

      {/* Provider Notes */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Housing Provider Notes</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <Textarea value={providerNotes} onChange={e => setProviderNotes(e.target.value)} className="text-sm" rows={2} placeholder="Notes received from housing provider..." />
          <Button size="sm" variant="outline" onClick={handleSaveProviderNotes} disabled={savingNotes}>
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </Button>
        </CardContent>
      </Card>

      {/* Status Update */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Update Status (Admin)</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 flex flex-wrap gap-2">
            {ALL_STATUSES.filter(s => s !== referral.status).map(s => (
              <Button key={s} size="sm" variant="outline" className="text-xs h-7" disabled={updatingStatus} onClick={() => handleStatusChange(s)}>
                → {s.replace(/_/g, ' ')}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {referral.external_referral_id && (
        <p className="text-xs text-muted-foreground">External ID: <code className="bg-muted px-1 rounded">{referral.external_referral_id}</code></p>
      )}
    </div>
  );
}
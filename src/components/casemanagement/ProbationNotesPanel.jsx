import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Shield, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const CONTACT_TYPES = [
  'office_visit', 'home_visit', 'phone_call', 'court_date',
  'drug_test', 'employment_check', 'general_observation', 'other'
];

const COMPLIANCE_STATUSES = ['compliant', 'non_compliant', 'pending_review', 'unknown'];

const complianceColors = {
  compliant: 'bg-emerald-50 text-emerald-700',
  non_compliant: 'bg-red-50 text-red-700',
  pending_review: 'bg-amber-50 text-amber-700',
  unknown: 'bg-slate-100 text-slate-600',
};

const ComplianceIcon = ({ status }) => {
  if (status === 'compliant') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'non_compliant') return <AlertCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

/**
 * ProbationNotesPanel — read/write panel for probation officers.
 * Staff/admin can view these notes too. Only POs can create them.
 *
 * Props:
 *   resident   — Resident record
 *   user       — Current user
 *   canAddNote — boolean from perms
 */
export default function ProbationNotesPanel({ resident, user, canAddNote = false }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    note_date: new Date().toISOString().split('T')[0],
    contact_type: 'general_observation',
    compliance_status: 'unknown',
    content: '',
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['probation-notes', resident.id],
    queryFn: () => base44.entities.ProbationNote.filter({ resident_id: resident.id }, '-note_date'),
    enabled: !!resident?.id,
  });

  const handleSave = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    await base44.entities.ProbationNote.create({
      ...form,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id || resident.id,
      organization_id: resident.organization_id || '',
      author_id: user?.id || '',
      author_name: user?.full_name || user?.email || 'Probation Officer',
      author_email: user?.email || '',
    });
    queryClient.invalidateQueries({ queryKey: ['probation-notes', resident.id] });
    setShowForm(false);
    setForm({ note_date: new Date().toISOString().split('T')[0], contact_type: 'general_observation', compliance_status: 'unknown', content: '' });
    setSaving(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Probation Notes
        </h3>
        {canAddNote && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Note
          </Button>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No probation notes recorded.</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[10px] flex items-center gap-1 ${complianceColors[note.compliance_status] || ''}`}>
                    <ComplianceIcon status={note.compliance_status} />
                    {note.compliance_status?.replace(/_/g, ' ')}
                  </Badge>
                  {note.contact_type && (
                    <Badge variant="outline" className="text-[10px]">
                      {note.contact_type.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                  {note.note_date || (note.created_date ? format(new Date(note.created_date), 'MMM d, yyyy') : '')}
                </span>
              </div>
              <p className="text-sm text-foreground">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-2">— {note.author_name || 'Probation Officer'}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Probation Note</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Type</Label>
                <Select value={form.contact_type} onValueChange={v => setForm(p => ({ ...p, contact_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.note_date}
                  onChange={e => setForm(p => ({ ...p, note_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Compliance Status</Label>
              <Select value={form.compliance_status} onValueChange={v => setForm(p => ({ ...p, compliance_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLIANCE_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Officer</Label>
              <Input value={user?.full_name || user?.email || 'Probation Officer'} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Describe the contact, observations, or compliance update..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.content.trim()}>
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
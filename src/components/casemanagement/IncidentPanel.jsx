import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Plus } from 'lucide-react';
import { isStaff } from '@/lib/roles';
import { format } from 'date-fns';

const INCIDENT_TYPES = [
  { value: 'missed_appointment', label: 'Missed Appointment' },
  { value: 'no_show', label: 'No Show' },
  { value: 'behavioral_issue', label: 'Behavioral Issue' },
  { value: 'relapse_concern', label: 'Relapse Concern' },
  { value: 'documentation_issue', label: 'Documentation Issue' },
  { value: 'employment_issue', label: 'Employment Issue' },
];

const severityColors = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-red-100 text-red-800 font-semibold',
};

export default function IncidentPanel({ resident, user }) {
  const queryClient = useQueryClient();
  const isStaffUser = isStaff(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    incident_type: 'missed_appointment',
    date: new Date().toISOString().split('T')[0],
    severity: 'medium',
    description: '',
    action_taken: '',
    follow_up_required: false,
  });
  const [saving, setSaving] = useState(false);

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', resident.id],
    queryFn: () => base44.entities.Incident.filter({ resident_id: resident.id }, '-date'),
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Incident.create({
      ...form,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id || '',
      organization_id: resident.organization_id,
      reported_by_id: user?.id,
      reported_by_name: user?.full_name,
    });
    queryClient.invalidateQueries({ queryKey: ['incidents', resident.id] });
    setShowForm(false);
    setForm({ incident_type: 'missed_appointment', date: new Date().toISOString().split('T')[0], severity: 'medium', description: '', action_taken: '', follow_up_required: false });
    setSaving(false);
  };

  if (!isStaffUser) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" /> Incidents
        </h3>
        <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Report Incident
        </Button>
      </div>

      {incidents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No incidents reported.</p>
      ) : (
        <div className="space-y-3">
          {incidents.map(inc => (
            <div key={inc.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-[10px] ${severityColors[inc.severity] || ''}`}>{inc.severity}</Badge>
                  <span className="text-xs font-medium">{INCIDENT_TYPES.find(t => t.value === inc.incident_type)?.label || inc.incident_type}</span>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{inc.date ? format(new Date(inc.date), 'MMM d, yyyy') : ''}</span>
              </div>
              <p className="text-sm text-foreground mt-1">{inc.description}</p>
              {inc.action_taken && <p className="text-xs text-muted-foreground mt-1">Action: {inc.action_taken}</p>}
              <p className="text-xs text-muted-foreground mt-1">Reported by {inc.reported_by_name || 'Staff'}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.incident_type} onValueChange={v => setForm(p => ({ ...p, incident_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the incident..." className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Action Taken</Label>
              <Textarea value={form.action_taken} onChange={e => setForm(p => ({ ...p, action_taken: e.target.value }))} placeholder="What action was taken?" className="min-h-[60px]" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.follow_up_required} onChange={e => setForm(p => ({ ...p, follow_up_required: e.target.checked }))} className="rounded" />
              Follow-up Required
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.description} className="bg-destructive hover:bg-destructive/90">
              {saving ? 'Saving...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
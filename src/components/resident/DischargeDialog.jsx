import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertTriangle, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DISCHARGE_REASONS = [
  { value: 'program_completion', label: 'Program Completion / Graduation' },
  { value: 'employment_secured', label: 'Employment Secured' },
  { value: 'housing_secured', label: 'Independent Housing Secured' },
  { value: 'voluntary_exit', label: 'Voluntary Exit' },
  { value: 'rule_violation', label: 'Rule Violation / Behavioral' },
  { value: 'non_compliance', label: 'Non-Compliance with Program Requirements' },
  { value: 'medical', label: 'Medical / Health Reasons' },
  { value: 'incarceration', label: 'Incarceration / Justice Involvement' },
  { value: 'transferred', label: 'Transferred to Another Program' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'other', label: 'Other' },
];

export default function DischargeDialog({ resident, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    discharge_reason: '',
    discharge_reason_other: '',
    final_case_note: '',
    actual_exit_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const effectiveReason = form.discharge_reason === 'other'
    ? form.discharge_reason_other
    : DISCHARGE_REASONS.find(r => r.value === form.discharge_reason)?.label || '';

  const isValid = form.discharge_reason &&
    (form.discharge_reason !== 'other' || form.discharge_reason_other.trim().length >= 3) &&
    form.final_case_note.trim().length >= 10 &&
    form.actual_exit_date;

  const handleDischarge = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await base44.functions.invoke('dischargeResident', {
        resident_id: resident.id,
        discharge_reason: effectiveReason,
        final_case_note: form.final_case_note,
        actual_exit_date: form.actual_exit_date,
      });
      queryClient.invalidateQueries({ queryKey: ['resident', resident.id] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success(`${resident.first_name} ${resident.last_name} discharged successfully.`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Discharge failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-destructive" />
            Discharge Participant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning banner */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">This action will discharge {resident.first_name} {resident.last_name}.</p>
              <p className="text-amber-700 mt-0.5">All open tasks will be archived and housing will be released. This cannot be undone without re-entry.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Discharge Reason <span className="text-destructive">*</span></Label>
            <Select value={form.discharge_reason} onValueChange={v => setForm(p => ({ ...p, discharge_reason: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {DISCHARGE_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.discharge_reason === 'other' && (
            <div className="space-y-1.5">
              <Label>Specify Reason <span className="text-destructive">*</span></Label>
              <Input
                value={form.discharge_reason_other}
                onChange={e => setForm(p => ({ ...p, discharge_reason_other: e.target.value }))}
                placeholder="Describe the discharge reason..."
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Exit Date <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={form.actual_exit_date}
              onChange={e => setForm(p => ({ ...p, actual_exit_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Final Case Note <span className="text-destructive">*</span></Label>
            <Textarea
              value={form.final_case_note}
              onChange={e => setForm(p => ({ ...p, final_case_note: e.target.value }))}
              placeholder="Summarize the participant's program outcome, goals achieved, and any follow-up recommendations (min 10 characters)..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{form.final_case_note.length} chars · min 10 required</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleDischarge}
            disabled={!isValid || saving}
          >
            {saving ? 'Processing...' : 'Confirm Discharge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
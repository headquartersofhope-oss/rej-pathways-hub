import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RefreshCw, History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ReEntryDialog({ resident, open, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    reentry_reason: '',
    new_intake_date: new Date().toISOString().split('T')[0],
    new_case_manager: '',
  });
  const [saving, setSaving] = useState(false);

  const isValid = form.reentry_reason.trim().length >= 3 && form.new_intake_date;

  const handleReEntry = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke('reEntryResident', {
        resident_id: resident.id,
        reentry_reason: form.reentry_reason,
        new_intake_date: form.new_intake_date,
        new_case_manager: form.new_case_manager || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['resident', resident.id] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success(`${resident.first_name} ${resident.last_name} re-enrolled (Cycle ${res.data?.reentry_cycle || ''}). Full history preserved.`);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Re-entry failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-accent" />
            Re-Enroll Participant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <History className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800">Re-enrolling {resident.first_name} {resident.last_name}</p>
              <p className="text-blue-700 mt-0.5">Prior program history will be fully preserved. A new intake cycle will begin.</p>
              {resident.actual_exit_date && (
                <p className="text-blue-600 mt-1 text-xs">Prior exit date: {resident.actual_exit_date}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Re-Entry Reason <span className="text-destructive">*</span></Label>
            <Textarea
              value={form.reentry_reason}
              onChange={e => setForm(p => ({ ...p, reentry_reason: e.target.value }))}
              placeholder="Why is this participant re-enrolling in the program?"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>New Intake Date <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={form.new_intake_date}
              onChange={e => setForm(p => ({ ...p, new_intake_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Assign Case Manager <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              value={form.new_case_manager}
              onChange={e => setForm(p => ({ ...p, new_case_manager: e.target.value }))}
              placeholder="Case manager name or email..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleReEntry}
            disabled={!isValid || saving}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving ? 'Processing...' : 'Confirm Re-Enrollment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
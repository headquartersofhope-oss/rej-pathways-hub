import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus } from 'lucide-react';

export default function EnrollResidentDialog({ open, onOpenChange, cls, user, onSuccess }) {
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-active'],
    queryFn: () => base44.entities.Resident.filter({ status: 'active' }),
    enabled: open,
  });

  const { data: existingEnrollments = [] } = useQuery({
    queryKey: ['enrollments-for-class', cls?.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ class_id: cls.id }),
    enabled: open && !!cls?.id,
  });

  const enrolledResidentIds = new Set(existingEnrollments.map(e => e.resident_id));

  const handleEnroll = async () => {
    if (!selectedResidentId) return;
    setSaving(true);
    setError('');
    const resident = residents.find(r => r.id === selectedResidentId);
    await base44.entities.ClassEnrollment.create({
      resident_id: selectedResidentId,
      global_resident_id: resident?.global_resident_id || resident?.id,
      class_id: cls.id,
      organization_id: user?.organization_id,
      status: 'enrolled',
      enrolled_by: user?.id,
      assigned_date: new Date().toISOString().split('T')[0],
    });
    setSaving(false);
    setSelectedResidentId('');
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Assign to Resident
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="p-3 bg-muted/40 rounded-lg">
            <p className="text-sm font-semibold">{cls?.title}</p>
            {cls?.category && (
              <Badge variant="outline" className="mt-1 text-[10px]">{cls.category.replace(/_/g, ' ')}</Badge>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium">Select Resident *</Label>
            <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a resident..." />
              </SelectTrigger>
              <SelectContent>
                {residents.length === 0 && (
                  <SelectItem value="none" disabled>No active residents found</SelectItem>
                )}
                {residents.map(r => {
                  const alreadyEnrolled = enrolledResidentIds.has(r.id);
                  return (
                    <SelectItem key={r.id} value={r.id} disabled={alreadyEnrolled}>
                      {r.preferred_name || r.first_name} {r.last_name}
                      {alreadyEnrolled ? ' (already enrolled)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleEnroll}
              disabled={saving || !selectedResidentId}
              className="gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {saving ? 'Enrolling…' : 'Assign Class'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
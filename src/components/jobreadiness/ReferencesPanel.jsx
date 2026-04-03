import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Trash2 } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  unavailable: 'bg-red-50 text-red-700',
};

export default function ReferencesPanel({ resident, staff, residentId, globalId, onRefresh, references }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', relationship: '', company: '', phone: '', email: '', status: 'pending', notes: '' });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ReferenceContact.create({
      global_resident_id: globalId || residentId,
      resident_id: residentId,
      organization_id: resident?.organization_id || '',
      ...form,
    });
    await onRefresh();
    setSaving(false);
    setShowForm(false);
    setForm({ name: '', relationship: '', company: '', phone: '', email: '', status: 'pending', notes: '' });
  };

  const handleDelete = async (id) => {
    await base44.entities.ReferenceContact.delete(id);
    await onRefresh();
  };

  const updateStatus = async (ref, status) => {
    await base44.entities.ReferenceContact.update(ref.id, { status });
    await onRefresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Professional References</h3>
        {staff && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Reference
          </Button>
        )}
      </div>

      {references.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No references added yet.
        </Card>
      ) : (
        references.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm">{r.name}</p>
                  <Badge className={`text-[10px] border-0 ${STATUS_STYLES[r.status]}`}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.relationship}{r.company ? ` · ${r.company}` : ''}</p>
                {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                {r.email && <p className="text-xs text-muted-foreground">{r.email}</p>}
              </div>
              {staff && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.status !== 'confirmed' && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => updateStatus(r, 'confirmed')}>Confirm</Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Reference</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            {[
              ['Name', 'name', 'text', 'Full name'],
              ['Relationship', 'relationship', 'text', 'e.g. Former Supervisor'],
              ['Company / Organization', 'company', 'text', ''],
              ['Phone', 'phone', 'tel', ''],
              ['Email', 'email', 'email', ''],
            ].map(([label, key, type, placeholder]) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                <Input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Add'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
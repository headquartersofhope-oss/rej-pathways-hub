import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plus, Gift } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  clothing: 'bg-purple-50 text-purple-700',
  household: 'bg-amber-50 text-amber-700',
  gift_card: 'bg-emerald-50 text-emerald-700',
  hygiene: 'bg-blue-50 text-blue-700',
  food: 'bg-orange-50 text-orange-700',
  bus_pass: 'bg-cyan-50 text-cyan-700',
  tools_equipment: 'bg-slate-100 text-slate-700',
  electronics: 'bg-indigo-50 text-indigo-700',
  furniture: 'bg-rose-50 text-rose-700',
  other: 'bg-muted text-muted-foreground',
};

const PURPOSE_LABELS = {
  job_interview: 'Job Interview',
  work_start: 'Work Start',
  general_need: 'General Need',
  emergency: 'Emergency',
  program_requirement: 'Program Requirement',
  other: 'Other',
};

export default function ResourceDistributionTab({ resident, user, canEdit }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    resource_item_id: '',
    quantity: 1,
    distribution_date: new Date().toISOString().split('T')[0],
    purpose: 'general_need',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const { data: distributions = [] } = useQuery({
    queryKey: ['resource-distributions', resident?.id],
    queryFn: () => base44.entities.ResourceDistribution.filter({ resident_id: resident.id }),
    enabled: !!resident?.id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['resource-items'],
    queryFn: () => base44.entities.ResourceItem.list('-created_date', 300),
  });

  const availableItems = items.filter(i => i.is_active !== false && (i.quantity_on_hand || 0) > 0);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleDistribute = async () => {
    const item = items.find(i => i.id === form.resource_item_id);
    if (!item) return;
    setSaving(true);

    // Log the distribution record
    await base44.entities.ResourceDistribution.create({
      global_resident_id: resident.global_resident_id,
      resident_id: resident.id,
      organization_id: resident.organization_id,
      resource_item_id: item.id,
      resource_item_name: item.name,
      resource_category: item.category,
      quantity: Number(form.quantity),
      distribution_date: form.distribution_date,
      purpose: form.purpose,
      notes: form.notes,
      distributed_by: user?.id,
      distributed_by_name: user?.full_name || user?.email,
    });

    // Decrement stock
    const newQty = Math.max(0, (item.quantity_on_hand || 0) - Number(form.quantity));
    await base44.entities.ResourceItem.update(item.id, { quantity_on_hand: newQty });

    queryClient.invalidateQueries({ queryKey: ['resource-distributions', resident.id] });
    queryClient.invalidateQueries({ queryKey: ['resource-items'] });
    setSaving(false);
    setDialogOpen(false);
    setForm({ resource_item_id: '', quantity: 1, distribution_date: new Date().toISOString().split('T')[0], purpose: 'general_need', notes: '' });
  };

  const totalDistributed = distributions.reduce((s, d) => s + (d.quantity || 1), 0);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="font-heading font-bold text-xl text-primary">{distributions.length}</p>
            <p className="text-[10px] text-muted-foreground">Distributions</p>
          </div>
          <div className="text-center">
            <p className="font-heading font-bold text-xl">{totalDistributed}</p>
            <p className="text-[10px] text-muted-foreground">Total Units</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="gap-1.5" size="sm">
            <Plus className="w-4 h-4" /> Log Distribution
          </Button>
        )}
      </div>

      {/* Distribution history */}
      {distributions.length === 0 ? (
        <div className="text-center py-12">
          <Gift className="w-9 h-9 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No resources distributed yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...distributions].sort((a, b) => (b.distribution_date || '').localeCompare(a.distribution_date || '')).map(d => (
            <Card key={d.id} className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{d.resource_item_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {d.resource_category && (
                    <Badge className={`text-[10px] ${CATEGORY_COLORS[d.resource_category] || ''}`}>
                      {d.resource_category?.replace(/_/g, ' ')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {PURPOSE_LABELS[d.purpose] || d.purpose?.replace(/_/g, ' ')}
                  </span>
                  {d.notes && <span className="text-xs text-muted-foreground">· {d.notes}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm">×{d.quantity ?? 1}</p>
                <p className="text-xs text-muted-foreground">
                  {d.distribution_date ? format(new Date(d.distribution_date), 'MMM d, yyyy') : '—'}
                </p>
                {d.distributed_by_name && (
                  <p className="text-[10px] text-muted-foreground">{d.distributed_by_name}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Log distribution dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Resource Distribution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs mb-1 block">Select Item *</Label>
              <Select value={form.resource_item_id} onValueChange={v => set('resource_item_id', v)}>
                <SelectTrigger><SelectValue placeholder="Choose available item…" /></SelectTrigger>
                <SelectContent>
                  {availableItems.length === 0 && (
                    <SelectItem value="_none" disabled>No items in stock</SelectItem>
                  )}
                  {availableItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}{i.size_or_variant ? ` (${i.size_or_variant})` : ''} — {i.quantity_on_hand} in stock
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={e => set('quantity', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Date</Label>
                <Input type="date" value={form.distribution_date} onChange={e => set('distribution_date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Purpose</Label>
              <Select value={form.purpose} onValueChange={v => set('purpose', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PURPOSE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any additional context…" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={saving || !form.resource_item_id} onClick={handleDistribute}>
                {saving ? 'Saving…' : 'Log Distribution'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
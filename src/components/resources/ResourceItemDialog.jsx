import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EMPTY = {
  name: '', category: 'clothing', description: '', source: 'donated',
  donor_name: '', quantity_on_hand: 0, quantity_total_received: 0,
  low_stock_threshold: 2, unit_value: '', size_or_variant: '',
  location: '', is_active: true, notes: '',
};

export default function ResourceItemDialog({ open, onOpenChange, editing, user, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ? {
      name: editing.name || '',
      category: editing.category || 'clothing',
      description: editing.description || '',
      source: editing.source || 'donated',
      donor_name: editing.donor_name || '',
      quantity_on_hand: editing.quantity_on_hand ?? 0,
      quantity_total_received: editing.quantity_total_received ?? 0,
      low_stock_threshold: editing.low_stock_threshold ?? 2,
      unit_value: editing.unit_value || '',
      size_or_variant: editing.size_or_variant || '',
      location: editing.location || '',
      is_active: editing.is_active !== false,
      notes: editing.notes || '',
    } : EMPTY);
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, unit_value: form.unit_value ? Number(form.unit_value) : null };
    if (editing) {
      await base44.entities.ResourceItem.update(editing.id, payload);
    } else {
      await base44.entities.ResourceItem.create({ ...payload, quantity_total_received: Number(form.quantity_on_hand) });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Resource Item' : 'Add Resource Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1 block">Item Name *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Men's Jacket Size L" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Category *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['clothing','household','gift_card','hygiene','food','bus_pass','tools_equipment','electronics','furniture','other'].map(v => (
                    <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Source</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['internal','donated','purchased','grant_funded','partner_agency'].map(v => (
                    <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Size / Variant</Label>
              <Input value={form.size_or_variant} onChange={e => set('size_or_variant', e.target.value)} placeholder="e.g. Large, $25" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Donor / Partner Name</Label>
              <Input value={form.donor_name} onChange={e => set('donor_name', e.target.value)} placeholder="If donated or partner" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Quantity On Hand</Label>
              <Input type="number" min={0} value={form.quantity_on_hand}
                onChange={e => set('quantity_on_hand', Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Low Stock Alert At</Label>
              <Input type="number" min={0} value={form.low_stock_threshold}
                onChange={e => set('low_stock_threshold', Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Unit Value ($)</Label>
              <Input type="number" min={0} step="0.01" value={form.unit_value}
                onChange={e => set('unit_value', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Storage Location</Label>
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Closet A" />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Description</Label>
            <Textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            <Label htmlFor="active" className="text-sm cursor-pointer">Active (visible for distribution)</Label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={saving || !form.name} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Item'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function RestockDialog({ open, onOpenChange, item, onRestocked }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleRestock = async () => {
    if (!item) return;
    setSaving(true);
    const newQty = (item.quantity_on_hand || 0) + Number(qty);
    const newTotal = (item.quantity_total_received || 0) + Number(qty);
    await base44.entities.ResourceItem.update(item.id, {
      quantity_on_hand: newQty,
      quantity_total_received: newTotal,
      notes: notes || item.notes,
    });
    setSaving(false);
    setQty(1);
    setNotes('');
    onRestocked();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Restock — {item?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Current stock: <span className="font-bold text-foreground">{item?.quantity_on_hand ?? 0}</span>
            </p>
            <Label className="text-xs mb-1 block">Units to Add *</Label>
            <Input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Notes (optional)</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Donation from ABC Church" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={saving || !qty || qty < 1} onClick={handleRestock}>
              {saving ? 'Saving…' : `Add ${qty || 0} Units`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
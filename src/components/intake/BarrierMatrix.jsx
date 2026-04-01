import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BARRIER_CATEGORIES } from '@/lib/intakeBarriers';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_OPTIONS = ['new', 'active', 'in_progress', 'resolved', 'blocked'];

export default function BarrierMatrix({ barriers, onUpdate }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editNotes, setEditNotes] = useState({});
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BarrierItem.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['barriers']); onUpdate?.(); },
  });

  // Group by category
  const grouped = barriers.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  const handleStatusChange = (barrier, status) => {
    updateMutation.mutate({ id: barrier.id, data: { status } });
  };

  const handleSaveNotes = (barrier) => {
    updateMutation.mutate({ id: barrier.id, data: { notes: editNotes[barrier.id] || barrier.notes } });
  };

  if (barriers.length === 0) {
    return (
      <Card className="flex flex-col items-center py-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-accent mb-3" />
        <p className="font-heading font-semibold">No barriers identified</p>
        <p className="text-sm text-muted-foreground mt-1">Complete the intake assessment to detect barriers.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([category, items]) => {
        const unresolvedCount = items.filter(b => b.status !== 'resolved').length;
        return (
          <Card key={category} className="overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="font-heading font-semibold text-sm">{BARRIER_CATEGORIES[category] || category}</p>
                {unresolvedCount > 0 && (
                  <Badge variant="outline" className="text-[10px]">{unresolvedCount} open</Badge>
                )}
              </div>
              <div className="flex gap-1">
                {items.map(b => (
                  <div key={b.id} className={`w-2 h-2 rounded-full border ${SEVERITY_STYLES[b.severity]?.split(' ')[0]}`} />
                ))}
              </div>
            </div>
            <div className="divide-y">
              {items.map((barrier) => (
                <div key={barrier.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(expandedId === barrier.id ? null : barrier.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${barrier.status === 'resolved' ? 'line-through text-muted-foreground' : ''}`}>
                          {barrier.title}
                        </p>
                        <Badge variant="outline" className={`text-[10px] border ${SEVERITY_STYLES[barrier.severity]}`}>
                          {barrier.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{barrier.status?.replace('_', ' ')}</Badge>
                        {barrier.requires_staff_action && (
                          <Badge className="text-[10px] bg-primary/10 text-primary">Staff Action</Badge>
                        )}
                      </div>
                      {barrier.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{barrier.description}</p>
                      )}
                    </div>
                    {expandedId === barrier.id
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                  </button>

                  {expandedId === barrier.id && (
                    <div className="px-4 pb-4 space-y-3 bg-muted/20">
                      {barrier.description && (
                        <p className="text-sm text-muted-foreground">{barrier.description}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">Status:</span>
                          <Select value={barrier.status} onValueChange={v => handleStatusChange(barrier, v)}>
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(s => (
                                <SelectItem key={s} value={s} className="text-xs">{s.replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {barrier.required_documents?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Required Documents:</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                            {barrier.required_documents.map((d, i) => <li key={i}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium">Notes / Interventions:</p>
                        <Textarea
                          value={editNotes[barrier.id] !== undefined ? editNotes[barrier.id] : (barrier.notes || '')}
                          onChange={e => setEditNotes(prev => ({ ...prev, [barrier.id]: e.target.value }))}
                          placeholder="Add notes or intervention details..."
                          rows={2}
                          className="text-xs"
                        />
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSaveNotes(barrier)}>
                          Save Notes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
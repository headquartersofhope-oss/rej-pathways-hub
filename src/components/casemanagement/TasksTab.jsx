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
import { CheckCircle2, Circle, Clock, Plus, AlertTriangle } from 'lucide-react';
import { isStaff } from '@/lib/roles';
import { format, isPast, parseISO } from 'date-fns';

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  urgent: 'bg-red-50 text-red-700',
};

const statusIcons = {
  pending: <Circle className="w-4 h-4 text-muted-foreground" />,
  in_progress: <Clock className="w-4 h-4 text-amber-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  blocked: <AlertTriangle className="w-4 h-4 text-destructive" />,
};

export default function TasksTab({ resident, user, tasks: initialTasks, barriers }) {
  const queryClient = useQueryClient();
  const isStaffUser = !user?.role || user?.role !== 'resident';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', priority: 'medium', due_date: '', status: 'pending', assigned_to: '', is_resident_visible: true });
  const [saving, setSaving] = useState(false);

  const { data: tasks = initialTasks } = useQuery({
    queryKey: ['service-tasks', resident.id],
    queryFn: async () => {
      const byResidentId = await base44.entities.ServiceTask.filter({ resident_id: resident.id });
      if (byResidentId.length > 0) return byResidentId.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      if (resident.global_resident_id) {
        const byGlobalId = await base44.entities.ServiceTask.filter({ global_resident_id: resident.global_resident_id });
        return byGlobalId.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      return [];
    },
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ServiceTask.create({
      ...form,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id || '',
      organization_id: resident.organization_id,
      requires_staff_action: true,
    });
    queryClient.invalidateQueries({ queryKey: ['service-tasks', resident.id] });
    setShowForm(false);
    setForm({ title: '', description: '', category: '', priority: 'medium', due_date: '', status: 'pending', assigned_to: '', is_resident_visible: true });
    setSaving(false);
  };

  const handleStatusChange = async (task, newStatus) => {
    await base44.entities.ServiceTask.update(task.id, {
      status: newStatus,
      ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ['service-tasks', resident.id] });
  };

  const open = tasks.filter(t => t.status !== 'completed');
  const done = tasks.filter(t => t.status === 'completed');

  // Auto-generate missing doc tasks display
  const missingDocTasks = (resident.missing_documents || []).map(doc => ({
    id: `missing-${doc}`,
    title: `Obtain: ${doc.replace(/_/g, ' ')}`,
    category: 'documentation',
    priority: 'high',
    status: 'pending',
    auto: true,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isStaffUser && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Task
          </Button>
        )}
      </div>

      {/* Missing doc auto-tasks */}
      {missingDocTasks.length > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Auto-generated: Missing Documents
          </p>
          <div className="space-y-1.5">
            {missingDocTasks.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-sm text-amber-900">
                <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                {t.title}
                <Badge className="text-[10px] bg-amber-200 text-amber-800 border-0 ml-auto">action needed</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {open.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3">Open Tasks ({open.length})</h3>
          <div className="space-y-2">
            {open.map(task => {
              const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'completed';
              return (
                <div key={task.id} className={`border rounded-lg p-3 ${overdue ? 'border-red-200 bg-red-50/30' : ''}`}>
                  <div className="flex items-start gap-2">
                    <button onClick={() => handleStatusChange(task, task.status === 'in_progress' ? 'completed' : 'in_progress')} className="mt-0.5 flex-shrink-0">
                      {statusIcons[task.status] || statusIcons.pending}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-[10px] ${priorityColors[task.priority] || ''}`}>{task.priority}</Badge>
                        {task.auto_generated && (
                          <Badge className="text-[10px] bg-blue-50 text-blue-600 border-0">intake-generated</Badge>
                        )}
                        {!task.auto_generated && task.barrier_item_id && (
                          <Badge className="text-[10px] bg-purple-50 text-purple-600 border-0">barrier-linked</Badge>
                        )}
                        {!task.auto_generated && !task.barrier_item_id && (
                          <Badge className="text-[10px] bg-slate-100 text-slate-600 border-0">staff-created</Badge>
                        )}
                        {task.requires_staff_action && (
                          <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">staff action</Badge>
                        )}
                        {task.due_date && (
                          <span className={`text-[10px] ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            Due {format(parseISO(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {task.category && <span className="text-[10px] text-muted-foreground">{task.category}</span>}
                      </div>
                    </div>
                    {isStaffUser && (
                      <Select value={task.status} onValueChange={v => handleStatusChange(task, v)}>
                        <SelectTrigger className="h-6 w-28 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['pending', 'in_progress', 'completed', 'blocked'].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {done.length > 0 && (
        <Card className="p-5">
          <h3 className="font-heading font-semibold text-sm mb-3 text-muted-foreground">Completed ({done.length})</h3>
          <div className="space-y-1.5">
            {done.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm line-through text-muted-foreground">{task.title}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tasks.length === 0 && missingDocTasks.length === 0 && (
        <Card className="p-10 text-center">
          <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Task title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Details..." className="min-h-[70px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'urgent'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. documentation, employment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title}>
              {saving ? 'Saving...' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
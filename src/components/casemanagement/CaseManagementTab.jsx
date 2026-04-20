import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, FileText, AlertCircle, MessageSquare } from 'lucide-react';
import { isStaff } from '@/lib/roles';
import IncidentPanel from '@/components/casemanagement/IncidentPanel';
import AISuggestionsPanel from '@/components/casemanagement/AISuggestionsPanel';
import { format } from 'date-fns';

const NOTE_TYPES = ['general', 'progress', 'incident', 'plan_update', 'employment', 'housing', 'mental_health', 'legal', 'other'];

const noteTypeColors = {
  general: 'bg-slate-100 text-slate-700',
  progress: 'bg-emerald-50 text-emerald-700',
  incident: 'bg-red-50 text-red-700',
  plan_update: 'bg-blue-50 text-blue-700',
  employment: 'bg-amber-50 text-amber-700',
  housing: 'bg-purple-50 text-purple-700',
  mental_health: 'bg-pink-50 text-pink-700',
  legal: 'bg-orange-50 text-orange-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function CaseManagementTab({ resident, user, barriers, perms = {} }) {
  const queryClient = useQueryClient();
  const canAddNote = perms.canAddNote ?? (!user?.role || user?.role !== 'resident');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({
    note_type: 'general',
    description: '',
    is_confidential: false,
    note_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const { data: notes = [] } = useQuery({
    queryKey: ['case-notes', resident.id],
    queryFn: async () => {
      // Try by resident_id first, also try global_resident_id
      const byResidentId = await base44.entities.CaseNote.filter({ resident_id: resident.id });
      if (byResidentId.length > 0) return byResidentId.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      if (resident.global_resident_id) {
        const byGlobalId = await base44.entities.CaseNote.filter({ global_resident_id: resident.global_resident_id });
        return byGlobalId.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      }
      return [];
    },
  });

  const handleSaveNote = async () => {
    if (!noteForm.description.trim()) return;
    setSaving(true);
    await base44.entities.CaseNote.create({
      note_type: noteForm.note_type,
      description: noteForm.description,
      is_confidential: noteForm.is_confidential,
      note_date: noteForm.note_date,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id || resident.id,
      organization_id: resident.organization_id || '',
      staff_id: user?.id || '',
      staff_name: user?.full_name || user?.email || 'Staff',
    });
    queryClient.invalidateQueries({ queryKey: ['case-notes', resident.id] });
    queryClient.invalidateQueries({ queryKey: ['all-notes'] });
    setShowNoteForm(false);
    setNoteForm({ note_type: 'general', description: '', is_confidential: false, note_date: new Date().toISOString().split('T')[0] });
    setSaving(false);
  };

  return (
    <div className="space-y-5">
       {/* Case Notes */}
       <Card className="p-5" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
         <div className="flex items-center justify-between mb-4">
           <h3 className="font-heading font-semibold text-sm flex items-center gap-2 text-white">
             <MessageSquare className="w-4 h-4 text-amber-500" /> Case Notes
           </h3>
           {canAddNote && (
             <Button size="sm" className="gap-1.5" onClick={() => setShowNoteForm(true)}>
               <Plus className="w-3.5 h-3.5" /> Add Note
             </Button>
           )}
         </div>

         {notes.length === 0 ? (
           <p className="text-sm text-center py-6" style={{ color: '#8B949E' }}>No case notes yet.</p>
         ) : (
           <div className="space-y-3">
             {notes
               .filter(note => !note.is_confidential || (perms.canViewConfidentialNotes ?? true))
               .map(note => (
               <div key={note.id} className="border rounded-lg p-4" style={{ borderColor: '#30363D', backgroundColor: '#1C2128' }}>
                 <div className="flex items-start justify-between gap-2 mb-2">
                   <div className="flex items-center gap-2 flex-wrap">
                     <Badge className={`text-[10px] ${noteTypeColors[note.note_type] || ''}`}>
                       {note.note_type?.replace(/_/g, ' ')}
                     </Badge>
                     {note.is_confidential && (
                       <Badge variant="outline" className="text-[10px] border" style={{ color: '#F87171', borderColor: '#F87171' }}>Confidential</Badge>
                     )}
                   </div>
                   <span className="text-[11px] flex-shrink-0" style={{ color: '#8B949E' }}>
                     {note.note_date || (note.created_date ? format(new Date(note.created_date), 'MMM d, yyyy') : '')}
                   </span>
                 </div>
                 <p className="text-sm text-white">{note.description}</p>
                 <p className="text-xs mt-2" style={{ color: '#8B949E' }}>— {note.staff_name || 'Staff'}</p>
               </div>
             ))}
           </div>
         )}
       </Card>

      {/* AI Service Plan Assistant */}
      {barriers && barriers.length > 0 && (
        <AISuggestionsPanel resident={resident} barriers={barriers} />
      )}

      {/* Incidents */}
      <IncidentPanel resident={resident} user={user} />

      {/* Note Dialog */}
      <Dialog open={showNoteForm} onOpenChange={setShowNoteForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Case Note</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Note Type</Label>
                <Select value={noteForm.note_type} onValueChange={v => setNoteForm(p => ({ ...p, note_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={noteForm.note_date}
                  onChange={e => setNoteForm(p => ({ ...p, note_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Staff</Label>
              <Input value={user?.full_name || user?.email || 'Staff'} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={noteForm.description}
                onChange={e => setNoteForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Enter case note..."
                className="min-h-[100px]"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={noteForm.is_confidential}
                onChange={e => setNoteForm(p => ({ ...p, is_confidential: e.target.checked }))}
                className="rounded"
              />
              Mark as Confidential
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteForm(false)}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={saving || !noteForm.description}>
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
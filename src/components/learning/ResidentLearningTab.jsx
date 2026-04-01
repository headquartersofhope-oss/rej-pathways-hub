import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { GraduationCap, Award, Plus, MessageSquare, CheckCircle2 } from 'lucide-react';

const statusConfig = {
  enrolled: { color: 'bg-blue-50 text-blue-700', label: 'Enrolled' },
  in_progress: { color: 'bg-amber-50 text-amber-700', label: 'In Progress' },
  completed: { color: 'bg-emerald-50 text-emerald-700', label: 'Completed' },
  dropped: { color: 'bg-slate-100 text-slate-600', label: 'Dropped' },
  no_show: { color: 'bg-red-50 text-red-700', label: 'No Show' },
};

// Barrier-to-class category mapping for smart suggestions
const barrierClassMap = {
  digital_literacy: ['digital_literacy'],
  identification_documents: ['work_readiness'],
  interview_readiness: ['interview_preparation', 'soft_skills'],
  education: ['resume_preparation', 'work_readiness'],
  work_history: ['resume_preparation', 'interview_preparation'],
  communication_access: ['digital_literacy', 'workplace_communication'],
  financial_readiness: ['financial_literacy'],
};

export default function ResidentLearningTab({ resident, user }) {
  const queryClient = useQueryClient();
  const [showEnroll, setShowEnroll] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ class_id: '', notes: '' });
  const [noteForm, setNoteForm] = useState({ class_id: '', note: '', is_flagged: false });
  const [saving, setSaving] = useState(false);

  const { data: enrollments = [] } = useQuery({
    queryKey: ['resident-enrollments', resident.id],
    queryFn: () => base44.entities.ClassEnrollment.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['resident-certificates', resident.id],
    queryFn: () => base44.entities.Certificate.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: instructorNotes = [] } = useQuery({
    queryKey: ['instructor-notes', resident.id],
    queryFn: () => base44.entities.InstructorNote.filter({ resident_id: resident.id }),
    enabled: !!resident.id,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
  });

  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
  const enrolledClassIds = new Set(enrollments.map(e => e.class_id));

  // Suggest classes based on barriers
  const barrierCategories = resident.barriers || [];
  const suggestedCategories = new Set(
    barrierCategories.flatMap(b => barrierClassMap[b] || [])
  );
  // Add suggestions based on job_readiness_score
  if ((resident.job_readiness_score || 0) < 50) {
    suggestedCategories.add('interview_preparation');
    suggestedCategories.add('work_readiness');
  }
  const suggestedClasses = classes.filter(
    c => suggestedCategories.has(c.category) && !enrolledClassIds.has(c.id) && c.is_active !== false
  );

  const handleEnroll = async () => {
    setSaving(true);
    await base44.entities.ClassEnrollment.create({
      global_resident_id: resident.global_resident_id || resident.id,
      resident_id: resident.id,
      class_id: enrollForm.class_id,
      organization_id: resident.organization_id,
      enrolled_by: user?.id,
      status: 'enrolled',
      notes: enrollForm.notes,
    });
    queryClient.invalidateQueries({ queryKey: ['resident-enrollments', resident.id] });
    setSaving(false);
    setShowEnroll(false);
    setEnrollForm({ class_id: '', notes: '' });
  };

  const handleNote = async () => {
    setSaving(true);
    await base44.entities.InstructorNote.create({
      global_resident_id: resident.global_resident_id || resident.id,
      resident_id: resident.id,
      class_id: noteForm.class_id,
      organization_id: resident.organization_id,
      instructor_id: user?.id,
      instructor_name: user?.full_name,
      note: noteForm.note,
      is_flagged: noteForm.is_flagged,
    });
    queryClient.invalidateQueries({ queryKey: ['instructor-notes', resident.id] });
    setSaving(false);
    setShowNote(false);
    setNoteForm({ class_id: '', note: '', is_flagged: false });
  };

  const updateStatus = async (enrollmentId, status) => {
    const update = { status };
    if (status === 'completed') update.completion_date = new Date().toISOString().split('T')[0];
    await base44.entities.ClassEnrollment.update(enrollmentId, update);
    queryClient.invalidateQueries({ queryKey: ['resident-enrollments', resident.id] });
  };

  const isStaffUser = !user?.role || user?.role !== 'resident';

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="font-heading font-bold text-lg">{enrollments.length}</p>
          <p className="text-[10px] text-muted-foreground">Enrolled</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="font-heading font-bold text-lg">{enrollments.filter(e => e.status === 'completed').length}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="font-heading font-bold text-lg">{certificates.length}</p>
          <p className="text-[10px] text-muted-foreground">Certificates</p>
        </div>
      </div>

      {/* Staff actions */}
      {isStaffUser && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setShowEnroll(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Enroll in Class
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNote(true)} className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Add Instructor Note
          </Button>
        </div>
      )}

      {/* Smart suggestions */}
      {isStaffUser && suggestedClasses.length > 0 && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <p className="text-xs font-semibold text-primary mb-2">Suggested Based on Barriers</p>
          <div className="flex flex-wrap gap-2">
            {suggestedClasses.slice(0, 4).map(cls => (
              <button
                key={cls.id}
                onClick={() => { setEnrollForm(f => ({ ...f, class_id: cls.id })); setShowEnroll(true); }}
                className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
              >
                + {cls.title}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Enrollments */}
      <div>
        <h4 className="font-heading font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Courses</h4>
        {enrollments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <GraduationCap className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No courses enrolled yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {enrollments.map(enr => {
              const cls = classMap[enr.class_id];
              const conf = statusConfig[enr.status] || statusConfig.enrolled;
              return (
                <Card key={enr.id} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    {enr.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <GraduationCap className="w-4 h-4 text-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cls?.title || 'Unknown class'}</p>
                    {enr.completion_date && <p className="text-xs text-muted-foreground">Completed {enr.completion_date}</p>}
                  </div>
                  {isStaffUser ? (
                    <Select value={enr.status} onValueChange={v => updateStatus(enr.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`text-[10px] border-0 ${conf.color}`}>{conf.label}</Badge>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div>
          <h4 className="font-heading font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Certificates</h4>
          <div className="space-y-2">
            {certificates.map(cert => (
              <Card key={cert.id} className="p-3 flex items-center gap-3 border-yellow-200 bg-yellow-50/30">
                <Award className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{cert.certificate_name}</p>
                  <p className="text-xs text-muted-foreground">Issued {cert.issued_date}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Instructor Notes */}
      {instructorNotes.length > 0 && (
        <div>
          <h4 className="font-heading font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Instructor Notes</h4>
          <div className="space-y-2">
            {instructorNotes.map(n => (
              <Card key={n.id} className={`p-3 ${n.is_flagged ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm">{n.note}</p>
                  {n.is_flagged && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0 flex-shrink-0">⚠ Flagged</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {classMap[n.class_id]?.title || 'General'} · {n.instructor_name || 'Staff'}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enroll dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enroll in Class</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Class *</Label>
              <Select value={enrollForm.class_id} onValueChange={v => setEnrollForm(f => ({ ...f, class_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.is_active !== false && !enrolledClassIds.has(c.id)).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={enrollForm.notes} onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowEnroll(false)}>Cancel</Button>
              <Button onClick={handleEnroll} disabled={saving || !enrollForm.class_id}>
                {saving ? 'Enrolling…' : 'Enroll'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructor note dialog */}
      <Dialog open={showNote} onOpenChange={setShowNote}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Instructor Note</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Class</Label>
              <Select value={noteForm.class_id} onValueChange={v => setNoteForm(f => ({ ...f, class_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class (optional)" /></SelectTrigger>
                <SelectContent>
                  {enrollments.map(enr => {
                    const cls = classMap[enr.class_id];
                    return cls ? <SelectItem key={enr.class_id} value={enr.class_id}>{cls.title}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note *</Label>
              <Textarea value={noteForm.note} onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))} rows={3} placeholder="Learning observation, progress note..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="flag" checked={noteForm.is_flagged} onChange={e => setNoteForm(f => ({ ...f, is_flagged: e.target.checked }))} />
              <Label htmlFor="flag">Flag for attention</Label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowNote(false)}>Cancel</Button>
              <Button onClick={handleNote} disabled={saving || !noteForm.note}>
                {saving ? 'Saving…' : 'Save Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
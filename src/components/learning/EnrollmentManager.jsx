import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Users, Award, CheckCircle2, ClipboardList } from 'lucide-react';
import AttendanceSheet from './AttendanceSheet';

const enrollmentStatusColors = {
  enrolled: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  dropped: 'bg-slate-100 text-slate-600',
  no_show: 'bg-red-50 text-red-700',
};

export default function EnrollmentManager({ user }) {
  const queryClient = useQueryClient();
  const [showEnroll, setShowEnroll] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [form, setForm] = useState({ resident_id: '', class_id: '', status: 'enrolled', notes: '' });
  const [saving, setSaving] = useState(false);
  const [issuingCert, setIssuingCert] = useState(null);
  const [certForm, setCertForm] = useState({ issued_date: '', notes: '' });

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.ClassEnrollment.list('-created_date', 300),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list('-created_date', 200),
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list('-created_date', 200),
  });

  const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  const handleEnroll = async () => {
    setSaving(true);
    const resident = residentMap[form.resident_id];
    await base44.entities.ClassEnrollment.create({
      ...form,
      global_resident_id: resident?.global_resident_id || resident?.id,
      organization_id: user?.organization_id,
      enrolled_by: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    setSaving(false);
    setShowEnroll(false);
    setForm({ resident_id: '', class_id: '', status: 'enrolled', notes: '' });
  };

  const updateStatus = async (enrollmentId, status) => {
    const update = { status };
    if (status === 'completed') update.completion_date = new Date().toISOString().split('T')[0];
    await base44.entities.ClassEnrollment.update(enrollmentId, update);
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };

  const issueCertificate = async () => {
    const enrollment = issuingCert;
    const cls = classMap[enrollment.class_id];
    const resident = residentMap[enrollment.resident_id];
    await base44.entities.Certificate.create({
      global_resident_id: enrollment.global_resident_id,
      resident_id: enrollment.resident_id,
      class_id: enrollment.class_id,
      organization_id: user?.organization_id,
      certificate_name: cls?.certificate_name || cls?.title || 'Certificate of Completion',
      issued_date: certForm.issued_date || new Date().toISOString().split('T')[0],
      issued_by: user?.id,
      issued_by_name: user?.full_name,
      notes: certForm.notes,
    });
    queryClient.invalidateQueries({ queryKey: ['certificates'] });
    setIssuingCert(null);
    setCertForm({ issued_date: '', notes: '' });
  };

  // Group enrollments by class
  const enrollmentsByClass = classes.map(cls => ({
    cls,
    enrollments: enrollments.filter(e => e.class_id === cls.id),
  })).filter(g => g.enrollments.length > 0);

  return (
    <div>
      <div className="flex justify-end mb-5">
        <Button onClick={() => setShowEnroll(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Enroll Resident
        </Button>
      </div>

      <Tabs defaultValue="rosters">
        <TabsList className="mb-4">
          <TabsTrigger value="rosters">Class Rosters</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="rosters">
          {enrollmentsByClass.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No enrollments yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrollmentsByClass.map(({ cls, enrollments: enrs }) => (
                <Card key={cls.id} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading font-semibold text-sm">{cls.title}</h3>
                    <Badge variant="outline" className="text-xs">{enrs.length} enrolled</Badge>
                  </div>
                  <div className="space-y-2">
                    {enrs.map(enr => {
                      const resident = residentMap[enr.resident_id];
                      const certIssued = certificates.some(c => c.resident_id === enr.resident_id && c.class_id === enr.class_id);
                      return (
                        <div key={enr.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                            {resident?.first_name?.[0]}{resident?.last_name?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{resident?.preferred_name || resident?.first_name} {resident?.last_name}</p>
                            {enr.completion_date && <p className="text-xs text-muted-foreground">Completed {enr.completion_date}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={enr.status} onValueChange={v => updateStatus(enr.id, v)}>
                              <SelectTrigger className="h-7 text-xs w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['enrolled', 'in_progress', 'completed', 'dropped', 'no_show'].map(s => (
                                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {enr.status === 'completed' && !certIssued && (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setIssuingCert(enr)}>
                                <Award className="w-3 h-3" /> Issue Cert
                              </Button>
                            )}
                            {certIssued && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" title="Certificate issued" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceSheet user={user} classes={classes} residents={residents} />
        </TabsContent>

        <TabsContent value="certificates">
          {certificates.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No certificates issued yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map(cert => {
                const resident = residentMap[cert.resident_id];
                const cls = classMap[cert.class_id];
                return (
                  <Card key={cert.id} className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{cert.certificate_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resident?.preferred_name || resident?.first_name} {resident?.last_name}
                        {cert.issued_date && ` · Issued ${cert.issued_date}`}
                        {cert.issued_by_name && ` · by ${cert.issued_by_name}`}
                      </p>
                    </div>
                    <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0">Issued</Badge>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enroll Dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enroll Resident</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Resident *</Label>
              <Select value={form.resident_id} onValueChange={v => setForm(f => ({ ...f, resident_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                <SelectContent>
                  {residents.filter(r => r.status === 'active' || r.status === 'pre_intake').map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.preferred_name || r.first_name} {r.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class *</Label>
              <Select value={form.class_id} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.filter(c => c.is_active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowEnroll(false)}>Cancel</Button>
              <Button onClick={handleEnroll} disabled={saving || !form.resident_id || !form.class_id}>
                {saving ? 'Enrolling…' : 'Enroll'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Certificate Dialog */}
      <Dialog open={!!issuingCert} onOpenChange={() => setIssuingCert(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={certForm.issued_date} onChange={e => setCertForm(f => ({ ...f, issued_date: e.target.value }))} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={certForm.notes} onChange={e => setCertForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIssuingCert(null)}>Cancel</Button>
              <Button onClick={issueCertificate}>Issue Certificate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
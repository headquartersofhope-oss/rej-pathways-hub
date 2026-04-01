import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, GraduationCap, Edit2, Award } from 'lucide-react';

const CATEGORIES = [
  { value: 'work_readiness', label: 'Work Readiness' },
  { value: 'soft_skills', label: 'Soft Skills' },
  { value: 'interview_preparation', label: 'Interview Preparation' },
  { value: 'resume_preparation', label: 'Resume Preparation' },
  { value: 'digital_literacy', label: 'Digital Literacy' },
  { value: 'financial_literacy', label: 'Financial Literacy' },
  { value: 'workplace_communication', label: 'Workplace Communication' },
  { value: 'conflict_management', label: 'Conflict Management' },
  { value: 'recovery_support_education', label: 'Recovery Support Education' },
  { value: 'certifications', label: 'Certifications' },
  { value: 'trade_intro', label: 'Trade Intro Classes' },
];

const categoryColors = {
  work_readiness: 'bg-blue-50 text-blue-700',
  soft_skills: 'bg-purple-50 text-purple-700',
  interview_preparation: 'bg-amber-50 text-amber-700',
  resume_preparation: 'bg-emerald-50 text-emerald-700',
  digital_literacy: 'bg-cyan-50 text-cyan-700',
  financial_literacy: 'bg-green-50 text-green-700',
  workplace_communication: 'bg-indigo-50 text-indigo-700',
  conflict_management: 'bg-orange-50 text-orange-700',
  recovery_support_education: 'bg-rose-50 text-rose-700',
  certifications: 'bg-yellow-50 text-yellow-700',
  trade_intro: 'bg-slate-50 text-slate-700',
};

const emptyForm = {
  title: '', description: '', category: '', instructor_name: '',
  duration_hours: '', max_capacity: '', is_active: true,
  completion_grants_certificate: false, certificate_name: '',
  barrier_tags: [],
};

export default function ClassCatalog({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 200),
  });

  const filtered = classes.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || c.category === filterCat;
    return matchSearch && matchCat;
  });

  const openCreate = () => { setEditingClass(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (cls) => { setEditingClass(cls); setForm({ ...emptyForm, ...cls }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      duration_hours: form.duration_hours ? Number(form.duration_hours) : null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
      organization_id: user?.organization_id,
    };
    if (editingClass) {
      await base44.entities.LearningClass.update(editingClass.id, data);
    } else {
      await base44.entities.LearningClass.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['learning-classes'] });
    setSaving(false);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Class
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classes found</p>
          <p className="text-sm mt-1">Create your first class to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cls => (
            <Card key={cls.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading font-semibold text-sm leading-tight">{cls.title}</h3>
                  {cls.instructor_name && <p className="text-xs text-muted-foreground mt-0.5">Instructor: {cls.instructor_name}</p>}
                </div>
                <button onClick={() => openEdit(cls)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {cls.description && <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>}
              <div className="flex flex-wrap gap-1 mt-auto">
                <Badge className={`text-[10px] border-0 ${categoryColors[cls.category] || 'bg-muted text-muted-foreground'}`}>
                  {CATEGORIES.find(c => c.value === cls.category)?.label || cls.category}
                </Badge>
                {cls.completion_grants_certificate && (
                  <Badge className="text-[10px] bg-yellow-50 text-yellow-700 border-0 gap-0.5">
                    <Award className="w-2.5 h-2.5" /> Certificate
                  </Badge>
                )}
                {!cls.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground">
                {cls.duration_hours && <span>{cls.duration_hours}h</span>}
                {cls.max_capacity && <span>Max {cls.max_capacity}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit Class' : 'Create Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Resume Writing Workshop" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Instructor Name</Label>
                <Input value={form.instructor_name} onChange={e => setForm(f => ({ ...f, instructor_name: e.target.value }))} />
              </div>
              <div>
                <Label>Duration (hours)</Label>
                <Input type="number" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Max Capacity</Label>
              <Input type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="cert" checked={form.completion_grants_certificate} onChange={e => setForm(f => ({ ...f, completion_grants_certificate: e.target.checked }))} />
              <Label htmlFor="cert">Completion grants certificate</Label>
            </div>
            {form.completion_grants_certificate && (
              <div>
                <Label>Certificate Name</Label>
                <Input value={form.certificate_name} onChange={e => setForm(f => ({ ...f, certificate_name: e.target.value }))} placeholder="e.g. Digital Literacy Certificate" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <Label htmlFor="active">Active (visible)</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title || !form.category}>
                {saving ? 'Saving…' : editingClass ? 'Save Changes' : 'Create Class'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
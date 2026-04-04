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
import { Plus, Search, GraduationCap, Edit2, Clock, Star } from 'lucide-react';

const CATEGORIES = [
  { value: 'orientation', label: 'Orientation' },
  { value: 'employment', label: 'Employment' },
  { value: 'housing', label: 'Housing' },
  { value: 'financial_literacy', label: 'Financial Literacy' },
  { value: 'digital_literacy', label: 'Digital Literacy' },
  { value: 'ai_literacy', label: 'AI Literacy' },
  { value: 'life_skills', label: 'Life Skills' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'documentation', label: 'Documentation' },
];

const categoryColors = {
  orientation: 'bg-blue-50 text-blue-700',
  employment: 'bg-emerald-50 text-emerald-700',
  housing: 'bg-purple-50 text-purple-700',
  financial_literacy: 'bg-green-50 text-green-700',
  digital_literacy: 'bg-cyan-50 text-cyan-700',
  ai_literacy: 'bg-indigo-50 text-indigo-700',
  life_skills: 'bg-amber-50 text-amber-700',
  wellness: 'bg-rose-50 text-rose-700',
  documentation: 'bg-orange-50 text-orange-700',
};

const emptyForm = {
  title: '', description: '', category: '', estimated_minutes: '',
  difficulty_level: 'beginner', literacy_level_support: 'standard',
  is_required: false, is_active: true, status: 'published',
  youtube_url: '', tags: [],
};

export default function ClassCatalog({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterRequired, setFilterRequired] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterActive, setFilterActive] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 300),
  });

  const filtered = classes.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || c.category === filterCat;
    const matchRequired = filterRequired === 'all' || (filterRequired === 'required' ? c.is_required : !c.is_required);
    const matchDiff = filterDifficulty === 'all' || c.difficulty_level === filterDifficulty;
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? c.is_active !== false : c.is_active === false);
    return matchSearch && matchCat && matchRequired && matchDiff && matchActive;
  });

  const openCreate = () => { setEditingClass(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (cls) => {
    setEditingClass(cls);
    setForm({ ...emptyForm, ...cls, estimated_minutes: cls.estimated_minutes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      organization_id: user?.organization_id,
      created_by: user?.email,
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRequired} onValueChange={setFilterRequired}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Required/Optional" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="optional">Optional</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="all">All Status</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Class
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        {isLoading ? 'Loading...' : `${filtered.length} class${filtered.length !== 1 ? 'es' : ''} found`}
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 h-40 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classes found</p>
          <p className="text-sm mt-1">
            {classes.length === 0
              ? 'Create your first class to get started.'
              : 'Try adjusting your filters.'}
          </p>
          {classes.length === 0 && (
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Create First Class
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cls => (
            <Card key={cls.id} className={`p-4 flex flex-col gap-3 ${cls.is_active === false ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-sm leading-tight">{cls.title}</h3>
                </div>
                <button onClick={() => openEdit(cls)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {cls.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>
              )}

              <div className="flex flex-wrap gap-1 mt-auto">
                <Badge className={`text-[10px] border-0 ${categoryColors[cls.category] || 'bg-muted text-muted-foreground'}`}>
                  {CATEGORIES.find(c => c.value === cls.category)?.label || cls.category}
                </Badge>
                {cls.is_required && (
                  <Badge className="text-[10px] bg-red-50 text-red-700 border-0 gap-0.5">
                    <Star className="w-2.5 h-2.5" /> Required
                  </Badge>
                )}
                {cls.difficulty_level && (
                  <Badge variant="outline" className="text-[10px]">
                    {cls.difficulty_level}
                  </Badge>
                )}
                {cls.literacy_level_support === 'low' && (
                  <Badge className="text-[10px] bg-purple-50 text-purple-700 border-0">Low Literacy</Badge>
                )}
                {cls.is_active === false && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                )}
                {cls.status === 'draft' && (
                  <Badge variant="outline" className="text-[10px] text-amber-600">Draft</Badge>
                )}
              </div>

              <div className="flex gap-3 text-[10px] text-muted-foreground">
                {cls.estimated_minutes && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {cls.estimated_minutes < 60
                      ? `${cls.estimated_minutes}m`
                      : `${Math.round(cls.estimated_minutes / 60)}h`}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
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
                <Label>Difficulty Level</Label>
                <Select value={form.difficulty_level} onValueChange={v => setForm(f => ({ ...f, difficulty_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. Minutes</Label>
                <Input type="number" value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))} placeholder="60" />
              </div>
            </div>
            <div>
              <Label>Literacy Support</Label>
              <Select value={form.literacy_level_support} onValueChange={v => setForm(f => ({ ...f, literacy_level_support: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="low">Low Literacy Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>YouTube URL (optional)</Label>
              <Input value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="req" checked={form.is_required} onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} />
                <Label htmlFor="req">Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <Label htmlFor="active">Active (visible)</Label>
              </div>
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
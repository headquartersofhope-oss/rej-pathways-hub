import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, GraduationCap, Edit2, Clock, Star, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import ClassFormDialog, { CATEGORIES } from './ClassFormDialog';

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

export default function ClassCatalog({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterRequired, setFilterRequired] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterActive, setFilterActive] = useState('active');

  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [saving, setSaving] = useState(false);

  // Archive / Delete confirmation state
  const [confirmArchive, setConfirmArchive] = useState(null); // class object
  const [confirmDelete, setConfirmDelete] = useState(null);   // class object
  const [deleteBlocked, setDeleteBlocked] = useState(null);   // { cls, reason }
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 300),
  });

  const filtered = classes.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || c.category === filterCat;
    const matchRequired = filterRequired === 'all' || (filterRequired === 'required' ? c.is_required : !c.is_required);
    const matchDiff = filterDifficulty === 'all' || c.difficulty_level === filterDifficulty;
    const matchActive = filterActive === 'all'
      || (filterActive === 'active' ? (c.is_active !== false && c.status !== 'archived') : (c.is_active === false || c.status === 'archived'));
    return matchSearch && matchCat && matchRequired && matchDiff && matchActive;
  });

  const openCreate = () => { setEditingClass(null); setShowForm(true); };
  const openEdit = (cls) => { setEditingClass(cls); setShowForm(true); };

  const handleSave = async (data) => {
    setSaving(true);
    const payload = {
      ...data,
      organization_id: user?.organization_id,
      created_by: editingClass ? editingClass.created_by : user?.email,
    };
    if (editingClass) {
      await base44.entities.LearningClass.update(editingClass.id, payload);
    } else {
      await base44.entities.LearningClass.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ['learning-classes'] });
    setSaving(false);
    setShowForm(false);
  };

  // Archive: mark inactive + archived status
  const handleArchive = async () => {
    if (!confirmArchive) return;
    setArchiving(true);
    await base44.entities.LearningClass.update(confirmArchive.id, {
      is_active: false,
      status: 'archived',
    });
    queryClient.invalidateQueries({ queryKey: ['learning-classes'] });
    setArchiving(false);
    setConfirmArchive(null);
  };

  // Unarchive: restore to active + published
  const handleUnarchive = async (cls) => {
    await base44.entities.LearningClass.update(cls.id, {
      is_active: true,
      status: 'published',
    });
    queryClient.invalidateQueries({ queryKey: ['learning-classes'] });
  };

  // Delete: check for any enrollments or completions first
  const handleDeleteRequest = async (cls) => {
    const [enrollments, completions] = await Promise.all([
      base44.entities.ClassEnrollment.filter({ class_id: cls.id }),
      base44.entities.Certificate.filter({ certificate_path_id: cls.id }),
    ]);
    const hasHistory = enrollments.length > 0 || completions.length > 0;
    if (hasHistory) {
      setDeleteBlocked({
        cls,
        reason: `This class has ${enrollments.length} enrollment record(s) and ${completions.length} certificate(s). Hard delete is blocked to preserve resident history. Use Archive instead.`,
      });
    } else {
      setConfirmDelete(cls);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await base44.entities.LearningClass.delete(confirmDelete.id);
    queryClient.invalidateQueries({ queryKey: ['learning-classes'] });
    setDeleting(false);
    setConfirmDelete(null);
  };

  const isArchived = (cls) => cls.is_active === false || cls.status === 'archived';

  return (
    <div>
      {/* Filters + Add button */}
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
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Archived / Inactive</SelectItem>
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
          {[...Array(6)].map((_, i) => <Card key={i} className="p-4 h-40 animate-pulse bg-muted/30" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classes found</p>
          <p className="text-sm mt-1">
            {classes.length === 0 ? 'Create your first class to get started.' : 'Try adjusting your filters.'}
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
            <Card key={cls.id} className={`p-4 flex flex-col gap-3 ${isArchived(cls) ? 'opacity-60 border-dashed' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold text-sm leading-tight flex-1 min-w-0">{cls.title}</h3>
                {/* Admin actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(cls)}
                    title="Edit class"
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isArchived(cls) ? (
                    <button
                      onClick={() => handleUnarchive(cls)}
                      title="Restore class"
                      className="text-muted-foreground hover:text-accent p-0.5 rounded"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmArchive(cls)}
                      title="Archive class"
                      className="text-muted-foreground hover:text-amber-600 p-0.5 rounded"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteRequest(cls)}
                    title="Delete class"
                    className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                  <Badge variant="outline" className="text-[10px]">{cls.difficulty_level}</Badge>
                )}
                {cls.literacy_level_support === 'low' && (
                  <Badge className="text-[10px] bg-purple-50 text-purple-700 border-0">Low Literacy</Badge>
                )}
                {isArchived(cls) && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Archived</Badge>
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
                      : `${Math.round(cls.estimated_minutes / 60 * 10) / 10}h`}
                  </span>
                )}
                {cls.passing_score != null && (
                  <span>Pass: {cls.passing_score}%</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Class Form Dialog */}
      <ClassFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editingClass={editingClass}
        onSave={handleSave}
        saving={saving}
      />

      {/* Archive Confirmation */}
      <AlertDialog open={!!confirmArchive} onOpenChange={v => !v && setConfirmArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive "{confirmArchive?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This class will be marked inactive and hidden from residents. It will no longer appear in Available Classes for new enrollments.
              Existing enrollment and completion records for residents will be fully preserved.
              You can restore it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {archiving ? 'Archiving…' : 'Archive Class'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Blocked */}
      <AlertDialog open={!!deleteBlocked} onOpenChange={v => !v && setDeleteBlocked(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot Delete "{deleteBlocked?.cls?.title}"</AlertDialogTitle>
            <AlertDialogDescription>{deleteBlocked?.reason}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>OK</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setDeleteBlocked(null); setConfirmArchive(deleteBlocked?.cls); }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Archive Instead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete "{confirmDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This class has no enrollment or completion history. It will be permanently removed and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
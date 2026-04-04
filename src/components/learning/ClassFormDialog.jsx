import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';

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

const emptyForm = {
  title: '',
  category: '',
  description: '',
  estimated_minutes: '',
  difficulty_level: 'beginner',
  literacy_level_support: 'standard',
  youtube_url: '',
  youtube_search_phrase: '',
  additional_videos: [],
  passing_score: 70,
  is_required: false,
  is_active: true,
  status: 'published',
  learning_objectives: [],
  reflection_prompt: '',
};

export { CATEGORIES, emptyForm };

export default function ClassFormDialog({ open, onOpenChange, editingClass, onSave, saving }) {
  const [form, setForm] = React.useState(emptyForm);
  const [objectiveInput, setObjectiveInput] = useState('');

  // Sync form when editingClass changes
  useEffect(() => {
    if (open) {
      if (editingClass) {
        setForm({
          ...emptyForm,
          ...editingClass,
          estimated_minutes: editingClass.estimated_minutes || '',
          passing_score: editingClass.passing_score ?? 70,
          learning_objectives: editingClass.learning_objectives || [],
          additional_videos: editingClass.additional_videos || [],
          reflection_prompt: editingClass.reflection_prompt || '',
        });
      } else {
        setForm(emptyForm);
      }
      setObjectiveInput('');
    }
  }, [open, editingClass]);

  const addObjective = () => {
    const val = objectiveInput.trim();
    if (!val) return;
    setForm(f => ({ ...f, learning_objectives: [...(f.learning_objectives || []), val] }));
    setObjectiveInput('');
  };

  const removeObjective = (idx) => {
    setForm(f => ({ ...f, learning_objectives: f.learning_objectives.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = () => {
    onSave({
      ...form,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      passing_score: form.passing_score ? Number(form.passing_score) : 70,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div>
            <Label className="text-xs font-medium">Title *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Resume Writing Workshop"
              className="mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs font-medium">Category *</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-medium">Short Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="2-3 sentences in plain language..."
              className="mt-1"
            />
          </div>

          {/* Learning Objectives */}
          <div>
            <Label className="text-xs font-medium">Learning Objectives</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={objectiveInput}
                onChange={e => setObjectiveInput(e.target.value)}
                placeholder="What will learners be able to do?"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addObjective(); } }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addObjective}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {(form.learning_objectives || []).length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1 text-xs">
                    <span>{obj}</span>
                    <button onClick={() => removeObjective(i)} className="text-muted-foreground hover:text-destructive ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Difficulty + Est. Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Difficulty Level</Label>
              <Select value={form.difficulty_level} onValueChange={v => setForm(f => ({ ...f, difficulty_level: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Est. Minutes</Label>
              <Input
                type="number"
                value={form.estimated_minutes}
                onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}
                placeholder="60"
                className="mt-1"
              />
            </div>
          </div>

          {/* Literacy Support + Passing Score */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Literacy Support</Label>
              <Select value={form.literacy_level_support} onValueChange={v => setForm(f => ({ ...f, literacy_level_support: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="low">Low Literacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Passing Score (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.passing_score}
                onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))}
                placeholder="70"
                className="mt-1"
              />
            </div>
          </div>

          {/* YouTube URL */}
          <div>
            <Label className="text-xs font-medium">Primary Video URL (YouTube)</Label>
            <Input
              value={form.youtube_url}
              onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
              className="mt-1"
            />
          </div>

          {/* YouTube Search Phrase */}
          <div>
            <Label className="text-xs font-medium">YouTube Search Phrase (fallback)</Label>
            <Input
              value={form.youtube_search_phrase}
              onChange={e => setForm(f => ({ ...f, youtube_search_phrase: e.target.value }))}
              placeholder="e.g. resume writing for beginners"
              className="mt-1"
            />
          </div>

          {/* Additional Videos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium">Additional Videos (optional)</Label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, additional_videos: [...(f.additional_videos || []), { title: '', url: '' }] }))}
                className="text-xs text-primary flex items-center gap-0.5 hover:underline"
              >
                <Plus className="w-3 h-3" /> Add Video
              </button>
            </div>
            {(form.additional_videos || []).length === 0 && (
              <p className="text-xs text-muted-foreground">No additional videos yet.</p>
            )}
            <div className="space-y-2 mt-1">
              {(form.additional_videos || []).map((vid, i) => (
                <div key={i} className="flex gap-2 items-start bg-muted/30 rounded p-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={vid.title}
                      onChange={e => setForm(f => {
                        const av = [...f.additional_videos];
                        av[i] = { ...av[i], title: e.target.value };
                        return { ...f, additional_videos: av };
                      })}
                      placeholder="Video title (optional)"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={vid.url}
                      onChange={e => setForm(f => {
                        const av = [...f.additional_videos];
                        av[i] = { ...av[i], url: e.target.value };
                        return { ...f, additional_videos: av };
                      })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="h-7 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, additional_videos: f.additional_videos.filter((_, idx) => idx !== i) }))}
                    className="text-muted-foreground hover:text-destructive mt-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reflection Prompt */}
          <div>
            <Label className="text-xs font-medium">Reflection Prompt (optional)</Label>
            <Textarea
              value={form.reflection_prompt}
              onChange={e => setForm(f => ({ ...f, reflection_prompt: e.target.value }))}
              rows={2}
              placeholder="e.g. What is one goal you want to reach while in this program?"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Shown to residents after completing the class to encourage reflection.</p>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs font-medium">Publication Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))}
                className="w-3.5 h-3.5"
              />
              Required class
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-3.5 h-3.5"
              />
              Active (visible to residents)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !form.title || !form.category}>
              {saving ? 'Saving…' : editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
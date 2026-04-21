import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, PlayCircle, ExternalLink } from 'lucide-react';
import { CATEGORIES } from './ClassFormDialog';

const VIDEO_TYPES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'external', label: 'External Link' },
  { value: 'uploaded', label: 'Uploaded File' },
  { value: 'article', label: 'Article / Reading' },
  { value: 'interactive', label: 'Interactive' },
];

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/);
  return match ? match[1] : null;
}

const emptyForm = {
  title: '',
  category: '',
  description: '',
  estimated_minutes: '',
  difficulty_level: 'beginner',
  literacy_level_support: 'standard',
  video_url: '',
  video_type: 'youtube',
  video_duration_minutes: '',
  content_html: '',
  external_resource_url: '',
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

export default function ClassEditor({ open, onOpenChange, editingClass, onSave, saving }) {
  const [form, setForm] = useState(emptyForm);
  const [objectiveInput, setObjectiveInput] = useState('');
  const [previewVideoId, setPreviewVideoId] = useState(null);

  useEffect(() => {
    if (open) {
      if (editingClass) {
        setForm({
          ...emptyForm,
          ...editingClass,
          estimated_minutes: editingClass.estimated_minutes || '',
          video_duration_minutes: editingClass.video_duration_minutes || '',
          passing_score: editingClass.passing_score ?? 70,
          learning_objectives: editingClass.learning_objectives || [],
          additional_videos: editingClass.additional_videos || [],
          reflection_prompt: editingClass.reflection_prompt || '',
          content_html: editingClass.content_html || '',
          external_resource_url: editingClass.external_resource_url || '',
        });
      } else {
        setForm(emptyForm);
      }
      setObjectiveInput('');
      setPreviewVideoId(null);
    }
  }, [open, editingClass]);

  // Auto-detect video type from URL
  const handleVideoUrlChange = (url) => {
    setForm(f => {
      let type = f.video_type;
      if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
      else if (url.includes('vimeo.com')) type = 'vimeo';
      else if (url) type = 'external';
      return { ...f, video_url: url, youtube_url: url, video_type: type };
    });
    setPreviewVideoId(extractYouTubeId(url));
  };

  const addObjective = () => {
    const val = objectiveInput.trim();
    if (!val) return;
    setForm(f => ({ ...f, learning_objectives: [...(f.learning_objectives || []), val] }));
    setObjectiveInput('');
  };

  const handleSubmit = () => {
    onSave({
      ...form,
      estimated_minutes: form.estimated_minutes ? Number(form.estimated_minutes) : null,
      video_duration_minutes: form.video_duration_minutes ? Number(form.video_duration_minutes) : null,
      passing_score: form.passing_score ? Number(form.passing_score) : 70,
      // Keep youtube_url in sync with video_url for backward compatibility
      youtube_url: form.video_url || form.youtube_url,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-medium">Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Resume Writing Workshop"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Difficulty</Label>
              <Select value={form.difficulty_level} onValueChange={v => setForm(f => ({ ...f, difficulty_level: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {/* VIDEO SECTION */}
          <div style={{ backgroundColor: '#0D1117', borderRadius: '8px', border: '1px solid #30363D' }} className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-amber-400" /> Video Content
            </h3>

            <div>
              <Label className="text-xs font-medium text-slate-300">Video URL (paste YouTube, Vimeo, or any link)</Label>
              <Input
                value={form.video_url}
                onChange={e => handleVideoUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="mt-1"
              />
              {form.video_url && form.video_type === 'youtube' && previewVideoId && (
                <div className="mt-3 rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${previewVideoId}`}
                    style={{ width: '100%', height: '100%' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Preview"
                  />
                </div>
              )}
              {form.video_url && !previewVideoId && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="text-[10px] bg-amber-900/50 text-amber-400 border-0">
                    {form.video_type || 'external'} link
                  </Badge>
                  <a href={form.video_url} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-amber-400 flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Preview
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-300">Video Type</Label>
                <Select value={form.video_type} onValueChange={v => setForm(f => ({ ...f, video_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VIDEO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-300">Video Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.video_duration_minutes}
                  onChange={e => setForm(f => ({ ...f, video_duration_minutes: e.target.value }))}
                  placeholder="e.g. 12"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-300">External Resource URL (optional)</Label>
              <Input
                value={form.external_resource_url}
                onChange={e => setForm(f => ({ ...f, external_resource_url: e.target.value }))}
                placeholder="https://example.com/resource"
                className="mt-1"
              />
            </div>
          </div>

          {/* Rich text content */}
          <div>
            <Label className="text-xs font-medium">Content / Reading Material (HTML or plain text)</Label>
            <Textarea
              value={form.content_html}
              onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))}
              rows={5}
              placeholder="<p>Add supplementary reading content here...</p>"
              className="mt-1 font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Displayed below the video. Basic HTML is supported.</p>
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
                    <button onClick={() => setForm(f => ({ ...f, learning_objectives: f.learning_objectives.filter((_, idx) => idx !== i) }))}
                            className="text-muted-foreground hover:text-destructive ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <Label className="text-xs font-medium">Passing Score (%)</Label>
              <Input
                type="number"
                min={0} max={100}
                value={form.passing_score}
                onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))}
                placeholder="70"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reflection Prompt */}
          <div>
            <Label className="text-xs font-medium">Reflection Prompt (optional)</Label>
            <Textarea
              value={form.reflection_prompt}
              onChange={e => setForm(f => ({ ...f, reflection_prompt: e.target.value }))}
              rows={2}
              placeholder="e.g. What is one goal you want to reach?"
              className="mt-1"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_required}
                     onChange={e => setForm(f => ({ ...f, is_required: e.target.checked }))} className="w-3.5 h-3.5" />
              Required class
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                     onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-3.5 h-3.5" />
              Active (visible to residents)
            </label>
          </div>

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
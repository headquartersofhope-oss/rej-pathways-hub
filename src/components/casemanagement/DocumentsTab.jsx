import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FileText, Plus, Upload, ExternalLink } from 'lucide-react';
import { isStaff } from '@/lib/roles';
import { format } from 'date-fns';

const DOC_TYPES = ['id', 'resume', 'certificate', 'court_order', 'lease', 'employment_verification', 'background_check', 'medical', 'other'];
const DOC_STATUSES = ['pending', 'verified', 'expired', 'rejected'];

const statusColors = {
  pending: 'bg-amber-50 text-amber-700',
  verified: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-red-50 text-red-700',
  rejected: 'bg-gray-100 text-gray-600',
};

export default function DocumentsTab({ resident, user }) {
  const queryClient = useQueryClient();
  const isStaffUser = isStaff(user?.role);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'id', status: 'pending', expiry_date: '', notes: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', resident.id],
    queryFn: () => base44.entities.Document.filter({ resident_id: resident.id }, '-created_date'),
  });

  const handleSave = async () => {
    setSaving(true);
    let file_url = '';
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      file_url = result.file_url;
    }
    await base44.entities.Document.create({
      ...form,
      file_url,
      resident_id: resident.id,
      global_resident_id: resident.global_resident_id || '',
      organization_id: resident.organization_id,
      uploaded_by: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ['documents', resident.id] });
    setShowForm(false);
    setForm({ name: '', type: 'id', status: 'pending', expiry_date: '', notes: '' });
    setFile(null);
    setSaving(false);
  };

  const handleStatusUpdate = async (doc, newStatus) => {
    await base44.entities.Document.update(doc.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['documents', resident.id] });
  };

  // Missing docs from resident profile
  const missingDocs = resident.missing_documents || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Document
        </Button>
      </div>

      {missingDocs.length > 0 && (
        <Card className="p-4 border-destructive/20 bg-destructive/5">
          <p className="text-xs font-semibold text-destructive mb-2">Missing Required Documents</p>
          <div className="flex flex-wrap gap-1.5">
            {missingDocs.map((d, i) => (
              <Badge key={i} className="text-[10px] bg-destructive/10 text-destructive border-0">{d.replace(/_/g, ' ')}</Badge>
            ))}
          </div>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="border rounded-lg p-3 flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{doc.name}</p>
                    <Badge className={`text-[10px] ${statusColors[doc.status] || ''}`}>{doc.status}</Badge>
                    <span className="text-[10px] text-muted-foreground">{doc.type?.replace(/_/g, ' ')}</span>
                  </div>
                  {doc.expiry_date && <p className="text-xs text-muted-foreground mt-0.5">Expires {doc.expiry_date}</p>}
                  {doc.notes && <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                  {isStaffUser && (
                    <Select value={doc.status} onValueChange={v => handleStatusUpdate(doc, v)}>
                      <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Document Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. State ID" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Upload File</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Uploading...' : 'Save Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
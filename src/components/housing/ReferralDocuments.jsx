import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DOC_TYPES = [
  { value: 'intake_summary', label: 'Intake Summary' },
  { value: 'state_id', label: 'State ID / Photo ID' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'proof_of_income', label: 'Proof of Income / Benefits' },
  { value: 'dd214', label: 'DD214 (Veterans)' },
  { value: 'consent_form', label: 'Release / Consent Form' },
  { value: 'needs_summary', label: 'Needs Summary' },
  { value: 'other', label: 'Other' },
];

export default function ReferralDocuments({ documents = [], onChange, readOnly = false }) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('other');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newDoc = {
      name: file.name,
      url: file_url,
      document_type: selectedType,
      uploaded_date: new Date().toISOString().split('T')[0],
    };
    onChange([...documents, newDoc]);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemove = (idx) => {
    onChange(documents.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 p-2.5 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate hover:underline block">
                    {doc.name}
                  </a>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                  </Badge>
                </div>
              </div>
              {!readOnly && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(idx)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                {uploading ? 'Uploading...' : 'Attach Document'}
              </span>
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}
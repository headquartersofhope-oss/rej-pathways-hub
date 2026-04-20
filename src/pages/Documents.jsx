import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Upload, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-amber-50 text-amber-700',
  verified: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-red-50 text-red-700',
  rejected: 'bg-slate-100 text-slate-700',
};

export default function Documents() {
  const { data: docs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Documents"
        subtitle="Manage secure document uploads"
        icon={FileText}
        actions={
          <Button className="gap-2"><Upload className="w-4 h-4" /> Upload Document</Button>
        }
      />

      {docs.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No documents yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload IDs, resumes, certificates, and other important files</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <Card key={doc.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[10px] ${statusColors[doc.status] || ''}`}>
                      {doc.status || 'pending'}
                    </Badge>
                    {doc.type && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {doc.type.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {doc.expiry_date && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Expires: {format(new Date(doc.expiry_date), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
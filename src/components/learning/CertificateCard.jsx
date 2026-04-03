import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { format } from 'date-fns';

const CERT_COLORS = {
  job_ready: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  stability: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  digital_readiness: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  financial_basics: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  life_skills: { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700' },
};

export default function CertificateCard({ certificate }) {
  const colors = CERT_COLORS[certificate.category] || CERT_COLORS.job_ready;

  return (
    <Card className={`p-4 border-2 ${colors.border} ${colors.bg}`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Award className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-sm">{certificate.certificate_name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {certificate.certificate_number}
            </p>
          </div>
          <Badge className={colors.badge}>Earned</Badge>
        </div>

        {/* Details */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <strong>Issued:</strong> {format(new Date(certificate.issued_date), 'MMM d, yyyy')}
          </p>
          {certificate.issued_by_name && certificate.issued_by !== 'system' && (
            <p>
              <strong>By:</strong> {certificate.issued_by_name}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Lock, AlertCircle } from 'lucide-react';

const CERT_COLORS = {
  job_ready: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  stability: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
  digital_readiness: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
  financial_basics: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600' },
  life_skills: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600' },
};

export default function CertificateProgress({ residentId, staffView = false }) {
  const [eligibility, setEligibility] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issuingId, setIssuingId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get eligibility
        const eligRes = await base44.functions.invoke('checkCertificateEligibility', {
          resident_id: residentId,
        });
        if (eligRes.data?.certificates) {
          setEligibility(eligRes.data);
        }

        // Get all classes
        const classes = await base44.entities.LearningClass.list();
        setAllClasses(classes);
      } catch (e) {
        setError('Failed to load certificate data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (residentId) {
      fetchData();
    }
  }, [residentId]);

  const handleIssueCertificate = async (pathId) => {
    setIssuingId(pathId);
    try {
      await base44.functions.invoke('issueCertificate', {
        resident_id: residentId,
        certificate_path_id: pathId,
      });
      // Refresh eligibility
      const res = await base44.functions.invoke('checkCertificateEligibility', {
        resident_id: residentId,
      });
      if (res.data?.certificates) {
        setEligibility(res.data);
      }
    } catch (e) {
      setError('Failed to issue certificate: ' + e.message);
    } finally {
      setIssuingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Loading certificates...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!eligibility || !eligibility.certificates || eligibility.certificates.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No certificates available.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {eligibility.certificates.map(cert => {
        const colors = CERT_COLORS[cert.category] || CERT_COLORS.job_ready;
        const isEligible = cert.is_eligible;
        const certTitle = cert.certificate_name.replace(' Certificate', '');

        return (
          <Card
            key={cert.certificate_path_id}
            className={`p-4 border ${colors.border} ${colors.bg}`}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">{cert.certificate_name}</h3>
                    {isEligible && (
                      <Badge className="bg-green-100 text-green-700">Eligible</Badge>
                    )}
                  </div>
                  {cert.description && (
                    <p className="text-xs text-muted-foreground mt-1">{cert.description}</p>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Progress</span>
                  <span className="font-bold">
                    {cert.completed_count}/{cert.total_required}
                  </span>
                </div>
                <Progress value={cert.progress} className="h-2" />
              </div>

              {/* Required Classes */}
              <div className="text-xs">
                <p className="font-medium mb-2">Required Classes:</p>
                <div className="space-y-1">
                  {cert.completed_class_ids && cert.completed_class_ids.length > 0 && (
                    <>
                      {cert.completed_class_ids.slice(0, 2).map(classId => {
                        const cls = allClasses.find(c => c.id === classId);
                        return (
                          <div key={classId} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="text-muted-foreground line-clamp-1">
                              {cls?.title}
                            </span>
                          </div>
                        );
                      })}
                      {cert.total_required > 2 && (
                        <p className="text-muted-foreground pl-5">
                          +{cert.total_required - cert.completed_count} more needed
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Issue Button (Staff Only) */}
              {staffView && isEligible && (
                <Button
                  size="sm"
                  onClick={() => handleIssueCertificate(cert.certificate_path_id)}
                  disabled={issuingId === cert.certificate_path_id}
                  className="w-full mt-2"
                >
                  {issuingId === cert.certificate_path_id ? 'Issuing...' : 'Issue Certificate'}
                </Button>
              )}

              {/* Locked state */}
              {!isEligible && (
                <div className="flex items-center gap-2 p-2 rounded bg-muted text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>Complete remaining classes to unlock</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
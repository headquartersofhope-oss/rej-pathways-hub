import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';

const REASON_LABELS = {
  orientation_required: 'Program Orientation',
  low_literacy_support: 'Literacy Support',
  low_digital_literacy: 'Digital Skills',
  no_resume: 'Resume Building',
  low_interview_readiness: 'Interview Prep',
  low_job_readiness: 'Job Readiness',
  financial_instability: 'Financial Stability',
  housing_instability: 'Housing Support',
  missing_documents: 'Documentation',
  transportation_barriers: 'Transportation',
  population_support: 'Population Support',
  foundational_skill: 'Foundational Skills',
};

export default function LearningRecommendations({ residentId, onAssign }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assigned, setAssigned] = useState(new Set());

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await base44.functions.invoke('recommendLearningClasses', {
        resident_id: residentId,
      });
      if (response.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (e) {
      setError('Failed to generate recommendations: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClass = async (classId, title) => {
    try {
      // Get resident info
      const residents = await base44.entities.Resident.list();
      const resident = residents.find(r => r.id === residentId);

      if (!resident) {
        setError('Resident not found');
        return;
      }

      // Create assignment
      const recommendation = recommendations.find(r => r.class_id === classId);
      await base44.entities.LearningAssignment.create({
        resident_id: residentId,
        global_resident_id: resident.global_resident_id,
        class_id: classId,
        organization_id: resident.organization_id,
        assignment_type: recommendation?.assignment_type || 'recommended',
        assignment_reason: recommendation?.reason_code || 'staff_manual',
        assigned_by: 'staff',
        assigned_date: new Date().toISOString().split('T')[0],
        status: 'assigned',
      });

      setAssigned(prev => new Set([...prev, classId]));
      if (onAssign) onAssign(classId, title);
    } catch (e) {
      setError('Failed to assign class: ' + e.message);
    }
  };

  useEffect(() => {
    if (residentId) {
      fetchRecommendations();
    }
  }, [residentId]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Analyzing resident profile...</p>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No recommendations at this time.</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchRecommendations}
          className="mt-3"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </Card>
    );
  }

  // Group by priority
  const required = recommendations.filter(r => r.assignment_type === 'required');
  const recommended = recommendations.filter(r => r.assignment_type === 'recommended');

  return (
    <div className="space-y-4">
      {/* Alert if required classes */}
      {required.length > 0 && (
        <Alert className="border-l-4 border-l-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{required.length} required class{required.length !== 1 ? 'es' : ''}</strong> recommended for this resident
          </AlertDescription>
        </Alert>
      )}

      {/* Required Classes */}
      {required.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="text-red-600">●</span>
            Required Classes ({required.length})
          </h3>
          {required.map(rec => (
            <Card key={rec.class_id} className="p-3 border-l-4 border-l-red-500">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{rec.class_title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {REASON_LABELS[rec.reason_code] || rec.reason_code}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                </div>
                {assigned.has(rec.class_id) ? (
                  <Badge className="bg-green-100 text-green-700 flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Assigned
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAssignClass(rec.class_id, rec.class_title)}
                    className="flex-shrink-0"
                  >
                    Assign
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recommended Classes */}
      {recommended.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            Recommended Classes ({recommended.length})
          </h3>
          {recommended.map(rec => (
            <Card key={rec.class_id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{rec.class_title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {REASON_LABELS[rec.reason_code] || rec.reason_code}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                </div>
                {assigned.has(rec.class_id) ? (
                  <Badge className="bg-green-100 text-green-700 flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Assigned
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAssignClass(rec.class_id, rec.class_title)}
                    className="flex-shrink-0"
                  >
                    Assign
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk assign button */}
      {recommendations.some(r => !assigned.has(r.class_id)) && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            recommendations
              .filter(r => !assigned.has(r.class_id))
              .forEach(rec => handleAssignClass(rec.class_id, rec.class_title));
          }}
        >
          Assign All Recommendations
        </Button>
      )}
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import TrainingOverlay from '@/components/training/TrainingOverlay';
import PageHeader from '@/components/shared/PageHeader';

export default function TrainingDashboard() {
  const { user } = useAuth();
  const [selectedTraining, setSelectedTraining] = useState(null);

  const { data: trainings = [] } = useQuery({
    queryKey: ['trainings'],
    queryFn: () => base44.entities.Training.list(),
  });

  const { data: progressRecords = [] } = useQuery({
    queryKey: ['training_progress', user?.id],
    queryFn: () =>
      user ? base44.entities.TrainingProgress.filter({ user_id: user.id }) : [],
    enabled: !!user,
  });

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  const userTrainings = useMemo(() => {
    if (isAdmin) {
      return trainings;
    }
    return trainings.filter((t) => t.data?.role === user?.role);
  }, [trainings, user?.role, isAdmin]);

  const progressMap = useMemo(() => {
    const map = {};
    progressRecords.forEach((record) => {
      map[record.data?.training_id] = record.data;
    });
    return map;
  }, [progressRecords]);

  const getProgress = (trainingId) => {
    const progress = progressMap[trainingId];
    if (!progress) return { status: 'not_started', completion: 0 };
    return {
      status: progress.status,
      completion: progress.steps_completed?.length || 0,
      score: progress.score,
    };
  };

  const handleStartTraining = async (training) => {
    const progress = getProgress(training.data?.training_id);
    if (progress.status === 'not_started') {
      await base44.entities.TrainingProgress.create({
        user_id: user.id,
        user_name: user.full_name,
        role: user.role,
        training_id: training.data?.training_id,
        module_title: training.data?.module_title,
        status: 'in_progress',
        started_date: new Date().toISOString(),
      });
    }
    setSelectedTraining(training);
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PageHeader title="Training Management" subtitle="Configure training modules and monitor staff progress" />

        <div className="mt-8 space-y-8">
          {/* Available Modules by Role */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Training Modules</h2>
            <div className="grid gap-4">
              {userTrainings.map((training) => (
                <Card key={training.id} style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{training.data?.module_title}</CardTitle>
                        <CardDescription>{training.data?.module_description}</CardDescription>
                      </div>
                      <Badge variant="outline">{training.data?.role}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {training.data?.steps?.length || 0} steps • {training.data?.estimated_minutes || 0} min
                      </span>
                      <div className="flex gap-2">
                        <Badge className={training.data?.completion_required ? 'bg-amber-500/20 text-amber-300' : 'bg-muted'}>
                          {training.data?.completion_required ? 'Required' : 'Optional'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Staff Progress */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Staff Progress</h2>
            <Card style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {progressRecords.map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-3 rounded-lg bg-card">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{record.data?.user_name}</p>
                        <p className="text-xs text-muted-foreground">{record.data?.module_title}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Progress value={(record.data?.steps_completed?.length || 0) * 10} className="w-32" />
                        <Badge className={
                          record.data?.status === 'completed'
                            ? 'bg-green-500/20 text-green-300'
                            : record.data?.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-muted'
                        }>
                          {record.data?.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <PageHeader
        title="Your Training"
        subtitle={`Complete your ${user?.role} onboarding modules`}
      />

      <div className="mt-8 grid gap-4">
        {userTrainings.length === 0 ? (
          <Card style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No training modules assigned for your role.</p>
            </CardContent>
          </Card>
        ) : (
          userTrainings.map((training) => {
            const progress = getProgress(training.data?.training_id);
            const isCompleted = progress.status === 'completed';

            return (
              <Card
                key={training.id}
                style={{
                  backgroundColor: '#161B22',
                  borderColor: '#30363D',
                  borderTopColor: isCompleted ? '#34D399' : '#F59E0B',
                  borderTopWidth: '3px',
                }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{training.data?.module_title}</CardTitle>
                      <CardDescription>{training.data?.module_description}</CardDescription>
                    </div>
                    {isCompleted && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {training.data?.estimated_minutes || 0} minutes
                    </span>
                    <span>
                      {progress.completion} / {training.data?.steps?.length || 0} steps
                    </span>
                  </div>
                  <Progress
                    value={(progress.completion / (training.data?.steps?.length || 1)) * 100}
                  />
                  {!isCompleted && (
                    <Button
                      onClick={() => handleStartTraining(training)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {progress.status === 'in_progress' ? 'Continue' : 'Start'} Training
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {selectedTraining && (
        <TrainingOverlay
          training={selectedTraining.data}
          userRole={user?.role}
          onClose={() => setSelectedTraining(null)}
          onStepComplete={() => {}}
        />
      )}
    </div>
  );
}
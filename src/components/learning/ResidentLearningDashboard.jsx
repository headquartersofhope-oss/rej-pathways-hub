import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import ClassCompletionCard from './ClassCompletionCard';
import { CheckCircle2, Clock, AlertCircle, BookOpen, Trophy } from 'lucide-react';

const CATEGORIES = {
  orientation: 'Orientation',
  employment: 'Employment',
  housing: 'Housing',
  financial_literacy: 'Financial',
  digital_literacy: 'Digital',
  ai_literacy: 'AI',
  life_skills: 'Life Skills',
  wellness: 'Wellness',
  documentation: 'Documentation',
};

export default function ResidentLearningDashboard({ residentId }) {
  const [selectedCategory, setSelectedCategory] = useState('');

  // BUG FIX: filter server-side to prevent cross-resident data leakage
  const { data: residentAssignments = [] } = useQuery({
    queryKey: ['resident-assignments', residentId],
    queryFn: () => base44.entities.LearningAssignment.filter({ resident_id: residentId }),
    enabled: !!residentId,
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list('-created_date', 300),
  });
  
  // Stats
  const stats = {
    total: residentAssignments.length,
    completed: residentAssignments.filter(a => a.status === 'completed' || a.status === 'passed').length,
    inProgress: residentAssignments.filter(a => a.status === 'in_progress').length,
    needsRetake: residentAssignments.filter(a => a.status === 'failed').length,
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Find next recommended class
  const nextClass = residentAssignments.find(a => a.status === 'assigned');

  // Group by category
  const byCategory = residentAssignments.reduce((acc, assignment) => {
    const cls = allClasses.find(c => c.id === assignment.class_id);
    if (cls) {
      if (!acc[cls.category]) acc[cls.category] = [];
      acc[cls.category].push({ ...assignment, classInfo: cls });
    }
    return acc;
  }, {});

  // Filter by selected category
  const filtered = selectedCategory 
    ? (byCategory[selectedCategory] || [])
    : residentAssignments
        .map(a => ({ ...a, classInfo: allClasses.find(c => c.id === a.class_id) }))
        .filter(x => x.classInfo);

  const requiredNotComplete = filtered.filter(a => a.classInfo.is_required && a.status !== 'passed');

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      {stats.needsRetake > 0 && (
        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Quiz Retake Needed</p>
              <p className="text-sm text-amber-800">You have {stats.needsRetake} quiz to retake. Score 70% or higher to pass.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Next Recommended Class */}
      {nextClass && allClasses.find(c => c.id === nextClass.class_id) && (
        <Card className="p-4 border-l-4 border-l-blue-500 bg-blue-50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">Ready to Start:</p>
              <p className="text-base font-bold text-blue-950 mt-1">
                {allClasses.find(c => c.id === nextClass.class_id)?.title}
              </p>
            </div>
            <Badge className="bg-blue-600">Next</Badge>
          </div>
        </Card>
      )}

      {/* Overall Progress */}
      <Card className="p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Learning Progress</h3>
            <span className="text-2xl font-bold">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div>
            <p className="font-bold text-lg">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </div>
          <div>
            <p className="font-bold text-lg text-yellow-600">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div>
            <p className="font-bold text-lg text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="font-bold text-lg text-red-600">{stats.needsRetake}</p>
            <p className="text-xs text-muted-foreground">Retakes</p>
          </div>
        </div>
      </Card>

      {/* Required Classes Alert */}
      {requiredNotComplete.length > 0 && (
        <Card className="p-4 border-l-4 border-l-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Required Classes</p>
              <p className="text-sm text-red-800 mt-1">
                Complete {requiredNotComplete.length} required class{requiredNotComplete.length !== 1 ? 'es' : ''} to progress in the program.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Classes by Category */}
      {Object.keys(byCategory).length > 0 && (
        <>
          <Tabs defaultValue="" className="w-full">
            <TabsList className="w-full overflow-x-auto justify-start">
              <TabsTrigger value="" onClick={() => setSelectedCategory('')}>
                All ({stats.total})
              </TabsTrigger>
              {Object.entries(byCategory).map(([cat, classes]) => (
                <TabsTrigger key={cat} value={cat} onClick={() => setSelectedCategory(cat)}>
                  {CATEGORIES[cat]} ({classes.length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="space-y-3 mt-4">
              {filtered.length > 0 ? (
                filtered.map(assignment => (
                  <ClassCompletionCard
                    key={assignment.id}
                    assignment={assignment}
                    classInfo={assignment.classInfo}
                    onStart={() => console.log('Start class', assignment.id)}
                    onRetake={() => console.log('Retake quiz', assignment.id)}
                  />
                ))
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No classes in this category.</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Completed Classes History */}
      {stats.completed > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Completed Classes</h3>
          </div>
          <div className="space-y-2">
            {residentAssignments
              .filter(a => a.status === 'completed' || a.status === 'passed')
              .map(assignment => {
                const cls = allClasses.find(c => c.id === assignment.class_id);
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-2 rounded bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">{cls?.title}</span>
                    </div>
                    {assignment.quiz_score && (
                      <Badge className="text-xs">{assignment.quiz_score}%</Badge>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {stats.total === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No classes assigned yet</p>
          <p className="text-sm mt-1">Your case manager will recommend classes based on your profile.</p>
        </Card>
      )}
    </div>
  );
}
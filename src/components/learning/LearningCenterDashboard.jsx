import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Clock, CheckCircle2, AlertCircle, Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = {
  orientation: { label: 'Orientation & Program Success', color: 'bg-blue-50 text-blue-700' },
  employment: { label: 'Employment Basics', color: 'bg-green-50 text-green-700' },
  housing: { label: 'Housing Stability', color: 'bg-purple-50 text-purple-700' },
  financial_literacy: { label: 'Financial Literacy', color: 'bg-yellow-50 text-yellow-700' },
  digital_literacy: { label: 'Digital Literacy', color: 'bg-cyan-50 text-cyan-700' },
  ai_literacy: { label: 'AI Literacy', color: 'bg-indigo-50 text-indigo-700' },
  life_skills: { label: 'Life Skills', color: 'bg-pink-50 text-pink-700' },
  wellness: { label: 'Wellness & Stability', color: 'bg-rose-50 text-rose-700' },
  documentation: { label: 'Documentation & ID', color: 'bg-slate-50 text-slate-700' },
};

export default function LearningCenterDashboard({ residentId }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');

  // Fetch all classes
  const { data: allClasses = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list(),
  });

  // Fetch assignments for this resident
  const { data: assignments = [] } = useQuery({
    queryKey: ['learning-assignments', residentId],
    queryFn: () => base44.entities.LearningAssignment.list(),
  });

  const residentAssignments = assignments.filter(a => a.resident_id === residentId);
  const assignedClassIds = new Set(residentAssignments.map(a => a.class_id));

  // Filter classes
  const filtered = allClasses.filter(c => {
    if (!c.is_active || c.status !== 'published') return false;
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (difficultyFilter && c.difficulty_level !== difficultyFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group classes by category
  const grouped = {};
  filtered.forEach(cls => {
    if (!grouped[cls.category]) grouped[cls.category] = [];
    grouped[cls.category].push(cls);
  });

  // Stats
  const completed = residentAssignments.filter(a => a.status === 'completed' || a.status === 'passed').length;
  const inProgress = residentAssignments.filter(a => a.status === 'in_progress').length;
  const assigned = residentAssignments.length;

  const getAssignmentStatus = (classId) => {
    const assignment = residentAssignments.find(a => a.class_id === classId);
    return assignment ? { ...assignment, hasAssignment: true } : { hasAssignment: false };
  };

  const handleStartClass = (classId) => {
    const assignment = residentAssignments.find(a => a.class_id === classId);
    if (assignment) {
      // Navigate to class detail or update status
      console.log(`Starting class ${classId} with assignment ${assignment.id}`);
      // Would navigate to /learning/:assignmentId in full implementation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned</p>
              <p className="text-2xl font-bold">{assigned}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{inProgress}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{completed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Categories</SelectItem>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Classes by Category */}
      <Tabs defaultValue={selectedCategory || Object.keys(grouped)[0] || ''}>
        {Object.keys(grouped).length > 0 && (
          <>
            <TabsList className="w-full overflow-x-auto justify-start">
              {Object.entries(grouped).map(([cat, classes]) => (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {CATEGORIES[cat]?.label?.split(' ')[0]} ({classes.length})
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(grouped).map(([cat, classes]) => (
              <TabsContent key={cat} value={cat} className="space-y-3">
                {classes.map(cls => {
                  const assignment = getAssignmentStatus(cls.id);
                  const isCompleted = assignment.hasAssignment && (assignment.status === 'completed' || assignment.status === 'passed');
                  const isInProgress = assignment.hasAssignment && assignment.status === 'in_progress';

                  return (
                    <Card key={cls.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base">{cls.title}</h3>
                            {cls.is_required && <Badge className="text-xs">Required</Badge>}
                            <Badge variant="outline" className={`text-xs ${CATEGORIES[cls.category]?.color}`}>
                              {CATEGORIES[cls.category]?.label}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-2">{cls.description}</p>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {cls.estimated_minutes} min
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {cls.difficulty_level}
                            </Badge>
                            {cls.literacy_level_support === 'low' && (
                              <Badge variant="secondary" className="text-xs">
                                Low literacy support
                              </Badge>
                            )}
                            {assignment.hasAssignment && (
                              <Badge
                                className={`text-xs ${
                                  isCompleted ? 'bg-green-100 text-green-700' : 
                                  isInProgress ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {assignment.status}
                              </Badge>
                            )}
                          </div>

                          {cls.learning_objectives && cls.learning_objectives.length > 0 && (
                            <div className="mt-2 text-sm">
                              <p className="text-xs font-medium text-muted-foreground mb-1">What you'll learn:</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {cls.learning_objectives.slice(0, 2).map((obj, i) => (
                                  <li key={i}>• {obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {assignment.hasAssignment ? (
                            <>
                              <Button
                                size="sm"
                                variant={isCompleted ? 'outline' : isInProgress ? 'default' : 'secondary'}
                                onClick={() => handleStartClass(cls.id)}
                              >
                                {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                              </Button>
                              {assignment.quiz_score && (
                                <div className="text-xs text-center">
                                  <p className="font-semibold">{assignment.quiz_score}%</p>
                                  <p className="text-muted-foreground">
                                    {assignment.quiz_passed ? 'Passed' : 'Retake'}
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" disabled>
                              Not assigned
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </TabsContent>
            ))}
          </>
        )}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No classes match your filters.</p>
          </div>
        )}
      </Tabs>
    </div>
  );
}
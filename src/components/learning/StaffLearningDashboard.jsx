import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock, RotateCcw, Search } from 'lucide-react';

export default function StaffLearningDashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['all-assignments'],
    queryFn: () => base44.entities.LearningAssignment.list(),
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['learning-classes'],
    queryFn: () => base44.entities.LearningClass.list(),
  });

  // Build resident learning summary
  const residentsWithLearning = residents.map(resident => {
    const residentAssignments = assignments.filter(a => a.resident_id === resident.id);
    const completed = residentAssignments.filter(a => a.status === 'passed' || a.status === 'completed').length;
    const inProgress = residentAssignments.filter(a => a.status === 'in_progress').length;
    const needsRetake = residentAssignments.filter(a => a.status === 'failed').length;
    const requiredNotComplete = residentAssignments.filter(a => {
      const cls = allClasses.find(c => c.id === a.class_id);
      return cls?.is_required && a.status !== 'passed';
    });

    return {
      resident,
      assignments: residentAssignments,
      stats: {
        total: residentAssignments.length,
        completed,
        inProgress,
        needsRetake,
        requiredNotComplete: requiredNotComplete.length,
      },
    };
  });

  // Filter
  const filtered = residentsWithLearning.filter(item => {
    const matchesSearch = item.resident.first_name.toLowerCase().includes(search.toLowerCase()) ||
                         item.resident.last_name.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'needs_attention') {
      matchesStatus = item.stats.needsRetake > 0 || item.stats.requiredNotComplete > 0;
    } else if (statusFilter === 'in_progress') {
      matchesStatus = item.stats.inProgress > 0;
    } else if (statusFilter === 'completed') {
      matchesStatus = item.stats.completed > 0;
    }

    return matchesSearch && matchesStatus;
  });

  // Priority alerts
  const needsAttention = residentsWithLearning.filter(item => 
    item.stats.needsRetake > 0 || item.stats.requiredNotComplete > 0
  );

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {needsAttention.length > 0 && (
        <Alert className="border-l-4 border-l-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>{needsAttention.length} resident{needsAttention.length !== 1 ? 's' : ''} need attention:</strong>{' '}
            {needsAttention.slice(0, 3).map(item => item.resident.first_name).join(', ')}
            {needsAttention.length > 3 && ` +${needsAttention.length - 3} more`}
          </AlertDescription>
        </Alert>
      )}

      {/* Platform Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Assignments</p>
          <p className="text-2xl font-bold">{assignments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {assignments.filter(a => a.status === 'passed' || a.status === 'completed').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Needs Retake</p>
          <p className="text-2xl font-bold text-red-600">
            {assignments.filter(a => a.status === 'failed').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">
            {assignments.filter(a => a.status === 'in_progress').length}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Statuses</SelectItem>
            <SelectItem value="needs_attention">Needs Attention</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resident List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map(item => {
            const progressPercent = item.stats.total > 0 
              ? Math.round((item.stats.completed / item.stats.total) * 100)
              : 0;

            return (
              <Card key={item.resident.id} className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {item.resident.first_name} {item.resident.last_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.resident.global_resident_id}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {item.stats.requiredNotComplete > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          {item.stats.requiredNotComplete} Required
                        </Badge>
                      )}
                      {item.stats.needsRetake > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">
                          {item.stats.needsRetake} Retake
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  {item.stats.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Progress</span>
                        <span className="text-sm font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${progressPercent}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted">
                      <p className="text-muted-foreground">Assigned</p>
                      <p className="font-bold">{item.stats.total}</p>
                    </div>
                    <div className="p-2 rounded bg-green-50 border border-green-200">
                      <p className="text-green-700 text-xs">Completed</p>
                      <p className="font-bold text-green-700">{item.stats.completed}</p>
                    </div>
                    <div className="p-2 rounded bg-yellow-50 border border-yellow-200">
                      <p className="text-yellow-700 text-xs">In Progress</p>
                      <p className="font-bold text-yellow-700">{item.stats.inProgress}</p>
                    </div>
                    <div className="p-2 rounded bg-red-50 border border-red-200">
                      <p className="text-red-700 text-xs">Needs Retake</p>
                      <p className="font-bold text-red-700">{item.stats.needsRetake}</p>
                    </div>
                  </div>

                  {/* Recent activities */}
                  {item.assignments.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-semibold mb-2">Recent Activity:</p>
                      <div className="space-y-1">
                        {item.assignments.slice(0, 3).map(assignment => {
                          const cls = allClasses.find(c => c.id === assignment.class_id);
                          return (
                            <div key={assignment.id} className="flex items-center gap-2 text-xs">
                              {assignment.status === 'passed' && (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              )}
                              {assignment.status === 'failed' && (
                                <RotateCcw className="w-3 h-3 text-red-600" />
                              )}
                              {assignment.status === 'in_progress' && (
                                <Clock className="w-3 h-3 text-yellow-600" />
                              )}
                              <span className="text-muted-foreground line-clamp-1">
                                {cls?.title}
                              </span>
                              {assignment.quiz_score !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {assignment.quiz_score}%
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-6 text-center text-muted-foreground">
            <p>No residents found matching your filters.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
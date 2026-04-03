import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AISuggestionsPanel({ resident, barriers = [], onTasksGenerated = null }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('suggestServiceTasks', {
        residentId: resident.id,
        globalResidentId: resident.global_resident_id,
        barriers: barriers.map(b => ({
          category: b.category,
          severity: b.severity,
          title: b.title,
          description: b.description
        })),
        residentContext: {
          name: `${resident.first_name} ${resident.last_name}`,
          population: resident.population,
          status: resident.status
        }
      });

      if (response.data.suggestions) {
        setSuggestions(response.data);
        onTasksGenerated?.(response.data);
      } else {
        setError('No suggestions generated');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = {
    low: 'bg-secondary/10 text-secondary',
    medium: 'bg-accent/10 text-accent',
    high: 'bg-destructive/20 text-destructive',
    urgent: 'bg-destructive text-destructive-foreground'
  };

  if (!barriers || barriers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center text-sm text-muted-foreground">
          No barriers identified yet. Complete intake to see AI suggestions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Generate Button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            AI Service Plan Assistant
          </CardTitle>
          <CardDescription>
            Analyze barriers and suggest actionable service tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerateSuggestions}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing barriers...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Suggestions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 flex gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Suggestions Display */}
      {suggestions && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {suggestions.summary}
            </CardContent>
          </Card>

          {/* Task Suggestions by Barrier */}
          {suggestions.suggestions?.map((barrierSuggestion, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">{barrierSuggestion.barrier_title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {barrierSuggestion.barrier_category}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {barrierSuggestion.tasks?.map((task, taskIdx) => (
                  <div key={taskIdx} className="border rounded-lg p-3 space-y-2">
                    {/* Task Title & Priority */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{task.title}</p>
                      <Badge className={`text-xs ${priorityColor[task.priority] || ''}`}>
                        {task.priority}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground">{task.description}</p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {task.estimated_days && (
                        <Badge variant="outline">~{task.estimated_days} days</Badge>
                      )}
                      {task.assigned_to && (
                        <Badge variant="outline">
                          {task.assigned_to.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>

                    {/* Success Metrics */}
                    {task.success_metrics && task.success_metrics.length > 0 && (
                      <div className="bg-muted/30 rounded p-2 mt-2">
                        <p className="text-xs font-medium mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Success Metrics:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {task.success_metrics.map((metric, m) => (
                            <li key={m} className="ml-4">• {metric}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Required Resources */}
                    {task.required_resources && task.required_resources.length > 0 && (
                      <div className="bg-muted/30 rounded p-2">
                        <p className="text-xs font-medium mb-1">Resources Needed:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {task.required_resources.map((resource, r) => (
                            <li key={r} className="ml-4">• {resource}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Regenerate Button */}
          <Button
            variant="outline"
            onClick={handleGenerateSuggestions}
            disabled={loading}
            className="w-full"
          >
            Regenerate Suggestions
          </Button>
        </div>
      )}
    </div>
  );
}
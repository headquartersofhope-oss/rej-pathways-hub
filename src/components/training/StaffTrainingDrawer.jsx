import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GraduationCap, X, CheckCircle2, Clock, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * StaffTrainingDrawer
 * Slides in from the right when the graduation cap icon is clicked in AppLayout.
 * Shows the list of LearningClass records where audience='staff' and category='staff_training'.
 * Each tutorial is collapsible. Open one to see content + quiz inline.
 * Completion is tracked in localStorage for v1 (no backend change required).
 */

const COMPLETION_KEY = 'pathways_staff_training_completed';

function getCompletedClasses() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(COMPLETION_KEY) || '[]');
  } catch {
    return [];
  }
}

function markComplete(classId) {
  if (typeof window === 'undefined') return;
  try {
    const completed = getCompletedClasses();
    if (!completed.includes(classId)) {
      completed.push(classId);
      localStorage.setItem(COMPLETION_KEY, JSON.stringify(completed));
    }
  } catch {}
}

export default function StaffTrainingDrawer({ open, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const [completed, setCompleted] = useState(getCompletedClasses());
  const [quizState, setQuizState] = useState({});
  const [quizResult, setQuizResult] = useState({});

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['staff-training-classes'],
    queryFn: async () => {
      const result = await base44.entities.LearningClass.filter({
        audience: 'staff',
        category: 'staff_training',
        is_active: true,
      });
      return (result || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: open,
    staleTime: 60_000,
  });

  if (!open) return null;

  const handleQuizAnswer = (classId, qIndex, answer) => {
    setQuizState(prev => ({
      ...prev,
      [classId]: { ...(prev[classId] || {}), [qIndex]: answer }
    }));
  };

  const handleSubmitQuiz = (cls) => {
    const answers = quizState[cls.id] || {};
    const total = cls.quiz_questions?.length || 0;
    const correct = (cls.quiz_questions || []).filter((q, i) => answers[i] === q.correct_answer).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passing = cls.passing_score || 70;
    const passed = score >= passing;

    if (passed) {
      markComplete(cls.id);
      setCompleted(getCompletedClasses());
    }

    setQuizResult(prev => ({ ...prev, [cls.id]: { score, passed, passing } }));
  };

  const completedCount = completed.filter(id => classes.some(c => c.id === id)).length;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className="fixed right-0 top-0 h-full w-full sm:w-[480px] lg:w-[560px] bg-background z-50 shadow-2xl flex flex-col border-l">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6" />
            <div>
              <h2 className="font-heading font-bold text-lg leading-tight">Staff Training Center</h2>
              <p className="text-xs opacity-80">In-app tutorials for the Pathways platform</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-900/10" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your progress</span>
            <span className="font-semibold">
              {completedCount} of {classes.length} complete
            </span>
          </div>
          {classes.length > 0 && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${(completedCount / classes.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading tutorials...
            </div>
          )}

          {!isLoading && classes.length === 0 && (
            <div className="p-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold mb-2">No staff tutorials yet</p>
              <p className="text-sm text-muted-foreground">
                An admin needs to run the <code className="text-xs bg-muted px-1 py-0.5 rounded">seedStaffTraining</code> function first.
              </p>
            </div>
          )}

          {classes.map(cls => {
            const isComplete = completed.includes(cls.id);
            const isExpanded = expanded === cls.id;
            const allAnswered = cls.quiz_questions?.every((_, i) => quizState[cls.id]?.[i]);

            return (
              <div key={cls.id} className="border-b">
                <button
                  onClick={() => setExpanded(isExpanded ? null : cls.id)}
                  className="w-full text-left p-4 hover:bg-muted/40 transition-colors flex items-start gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-green-100 dark:bg-green-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{cls.order}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{cls.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{cls.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                        <Clock className="w-3 h-3" />
                        {cls.estimated_minutes} min
                      </Badge>
                      {isComplete && (
                        <Badge className="text-[10px] bg-green-100 text-green-800 border-0">Complete</Badge>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-4 bg-muted/20">
                    {/* Content */}
                    <div
                      className="prose prose-sm max-w-none text-sm dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: cls.content_html || '' }}
                    />

                    {/* Learning objectives */}
                    {cls.learning_objectives && cls.learning_objectives.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">After this you will be able to:</p>
                        <ul className="text-xs space-y-1 text-amber-900 dark:text-amber-200">
                          {cls.learning_objectives.map((obj, i) => (
                            <li key={i}>• {obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Quiz */}
                    {cls.quiz_questions && cls.quiz_questions.length > 0 && (
                      <div className="border rounded-lg p-3 bg-background">
                        <p className="font-semibold text-sm mb-3">Knowledge Check</p>
                        <div className="space-y-3">
                          {cls.quiz_questions.map((q, i) => {
                            const selected = quizState[cls.id]?.[i];
                            return (
                              <div key={i}>
                                <p className="text-xs font-medium mb-1.5">{i + 1}. {q.question}</p>
                                <div className="space-y-1">
                                  {q.options.map((opt, j) => (
                                    <label
                                      key={j}
                                      className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${selected === opt ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-muted hover:bg-muted/40'}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`q-${cls.id}-${i}`}
                                        checked={selected === opt}
                                        onChange={() => handleQuizAnswer(cls.id, i, opt)}
                                        className="w-3 h-3"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          onClick={() => handleSubmitQuiz(cls)}
                          size="sm"
                          className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                          disabled={!allAnswered}
                        >
                          Submit Quiz
                        </Button>
                        {quizResult[cls.id] && (
                          <div className={`mt-2 p-2 rounded text-xs font-medium ${quizResult[cls.id].passed ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200'}`}>
                            {quizResult[cls.id].passed
                              ? `✓ Passed with ${quizResult[cls.id].score}%! Tutorial marked complete.`
                              : `Score: ${quizResult[cls.id].score}% — passing is ${quizResult[cls.id].passing}%. Review and try again.`}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reflection */}
                    {cls.reflection_prompt && (
                      <div className="bg-muted/40 rounded-lg p-3">
                        <p className="text-xs font-semibold mb-1.5">Reflection</p>
                        <p className="text-xs text-muted-foreground italic">{cls.reflection_prompt}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t text-[10px] text-muted-foreground text-center bg-muted/40">
          Pathway Forward™ · Staff Training Center
        </div>
      </aside>
    </>
  );
}

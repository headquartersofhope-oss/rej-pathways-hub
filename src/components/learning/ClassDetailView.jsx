import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Clock, ExternalLink, PlayCircle, BookOpen, GraduationCap, MessageSquare } from 'lucide-react';
import QuizComponent from './QuizComponent';
import { checkAndAutoIssueCertificate } from '@/lib/autoIssueCertificate';

const CATEGORY_LABELS = {
  orientation: 'Orientation',
  employment: 'Employment',
  housing: 'Housing',
  financial_literacy: 'Financial Literacy',
  digital_literacy: 'Digital Literacy',
  ai_literacy: 'AI Literacy',
  life_skills: 'Life Skills',
  wellness: 'Wellness',
  documentation: 'Documentation',
};

const categoryColors = {
  orientation: 'bg-blue-50 text-blue-700',
  employment: 'bg-emerald-50 text-emerald-700',
  housing: 'bg-purple-50 text-purple-700',
  financial_literacy: 'bg-green-50 text-green-700',
  digital_literacy: 'bg-cyan-50 text-cyan-700',
  ai_literacy: 'bg-indigo-50 text-indigo-700',
  life_skills: 'bg-amber-50 text-amber-700',
  wellness: 'bg-rose-50 text-rose-700',
  documentation: 'bg-orange-50 text-orange-700',
};

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export default function ClassDetailView({ open, onOpenChange, cls, enrollment, resident, allEnrollments, allClasses, isStaffPreview }) {
  const queryClient = useQueryClient();
  const [showQuiz, setShowQuiz] = useState(false);
  const [markingProgress, setMarkingProgress] = useState(false);
  const [reflectionText, setReflectionText] = useState(enrollment?.reflection_notes || '');
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Reset state when class changes
  React.useEffect(() => {
    setShowQuiz(false);
    setMarkingProgress(false);
    setReflectionText(enrollment?.reflection_notes || '');
    setReflectionSaved(false);
  }, [cls?.id, enrollment?.id]);

  if (!cls) return null;

  const isEnrolled = !!enrollment;
  const isCompleted = enrollment?.status === 'completed';
  const hasQuiz = cls.quiz_questions && cls.quiz_questions.length > 0;
  const embedUrl = getYouTubeEmbedUrl(cls.youtube_url);
  const catColor = categoryColors[cls.category] || 'bg-muted text-muted-foreground';
  const catLabel = CATEGORY_LABELS[cls.category] || cls.category;

  const handleQuizComplete = async (passed) => {
    // Always refresh enrollment data regardless of pass/fail
    queryClient.invalidateQueries({ queryKey: ['my-enrollments', resident?.id] });
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    // Auto-issue certificates if eligible and passed
    if (passed && resident && allEnrollments && allClasses) {
      await checkAndAutoIssueCertificate({
        residentId: resident.id,
        globalResidentId: resident.global_resident_id,
        organizationId: resident.organization_id,
        allEnrollments,
        allClasses,
      });
      queryClient.invalidateQueries({ queryKey: ['my-certificates', resident?.id] });
    }
    setShowQuiz(false);
  };

  const handleMarkInProgress = async () => {
    if (!enrollment) return;
    setMarkingProgress(true);
    await base44.entities.ClassEnrollment.update(enrollment.id, { status: 'in_progress' });
    queryClient.invalidateQueries({ queryKey: ['my-enrollments', resident?.id] });
    setMarkingProgress(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg leading-snug">{cls.title}</DialogTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge className={`text-[10px] border-0 ${catColor}`}>{catLabel}</Badge>
                {cls.difficulty_level && (
                  <Badge variant="outline" className="text-[10px]">{cls.difficulty_level}</Badge>
                )}
                {cls.is_required && (
                  <Badge className="text-[10px] bg-red-50 text-red-700 border-0">Required</Badge>
                )}
                {cls.literacy_level_support === 'low' && (
                  <Badge className="text-[10px] bg-purple-50 text-purple-700 border-0">Low Literacy</Badge>
                )}
                {isCompleted && (
                  <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-0 gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                  </Badge>
                )}
              </div>
            </div>
            {cls.estimated_minutes && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                {cls.estimated_minutes < 60 ? `${cls.estimated_minutes} min` : `${Math.round(cls.estimated_minutes / 60)} hr`}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-1">
          {/* Description */}
          {cls.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{cls.description}</p>
          )}

          {/* Learning Objectives */}
          {cls.learning_objectives?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary" /> What You'll Learn
              </h4>
              <ul className="space-y-1.5">
                {cls.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Video */}
          {embedUrl ? (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-primary" /> Video
              </h4>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={cls.title}
                />
              </div>
            </div>
          ) : cls.youtube_search_phrase ? (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-primary" /> Video Resource
              </h4>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(cls.youtube_search_phrase)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Search YouTube: "{cls.youtube_search_phrase}"
              </a>
            </div>
          ) : null}

          {/* Enrollment Status / Actions */}
          {isEnrolled && (
            <Card className={`p-4 ${isCompleted ? 'border-emerald-200 bg-emerald-50' : 'bg-muted/30'}`}>
              {isCompleted ? (
                <p className="text-sm text-emerald-700 font-medium flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed{enrollment.completion_date ? ` on ${enrollment.completion_date}` : ''}.
                  {enrollment.quiz_score != null && ` Score: ${enrollment.quiz_score}%`}
                </p>
              ) : enrollment.quiz_score != null ? (
                <p className="text-sm mb-2">
                  Last quiz score: <span className="font-bold">{enrollment.quiz_score}%</span>
                  {enrollment.quiz_passed ? (
                    <span className="ml-2 text-emerald-600">✓ Passed</span>
                  ) : (
                    <span className="ml-2 text-red-600">✗ Not passed yet — try again</span>
                  )}
                </p>
              ) : null}
              <div className="flex gap-2 flex-wrap">
                {!hasQuiz && !isCompleted && (
                  <Button size="sm" onClick={handleMarkInProgress} disabled={markingProgress}>
                    {markingProgress ? 'Saving...' : 'Mark as In Progress'}
                  </Button>
                )}
                {hasQuiz && !showQuiz && (
                  <Button size="sm" onClick={() => setShowQuiz(true)}>
                    <GraduationCap className="w-4 h-4 mr-1" />
                    {isCompleted ? 'Retake Quiz' : enrollment.quiz_score != null ? 'Retake Quiz' : 'Start Quiz'}
                  </Button>
                )}
                {showQuiz && (
                  <Button size="sm" variant="outline" onClick={() => setShowQuiz(false)}>
                    Hide Quiz
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Staff preview: show quiz entry even without enrollment */}
          {!isEnrolled && hasQuiz && isStaffPreview && (
            <Card className="p-4 bg-muted/30 border-dashed">
              <p className="text-xs text-muted-foreground mb-2">Staff preview — quiz not scored</p>
              <div className="flex gap-2">
                {!showQuiz ? (
                  <Button size="sm" variant="outline" onClick={() => setShowQuiz(true)}>
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Preview Quiz
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setShowQuiz(false)}>
                    Hide Quiz
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Quiz inline */}
          {showQuiz && hasQuiz && (isEnrolled || isStaffPreview) && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" /> Quiz
              </h4>
              <QuizComponent
                key={`${cls.id}-${enrollment?.id}`}
                classId={cls.id}
                enrollmentId={enrollment?.id}
                className={cls.title}
                passingScore={cls.passing_score ?? 70}
                readOnly={isStaffPreview && !isEnrolled}
                onComplete={handleQuizComplete}
              />
            </div>
          )}

          {/* Passing score info */}
          {hasQuiz && cls.passing_score != null && (
            <p className="text-xs text-muted-foreground">Passing score: {cls.passing_score}%</p>
          )}

          {/* Reflection Prompt */}
          {cls.reflection_prompt && enrollment && (isCompleted || !hasQuiz) && (
            <Card className="p-4 border-blue-200 bg-blue-50/40">
              <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-1.5 text-blue-800">
                <MessageSquare className="w-4 h-4" /> Reflection
              </h4>
              <p className="text-sm text-blue-900 mb-3">{cls.reflection_prompt}</p>
              <Textarea
                rows={3}
                placeholder="Write your reflection here..."
                value={reflectionText}
                onChange={e => { setReflectionText(e.target.value); setReflectionSaved(false); }}
                className="bg-white text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                {reflectionSaved && <span className="text-xs text-emerald-600">Saved ✓</span>}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto h-7 text-xs"
                  disabled={savingReflection || !reflectionText.trim()}
                  onClick={async () => {
                    setSavingReflection(true);
                    await base44.entities.ClassEnrollment.update(enrollment.id, { reflection_notes: reflectionText });
                    setSavingReflection(false);
                    setReflectionSaved(true);
                  }}
                >
                  {savingReflection ? 'Saving…' : 'Save Reflection'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
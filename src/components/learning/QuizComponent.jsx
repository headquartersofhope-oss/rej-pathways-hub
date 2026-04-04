import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

export default function QuizComponent({ classId, enrollmentId, assignmentId, className, passingScore = 70, readOnly = false, onComplete }) {
  // Support both prop names for backwards compatibility
  const effectiveEnrollmentId = enrollmentId || assignmentId;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizData, setQuizData] = useState(null);

  // Fetch class quiz data
  useEffect(() => {
    if (!classId) return;
    const fetchQuiz = async () => {
      try {
        const results = await base44.entities.LearningClass.filter({ id: classId });
        if (results[0]) setQuizData(results[0]);
      } catch (e) {
        setError('Could not load quiz');
      }
    };
    fetchQuiz();
  }, [classId]);

  if (!quizData || !quizData.quiz_questions || quizData.quiz_questions.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No quiz questions available for this class.</p>
      </Card>
    );
  }

  const questions = quizData.quiz_questions;
  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const passed = score !== null && score >= passingScore;

  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: answer,
    }));
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (answers[idx] === q.correct_answer) {
          correctCount++;
        }
      });
      const percentage = Math.round((correctCount / totalQuestions) * 100);
      setScore(percentage);
      setSubmitted(true);

      // Save to ClassEnrollment unless staff preview/readOnly
      if (effectiveEnrollmentId && !readOnly) {
        await base44.entities.ClassEnrollment.update(effectiveEnrollmentId, {
          quiz_score: percentage,
          quiz_passed: percentage >= passingScore,
          status: percentage >= passingScore ? 'completed' : 'in_progress',
          ...(percentage >= passingScore ? { completion_date: new Date().toISOString().split('T')[0] } : {}),
        });
      }

      // Always call onComplete so parent can refresh (pass 'passed' flag)
      if (onComplete) {
        onComplete(percentage >= passingScore);
      }
    } catch (e) {
      setError('Failed to submit quiz: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setCurrentQuestion(0);
  };

  // Show results
  if (submitted && score !== null) {
    const currentQ = questions[currentQuestion];
    const userAnswer = answers[currentQuestion];
    const isCorrect = userAnswer === currentQ.correct_answer;

    return (
      <div className="space-y-4">
        {/* Score Summary */}
        <Card className={`p-6 border-l-4 ${passed ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'}`}>
          <div className="flex items-center gap-3 mb-2">
            {passed ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-green-900">Congratulations! You Passed!</h3>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-bold text-red-900">Not Quite There Yet</h3>
              </>
            )}
          </div>
          <div className="text-center mt-4">
            <p className="text-3xl font-bold">{score}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              You got {Object.values(answers).filter((a, i) => a === questions[i].correct_answer).length} out of {totalQuestions} correct
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Passing score: {passingScore}%
            </p>
          </div>
        </Card>

        {/* Question Review */}
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Question {currentQuestion + 1} of {totalQuestions}</h4>
          <p className="text-sm font-medium mb-3">{currentQ.question}</p>

          <div className="space-y-2 mb-4">
            {currentQ.options.map((option, idx) => {
              const isUserAnswer = userAnswer === option;
              const isCorrectAnswer = option === currentQ.correct_answer;
              let bgColor = 'bg-muted';
              let textColor = 'text-muted-foreground';

              if (isCorrectAnswer) {
                bgColor = 'bg-green-100';
                textColor = 'text-green-900';
              } else if (isUserAnswer && !isCorrect) {
                bgColor = 'bg-red-100';
                textColor = 'text-red-900';
              }

              return (
                <div key={idx} className={`p-3 rounded-md ${bgColor} ${textColor} text-sm`}>
                  <div className="flex items-center gap-2">
                    {isCorrectAnswer && <CheckCircle2 className="w-4 h-4" />}
                    {isUserAnswer && !isCorrect && <XCircle className="w-4 h-4" />}
                    <span>{option}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {currentQ.explanation && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">Why:</p>
              <p className="text-sm text-blue-800">{currentQ.explanation}</p>
            </div>
          )}
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
            disabled={currentQuestion === totalQuestions - 1}
          >
            Next
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t pt-4">
          {!passed && (
            <Button onClick={handleRetake} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Quiz
            </Button>
          )}
          {passed && (
            <Button onClick={onComplete} className="flex-1">
              Continue to Next Class
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Quiz in progress
  if (!submitted) {
    const q = questions[currentQuestion];

    return (
      <div className="space-y-4">
        {/* Progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Question {currentQuestion + 1} of {totalQuestions}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Card>

        {/* Question */}
        <Card className="p-6">
          <h3 className="font-semibold text-base mb-4">{q.question}</h3>

          <RadioGroup value={answers[currentQuestion] || ''} onValueChange={handleAnswer}>
            <div className="space-y-3">
              {q.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg border border-input hover:bg-accent cursor-pointer">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>

          {currentQuestion < totalQuestions - 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
              disabled={!answers[currentQuestion]}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmitQuiz}
              disabled={!answers[currentQuestion] || loading}
              className="flex-1"
            >
              {loading ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          )}
        </div>

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 text-red-700 rounded-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    );
  }
}
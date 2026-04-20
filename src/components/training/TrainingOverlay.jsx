import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ChevronLeft, ChevronRight, CheckCircle2, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const getRoleColor = (role) => {
  const colors = {
    admin: '#F59E0B',
    super_admin: '#A78BFA',
    case_manager: '#60A5FA',
    housing_staff: '#34D399',
    employment_staff: '#FBBF24',
    probation_officer: '#F87171',
    employer: '#2DD4BF',
    resident: '#818CF8',
  };
  return colors[role] || '#F59E0B';
};

export default function TrainingOverlay({ training, onClose, userRole, onStepComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);

  if (!training || !training.steps || training.steps.length === 0) {
    return null;
  }

  const steps = training.steps.sort((a, b) => a.step_number - b.step_number);
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e) => {
    if (e.target.closest('[data-no-drag]')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleNext = () => {
    if (step.action_type === 'quiz' && selectedQuizAnswer === null) {
      return;
    }
    if (isLastStep) {
      onStepComplete?.();
      onClose();
    } else {
      setCurrentStep(currentStep + 1);
      setSelectedQuizAnswer(null);
      setQuizFeedback(null);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSelectedQuizAnswer(null);
      setQuizFeedback(null);
    }
  };

  const handleQuizAnswer = (answer) => {
    setSelectedQuizAnswer(answer);
    const isCorrect = answer === step.quiz_correct_answer;
    setQuizFeedback(isCorrect ? 'correct' : 'incorrect');
  };

  const roleColor = getRoleColor(userRole);

  const renderActionArea = () => {
    switch (step.action_type) {
      case 'read':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">{step.content}</p>
            <Button onClick={handleNext} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              Next
            </Button>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <p className="font-semibold text-foreground">{step.quiz_question}</p>
            <div className="space-y-2">
              {step.quiz_options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuizAnswer(option)}
                  className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                    selectedQuizAnswer === option
                      ? quizFeedback === 'correct'
                        ? 'border-green-500 bg-green-500/10 text-green-300'
                        : 'border-red-500 bg-red-500/10 text-red-300'
                      : 'border-border hover:border-amber-500 text-muted-foreground'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {quizFeedback && (
              <div className={`p-3 rounded-lg text-sm ${
                quizFeedback === 'correct'
                  ? 'bg-green-500/10 text-green-300'
                  : 'bg-red-500/10 text-red-300'
              }`}>
                {quizFeedback === 'correct' ? '✓ Correct!' : '✗ Incorrect. Try again or skip.'}
              </div>
            )}
            <Button
              onClick={handleNext}
              disabled={selectedQuizAnswer === null}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold disabled:opacity-50"
            >
              {quizFeedback === 'correct' ? 'Next' : 'Skip'}
            </Button>
          </div>
        );

      case 'click':
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
              🎯 Look for the pulsing amber highlight on the screen
            </div>
            <p className="text-muted-foreground text-sm">{step.description}</p>
            <Button onClick={handleNext} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              Got it, Next
            </Button>
          </div>
        );

      case 'fill':
      case 'watch':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            <Button onClick={handleNext} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
              Continue
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLastStep && currentStep > 0 && steps.length === currentStep) {
    return (
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{ position: 'fixed', left: `${position.x}px`, top: `${position.y}px` }}
        onMouseDown={handleMouseDown}
        className="w-96 rounded-2xl shadow-2xl overflow-hidden cursor-move z-50"
        style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}
      >
        <div className="p-8 text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
            <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: roleColor }} />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Congratulations!</h2>
            <p className="text-muted-foreground">You've completed {training.module_title}</p>
          </div>
          <Button
            onClick={onClose}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            Close
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      style={{ position: 'fixed', left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
      className="w-96 rounded-2xl shadow-2xl overflow-hidden cursor-move z-50"
      style={{ backgroundColor: '#1C2128', borderColor: '#30363D', border: `1px solid #30363D`, borderLeftColor: roleColor, borderLeftWidth: '4px' }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: '#30363D' }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-muted-foreground font-semibold">
            STEP {currentStep + 1} OF {steps.length}
          </span>
          <button
            data-no-drag
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>

        {/* Action Area */}
        <div>{renderActionArea()}</div>

        {/* Navigation */}
        <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#30363D' }}>
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            size="sm"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            {isLastStep ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            onClick={() => onClose()}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Skip
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
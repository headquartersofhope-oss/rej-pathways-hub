import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BookOpen, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

export default function TrainingButtonWidget({
  userRole = 'resident',
  userId = null,
  appColor = '#F59E0B',
  floatingButtonPosition = { bottom: '20px', right: '20px' },
  trainingRequired = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  const { data: trainings = [] } = useQuery({
    queryKey: ['trainings', userRole],
    queryFn: () => base44.entities.Training.filter({ role: userRole }),
  });

  const { data: progressRecords = [] } = useQuery({
    queryKey: ['training_progress', userId],
    queryFn: () => userId ? base44.entities.TrainingProgress.filter({ user_id: userId }) : Promise.resolve([]),
  });

  const getProgressForTraining = (trainingId) => {
    const progress = progressRecords.find(p => p.data?.training_id === trainingId);
    if (!progress) return { status: 'not_started', percentage: 0 };
    
    const totalSteps = trainings.find(t => t.data?.training_id === trainingId)?.data?.steps?.length || 1;
    const completedSteps = progress.data?.steps_completed?.length || 0;
    const percentage = (completedSteps / totalSteps) * 100;

    return {
      status: progress.data?.status,
      percentage,
      currentStep: progress.data?.current_step,
    };
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          ...floatingButtonPosition,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#161B22',
          border: `2px solid #30363D`,
          boxShadow: `0 8px 32px ${appColor}33`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 39,
        }}
        title="Training"
      >
        <BookOpen className="w-6 h-6" style={{ color: appColor }} />
      </motion.button>

      {/* Training Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '100px',
              right: '20px',
              width: '350px',
              maxHeight: '400px',
              backgroundColor: '#161B22',
              border: '1px solid #30363D',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #30363D',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '14px' }}>
                Training Modules
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6"
              >
                <X className="w-4 h-4" style={{ color: '#8B949E' }} />
              </Button>
            </div>

            {/* Trainings List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
              }}
            >
              {trainings.length === 0 ? (
                <div style={{ color: '#8B949E', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                  No training modules available
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {trainings.map(training => {
                    const trainingData = training.data || {};
                    const progress = getProgressForTraining(trainingData.training_id);

                    return (
                      <div
                        key={training.id}
                        onClick={() => {
                          setSelectedTraining(training);
                          setShowOverlay(true);
                        }}
                        style={{
                          padding: '10px',
                          backgroundColor: '#21262D',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: '1px solid #30363D',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = appColor}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#30363D'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ color: '#CDD9E5', fontSize: '13px', fontWeight: '500' }}>
                            {trainingData.module_title}
                          </span>
                          <ChevronRight className="w-4 h-4" style={{ color: '#8B949E' }} />
                        </div>
                        <Progress value={progress.percentage} className="h-1.5" />
                        <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '4px' }}>
                          {progress.status === 'completed' ? '✓ Completed' : `Step ${progress.currentStep} of ${trainingData.steps?.length || 0}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Training Overlay Placeholder */}
      {showOverlay && selectedTraining && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowOverlay(false)}
        >
          <div
            style={{
              backgroundColor: '#161B22',
              border: '1px solid #30363D',
              borderRadius: '1rem',
              padding: '24px',
              maxWidth: '500px',
              color: '#CDD9E5',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#FFFFFF', marginBottom: '12px' }}>
              {selectedTraining.data?.module_title}
            </h2>
            <p style={{ fontSize: '14px', marginBottom: '16px' }}>
              {selectedTraining.data?.module_description}
            </p>
            <Button
              onClick={() => setShowOverlay(false)}
              style={{ backgroundColor: appColor, color: '#0D1117' }}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
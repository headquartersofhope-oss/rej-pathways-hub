import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useTrainingMode: Manage training mode state and module progress
 */
export function useTrainingMode() {
  const [trainingMode, setTrainingMode] = useState(false);
  const [currentModule, setCurrentModule] = useState(null);
  const [completedModules, setCompletedModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Load training progress on mount
  useEffect(() => {
    loadTrainingProgress();
  }, []);

  const loadTrainingProgress = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setLoadingModules(false);
        return;
      }

      // Fetch user's training progress
      const trainings = await base44.entities.Training.list();
      const progressRecords = await base44.entities.TrainingProgress.filter({
        user_id: user.id,
      });

      // Map completed module IDs
      const completed = progressRecords
        .filter(p => p.status === 'completed')
        .map(p => p.training_id);

      setCompletedModules(completed);
      setLoadingModules(false);
    } catch (error) {
      console.error('Failed to load training progress:', error);
      setLoadingModules(false);
    }
  };

  const toggleTrainingMode = useCallback(async () => {
    if (!trainingMode) {
      // Turning ON training mode
      setTrainingMode(true);
      // Auto-open with welcome message (handled by TrainingCoach component)
    } else {
      // Turning OFF training mode
      setTrainingMode(false);
      setCurrentModule(null);
    }
  }, [trainingMode]);

  const startModule = useCallback((moduleId, moduleName) => {
    setCurrentModule(moduleName);
    
    // Initialize or fetch training progress for this module
    initializeModuleProgress(moduleId);
  }, []);

  const completeModule = useCallback(async (moduleName) => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      // Find the training record by name
      const trainings = await base44.entities.Training.list();
      const training = trainings.find(t => t.module_title === moduleName);

      if (training) {
        // Update or create progress record
        const existingProgress = await base44.entities.TrainingProgress.filter({
          user_id: user.id,
          training_id: training.training_id,
        });

        if (existingProgress.length > 0) {
          await base44.entities.TrainingProgress.update(existingProgress[0].id, {
            status: 'completed',
            completion_date: new Date().toISOString(),
          });
        } else {
          await base44.entities.TrainingProgress.create({
            user_id: user.id,
            training_id: training.training_id,
            role: user.role,
            module_title: moduleName,
            status: 'completed',
            completion_date: new Date().toISOString(),
          });
        }

        setCompletedModules(prev => [...prev, training.training_id]);
      }
    } catch (error) {
      console.error('Failed to complete module:', error);
    }
  }, []);

  const initializeModuleProgress = async (moduleId) => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const existing = await base44.entities.TrainingProgress.filter({
        user_id: user.id,
        training_id: moduleId,
      });

      if (existing.length === 0) {
        await base44.entities.TrainingProgress.create({
          user_id: user.id,
          training_id: moduleId,
          role: user.role,
          status: 'in_progress',
          current_step: 1,
          started_date: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to initialize module progress:', error);
    }
  };

  return {
    trainingMode,
    toggleTrainingMode,
    currentModule,
    setCurrentModule,
    startModule,
    completeModule,
    completedModules,
    loadingModules,
  };
}
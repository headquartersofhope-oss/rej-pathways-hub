import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useTrainingMode } from '@/lib/useTrainingMode';

/**
 * ModuleSelector: Modal dialog for selecting training module on first activation
 */
export default function ModuleSelector({ isOpen, onClose }) {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { startModule } = useTrainingMode();

  useEffect(() => {
    if (!isOpen) return;
    loadTrainings();
  }, [isOpen]);

  const loadTrainings = async () => {
    try {
      const user = await base44.auth.me();
      if (!user) return;

      const modules = await base44.entities.Training.filter({ role: user.role });
      setTrainings(modules);
    } catch (error) {
      console.error('Failed to load trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectModule = (module) => {
    startModule(module.training_id, module.module_title);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="rounded-2xl p-8 max-w-md w-full border"
        style={{ backgroundColor: '#161B22', borderColor: '#F59E0B' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#F59E0B14' }}>
            <GraduationCap className="w-6 h-6" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Welcome to Training</h2>
            <p className="text-sm text-slate-400">Select a module to get started</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : trainings.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No training modules available for your role.</p>
        ) : (
          <div className="space-y-2 mb-6">
            {trainings.map((training) => (
              <button
                key={training.id}
                onClick={() => handleSelectModule(training)}
                className="w-full text-left p-4 rounded-lg border border-slate-700 hover:border-amber-500 hover:bg-slate-900 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                      {training.module_title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {training.estimated_minutes || 30} min · {training.steps?.length || 0} steps
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-900 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
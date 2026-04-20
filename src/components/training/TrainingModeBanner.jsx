import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * TrainingModeBanner: Subtle amber banner shown at top when training mode is active
 */
export default function TrainingModeBanner({ trainingMode, currentModule }) {
  if (!trainingMode) return null;

  return (
    <div
      className="w-full py-2 px-4 flex items-center justify-center text-sm font-medium border-b"
      style={{
        backgroundColor: '#F59E0B14',
        borderColor: '#F59E0B',
        color: '#F59E0B',
      }}
    >
      <CheckCircle className="w-4 h-4 mr-2" />
      Training Mode Active — Your AI Coach is Ready
      {currentModule && <span className="ml-2 text-xs opacity-80">• {currentModule}</span>}
    </div>
  );
}
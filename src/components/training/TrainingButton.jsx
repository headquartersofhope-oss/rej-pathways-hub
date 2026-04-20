import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, CheckCircle2, Circle } from 'lucide-react';
import TrainingOverlay from './TrainingOverlay';

export default function TrainingButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: trainings = [] } = useQuery({
    queryKey: ['trainings', user?.role],
    queryFn: () => (user ? base44.entities.Training.filter({ role: user.role }) : []),
    enabled: !!user,
  });

  const { data: progressRecords = [] } = useQuery({
    queryKey: ['training_progress', user?.id],
    queryFn: () => (user ? base44.entities.TrainingProgress.filter({ user_id: user.id }) : []),
    enabled: !!user,
  });

  const completedCount = progressRecords.filter((p) => p.data?.status === 'completed').length;
  const totalTrainings = trainings.length;
  const isComplete = completedCount === totalTrainings && totalTrainings > 0;
  const hasIncomplete = completedCount < totalTrainings && totalTrainings > 0;

  if (!user || totalTrainings === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors shadow-lg flex items-center justify-center group"
          title="Open Training"
        >
          <GraduationCap className="w-6 h-6 text-slate-900" />
          {hasIncomplete && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></span>
          )}
          {isComplete && (
            <CheckCircle2 className="absolute -top-1 -right-1 w-5 h-5 text-green-500 bg-background rounded-full" />
          )}
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Open Training
          </div>
        </button>
      </div>

      {isOpen && totalTrainings > 0 && (
        <TrainingSelector
          trainings={trainings}
          progressRecords={progressRecords}
          onClose={() => setIsOpen(false)}
          userRole={user?.role}
        />
      )}
    </>
  );
}

function TrainingSelector({ trainings, progressRecords, onClose, userRole }) {
   const [selectedTraining, setSelectedTraining] = useState(null);
   const progressMap = {};
   progressRecords.forEach((p) => {
     progressMap[p.data?.training_id] = p.data;
   });

   if (selectedTraining) {
     return (
       <TrainingOverlay
         training={selectedTraining.data}
         userRole={userRole}
         onClose={() => {
           setSelectedTraining(null);
           onClose();
         }}
         onStepComplete={() => {}}
       />
     );
   }

   return (
     <div
       className="fixed bottom-24 right-6 w-80 rounded-2xl shadow-2xl overflow-hidden z-40"
       style={{ backgroundColor: '#1C2128', borderColor: '#30363D', border: '1px solid #30363D' }}
     >
       <div className="p-4 border-b" style={{ borderColor: '#30363D' }}>
         <h3 className="font-bold text-foreground">Your Training Modules</h3>
       </div>
       <div className="max-h-96 overflow-y-auto">
         {trainings.map((training) => {
           const trainingData = training.data;
           const progress = progressMap[trainingData?.training_id];
           const isCompleted = progress?.status === 'completed';

           // Get steps array with proper validation
           const stepsArray = Array.isArray(trainingData?.steps) ? trainingData.steps : [];
           const completedSteps = progress?.steps_completed && Array.isArray(progress.steps_completed) ? progress.steps_completed.length : 0;
           const totalSteps = stepsArray.length;

           return (
             <button
               key={training.id}
               onClick={() => setSelectedTraining(training)}
               className="w-full text-left p-3 border-b hover:bg-muted transition-colors"
               style={{ borderColor: '#30363D' }}
             >
               <div className="flex items-start gap-3">
                 <div className="mt-1">
                   {isCompleted ? (
                     <CheckCircle2 className="w-4 h-4 text-green-500" />
                   ) : (
                     <Circle className="w-4 h-4 text-muted-foreground" />
                   )}
                 </div>
                 <div className="flex-1">
                   <p className="font-semibold text-sm text-foreground">{trainingData?.module_title}</p>
                   <p className="text-xs text-muted-foreground mt-1">
                     {completedSteps} / {totalSteps} steps
                   </p>
                 </div>
               </div>
             </button>
           );
         })}
       </div>
     </div>
   );
}
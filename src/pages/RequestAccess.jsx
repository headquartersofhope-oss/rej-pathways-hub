import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import ResidentIntakeForm from '@/components/onboarding/ResidentIntakeForm';
import RoleRequestForm from '@/components/onboarding/RoleRequestForm';

export default function RequestAccess() {
  const navigate = useNavigate();
  const [step, setStep] = useState('role-select'); // role-select, resident, other, submitted
  const [selectedRole, setSelectedRole] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'resident') {
      setStep('resident');
    } else {
      setStep('other');
    }
  };

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const request = await base44.entities.OnboardingRequest.create({
        ...data,
        request_type: selectedRole === 'resident' ? 'resident_intake' : `${selectedRole}_request`,
        requested_role: selectedRole === 'resident' ? 'resident' : selectedRole,
        status: 'pending',
        submitted_date: new Date().toISOString(),
        ai_analysis_complete: false
      });

      // Trigger AI analysis
      await base44.functions.invoke('analyzeOnboardingRequest', {
        request_id: request.id
      });

      setStep('submitted');
      toast.success('Request submitted! You will hear back from admin soon.');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        {step !== 'submitted' && (
          <button
            onClick={() => step === 'role-select' ? navigate('/') : setStep('role-select')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* Step: Role Selection */}
        {step === 'role-select' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                Request Access
              </h1>
              <p className="text-muted-foreground">
                Tell us who you are so we can route your request to the right team
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card
                className="p-6 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => handleRoleSelect('resident')}
              >
                <h3 className="font-semibold text-foreground mb-2">Resident / Participant</h3>
                <p className="text-sm text-muted-foreground">
                  Complete intake assessment to start your program journey
                </p>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => handleRoleSelect('case_manager')}
              >
                <h3 className="font-semibold text-foreground mb-2">Case Manager / Staff</h3>
                <p className="text-sm text-muted-foreground">
                  Request access to manage residents and track progress
                </p>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => handleRoleSelect('employer')}
              >
                <h3 className="font-semibold text-foreground mb-2">Employer</h3>
                <p className="text-sm text-muted-foreground">
                  Post jobs and connect with qualified candidates
                </p>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => handleRoleSelect('probation_officer')}
              >
                <h3 className="font-semibold text-foreground mb-2">Probation / Parole Officer</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your clients' progress and engagement
                </p>
              </Card>

              <Card
                className="p-6 cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                onClick={() => handleRoleSelect('partner')}
              >
                <h3 className="font-semibold text-foreground mb-2">Partner / Resource Agency</h3>
                <p className="text-sm text-muted-foreground">
                  Collaborate and share resources with the program
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* Step: Resident Intake */}
        {step === 'resident' && (
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-6">
              Resident Intake Form
            </h1>
            <ResidentIntakeForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {/* Step: Other Role Request */}
        {step === 'other' && (
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-6">
              Request Access
            </h1>
            <RoleRequestForm
              role={selectedRole}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {/* Step: Submitted */}
        {step === 'submitted' && (
          <Card className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
              Request Submitted
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Thank you for your request. An administrator will review your application and contact you within 1-2 business days.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return to Home
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
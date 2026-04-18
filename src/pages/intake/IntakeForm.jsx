import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save } from 'lucide-react';
import IntakeStepNav from '@/components/intake/IntakeStepNav';
import { INTAKE_STEPS, detectBarriers, generateTasksForBarrier, calculateScores } from '@/lib/intakeBarriers';
import SmartTriggerPanel from '@/components/intake/SmartTriggerPanel';

import PersonalStep from '@/components/intake/steps/PersonalStep';
import HousingStep from '@/components/intake/steps/HousingStep';
import JusticeStep from '@/components/intake/steps/JusticeStep';
import TreatmentStep from '@/components/intake/steps/TreatmentStep';
import VeteranStep from '@/components/intake/steps/VeteranStep';
import FosterCareStep from '@/components/intake/steps/FosterCareStep';
import EducationStep from '@/components/intake/steps/EducationStep';
import WorkHistoryStep from '@/components/intake/steps/WorkHistoryStep';
import TransportationStep from '@/components/intake/steps/TransportationStep';
import CommunicationStep from '@/components/intake/steps/CommunicationStep';
import DigitalLiteracyStep from '@/components/intake/steps/DigitalLiteracyStep';
import DependentCareStep from '@/components/intake/steps/DependentCareStep';
import LegalFinancialStep from '@/components/intake/steps/LegalFinancialStep';
import DocumentsStep from '@/components/intake/steps/DocumentsStep';
import MentalHealthStep from '@/components/intake/steps/MentalHealthStep';
import DisabilityStep from '@/components/intake/steps/DisabilityStep';
import ClothingToolsStep from '@/components/intake/steps/ClothingToolsStep';
import BenefitsStep from '@/components/intake/steps/BenefitsStep';
import EmergencyContactStep from '@/components/intake/steps/EmergencyContactStep';

const STEP_COMPONENTS = {
  personal: PersonalStep,
  housing: HousingStep,
  justice: JusticeStep,
  treatment: TreatmentStep,
  veteran: VeteranStep,
  foster_care: FosterCareStep,
  education: EducationStep,
  work_history: WorkHistoryStep,
  transportation: TransportationStep,
  communication: CommunicationStep,
  digital_literacy: DigitalLiteracyStep,
  dependent_care: DependentCareStep,
  legal_financial: LegalFinancialStep,
  documents: DocumentsStep,
  mental_health: MentalHealthStep,
  disability: DisabilityStep,
  clothing_tools: ClothingToolsStep,
  benefits: BenefitsStep,
  emergency_contact: EmergencyContactStep,
};

export default function IntakeForm() {
  const { residentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [formData, setFormData] = useState({});
  const [completedSteps, setCompletedSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const saveLockRef = React.useRef(false); // prevents duplicate assessment creation on rapid clicks

  const { data: resident } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => base44.entities.Resident.get(residentId),
    enabled: !!residentId && residentId !== ':residentId',
  });

  const { data: existingAssessment } = useQuery({
    queryKey: ['assessment', residentId],
    queryFn: () => base44.entities.IntakeAssessment.filter({ resident_id: residentId }).then(r => r[0] || null),
    enabled: !!residentId,
  });

  // Reset form state when residentId changes (prevents bleeding between residents)
  React.useEffect(() => {
    setFormData({});
    setCompletedSteps([]);
    setCurrentStepIdx(0);
  }, [residentId]);

  // Populate form when existing assessment loads — only after reset
  React.useEffect(() => {
    if (existingAssessment) {
      const { id, resident_id, organization_id, status, completed_at, completed_by, scores, global_resident_id, ...sections } = existingAssessment;
      setFormData(sections);
      setCompletedSteps(INTAKE_STEPS.map(s => s.id).filter(sid => sections[sid] && Object.keys(sections[sid]).length > 0));
    }
  }, [existingAssessment?.id]);

  const currentStep = INTAKE_STEPS[currentStepIdx];
  const StepComponent = STEP_COMPONENTS[currentStep.id];
  const progress = Math.round(((currentStepIdx + 1) / INTAKE_STEPS.length) * 100);

  const handleStepChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    // Mark step complete
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps(prev => [...prev, currentStep.id]);
    }
    // Auto-save
    await handleSave(false);
    if (currentStepIdx < INTAKE_STEPS.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handleSave = async (showFeedback = true) => {
    if (saveLockRef.current) return; // prevent concurrent saves
    saveLockRef.current = true;
    setSaving(true);
    const payload = {
      ...formData,
      resident_id: residentId,
      global_resident_id: resident?.global_resident_id || '',
      status: 'in_progress',
    };
    if (existingAssessment?.id) {
      await base44.entities.IntakeAssessment.update(existingAssessment.id, payload);
    } else {
      await base44.entities.IntakeAssessment.create(payload);
    }

    // Also sync identity/contact fields during partial saves
    const residentUpdates = {};
    if (formData.personal) {
      if (formData.personal.first_name) residentUpdates.first_name = formData.personal.first_name;
      if (formData.personal.last_name) residentUpdates.last_name = formData.personal.last_name;
      if (formData.personal.preferred_name) residentUpdates.preferred_name = formData.personal.preferred_name;
      if (formData.personal.pronouns) residentUpdates.pronouns = formData.personal.pronouns;
      if (formData.personal.pronouns_other) residentUpdates.pronouns = formData.personal.pronouns_other;
      if (formData.personal.gender_identity) residentUpdates.gender = formData.personal.gender_identity;
      if (formData.personal.primary_language) residentUpdates.primary_language = formData.personal.primary_language;
      if (formData.personal.primary_language_other) residentUpdates.primary_language = formData.personal.primary_language_other;
      if (formData.personal.email) residentUpdates.email = formData.personal.email;
      if (formData.personal.phone) residentUpdates.phone = formData.personal.phone;
      if (formData.personal.date_of_birth) residentUpdates.date_of_birth = formData.personal.date_of_birth;
    }
    if (formData.emergency_contact?.name) {
      residentUpdates.emergency_contact_name = formData.emergency_contact.name;
    }
    if (formData.emergency_contact?.phone) {
      residentUpdates.emergency_contact_phone = formData.emergency_contact.phone;
    }

    if (Object.keys(residentUpdates).length > 0) {
      await base44.entities.Resident.update(resident.id, residentUpdates);
      queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    }

    setSaving(false);
    saveLockRef.current = false;
  };

  const handleComplete = async () => {
    if (!residentId || residentId === ':residentId' || !resident?.id) return;
    if (saveLockRef.current) return; // prevent double-submit on complete
    saveLockRef.current = true;
    setCompleting(true);
    try {
      const globalResidentId = resident.global_resident_id || '';

      // Detect barriers and scores before saving
      const rawData = {
        ...formData,
        resident_id: residentId,
        global_resident_id: globalResidentId,
      };
      const detectedBarriers = detectBarriers(rawData);
      const scores = calculateScores(rawData, detectedBarriers);

      const assessmentData = {
        ...rawData,
        status: 'completed',
        completed_at: new Date().toISOString(),
        scores,
      };

      // Save assessment and get back the confirmed ID
      let assessmentId;
      if (existingAssessment?.id) {
        await base44.entities.IntakeAssessment.update(existingAssessment.id, assessmentData);
        assessmentId = existingAssessment.id;
      } else {
        const created = await base44.entities.IntakeAssessment.create(assessmentData);
        assessmentId = created.id;
      }

      // Create barrier items
      const createdBarriers = await Promise.all(
        detectedBarriers.map(b => base44.entities.BarrierItem.create({
          ...b,
          resident_id: residentId,
          global_resident_id: globalResidentId,
          assessment_id: assessmentId,
        }))
      );

      // Create service plan
      const plan = await base44.entities.ServicePlan.create({
        resident_id: residentId,
        global_resident_id: globalResidentId,
        assessment_id: assessmentId,
        organization_id: '',
        title: `Service Plan — ${resident.first_name} ${resident.last_name}`,
        status: 'active',
      });

      // Generate tasks for all barriers
      await Promise.all(
        createdBarriers.flatMap(barrier =>
          generateTasksForBarrier(barrier, plan.id, residentId, globalResidentId, '').map(task =>
            base44.entities.ServiceTask.create(task)
          )
        )
      );

      // Sync profile fields from intake back to Resident record
      const intakeDateStr = new Date().toISOString().split('T')[0];
      const intakeDate = new Date(intakeDateStr);
      const expectedExitDate = new Date(intakeDate.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const residentUpdates = {
        job_readiness_score: scores.work_readiness_score,
        intake_date: intakeDateStr,
        expected_exit_date: expectedExitDate,
        status: resident.status === 'pre_intake' ? 'active' : resident.status,
      };

      // Backfill ALL contact/profile fields to Resident record
      // These are the source-of-truth fields that must sync from intake
      if (formData.personal) {
        if (formData.personal.first_name) residentUpdates.first_name = formData.personal.first_name;
        if (formData.personal.last_name) residentUpdates.last_name = formData.personal.last_name;
        if (formData.personal.preferred_name) residentUpdates.preferred_name = formData.personal.preferred_name;
        if (formData.personal.pronouns) residentUpdates.pronouns = formData.personal.pronouns;
        if (formData.personal.pronouns_other) residentUpdates.pronouns = formData.personal.pronouns_other;
        if (formData.personal.gender_identity) residentUpdates.gender = formData.personal.gender_identity;
        if (formData.personal.primary_language) residentUpdates.primary_language = formData.personal.primary_language;
        if (formData.personal.primary_language_other) residentUpdates.primary_language = formData.personal.primary_language_other;
      }

      // Backfill contact info from personal section (if captured there)
      if (formData.personal?.email) residentUpdates.email = formData.personal.email;
      if (formData.personal?.phone) residentUpdates.phone = formData.personal.phone;
      if (formData.personal?.date_of_birth) residentUpdates.date_of_birth = formData.personal.date_of_birth;
      if (formData.personal?.ssn_last4) residentUpdates.ssn_last4 = formData.personal.ssn_last4;

      // Backfill emergency contact if captured
      if (formData.emergency_contact?.name) {
        residentUpdates.emergency_contact_name = formData.emergency_contact.name;
      }
      if (formData.emergency_contact?.phone) {
        residentUpdates.emergency_contact_phone = formData.emergency_contact.phone;
      }

      await base44.entities.Resident.update(resident.id, residentUpdates);

      // Re-fetch to verify write succeeded
      const updated = await base44.entities.Resident.get(resident.id);
      if (!updated.intake_date) {
        console.warn(`[IntakeForm] intake_date still blank after write for resident ${resident.id}`);
      }

      // Invalidate all related caches so every screen shows fresh data
      queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['assessment', residentId] });
      queryClient.invalidateQueries({ queryKey: ['barriers', residentId] });
      queryClient.invalidateQueries({ queryKey: ['service-tasks', residentId] });
      queryClient.invalidateQueries({ queryKey: ['all-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['all-barriers'] });
      queryClient.invalidateQueries({ queryKey: ['all-service-tasks'] });

      navigate(`/intake/${residentId}`);
    } finally {
      setCompleting(false);
      saveLockRef.current = false;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/intake/${residentId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-lg">Intake Assessment</h1>
          {resident && <p className="text-sm text-muted-foreground">{resident.first_name} {resident.last_name}</p>}
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSave(true)} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Step {currentStepIdx + 1} of {INTAKE_STEPS.length}</span>
          <span>{progress}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Nav */}
      <div className="mb-5">
        <IntakeStepNav
          currentStep={currentStep.id}
          completedSteps={completedSteps}
          onStepClick={(id) => setCurrentStepIdx(INTAKE_STEPS.findIndex(s => s.id === id))}
        />
      </div>

      {/* Two-column layout: form + smart panel */}
      <div className="flex gap-6 items-start">
        {/* Left: step form + nav */}
        <div className="flex-1 min-w-0">
          <Card className="p-5 mb-5">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{currentStep.icon}</span>
              <div>
                <h2 className="font-heading font-bold text-base">{currentStep.label}</h2>
                <p className="text-xs text-muted-foreground">Step {currentStepIdx + 1} of {INTAKE_STEPS.length}</p>
              </div>
            </div>
            <StepComponent
              data={formData[currentStep.id] || {}}
              onChange={(val) => handleStepChange(currentStep.id, val)}
            />
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))} disabled={currentStepIdx === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Previous
            </Button>

            {currentStepIdx < INTAKE_STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={completing} className="gap-2 bg-accent hover:bg-accent/90">
                {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Complete & Generate Plan
              </Button>
            )}
          </div>
        </div>

        {/* Right: live smart trigger panel */}
        <div className="w-80 shrink-0 sticky top-6 hidden lg:block">
          <SmartTriggerPanel formData={formData} />
        </div>
      </div>
    </div>
  );
}
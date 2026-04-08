import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ChevronRight, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Link } from 'react-router-dom';

// Map barrier categories to resident-friendly labels and descriptions
const BARRIER_LABELS = {
  legal: { label: 'Legal Support', description: 'Help with legal documents and requirements', icon: '⚖️' },
  identification_documents: { label: 'ID & Documents', description: 'Getting the documents you need', icon: '📄' },
  housing_stability: { label: 'Housing', description: 'Support for stable housing', icon: '🏠' },
  transportation: { label: 'Transportation', description: 'Getting to work and appointments', icon: '🚌' },
  education: { label: 'Education', description: 'Learning and skill-building support', icon: '📚' },
  digital_literacy: { label: 'Digital Skills', description: 'Using computers and technology', icon: '💻' },
  work_history: { label: 'Work History', description: 'Building your work experience', icon: '💼' },
  interview_readiness: { label: 'Interview Prep', description: 'Getting ready for job interviews', icon: '🎤' },
  mental_health_support: { label: 'Mental Health', description: 'Counseling and wellness support', icon: '💙' },
  substance_recovery: { label: 'Recovery Support', description: 'Treatment and recovery services', icon: '🌱' },
  childcare_dependent_care: { label: 'Childcare', description: 'Support for childcare needs', icon: '👶' },
  benefits: { label: 'Benefits', description: 'Enrolling in eligible benefits', icon: '📋' },
  financial_readiness: { label: 'Financial Skills', description: 'Budgeting and financial planning', icon: '💰' },
  disability_accommodations: { label: 'Disability Support', description: 'Accommodations and assistance', icon: '♿' },
  clothing_tools_gear: { label: 'Work Clothing & Gear', description: 'Interview and work attire', icon: '👔' },
  communication_access: { label: 'Communication', description: 'Phone, email, and internet access', icon: '📱' },
};

const SEVERITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

const STATUS_DISPLAY = {
  new: { color: 'bg-blue-50 text-blue-700', label: 'New', icon: AlertCircle },
  active: { color: 'bg-amber-50 text-amber-700', label: 'In Progress', icon: Clock },
  in_progress: { color: 'bg-amber-50 text-amber-700', label: 'In Progress', icon: Clock },
  resolved: { color: 'bg-emerald-50 text-emerald-700', label: 'Resolved ✓', icon: CheckCircle2 },
  blocked: { color: 'bg-red-50 text-red-700', label: 'Needs Action', icon: AlertCircle },
};

export default function MySupports() {
  const { user } = useOutletContext();

  const { data: myResident } = useQuery({
    queryKey: ['my-resident', user?.id],
    queryFn: async () => {
      const list = await base44.entities.Resident.filter({ user_id: user?.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: barriers = [], isLoading } = useQuery({
    queryKey: ['my-barriers', myResident?.id],
    queryFn: () => base44.entities.BarrierItem.filter({ resident_id: myResident.id }),
    enabled: !!myResident?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', myResident?.id],
    queryFn: async () => {
      const list = await base44.entities.ServiceTask.filter({ resident_id: myResident.id });
      return list.filter(t => t.is_resident_visible !== false);
    },
    enabled: !!myResident?.id,
  });

  // Only show active/relevant barriers (not resolved ones unless there are none active)
  const activeBarriers = barriers.filter(b => b.status !== 'resolved');
  const resolvedBarriers = barriers.filter(b => b.status === 'resolved');
  const displayBarriers = activeBarriers.length > 0 ? activeBarriers : barriers;

  // Build next steps per barrier
  const getBarrierTasks = (barrierId) =>
    tasks.filter(t => t.barrier_item_id === barrierId && t.status !== 'completed');

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="My Supports" subtitle="Services and support active for you" icon={Shield} />

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <Card key={i} className="p-5 h-20 animate-pulse bg-muted/30" />)}
        </div>
      )}

      {!isLoading && barriers.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No support services set up yet.</p>
          <p className="text-xs mt-1">Your case manager will set up your support plan after your intake assessment.</p>
        </Card>
      )}

      {/* Summary */}
      {barriers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{activeBarriers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{resolvedBarriers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Resolved</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{barriers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
          </Card>
        </div>
      )}

      {/* Active supports */}
      {activeBarriers.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-secondary" /> Active Supports
          </h3>
          <div className="space-y-3">
            {activeBarriers.map(barrier => {
              const meta = BARRIER_LABELS[barrier.category] || { label: barrier.category, description: '', icon: '•' };
              const statusInfo = STATUS_DISPLAY[barrier.status] || STATUS_DISPLAY.active;
              const StatusIcon = statusInfo.icon;
              const linkedTasks = getBarrierTasks(barrier.id);

              return (
                <Card key={barrier.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center">
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{meta.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                        </div>
                        <Badge className={`text-[10px] border-0 flex-shrink-0 ${statusInfo.color}`}>
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Resident-friendly description if exists (no internal notes) */}
                      {barrier.description && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{barrier.description}</p>
                      )}

                      {/* Linked tasks (next steps) */}
                      {linkedTasks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Your next steps:</p>
                          <div className="space-y-1">
                            {linkedTasks.slice(0, 2).map(t => (
                              <div key={t.id} className="flex items-center gap-2 text-xs">
                                <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                                <span>{t.title}</span>
                                {t.due_date && <span className="text-muted-foreground ml-auto">Due {t.due_date}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Required documents (if any) */}
                      {barrier.required_documents?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Documents needed:</p>
                          <div className="flex flex-wrap gap-1">
                            {barrier.required_documents.map((doc, i) => (
                              <span key={i} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{doc}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved supports */}
      {resolvedBarriers.length > 0 && (
        <details>
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground py-2">
            Resolved supports ({resolvedBarriers.length})
          </summary>
          <div className="space-y-2 mt-2">
            {resolvedBarriers.map(barrier => {
              const meta = BARRIER_LABELS[barrier.category] || { label: barrier.category, icon: '•' };
              return (
                <Card key={barrier.id} className="p-3 opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{meta.icon}</span>
                    <p className="text-sm flex-1">{meta.label}</p>
                    <Badge className="text-[10px] border-0 bg-emerald-50 text-emerald-700">Resolved ✓</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </details>
      )}

      {/* Link to tasks */}
      {tasks.filter(t => t.status !== 'completed').length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">You have open tasks</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tasks.filter(t => t.status !== 'completed').length} tasks need your attention
              </p>
            </div>
            <Link to="/my-tasks" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View Tasks <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
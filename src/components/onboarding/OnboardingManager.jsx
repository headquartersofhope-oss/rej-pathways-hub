import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Search, UserPlus, CheckCircle2, RotateCcw } from 'lucide-react';
import { buildChecklist, computeProgress } from '@/lib/onboarding';

export default function OnboardingManager({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.filter(
      user?.organization_id ? { organization_id: user.organization_id } : {}
    ),
  });

  const { data: onboardings = [] } = useQuery({
    queryKey: ['all-onboardings'],
    queryFn: () => base44.entities.Onboarding.list('-created_date', 200),
  });

  // Map resident_id → onboarding record
  const onboardingMap = Object.fromEntries(
    onboardings.map(o => [o.resident_id, o])
  );

  const handleToggle = async (resident, enabled) => {
    setToggling(resident.id);
    const existing = onboardingMap[resident.id];
    if (existing) {
      await base44.entities.Onboarding.update(existing.id, { is_active: enabled, dismissed: false });
    } else {
      await base44.entities.Onboarding.create({
        user_id: resident.user_id || '',
        resident_id: resident.id,
        organization_id: resident.organization_id || user?.organization_id || '',
        assigned_by: user?.id || '',
        is_active: true,
        dismissed: false,
        completed_steps: [],
      });
    }
    queryClient.invalidateQueries({ queryKey: ['all-onboardings'] });
    setToggling(null);
  };

  const handleReset = async (resident) => {
    const existing = onboardingMap[resident.id];
    if (!existing) return;
    await base44.entities.Onboarding.update(existing.id, {
      completed_steps: [],
      dismissed: false,
      completed_at: null,
    });
    queryClient.invalidateQueries({ queryKey: ['all-onboardings'] });
  };

  const filtered = residents.filter(r =>
    !search || `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const assignedCount = onboardings.filter(o => o.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="font-heading font-semibold text-sm">Onboarding Assignments</p>
          <p className="text-xs text-muted-foreground">{assignedCount} residents currently in onboarding</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map(r => {
          const ob = onboardingMap[r.id];
          const isActive = ob?.is_active || false;
          const progress = ob ? computeProgress(buildChecklist(r, [], [], null, ob.completed_steps || [])) : 0;
          const isDismissed = ob?.dismissed;
          const isCompleted = !!ob?.completed_at;

          return (
            <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                {r.first_name?.[0]}{r.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{r.first_name} {r.last_name}</p>
                {isActive && !isCompleted && (
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={progress} className="h-1.5 w-24" />
                    <span className="text-[10px] text-muted-foreground">{progress}%</span>
                    {isDismissed && <Badge variant="outline" className="text-[10px]">Dismissed</Badge>}
                  </div>
                )}
                {isCompleted && (
                  <div className="flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-medium">Completed</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {ob && (
                  <button
                    onClick={() => handleReset(r)}
                    title="Reset onboarding progress"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <Switch
                  checked={isActive}
                  disabled={toggling === r.id}
                  onCheckedChange={(v) => handleToggle(r, v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
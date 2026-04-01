import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings } from 'lucide-react';
import { MODULES } from '@/lib/modules';

export default function ModuleSettings() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const { data: flags = [] } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => base44.entities.FeatureFlag.list(),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ flag, enabled }) => {
      if (flag) {
        return base44.entities.FeatureFlag.update(flag.id, { enabled });
      } else {
        return base44.entities.FeatureFlag.create({
          module_slug: enabled.slug,
          module_name: enabled.name,
          enabled: true,
          organization_id: user?.organization_id || '',
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feature-flags'] }),
  });

  const isModuleEnabled = (slug) => {
    const flag = flags.find(f => f.module_slug === slug);
    return flag?.enabled || false;
  };

  const getFlag = (slug) => flags.find(f => f.module_slug === slug);

  const handleToggle = (mod, newVal) => {
    const flag = getFlag(mod.slug);
    if (flag) {
      toggleMutation.mutate({ flag, enabled: newVal });
    } else {
      toggleMutation.mutate({ flag: null, enabled: mod });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Module Settings"
        subtitle="Enable or disable modules for your organization"
        icon={Settings}
      />

      <div className="space-y-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const enabled = isModuleEnabled(mod.slug);

          return (
            <Card key={mod.slug} className="p-5">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold text-sm">{mod.name}</p>
                    {enabled && <Badge className="text-[10px] bg-accent text-accent-foreground">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(val) => handleToggle(mod, val)}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
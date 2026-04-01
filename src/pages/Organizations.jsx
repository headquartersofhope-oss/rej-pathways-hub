import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Plus, MapPin } from 'lucide-react';

export default function Organizations() {
  const { data: orgs = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Organizations"
        subtitle="Manage platform organizations"
        icon={Building2}
        actions={
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Organization</Button>
        }
      />

      {orgs.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No organizations yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first organization to get started</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <Card key={org.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                {org.logo_url ? (
                  <img src={org.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {org.name?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{org.name}</p>
                  <Badge variant={org.status === 'active' ? 'default' : 'outline'} className="text-[10px] mt-0.5">
                    {org.status || 'active'}
                  </Badge>
                </div>
              </div>
              {org.city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {org.city}, {org.state}
                </div>
              )}
              {org.type && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">{org.type.replace(/_/g, ' ')}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
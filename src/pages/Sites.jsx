import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, Users } from 'lucide-react';

export default function Sites() {
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: () => base44.entities.Site.list(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sites"
        subtitle="Manage locations and facilities"
        icon={MapPin}
        actions={
          <Button className="gap-2"><Plus className="w-4 h-4" /> Add Site</Button>
        }
      />

      {sites.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No sites yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first site or facility</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <Card key={site.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="font-heading font-semibold text-sm">{site.name}</p>
                <Badge variant={site.status === 'active' ? 'default' : 'outline'} className="text-[10px]">
                  {site.status || 'active'}
                </Badge>
              </div>
              {site.city && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {site.city}, {site.state}
                </p>
              )}
              {site.capacity && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3" /> {site.current_occupancy || 0} / {site.capacity} capacity
                </p>
              )}
              {site.site_type && (
                <Badge variant="outline" className="text-[10px] mt-2 capitalize">
                  {site.site_type.replace(/_/g, ' ')}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
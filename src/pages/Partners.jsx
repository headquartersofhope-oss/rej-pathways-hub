import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Handshake, Plus } from 'lucide-react';

export default function Partners() {
  const { user } = useOutletContext();

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.PartnerAgency.list(),
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Partner Agencies"
        subtitle={`${partners.length} partners`}
        icon={Handshake}
        actions={
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Partner
          </Button>
        }
      />

      {partners.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Handshake className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No partner agencies yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add referral partners, probation offices, and service agencies</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p) => (
            <Card key={p.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                  {p.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{p.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {p.type?.replace(/_/g, ' ') || 'other'}
                  </Badge>
                </div>
              </div>
              {p.contact_name && <p className="text-xs text-muted-foreground">Contact: {p.contact_name}</p>}
              {p.referral_count > 0 && <p className="text-xs text-muted-foreground">{p.referral_count} referrals</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Handshake, Plus, Edit2 } from 'lucide-react';
import PartnerFormDialog from '@/components/partners/PartnerFormDialog';

export default function Partners() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => base44.entities.PartnerAgency.list(),
  });

  const handleAddPartner = () => {
    setSelectedPartner(null);
    setFormOpen(true);
  };

  const handleEditPartner = (partner) => {
    setSelectedPartner(partner);
    setFormOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['partners'] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PartnerFormDialog open={formOpen} onOpenChange={setFormOpen} partner={selectedPartner} onSaved={handleSaved} />

      <PageHeader
        title="Partner Agencies"
        subtitle={`${partners.length} partners`}
        icon={Handshake}
        actions={
          <Button className="gap-2" onClick={handleAddPartner}>
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
            <Card key={p.id} className="p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">
                  {p.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{p.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {p.type?.replace(/_/g, ' ') || 'other'}
                  </Badge>
                </div>
                <button
                  onClick={() => handleEditPartner(p)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Edit partner"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                {p.contact_name && <p className="text-muted-foreground">Contact: <span className="text-foreground font-medium">{p.contact_name}</span></p>}
                {p.contact_email && <p className="text-muted-foreground">Email: <span className="text-foreground">{p.contact_email}</span></p>}
                {p.contact_phone && <p className="text-muted-foreground">Phone: <span className="text-foreground">{p.contact_phone}</span></p>}
                {p.status && <p className="text-muted-foreground">Status: <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="ml-1">{p.status}</Badge></p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
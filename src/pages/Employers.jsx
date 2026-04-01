import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Search, Plus, Building2, Globe, Phone } from 'lucide-react';

export default function Employers() {
  const { user } = useOutletContext();
  const [search, setSearch] = useState('');

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ['employers'],
    queryFn: () => base44.entities.Employer.list(),
  });

  const filtered = employers.filter(e =>
    !search || e.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Employers"
        subtitle={`${employers.length} employer partners`}
        icon={Briefcase}
        actions={
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Employer
          </Button>
        }
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search employers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 && !isLoading ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">No employers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first employer partner to get started</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <Card key={emp.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-sm font-bold text-secondary-foreground">
                  {emp.company_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm truncate">{emp.company_name}</p>
                  {emp.industry && <p className="text-xs text-muted-foreground">{emp.industry}</p>}
                </div>
                <Badge variant={emp.status === 'active' ? 'default' : 'outline'} className="text-xs">
                  {emp.status || 'pending'}
                </Badge>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {emp.contact_name && <p>Contact: {emp.contact_name}</p>}
                {emp.open_positions > 0 && (
                  <p className="font-medium text-primary">{emp.open_positions} open positions</p>
                )}
                {emp.total_placements > 0 && <p>{emp.total_placements} total placements</p>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
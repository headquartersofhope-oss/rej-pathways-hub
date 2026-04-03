import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Search, Plus, Building2, Phone, Mail, MapPin, Pencil } from 'lucide-react';
import EmployerFormDialog from '@/components/employers/EmployerFormDialog';

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-50 text-amber-700',
};

export default function Employers() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState(null);

  const { data: employers = [], isLoading } = useQuery({
    queryKey: ['employers'],
    queryFn: () => base44.entities.Employer.list(),
    staleTime: 0,
  });

  const filtered = employers.filter(e =>
    !search || e.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.industry?.toLowerCase().includes(search.toLowerCase()) ||
    e.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingEmployer(null);
    setDialogOpen(true);
  };

  const handleEdit = (emp) => {
    setEditingEmployer(emp);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['employers'] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Employers"
        subtitle={`${employers.length} employer partner${employers.length !== 1 ? 's' : ''}`}
        icon={Briefcase}
        actions={
          <Button className="gap-2" onClick={handleOpenNew}>
            <Plus className="w-4 h-4" /> Onboard Employer
          </Button>
        }
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employers by name, industry, or contact..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-5 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-heading font-semibold text-lg">
            {search ? 'No employers match your search' : 'No employers yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {search ? 'Try a different search term.' : 'Add your first employer partner to get started.'}
          </p>
          {!search && (
            <Button onClick={handleOpenNew} className="gap-2">
              <Plus className="w-4 h-4" /> Onboard Employer
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-sm font-bold text-secondary-foreground flex-shrink-0">
                    {emp.company_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-sm truncate">{emp.company_name}</p>
                    {emp.industry && <p className="text-xs text-muted-foreground">{emp.industry}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge className={`text-xs border-0 ${statusColors[emp.status] || statusColors.pending_review}`}>
                    {(emp.status || 'pending').replace(/_/g, ' ')}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(emp)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {emp.contact_name && (
                  <p className="font-medium text-foreground">{emp.contact_name}{emp.contact_title ? ` · ${emp.contact_title}` : ''}</p>
                )}
                {emp.contact_email && (
                  <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {emp.contact_email}</p>
                )}
                {emp.contact_phone && (
                  <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {emp.contact_phone}</p>
                )}
                {(emp.city || emp.state) && (
                  <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {[emp.city, emp.state].filter(Boolean).join(', ')}</p>
                )}
                {emp.open_positions > 0 && (
                  <p className="font-medium text-primary mt-2">{emp.open_positions} open position{emp.open_positions !== 1 ? 's' : ''}</p>
                )}
                {(emp.second_chance_friendly || emp.veteran_friendly) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {emp.second_chance_friendly && (
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-medium">2nd Chance</span>
                    )}
                    {emp.veteran_friendly && (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-medium">Veteran Friendly</span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EmployerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employer={editingEmployer}
        onSaved={handleSaved}
      />
    </div>
  );
}
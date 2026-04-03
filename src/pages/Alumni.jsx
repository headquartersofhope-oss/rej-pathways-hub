import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { isStaff, isAdmin } from '@/lib/rbac';
import PageHeader from '@/components/shared/PageHeader';
import AlumniCard from '@/components/alumni/AlumniCard';
import AlumniFormDialog from '@/components/alumni/AlumniFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Search, GraduationCap } from 'lucide-react';

export default function Alumni() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const canManage = isStaff(user?.role);

  const { data: alumni = [], isLoading } = useQuery({
    queryKey: ['alumni'],
    queryFn: () => base44.entities.AlumniProfile.list('-created_date', 200),
  });

  const filtered = alumni.filter(a => {
    const matchesSearch = !search ||
      a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.industry?.toLowerCase().includes(search.toLowerCase()) ||
      a.job_title?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const mentors = filtered.filter(a => a.willing_to_mentor && a.status === 'active' && a.opt_in_contact_sharing);
  const all = filtered;

  const handleEdit = (record) => { setEditing(record); setDialogOpen(true); };
  const handleAdd = () => { setEditing(null); setDialogOpen(true); };
  const handleSaved = () => { queryClient.invalidateQueries({ queryKey: ['alumni'] }); setDialogOpen(false); };

  const handleStatusChange = async (record, newStatus) => {
    await base44.entities.AlumniProfile.update(record.id, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['alumni'] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Alumni"
        subtitle="Program graduates, mentorship directory, and alumni management"
        icon={GraduationCap}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, industry, job title…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canManage && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
        {canManage && (
          <Button onClick={handleAdd} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Alumni
          </Button>
        )}
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="mb-5">
          <TabsTrigger value="directory">
            Mentor Directory
            <Badge className="ml-1.5 text-[10px]">{mentors.length}</Badge>
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="manage">
              All Records
              <Badge variant="outline" className="ml-1.5 text-[10px]">{all.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Public mentor directory — opt-in only */}
        <TabsContent value="directory">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No alumni mentors available yet.</p>
              {canManage && <p className="text-xs text-muted-foreground mt-1">Activate alumni records and ensure they have opted in to contact sharing.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentors.map(a => (
                <AlumniCard key={a.id} alumni={a} showContact={true} isStaff={false}
                  onEdit={canManage ? () => handleEdit(a) : null} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Staff management view */}
        {canManage && (
          <TabsContent value="manage">
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
            ) : all.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No alumni records yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {all.map(a => (
                  <AlumniCard key={a.id} alumni={a} showContact={true} isStaff={true}
                    onEdit={() => handleEdit(a)}
                    onStatusChange={(s) => handleStatusChange(a, s)} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <AlumniFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        user={user}
        onSaved={handleSaved}
      />
    </div>
  );
}
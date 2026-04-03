import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UserCircle, Plus, Search, Shield, Edit2 } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/roles';
import { useOutletContext } from 'react-router-dom';
import OnboardingManager from '@/components/onboarding/OnboardingManager';
import NotificationDispatcher from '@/components/notifications/NotificationDispatcher';
import UserFormDialog from '@/components/users/UserFormDialog';

export default function UserManagement() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleAddUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (u) => {
    setSelectedUser(u);
    setFormOpen(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const filtered = users.filter(u =>
    !search || (u.full_name || u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={selectedUser} onSaved={handleSaved} />

      <PageHeader
        title="User Management"
        subtitle={`${users.length} users`}
        icon={UserCircle}
        actions={
          <Button className="gap-2" onClick={handleAddUser}><Plus className="w-4 h-4" /> Add User</Button>
        }
      />

      <Tabs defaultValue="users">
        <TabsList className="mb-5">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="font-medium">{u.full_name || 'Unnamed'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm hidden sm:table-cell">{u.phone || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[u.role] || u.role || 'User'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {u.status || 'active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit user"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card className="p-5">
            <OnboardingManager user={user} />
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationDispatcher user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
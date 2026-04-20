import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, Users, Shield, CheckCircle2, X, Edit2, Trash2 } from 'lucide-react';

const AVAILABLE_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'case_manager', label: 'Case Manager' },
  { value: 'housing_staff', label: 'Housing Staff' },
  { value: 'employment_staff', label: 'Employment Staff' },
  { value: 'probation_officer', label: 'Probation Officer' },
  { value: 'employer', label: 'Employer' },
  { value: 'resident', label: 'Resident' },
];

const ROLE_PERMISSIONS = {
  super_admin: {
    canManageAllResidents: true,
    canManageAllUsers: true,
    canAssignRoles: true,
    canRevokeRoles: true,
    canAssignAdminRoles: true,
    canToggleAdminRoleAssignment: true,
    canPreviewAllRoles: true,
    canAccessAllModules: true,
    canViewAuditLogs: true,
  },
  admin: {
    canManageAllResidents: true,
    canManageAllUsers: true,
    canAssignRoles: true,
    canRevokeRoles: true,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: true,
    canViewAuditLogs: true,
  },
  manager: {
    canManageAllResidents: true,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: true,
    canViewAuditLogs: false,
  },
  case_manager: {
    canManageAllResidents: false,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: false,
    canViewAuditLogs: false,
  },
  housing_staff: {
    canManageAllResidents: false,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: false,
    canViewAuditLogs: false,
  },
  employment_staff: {
    canManageAllResidents: false,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: false,
    canViewAuditLogs: false,
  },
  probation_officer: {
    canManageAllResidents: false,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: false,
    canViewAuditLogs: false,
  },
  employer: {
    canManageAllResidents: false,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: false,
    canViewAuditLogs: false,
  },
  resident: {
    canManageAllResidents: false,
    canManageAllUsers: false,
    canAssignRoles: false,
    canRevokeRoles: false,
    canAssignAdminRoles: false,
    canToggleAdminRoleAssignment: false,
    canPreviewAllRoles: false,
    canAccessAllModules: false,
    canViewAuditLogs: false,
  },
};

export default function TeamManagement() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'case_manager' });
  const [adminToggleState, setAdminToggleState] = useState({});

  const { data: teamMembers = [], refetch } = useQuery({
    queryKey: ['user_profiles'],
    queryFn: () => base44.entities.UserProfile.list(),
  });

  useEffect(() => {
    const toggleState = {};
    teamMembers.forEach(member => {
      if (member.data.app_role === 'admin') {
        toggleState[member.id] = true;
      }
    });
    setAdminToggleState(toggleState);
  }, [teamMembers]);

  const handleInvite = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      alert('Please fill in required fields');
      return;
    }

    try {
      await base44.entities.UserProfile.create({
        email: formData.email,
        full_name: formData.name,
        phone_number: formData.phone,
        app_role: formData.role,
        status: 'active',
        onboarding_status: 'invited',
      });
      setFormData({ name: '', email: '', phone: '', role: 'case_manager' });
      refetch();
    } catch (error) {
      console.error('Error inviting team member:', error);
      alert('Failed to invite team member');
    }
  };

  const handleToggleAdminRoleAssignment = async (memberId, currentRole, newState) => {
    setAdminToggleState(prev => ({ ...prev, [memberId]: newState }));
    // In production, this would update a permission flag on the admin user record
  };

  const handleRemoveUser = async (memberId) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      try {
        await base44.entities.UserProfile.delete(memberId);
        refetch();
      } catch (error) {
        console.error('Error removing team member:', error);
        alert('Failed to remove team member');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Invite Section */}
      <Card className="border-border" style={{ backgroundColor: '#161B22' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Invite New Team Member
          </CardTitle>
          <CardDescription>Add a new user to the Pathways system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
            />
            <Input
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
            />
            <Select value={formData.role} onValueChange={(role) => setFormData({ ...formData, role })}>
              <SelectTrigger style={{ backgroundColor: '#21262D', borderColor: '#30363D' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
            Send Invitation
          </Button>
        </CardContent>
      </Card>

      {/* Active Team Members */}
      <Card className="border-border" style={{ backgroundColor: '#161B22' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Active Team Members
          </CardTitle>
          <CardDescription>{teamMembers.length} team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: '#CDD9E5' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363D' }}>
                  <th className="text-left py-3 px-4" style={{ color: '#8B949E' }}>Name</th>
                  <th className="text-left py-3 px-4" style={{ color: '#8B949E' }}>Email</th>
                  <th className="text-left py-3 px-4" style={{ color: '#8B949E' }}>Role</th>
                  <th className="text-left py-3 px-4" style={{ color: '#8B949E' }}>Status</th>
                  <th className="text-left py-3 px-4" style={{ color: '#8B949E' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(member => (
                  <tr key={member.id} style={{ borderBottom: '1px solid #30363D' }}>
                    <td className="py-3 px-4">{member.data.full_name}</td>
                    <td className="py-3 px-4">{member.data.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline">{member.data.app_role}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={member.data.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                        {member.data.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 space-x-2">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveUser(member.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Matrix */}
      <Card className="border-border" style={{ backgroundColor: '#161B22' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Role Permissions Matrix
          </CardTitle>
          <CardDescription>View what each role can and cannot do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ color: '#CDD9E5' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363D' }}>
                  <th className="text-left py-3 px-4 min-w-48" style={{ color: '#8B949E' }}>Permission</th>
                  {AVAILABLE_ROLES.map(role => (
                    <th key={role.value} className="text-center py-3 px-3 min-w-24" style={{ color: '#8B949E' }}>{role.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(ROLE_PERMISSIONS.super_admin).map(permission => (
                  <tr key={permission} style={{ borderBottom: '1px solid #30363D' }}>
                    <td className="py-3 px-4 font-medium">{permission.replace(/([A-Z])/g, ' $1').trim()}</td>
                    {AVAILABLE_ROLES.map(role => (
                      <td key={`${permission}-${role.value}`} className="text-center py-3 px-3">
                        {ROLE_PERMISSIONS[role.value]?.[permission] ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin Role Assignment Toggle */}
      <Card className="border-border" style={{ backgroundColor: '#161B22' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Admin Role Assignment Permissions
          </CardTitle>
          <CardDescription>Enable/disable admin ability to assign roles to others</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers
              .filter(m => m.data.app_role === 'admin' || m.data.app_role === 'super_admin')
              .map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#21262D' }}>
                  <div>
                    <p className="font-medium">{member.data.full_name}</p>
                    <p className="text-xs" style={{ color: '#8B949E' }}>{member.data.email}</p>
                  </div>
                  {member.data.app_role === 'super_admin' ? (
                    <Badge className="bg-amber-500/20 text-amber-400">Always Enabled</Badge>
                  ) : (
                    <Switch
                      checked={adminToggleState[member.id] || false}
                      onCheckedChange={(checked) => handleToggleAdminRoleAssignment(member.id, member.data.app_role, checked)}
                    />
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
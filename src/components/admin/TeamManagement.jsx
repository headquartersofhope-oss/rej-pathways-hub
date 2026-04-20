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
import PremiumPageHeader from '@/components/premium/PremiumPageHeader';

const AVAILABLE_ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: '#F59E0B' },
  { value: 'admin', label: 'Admin', color: '#60A5FA' },
  { value: 'manager', label: 'Manager', color: '#A78BFA' },
  { value: 'case_manager', label: 'Case Manager', color: '#34D399' },
  { value: 'housing_staff', label: 'Housing Staff', color: '#2DD4BF' },
  { value: 'employment_staff', label: 'Employment Staff', color: '#8B5CF6' },
  { value: 'probation_officer', label: 'Probation Officer', color: '#F87171' },
  { value: 'employer', label: 'Employer', color: '#FB923C' },
  { value: 'resident', label: 'Resident', color: '#94A3B8' },
];

const ROLE_COLOR_MAP = {
  super_admin: '#F59E0B',
  admin: '#60A5FA',
  manager: '#A78BFA',
  case_manager: '#34D399',
  housing_staff: '#2DD4BF',
  employment_staff: '#8B5CF6',
  probation_officer: '#F87171',
  employer: '#FB923C',
  resident: '#94A3B8',
};

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
      if (member.data?.app_role === 'admin') {
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
      <PremiumPageHeader title="Team Management" subtitle="Invite staff, assign roles, and control permissions." icon={Shield} />

      {/* Invite Section */}
      <Card className="border-2" style={{ backgroundColor: '#161B22', borderColor: '#30363D', borderTopColor: '#34D399', borderTopWidth: '4px' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Users className="w-5 h-5" />
            Invite New Team Member
          </CardTitle>
          <CardDescription style={{ color: '#8B949E' }}>Add a new user to the Pathways system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
              onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
              onBlur={(e) => e.target.style.borderColor = '#30363D'}
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
              onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
              onBlur={(e) => e.target.style.borderColor = '#30363D'}
            />
            <Input
              placeholder="Phone (optional)"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}
              onFocus={(e) => e.target.style.borderColor = '#F59E0B'}
              onBlur={(e) => e.target.style.borderColor = '#30363D'}
            />
            <Select value={formData.role} onValueChange={(role) => setFormData({ ...formData, role })}>
              <SelectTrigger style={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }}>
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
      <Card className="border-border" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Shield className="w-5 h-5" />
            Active Team Members
          </CardTitle>
          <CardDescription style={{ color: '#8B949E' }}>{teamMembers.length} team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: '#CDD9E5' }}>
              <thead style={{ backgroundColor: '#21262D' }}>
                <tr style={{ borderBottom: '1px solid #30363D' }}>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#8B949E' }}>Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#8B949E' }}>Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#8B949E' }}>Role</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#8B949E' }}>Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase" style={{ color: '#8B949E' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(member => {
                  const memberData = member.data || {};
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid #30363D' }}>
                      <td className="py-3 px-4">{memberData.full_name || 'N/A'}</td>
                      <td className="py-3 px-4">{memberData.email || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <Badge style={{
                          backgroundColor: (ROLE_COLOR_MAP[memberData.app_role] || '#94A3B8') + '20',
                          color: ROLE_COLOR_MAP[memberData.app_role] || '#94A3B8',
                          border: `1px solid ${ROLE_COLOR_MAP[memberData.app_role] || '#94A3B8'}`
                        }}>
                          {memberData.app_role || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={memberData.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {memberData.status || 'inactive'}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Matrix */}
      <Card className="border-border" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <CheckCircle2 className="w-5 h-5" />
            Role Permissions Matrix
          </CardTitle>
          <CardDescription style={{ color: '#8B949E' }}>View what each role can and cannot do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ color: '#CDD9E5' }}>
              <thead style={{ backgroundColor: '#21262D' }}>
                <tr style={{ borderBottom: '1px solid #30363D' }}>
                  <th className="text-left py-3 px-4 min-w-48 text-xs font-semibold uppercase" style={{ color: '#8B949E' }}>Permission</th>
                  {AVAILABLE_ROLES.map(role => (
                    <th key={role.value} className="text-center py-3 px-3 min-w-24 text-xs font-semibold uppercase" style={{ color: role.color }}>{role.label}</th>
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
                          <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: '#34D399' }} />
                        ) : (
                          <X className="w-4 h-4 mx-auto" style={{ color: '#F87171' }} />
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
      <Card className="border-border" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: '#FFFFFF' }}>
            <Shield className="w-5 h-5" />
            Admin Role Assignment Permissions
          </CardTitle>
          <CardDescription style={{ color: '#8B949E' }}>Enable/disable admin ability to assign roles to others</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers
              .filter(m => (m.data?.app_role === 'admin' || m.data?.app_role === 'super_admin'))
              .map(member => {
                const memberData = member.data || {};
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#21262D' }}>
                    <div>
                      <p className="font-medium" style={{ color: '#FFFFFF' }}>{memberData.full_name || 'N/A'}</p>
                      <p className="text-xs" style={{ color: '#8B949E' }}>{memberData.email || 'N/A'}</p>
                    </div>
                    {memberData.app_role === 'super_admin' ? (
                      <Badge style={{ backgroundColor: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B' }}>Always Enabled</Badge>
                    ) : (
                      <Switch
                        checked={adminToggleState[member.id] || false}
                        onCheckedChange={(checked) => handleToggleAdminRoleAssignment(member.id, memberData.app_role, checked)}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
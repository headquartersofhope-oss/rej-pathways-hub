import { useAuth } from '@/lib/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { isAdmin } from '@/lib/rbac';
import { isSuperAdmin } from '@/lib/roles';
import { ROLE_LABELS, ALL_ROLES } from '@/lib/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, XCircle, User, Key } from 'lucide-react';

const ACCESS_MATRIX = [
  { label: 'Admin Dashboard', roles: ['admin', 'super_admin', 'org_admin', 'user'] },
  { label: 'Control Center', roles: ['admin', 'super_admin', 'org_admin', 'user'] },
  { label: 'Audit Center', roles: ['admin', 'super_admin', 'org_admin', 'user'] },
  { label: 'User Management', roles: ['admin', 'super_admin', 'org_admin', 'user'] },
  { label: 'Housing Operations', roles: ['admin', 'super_admin', 'org_admin', 'user', 'staff', 'house_manager', 'case_manager', 'program_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator'] },
  { label: 'Grant Tracker', roles: ['admin', 'super_admin', 'org_admin', 'user', 'staff', 'grant_manager', 'program_manager', 'case_manager', 'employment_specialist', 'house_manager', 'transportation_coordinator'] },
  { label: 'Transportation Hub', roles: ['admin', 'super_admin', 'org_admin', 'user', 'staff', 'transportation_coordinator', 'driver', 'program_manager', 'case_manager', 'house_manager', 'employment_specialist', 'grant_manager'] },
  { label: 'Case Management', roles: ['admin', 'super_admin', 'org_admin', 'user', 'staff', 'case_manager', 'program_manager', 'house_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator'] },
  { label: 'Reporting & Outcomes', roles: ['admin', 'super_admin', 'org_admin', 'user', 'staff', 'program_manager', 'case_manager', 'house_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator', 'auditor'] },
  { label: 'System Settings / Modules', roles: ['admin', 'super_admin', 'org_admin', 'user'] },
  { label: 'Pathway Engine / Learning', roles: ['admin', 'super_admin', 'org_admin', 'user', 'staff', 'instructor', 'program_manager', 'case_manager', 'house_manager', 'employment_specialist', 'grant_manager', 'transportation_coordinator'] },
  { label: 'Self-Audit Diagnostics', roles: ['admin', 'super_admin', 'org_admin', 'user'] },
];

export default function MyAccessVerification() {
  const { user: rawUser } = useAuth();
  const outletCtx = useOutletContext();
  const user = outletCtx?.user || rawUser;

  const platformRole = rawUser?.role || '—';
  const appRole = rawUser?.data?.app_role || user?.role || '—';
  const effectiveRole = user?.role || appRole;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl">Access Verification</h1>
          <p className="text-sm text-muted-foreground">Confirms your current user identity and permission level</p>
        </div>
      </div>

      {/* Identity Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Current User Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Full Name</p>
            <p className="font-semibold">{rawUser?.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="font-mono text-xs">{rawUser?.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Platform Role (Base44)</p>
            <Badge variant="outline" className="font-mono text-xs">{platformRole}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">App Role (HOH OS)</p>
            <Badge className="font-mono text-xs bg-primary">{appRole}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Effective Role (resolved)</p>
            <Badge className={`font-mono text-xs ${isAdmin(effectiveRole) ? 'bg-emerald-600' : 'bg-amber-500'}`}>
              {ROLE_LABELS[effectiveRole] || effectiveRole}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Super Admin</p>
            {isSuperAdmin(effectiveRole) || platformRole === 'admin' ? (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs"><CheckCircle2 className="w-4 h-4" /> YES — Full unrestricted access</span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="w-4 h-4" /> No</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" /> Module Access Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {ACCESS_MATRIX.map(({ label, roles }) => {
              const hasAccess = roles.includes(effectiveRole) || platformRole === 'admin' || effectiveRole === 'super_admin';
              return (
                <div key={label} className="flex items-center justify-between py-2.5">
                  <p className="text-sm">{label}</p>
                  {hasAccess ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Restricted
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Raw token data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-xs text-muted-foreground">Raw Auth Object (debug)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-lg p-3 text-[11px] overflow-auto max-h-48">
            {JSON.stringify({ id: rawUser?.id, email: rawUser?.email, role: rawUser?.role, data: rawUser?.data }, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
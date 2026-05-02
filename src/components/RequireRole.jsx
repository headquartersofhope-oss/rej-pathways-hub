import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

/**
 * Route guard that blocks access unless user.role is in the `roles` array.
 *
 * Usage:
 *   <Route path="/admin/users" element={
 *     <RequireRole roles={ADMIN_ROLES}>
 *       <UserManagement />
 *     </RequireRole>
 *   } />
 *
 * If the user lacks the required role:
 *   - If `redirect` is provided, navigates there
 *   - Otherwise renders an "Access Denied" card with a link back to home
 *
 * This is the route-level layer of defense. Entity RLS is the data-level
 * layer that prevents direct API exploitation.
 */
export default function RequireRole({ roles = [], children, redirect }) {
  const { user } = useAuth();

  // No user yet — parent AuthProvider already handles unauthenticated state.
  // If we reach this with no user, just render nothing (the auth flow will
  // redirect to login on its own).
  if (!user) return null;

  // If user has no role at all, deny.
  if (!user.role) {
    return <DeniedCard reason="Your account has no role assigned yet. Contact your administrator." />;
  }

  // Allowed roles include the user's role — render children.
  if (roles.includes(user.role)) {
    return children;
  }

  // Not allowed.
  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  return <DeniedCard reason="You don't have permission to view this page. If you think this is a mistake, contact your administrator." />;
}

function DeniedCard({ reason }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="p-8 max-w-md text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-xl font-heading font-bold mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground mb-4">{reason}</p>
        <a href="/" className="text-sm text-primary font-semibold hover:underline">
          Return to dashboard
        </a>
      </Card>
    </div>
  );
}

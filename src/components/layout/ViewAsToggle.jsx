import React, { useState, useRef, useEffect } from 'react';
import { Eye, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isAdmin, ROLE_LABELS, clearViewAsOverride } from '@/lib/roles';

/**
 * Admin-only role preview switcher. Lets an admin temporarily render the
 * app as if they were any other role, without changing their actual user record.
 *
 * Implementation: writes the chosen role to localStorage under VIEW_AS_KEY.
 * Home.jsx and Sidebar.jsx read this via getEffectiveRole(user) from rbac.js,
 * so the dispatched dashboard and the sidebar both reflect the previewed role.
 *
 * Note: this only changes UI rendering. Backend RBAC checks still use the user's
 * actual role, so previewing as 'resident' will not actually grant resident-level
 * data access — it will simply load the ResidentDashboard with whatever data the
 * admin has access to. This is a UI preview, not a true impersonation.
 */
const VIEW_AS_KEY = 'pathways_view_as_role';

const VIEWABLE_ROLES = [
  'case_manager',
  'resident',
  'probation_officer',
  'employer',
  'sponsor',
  'donor',
  'staff',
  'program_manager',
  'auditor',
  'instructor',
];

export default function ViewAsToggle({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user || !isAdmin(user.role)) return null;

  const currentOverride =
    typeof window !== 'undefined' ? localStorage.getItem(VIEW_AS_KEY) : null;

  const handleViewAs = (role) => {
    try {
      localStorage.setItem(VIEW_AS_KEY, role);
      window.location.reload();
    } catch (e) {
      console.error('Could not set view-as override', e);
    }
  };

  const handleClear = () => {
    clearViewAsOverride();
    window.location.reload();
  };

  if (currentOverride) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1">
          <Eye className="w-3 h-3" />
          Viewing as: {ROLE_LABELS[currentOverride] || currentOverride}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClear}
          className="h-7 px-2 text-xs gap-1 text-slate-300 hover:text-white"
        >
          <X className="w-3 h-3" /> Exit
        </Button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs gap-1.5 text-slate-400 hover:text-white"
        onClick={() => setOpen(!open)}
      >
        <Eye className="w-3.5 h-3.5" /> View As <ChevronDown className="w-3 h-3" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-popover text-popover-foreground shadow-md z-50">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            Preview as another role
          </div>
          <div className="border-t" />
          {VIEWABLE_ROLES.map((role) => (
            <button
              key={role}
              onClick={() => {
                setOpen(false);
                handleViewAs(role);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            >
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

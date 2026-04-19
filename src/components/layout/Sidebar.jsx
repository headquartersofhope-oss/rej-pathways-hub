import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROLES, isStaff, isAdmin, isManager, isSuperAdmin, ROLE_LABELS } from '@/lib/roles';
import { MODULES } from '@/lib/modules';
import {
LayoutDashboard, Users, Building2, MapPin, FileText,
MessageSquare, Settings, LogOut, Menu, X, ChevronDown,
ChevronRight, Shield, UserCircle, Briefcase, Handshake, ClipboardList, FolderOpen, GraduationCap, Star, BarChart2, Award, Package, Zap, TrendingUp, Calendar, CheckSquare, ShieldCheck, Home, Terminal, Car, DollarSign, BedDouble, Activity, GitBranch
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const navSections = (role) => {
  // Employer gets a minimal, focused nav
  if (role === 'employer') {
    return [
      {
        label: 'Employer',
        items: [
          { label: 'Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'My Jobs & Candidates', path: '/employer-portal', icon: Briefcase },
          { label: 'Messages', path: '/messages', icon: MessageSquare },
        ],
      },
    ];
  }

  const sections = [];

  // Dashboard - everyone gets this
  sections.push({
    label: 'Dashboard',
    items: [{ label: 'Home', path: '/', icon: LayoutDashboard }],
  });

  // Manager Portal (managers only)
  if (isManager(role)) {
    sections.push({
      label: 'Manager',
      items: [
        { label: 'Manager Portal', path: '/manager-portal', icon: GitBranch },
      ],
    });
  }

  // Staff sections
  if (isStaff(role)) {
    sections.push({
      label: 'Participants',
      items: [
        { label: 'All Participants', path: '/residents', icon: Users },
        { label: 'Intake & Assessment', path: '/intake', icon: ClipboardList },
        { label: 'Case Management', path: '/case-management', icon: FolderOpen },
        { label: 'Job Readiness', path: '/job-readiness', icon: Star },
        { label: 'Job Matching', path: '/job-matching', icon: Zap },
        { label: 'Alumni', path: '/alumni', icon: Award },
      ],
    });

    sections.push({
      label: 'Operations',
      items: [
        { label: 'Housing Operations', path: '/housing', icon: BedDouble },
        { label: 'Transportation Hub', path: '/transportation', icon: Car },
        { label: 'Grant Tracker', path: '/grants', icon: DollarSign },
        { label: 'Resource Inventory', path: '/resources', icon: Package },
        { label: 'Partner Agencies', path: '/partners', icon: Handshake },
        { label: 'Employers', path: '/employers', icon: Briefcase },
        { label: 'Housing Referrals', path: '/housing-referrals', icon: Home },
      ],
    });
  }

  // Reporting & Outcomes (all staff)
  if (isStaff(role)) {
    sections.push({
      label: 'Reporting',
      items: [
        { label: 'Core Metrics', path: '/reporting', icon: BarChart2 },
        { label: 'Participant Outcomes', path: '/resident-outcomes', icon: Users },
        { label: 'Employer Outcomes', path: '/employer-outcomes', icon: Briefcase },
      ],
    });
  }

  // Admin sections
  if (isAdmin(role)) {
    sections.push({
      label: 'Administration',
      items: [
        { label: '⚡ Control Center', path: '/admin/control-center', icon: Terminal },
        { label: '🔬 Audit Center', path: '/admin/audit', icon: Shield },
        { label: '🩺 System Health', path: '/admin/system-health', icon: Activity },
        { label: '🔐 My Access', path: '/admin/my-access', icon: Shield },
        { label: 'Onboarding Queue', path: '/admin/onboarding', icon: ClipboardList },
        { label: 'Organizations', path: '/organizations', icon: Building2 },
        { label: 'Sites', path: '/sites', icon: MapPin },
        { label: 'User Management', path: '/users', icon: UserCircle },
        { label: 'Module Settings', path: '/modules', icon: Settings },
        { label: 'Audit Logs', path: '/audit-logs', icon: Shield },
      ],
    });
  }

  // Resident self-service nav
  if (role === 'resident') {
    sections.push({
      label: 'My Services',
      items: [
        { label: 'My Supports', path: '/my-supports', icon: ShieldCheck },
        { label: 'My Tasks', path: '/my-tasks', icon: CheckSquare },
        { label: 'My Appointments', path: '/my-appointments', icon: Calendar },
        { label: 'My Jobs', path: '/my-jobs', icon: Briefcase },
      ],
    });
  }

  // Learning (staff and residents, not employers)
  if (role !== 'employer') {
    sections.push({
      label: 'Learning',
      items: [
        { label: 'Learning Center', path: '/learning', icon: GraduationCap },
      ],
    });
  }

  // Shared communication (non-employer)
  sections.push({
    label: 'Communication',
    items: [
      { label: 'Messages', path: '/messages', icon: MessageSquare },
      { label: 'Documents', path: '/documents', icon: FileText },
    ],
  });

  return sections;
};

export default function Sidebar({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState(false);
  const location = useLocation();
  const role = user?.role || 'resident';
  const sections = navSections(role);

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <span className="text-secondary-foreground font-heading font-bold text-xs">HOH</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm text-sidebar-foreground leading-tight">
              HOH OS
            </h1>
            <p className="text-[11px] text-sidebar-foreground/50 leading-tight">
              {ROLE_LABELS[role] || 'User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 mb-1.5 text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                      active
                        ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Module Navigation */}
        {isStaff(role) && (
          <div>
            <button
              onClick={() => setExpandedModules(!expandedModules)}
              className="flex items-center justify-between w-full px-2 mb-1.5"
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40">
                Modules
              </p>
              {expandedModules ? (
                <ChevronDown className="w-3 h-3 text-sidebar-foreground/40" />
              ) : (
                <ChevronRight className="w-3 h-3 text-sidebar-foreground/40" />
              )}
            </button>
            {expandedModules && (
              <div className="space-y-0.5">
                {MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const path = `/module/${mod.slug}`;
                  const active = location.pathname === path;
                  return (
                    <Link
                      key={mod.slug}
                      to={path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        active
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{mod.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground text-xs font-semibold">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">
              {user?.email}
            </p>
          </div>
          <button onClick={handleLogout} className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden bg-card shadow-md"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-sidebar z-50 transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close */}
        <button
          className="absolute top-3 right-3 lg:hidden text-sidebar-foreground/60"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}
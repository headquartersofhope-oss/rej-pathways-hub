import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/AuthContext';
import GlobalSearchBar from '@/components/shared/GlobalSearchBar';

export default function AppLayout() {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">REJ</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar with global search */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <GlobalSearchBar />
        </div>
        <div className="flex-1">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
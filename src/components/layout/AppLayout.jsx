import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/AuthContext';
import GlobalSearchBar from '@/components/shared/GlobalSearchBar';

export default function AppLayout() {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background to-background/95">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">HOH</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Loading Pathways...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto flex flex-col bg-gradient-to-b from-background to-background/98">
        {/* Top bar with global search */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-3 border-b border-border bg-card/40 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
          <GlobalSearchBar />
        </div>
        <div className="flex-1 animate-in fade-in duration-300">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
}
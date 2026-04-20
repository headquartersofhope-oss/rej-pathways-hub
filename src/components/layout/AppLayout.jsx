import React from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/AuthContext';
import GlobalSearchBar from '@/components/shared/GlobalSearchBar';
import TrainingButton from '@/components/training/TrainingButton';
import AppAssistant from '@/components/ai/AppAssistant';

export default function AppLayout() {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();

  const { data: userProfiles = [] } = useQuery({
    queryKey: ['userProfile', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return [];
      
      // Primary: query by email (most reliable field)
      const results = user?.email ? await base44.entities.UserProfile.filter({ email: user.email }) : [];
      
      if (results.length > 0) {
        console.log('AppLayout: UserProfile query - PRIMARY (by email)', { 
          queryFilter: { email: user.email }, 
          result: results[0]
        });
        return results;
      }
      
      // Fallback 1: query where full_name contains "Rodney"
      const fallback1 = await base44.entities.UserProfile.list();
      const fallback1Result = fallback1.filter(p => p.full_name?.toLowerCase().includes('rodney'));
      if (fallback1Result.length > 0) {
        console.log('AppLayout: UserProfile query - FALLBACK 1 (full_name contains Rodney)', { 
          result: fallback1Result[0]
        });
        return fallback1Result;
      }
      
      // Fallback 2: query where phone_number equals 5127705952
      const fallback2Result = fallback1.filter(p => p.phone_number === '5127705952');
      if (fallback2Result.length > 0) {
        console.log('AppLayout: UserProfile query - FALLBACK 2 (phone_number = 5127705952)', { 
          result: fallback2Result[0]
        });
        return fallback2Result;
      }
      
      console.log('AppLayout: UserProfile query - NO RESULTS', { email: user?.email });
      return [];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
  });

  const userProfile = userProfiles.length > 0 ? userProfiles[0] : null;
  console.log('AppLayout: userProfile resolved', { userProfile, userName: user?.full_name });

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
      <main className="flex-1 overflow-y-auto flex flex-col bg-background">
         {/* Top bar with global search */}
         <div className="hidden lg:flex items-center gap-3 px-6 py-4 border-b sticky top-0 z-20 shadow-sm" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
          <GlobalSearchBar />
        </div>
        <div className="flex-1 animate-in fade-in duration-300">
           <Outlet context={{ user }} />
         </div>
        </main>
        <TrainingButton />
        <AppAssistant 
          userRole={user?.role || 'resident'} 
          userName={user?.full_name || 'User'}
          userProfile={userProfile}
          appName="Pathways Hub"
          organizationId={userProfile?.organization_id}
        />
        </div>
        );
        }
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Building, ArrowRight } from 'lucide-react';
import TurnkeyBedAssignment from './TurnkeyBedAssignment';
import ReferralToPlacementFlow from './ReferralToPlacementFlow';

/**
 * HousingAssignmentPanel
 * Top-level panel that clearly distinguishes between:
 *   1. Turnkey House — Internal Placement (org-controlled houses)
 *   2. Per-Bed Housing — Referral Inventory (external HousingProvider referrals)
 *
 * This replaces the previous single-mode referral flow in housing placement contexts.
 */
export default function HousingAssignmentPanel({ resident, currentUser, onComplete }) {
  const [mode, setMode] = useState(null); // null | 'turnkey' | 'referral'

  if (mode === 'turnkey') {
    return (
      <div className="space-y-2">
        <button onClick={() => setMode(null)} className="text-xs text-primary hover:underline">
          ← Back to options
        </button>
        <TurnkeyBedAssignment
          resident={resident}
          currentUser={currentUser}
          onAssigned={() => { onComplete?.(); setMode(null); }}
        />
      </div>
    );
  }

  if (mode === 'referral') {
    return (
      <div className="space-y-2">
        <button onClick={() => setMode(null)} className="text-xs text-primary hover:underline">
          ← Back to options
        </button>
        <ReferralToPlacementFlow
          resident={resident}
          onPlacementCreated={() => { onComplete?.(); setMode(null); }}
        />
      </div>
    );
  }

  // Mode selection screen
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground px-1">SELECT PLACEMENT TYPE</p>

      {/* Turnkey House — Internal Placement */}
      <button
        onClick={() => setMode('turnkey')}
        className="w-full p-4 border-2 rounded-lg text-left hover:border-primary hover:bg-primary/5 transition group"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
            <Building className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm">Turnkey House — Internal Placement</p>
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hidden sm:inline-flex">
                Org Controlled
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Assign client to a room/bed in a house managed by your organization. Used when your org leases or operates the entire facility.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1 shrink-0" />
        </div>
      </button>

      {/* Per-Bed Housing — Referral Inventory */}
      <button
        onClick={() => setMode('referral')}
        className="w-full p-4 border-2 rounded-lg text-left hover:border-accent hover:bg-accent/5 transition group"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20">
            <Home className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm">Per-Bed Housing — Referral Inventory</p>
              <Badge className="text-[10px] bg-accent/10 text-accent border-accent/20 hidden sm:inline-flex">
                External Referral
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Submit a referral to an external housing provider. Placement is subject to provider approval and availability.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent mt-1 shrink-0" />
        </div>
      </button>
    </div>
  );
}
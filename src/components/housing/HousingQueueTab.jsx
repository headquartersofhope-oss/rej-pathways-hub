import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Home, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import HousingPlacementModal from './HousingPlacementModal';

export default function HousingQueueTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);

  // Fetch residents in housing_pending status
  const { data: pendingResidents = [], isLoading: loadingPending, refetch: refetchQueue } = useQuery({
    queryKey: ['housing-pending-residents'],
    queryFn: async () => {
      console.log('[HOUSING] Fetching pending residents...');
      const residents = await base44.entities.Resident.filter({
        status: 'housing_pending'
      });
      console.log('[HOUSING] Found', residents.length, 'pending residents');
      return residents.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    refetchInterval: 5000, // Auto-refetch every 5 seconds
  });

  // Fetch housed residents
  const { data: housingPlacements = [] } = useQuery({
    queryKey: ['housing-placements'],
    queryFn: () => base44.entities.HousingPlacement.filter({ placement_status: 'placed' }),
  });

  const filtered = pendingResidents.filter(r =>
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectResident = (resident) => {
    setSelectedResident(resident);
    setShowPlacementModal(true);
  };

  const handlePlacementComplete = () => {
    setShowPlacementModal(false);
    setSelectedResident(null);
    queryClient.invalidateQueries({ queryKey: ['housing-pending-residents'] });
    queryClient.invalidateQueries({ queryKey: ['housing-placements'] });
  };

  return (
    <div className="space-y-6">
      {/* Pending Queue */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Home className="w-5 h-5" />
            Pending Housing Queue ({filtered.length})
          </h2>
        </div>

        {/* Search + Refresh */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => refetchQueue()}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Queue list */}
        <div className="grid gap-3">
          {loadingPending ? (
            <Card className="p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No residents pending housing placement
            </Card>
          ) : (
            filtered.map((resident) => (
              <Card key={resident.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">
                      {resident.first_name} {resident.last_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {resident.email || 'No email'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {resident.population || 'General'}
                      </Badge>
                      {resident.global_resident_id && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {resident.global_resident_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSelectResident(resident)}
                    size="sm"
                    className="gap-2 whitespace-nowrap"
                  >
                    Assign
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Placed residents */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-green-600" />
          Currently Placed ({housingPlacements.length})
        </h2>
        <div className="grid gap-3">
          {housingPlacements.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No residents currently placed
            </Card>
          ) : (
            housingPlacements.map((placement) => (
              <Card key={placement.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {placement.house_name} - {placement.bed_label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Moved in: {new Date(placement.move_in_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Occupied</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Placement Modal */}
      {showPlacementModal && selectedResident && (
        <HousingPlacementModal
          resident={selectedResident}
          onClose={() => {
            setShowPlacementModal(false);
            setSelectedResident(null);
          }}
          onComplete={handlePlacementComplete}
        />
      )}
    </div>
  );
}
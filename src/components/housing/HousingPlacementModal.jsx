import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Home, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function HousingPlacementModal({ resident, onClose, onComplete }) {
  const [selectedHouse, setSelectedHouse] = useState('');
  const [selectedBed, setSelectedBed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active houses
  const { data: houses = [] } = useQuery({
    queryKey: ['active-houses'],
    queryFn: async () => {
      const allHouses = await base44.entities.House.filter({ status: 'active' });
      return allHouses;
    },
  });

  // Fetch available beds for selected house
  const { data: availableBeds = [], isLoading: loadingBeds } = useQuery({
    queryKey: ['available-beds', selectedHouse],
    queryFn: async () => {
      if (!selectedHouse) return [];
      const beds = await base44.entities.Bed.filter({
        house_id: selectedHouse,
        status: 'available'
      });
      return beds;
    },
    enabled: !!selectedHouse,
  });

  const handleAssign = async () => {
    if (!selectedHouse || !selectedBed) {
      toast.error('Please select house and bed');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await base44.functions.invoke('assignHousingPlacement', {
        resident_id: resident.id,
        house_id: selectedHouse,
        bed_id: selectedBed
      });

      if (result?.data?.success) {
        toast.success(`${resident.first_name} assigned to housing`);
        onComplete();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to assign housing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Housing Placement</DialogTitle>
          <DialogDescription>
            Assign {resident.first_name} {resident.last_name} to a house and bed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resident summary */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {resident.first_name} {resident.last_name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {resident.global_resident_id}
                </p>
              </div>
            </div>
          </Card>

          {/* House selection */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Select House
            </label>
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a house..." />
              </SelectTrigger>
              <SelectContent>
                {houses.map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    {house.name} ({house.occupied_beds || 0}/{house.total_beds})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bed selection */}
          {selectedHouse && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Select Bed
              </label>
              {loadingBeds ? (
                <div className="p-3 text-center">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : availableBeds.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">No available beds in this house</p>
                </div>
              ) : (
                <Select value={selectedBed} onValueChange={setSelectedBed}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a bed..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBeds.map((bed) => (
                      <SelectItem key={bed.id} value={bed.id}>
                        {bed.bed_label} (Room {bed.room_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isSubmitting || !selectedHouse || !selectedBed}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign to Housing'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
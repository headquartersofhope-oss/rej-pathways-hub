import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function BedOccupancyChart({ houses = [], loading = false }) {
  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center h-80" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </Card>
    );
  }

  // Aggregate bed data by status
  const statusCounts = {
    occupied: 0,
    available: 0,
    reserved: 0,
    maintenance: 0,
  };

  // Also prepare house-level breakdown
  const houseData = houses.map(house => ({
    name: house.name || 'Unnamed',
    occupied: house.occupied_beds || 0,
    available: (house.total_beds || 0) - (house.occupied_beds || 0),
    capacity: house.total_beds || 0,
  }));

  houseData.forEach(h => {
    statusCounts.occupied += h.occupied;
    statusCounts.available += h.available;
  });

  const chartData = [
    { name: 'Occupied', value: statusCounts.occupied, fill: '#34D399' },
    { name: 'Available', value: statusCounts.available, fill: '#60A5FA' },
    { name: 'Reserved', value: statusCounts.reserved, fill: '#FBBF24' },
    { name: 'Maintenance', value: statusCounts.maintenance, fill: '#F87171' },
  ];

  const totalBeds = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const occupancyRate = totalBeds > 0 ? Math.round((statusCounts.occupied / totalBeds) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <Card className="p-6" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Bed Status Overview</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData.filter(d => d.value > 0)}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} beds`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Occupancy by House */}
      <Card className="p-6" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
        <h3 className="font-heading font-bold text-lg text-foreground mb-4">Occupancy by House</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={houseData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B949E' }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12, fill: '#8B949E' }} />
            <Tooltip contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3' }} />
            <Bar dataKey="occupied" stackId="a" fill="#34D399" name="Occupied" />
            <Bar dataKey="available" stackId="a" fill="#60A5FA" name="Available" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary Stats */}
      <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Beds</p>
          <p className="font-heading font-bold text-2xl text-white mt-1">{totalBeds}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Occupied</p>
          <p className="font-heading font-bold text-2xl text-amber-400 mt-1">{statusCounts.occupied}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Available</p>
          <p className="font-heading font-bold text-2xl text-blue-400 mt-1">{statusCounts.available}</p>
        </div>
        <div className="p-4 rounded-lg border" style={{ backgroundColor: '#1C2128', borderColor: '#30363D' }}>
          <p className="text-xs text-muted-foreground font-semibold uppercase">Occupancy Rate</p>
          <p className="font-heading font-bold text-2xl text-emerald-400 mt-1">{occupancyRate}%</p>
        </div>
      </div>
    </div>
  );
}
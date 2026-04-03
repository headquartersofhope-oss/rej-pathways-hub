import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { isStaff } from '@/lib/rbac';
import PageHeader from '@/components/shared/PageHeader';
import ResourceItemDialog from '@/components/resources/ResourceItemDialog';
import RestockDialog from '@/components/resources/RestockDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Search, AlertTriangle, Pencil, RefreshCw, History } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_LABELS = {
  clothing: 'Clothing', household: 'Household', gift_card: 'Gift Card',
  hygiene: 'Hygiene', food: 'Food', bus_pass: 'Bus Pass',
  tools_equipment: 'Tools/Equipment', electronics: 'Electronics',
  furniture: 'Furniture', other: 'Other',
};

const CATEGORY_COLORS = {
  clothing: 'bg-purple-50 text-purple-700',
  household: 'bg-amber-50 text-amber-700',
  gift_card: 'bg-emerald-50 text-emerald-700',
  hygiene: 'bg-blue-50 text-blue-700',
  food: 'bg-orange-50 text-orange-700',
  bus_pass: 'bg-cyan-50 text-cyan-700',
  tools_equipment: 'bg-slate-100 text-slate-700',
  electronics: 'bg-indigo-50 text-indigo-700',
  furniture: 'bg-rose-50 text-rose-700',
  other: 'bg-muted text-muted-foreground',
};

const SOURCE_LABELS = {
  internal: 'Internal', donated: 'Donated', purchased: 'Purchased',
  grant_funded: 'Grant', partner_agency: 'Partner',
};

export default function ResourceInventory() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [itemDialog, setItemDialog] = useState({ open: false, editing: null });
  const [restockDialog, setRestockDialog] = useState({ open: false, item: null });
  const [historyItem, setHistoryItem] = useState(null);

  const canManage = isStaff(user?.role);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['resource-items'],
    queryFn: () => base44.entities.ResourceItem.list('-created_date', 300),
  });

  const { data: distributions = [] } = useQuery({
    queryKey: ['resource-distributions-all'],
    queryFn: () => base44.entities.ResourceDistribution.list('-distribution_date', 500),
    enabled: !!historyItem,
  });

  const filtered = items.filter(item => {
    if (!showInactive && item.is_active === false) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase()) &&
        !item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lowStock = items.filter(i => i.is_active !== false && i.quantity_on_hand <= (i.low_stock_threshold ?? 2));
  const totalValue = items.filter(i => i.is_active !== false)
    .reduce((sum, i) => sum + ((i.unit_value || 0) * (i.quantity_on_hand || 0)), 0);
  const totalDistributed = distributions.length;

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['resource-items'] });
    setItemDialog({ open: false, editing: null });
  };

  const handleRestocked = () => {
    queryClient.invalidateQueries({ queryKey: ['resource-items'] });
    setRestockDialog({ open: false, item: null });
  };

  const itemHistory = historyItem
    ? distributions.filter(d => d.resource_item_id === historyItem.id)
    : [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Resource Inventory"
        subtitle="Track and distribute tangible resources to residents"
        icon={Package}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="font-heading font-bold text-2xl text-primary">{items.filter(i => i.is_active !== false).length}</p>
          <p className="text-xs text-muted-foreground">Active Items</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={`font-heading font-bold text-2xl ${lowStock.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {lowStock.length}
          </p>
          <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-heading font-bold text-2xl">{items.reduce((s, i) => s + (i.quantity_on_hand || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Units On Hand</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-heading font-bold text-2xl">${totalValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Est. Total Value</p>
        </Card>
      </div>

      {/* Low stock alert bar */}
      {lowStock.length > 0 && (
        <Card className="p-3 mb-5 border-amber-200 bg-amber-50 flex items-center gap-2 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800 font-medium">Low stock:</span>
          {lowStock.map(i => (
            <Badge key={i.id} className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
              {i.name} ({i.quantity_on_hand} left)
            </Badge>
          ))}
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowInactive(x => !x)} className="gap-1.5">
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
            <Button onClick={() => setItemDialog({ open: true, editing: null })} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </>
        )}
      </div>

      {/* Inventory table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No items found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Location</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Unit Value</th>
                  {canManage && <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(item => {
                  const isLow = item.quantity_on_hand <= (item.low_stock_threshold ?? 2);
                  const isEmpty = item.quantity_on_hand <= 0;
                  return (
                    <tr key={item.id} className={`hover:bg-muted/30 transition-colors ${item.is_active === false ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.name}</p>
                        {item.size_or_variant && <p className="text-xs text-muted-foreground">{item.size_or_variant}</p>}
                        {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge className={`text-xs ${CATEGORY_COLORS[item.category] || ''}`}>
                          {CATEGORY_LABELS[item.category] || item.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {SOURCE_LABELS[item.source] || item.source || '—'}
                        {item.donor_name && <span className="block text-[10px]">{item.donor_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                        {item.location || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-heading font-bold text-base ${isEmpty ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-foreground'}`}>
                          {item.quantity_on_hand ?? 0}
                        </span>
                        {isLow && !isEmpty && <p className="text-[10px] text-amber-600">Low</p>}
                        {isEmpty && <p className="text-[10px] text-red-600">Out</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden lg:table-cell">
                        {item.unit_value ? `$${item.unit_value.toFixed(2)}` : '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              title="Restock" onClick={() => setRestockDialog({ open: true, item })}>
                              <RefreshCw className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              title="History" onClick={() => setHistoryItem(historyItem?.id === item.id ? null : item)}>
                              <History className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              title="Edit" onClick={() => setItemDialog({ open: true, editing: item })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Distribution history panel */}
      {historyItem && (
        <Card className="mt-5 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Distribution History — {historyItem.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setHistoryItem(null)}>Close</Button>
          </div>
          {itemHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No distributions logged yet.</div>
          ) : (
            <div className="divide-y">
              {itemHistory.map(d => (
                <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{d.distributed_by_name || 'Staff'} → Resident</p>
                    <p className="text-xs text-muted-foreground">
                      {d.purpose?.replace(/_/g, ' ')} · {d.notes || ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold">×{d.quantity ?? 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.distribution_date ? format(new Date(d.distribution_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ResourceItemDialog
        open={itemDialog.open}
        onOpenChange={(v) => setItemDialog(d => ({ ...d, open: v }))}
        editing={itemDialog.editing}
        user={user}
        onSaved={handleSaved}
      />

      <RestockDialog
        open={restockDialog.open}
        onOpenChange={(v) => setRestockDialog(d => ({ ...d, open: v }))}
        item={restockDialog.item}
        onRestocked={handleRestocked}
      />
    </div>
  );
}
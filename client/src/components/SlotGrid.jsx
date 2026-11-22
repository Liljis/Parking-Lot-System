import React, { useState } from 'react';
import { SlotCard } from './SlotCard';
import { Search, RotateCw, Filter, CheckCircle2, Clock, Ban } from 'lucide-react';

export function SlotGrid({ slots, onReserve, isReserving, onRefresh, isRefreshing, secondsUntilRefresh, hasReachedLimit }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = slots.length;
  const availableCount = slots.filter((s) => s.status === 'available').length;
  const reservedCount = slots.filter((s) => s.status === 'reserved').length;
  const occupiedCount = slots.filter((s) => s.status === 'occupied').length;

  const filteredSlots = slots.filter((slot) => {
    if (filterStatus !== 'all' && slot.status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        slot.slot_number.toLowerCase().includes(q) ||
        (slot.active_booking?.user_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Slots
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
            <span>Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{availableCount}</div>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
            <span>Reserved (15m)</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{reservedCount}</div>
        </div>

        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800 uppercase tracking-wider mb-1">
            <span>Occupied</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{occupiedCount}</div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Auto-Refresh */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'available', label: `Available (${availableCount})` },
            { id: 'reserved', label: `Reserved (${reservedCount})` },
            { id: 'occupied', label: `Occupied (${occupiedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                filterStatus === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search slot (e.g. A-01)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh slot statuses"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh ({secondsUntilRefresh}s)</span>
          </button>
        </div>
      </div>

      {/* Grid of Slots */}
      {filteredSlots.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <Filter className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">No parking slots found</h4>
          <p className="text-xs text-slate-500 mt-1">Try selecting a different filter or clearing your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              onReserve={onReserve}
              isReserving={isReserving === slot.id}
              hasReachedLimit={hasReachedLimit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

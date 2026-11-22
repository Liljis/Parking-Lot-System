import React, { useState } from 'react';
import { ShieldCheck, Clock, User, ArrowRight, Loader2 } from 'lucide-react';

export function SlotCard({ slot, onReserve, isReserving, hasReachedLimit }) {
  const [confirming, setConfirming] = useState(false);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'available':
        return {
          bg: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/10',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          iconColor: 'text-emerald-600',
          dot: 'bg-emerald-500',
          label: 'Available',
          textColor: 'text-emerald-950',
        };
      case 'reserved':
        return {
          bg: 'bg-amber-50/70 border-amber-200 hover:border-amber-300',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          iconColor: 'text-amber-600',
          dot: 'bg-amber-500 animate-pulse',
          label: 'Reserved (15m)',
          textColor: 'text-amber-950',
        };
      case 'occupied':
        return {
          bg: 'bg-rose-50/60 border-rose-200 opacity-90',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          iconColor: 'text-rose-600',
          dot: 'bg-rose-500',
          label: 'Occupied',
          textColor: 'text-rose-950',
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200',
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          iconColor: 'text-slate-600',
          dot: 'bg-slate-400',
          label: status,
          textColor: 'text-slate-900',
        };
    }
  };

  const config = getStatusConfig(slot.status);
  const zone = slot.slot_number.startsWith('A') ? 'Zone A (North Gate)' : 'Zone B (South Gate)';

  const handleReserveClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onReserve(slot.id);
    setConfirming(false);
  };

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all duration-200 flex flex-col justify-between relative ${config.bg}`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {zone}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badge}`}
          >
            <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
            {config.label}
          </span>
        </div>

        {/* Slot Number Main */}
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className={`text-3xl font-extrabold tracking-tight ${config.textColor}`}>
            {slot.slot_number}
          </h3>
        </div>

        {/* GPS location preview */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-4">
          <span>GPS: {slot.location_lat.toFixed(4)}, {slot.location_lng.toFixed(4)}</span>
        </div>

        {/* Active Booking status info */}
        {slot.active_booking && (
          <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-xs text-slate-600 mb-4 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{slot.active_booking.user_name || 'Reserved by Employee'}</span>
            </div>
            {slot.status === 'reserved' && slot.active_booking.expires_at && (
              <div className="flex items-center gap-1 text-[11px] text-amber-700">
                <Clock className="w-3 h-3" />
                <span>Pending GPS arrival</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-2 pt-2 border-t border-slate-200/50">
        {slot.status === 'available' ? (
          hasReachedLimit ? (
            <div className="text-center py-2 px-2 text-[11px] font-medium text-slate-500 bg-slate-100/80 rounded-lg">
              Limit Reached (Max 2 Slots)
            </div>
          ) : confirming ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReserveClick}
                disabled={isReserving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg text-xs shadow-sm transition flex items-center justify-center gap-1"
              >
                {isReserving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Confirm Reservation'
                )}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-2.5 rounded-lg text-xs transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleReserveClick}
              disabled={isReserving}
              className="w-full bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 hover:border-emerald-600 font-semibold py-2 px-3 rounded-lg text-xs shadow-2xs transition flex items-center justify-center gap-1.5 group"
            >
              <span>Reserve Slot</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )
        ) : (
          <div className="text-center py-1.5 text-xs font-medium text-slate-500">
            {slot.status === 'reserved' ? 'Awaiting Arrival' : 'Currently Occupied'}
          </div>
        )}
      </div>
    </div>
  );
}

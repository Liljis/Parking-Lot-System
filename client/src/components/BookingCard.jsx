import React, { useState, useEffect } from 'react';
import { Clock, Navigation, CheckCircle, ShieldAlert, LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';

export function BookingCard({ booking, onConfirmClick, onReleaseClick, isReleasing }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      let targetTime = null;

      if (booking.status === 'pending') {
        targetTime = new Date(booking.expires_at).getTime();
      } else if (booking.status === 'confirmed' && booking.auto_release_at) {
        targetTime = new Date(booking.auto_release_at).getTime();
      }

      if (!targetTime) {
        setTimeLeft('');
        return;
      }

      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(booking.status === 'pending' ? 'Expired' : 'Auto-released');
        setIsUrgent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (booking.status === 'pending') {
        setIsUrgent(diff < 3 * 60 * 1000); // under 3 minutes
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setIsUrgent(false);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [booking]);

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            Awaiting GPS Arrival
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Parked & Confirmed
          </span>
        );
      case 'released':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Check className="w-3.5 h-3.5 text-slate-500" />
            Released
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Expired (No Show)
          </span>
        );
      default:
        return null;
    }
  };

  const slotNumber = booking.slot?.slot_number || booking.slot_number || 'Slot';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xl flex items-center justify-center border border-blue-200 shadow-2xs">
            {slotNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-base">
                Slot {slotNumber}
              </h4>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Booked at: {new Date(booking.booked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(booking.booked_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Countdown Timer */}
        {timeLeft && (booking.status === 'pending' || booking.status === 'confirmed') && (
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${
              isUrgent
                ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {booking.status === 'pending' ? 'Arrive within: ' : 'Auto-release in: '}
              <span className="font-mono font-bold">{timeLeft}</span>
            </span>
          </div>
        )}
      </div>

      {/* Middle info */}
      <div className="py-3 text-xs text-slate-600 flex flex-wrap gap-y-1 gap-x-4">
        {booking.confirmed_at && (
          <div>
            <span className="text-slate-400">Confirmed: </span>
            <span className="font-medium text-slate-800">
              {new Date(booking.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        {booking.released_at && (
          <div>
            <span className="text-slate-400">Departed: </span>
            <span className="font-medium text-slate-800">
              {new Date(booking.released_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(booking.status === 'pending' || booking.status === 'confirmed') && (
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
          {booking.status === 'pending' && (
            <button
              onClick={() => onConfirmClick(booking)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Confirm Arrival (GPS)</span>
            </button>
          )}

          {booking.status === 'confirmed' && (
            <button
              onClick={() => onReleaseClick(booking.id)}
              disabled={isReleasing === booking.id}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              {isReleasing === booking.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Releasing Slot...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Release Slot (Leaving)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

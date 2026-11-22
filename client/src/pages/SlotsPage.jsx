import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { SlotGrid } from '../components/SlotGrid';
import { BookingCard } from '../components/BookingCard';
import { GPSConfirmModal } from '../components/GPSConfirmModal';
import { AlertCircle, CheckCircle, Clock, Sparkles } from 'lucide-react';

const REFRESH_INTERVAL_SECONDS = 30;

export function SlotsPage() {
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL_SECONDS);
  const [reservingSlotId, setReservingSlotId] = useState(null);
  const [releasingBookingId, setReleasingBookingId] = useState(null);
  const [activeModalBooking, setActiveModalBooking] = useState(null);
  const [isConfirmingGps, setIsConfirmingGps] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const [slotsRes, bookingsRes] = await Promise.all([
        api.getSlots(),
        api.getMyBookings(),
      ]);

      if (slotsRes && slotsRes.slots) {
        setSlots(slotsRes.slots);
      }
      if (bookingsRes && bookingsRes.bookings) {
        setMyBookings(bookingsRes.bookings);
      }
    } catch (err) {
      if (err.status === 401) {
        window.location.href = '/login';
        return;
      }
      showToast(err.message || 'Failed to fetch parking slots', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setSecondsUntilRefresh(REFRESH_INTERVAL_SECONDS);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchData(true);
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchData]);

  const handleReserve = async (slotId) => {
    setReservingSlotId(slotId);
    try {
      const res = await api.createBooking(slotId);
      showToast(res.message || 'Slot reserved! You have 15 minutes to arrive.', 'success');
      await fetchData(true);
    } catch (err) {
      showToast(err.message || 'Failed to reserve slot', 'error');
    } finally {
      setReservingSlotId(null);
    }
  };

  const handleOpenGpsModal = (booking) => {
    setActiveModalBooking(booking);
  };

  const handleConfirmGps = async (bookingId, lat, lng) => {
    setIsConfirmingGps(true);
    try {
      const res = await api.confirmArrival(bookingId, lat, lng);
      showToast(res.message || 'Arrival confirmed! Slot is now yours.', 'success');
      setActiveModalBooking(null);
      await fetchData(true);
    } catch (err) {
      showToast(err.message || 'GPS verification failed', 'error');
    } finally {
      setIsConfirmingGps(false);
    }
  };

  const handleRelease = async (bookingId) => {
    setReleasingBookingId(bookingId);
    try {
      const res = await api.releaseBooking(bookingId);
      showToast(res.message || 'Slot released successfully. Safe travels!', 'success');
      await fetchData(true);
    } catch (err) {
      showToast(err.message || 'Failed to release slot', 'error');
    } finally {
      setReleasingBookingId(null);
    }
  };

  // Find all active bookings for the user (pending or confirmed)
  const activeBookings = myBookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed'
  );
  const hasReachedLimit = activeBookings.length >= 2;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-emerald-50 border-emerald-300 text-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Active User Bookings Banner */}
      {activeBookings.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Your Active Parking Reservations
              </h3>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                hasReachedLimit
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {activeBookings.length} / 2 Slots Booked {hasReachedLimit ? '(Limit Reached)' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onConfirmClick={handleOpenGpsModal}
                onReleaseClick={handleRelease}
                isReleasing={releasingBookingId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Grid View Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Live Parking Lot Status
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time slot availability. Each user can hold up to 2 active reservations.
          </p>
        </div>
      </div>

      {/* Slot Grid Component */}
      <SlotGrid
        slots={slots}
        onReserve={handleReserve}
        isReserving={reservingSlotId}
        onRefresh={() => fetchData(false)}
        isRefreshing={isRefreshing}
        secondsUntilRefresh={secondsUntilRefresh}
        hasReachedLimit={hasReachedLimit}
      />

      {/* GPS Confirm Modal */}
      <GPSConfirmModal
        booking={activeModalBooking}
        isOpen={Boolean(activeModalBooking)}
        onClose={() => setActiveModalBooking(null)}
        onConfirm={handleConfirmGps}
        isConfirming={isConfirmingGps}
      />
    </div>
  );
}

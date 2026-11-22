import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookingCard } from '../components/BookingCard';
import { GPSConfirmModal } from '../components/GPSConfirmModal';
import { Calendar, AlertCircle, CheckCircle, Clock, CheckCircle2, History } from 'lucide-react';

export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasingId, setReleasingId] = useState(null);
  const [activeModalBooking, setActiveModalBooking] = useState(null);
  const [isConfirmingGps, setIsConfirmingGps] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const fetchBookings = async () => {
    try {
      const res = await api.getMyBookings();
      if (res && res.bookings) {
        setBookings(res.bookings);
      }
    } catch (err) {
      if (err.status === 401) {
        window.location.href = '/login';
        return;
      }
      showToast(err.message || 'Failed to fetch bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenGpsModal = (booking) => {
    setActiveModalBooking(booking);
  };

  const handleConfirmGps = async (bookingId, lat, lng) => {
    setIsConfirmingGps(true);
    try {
      const res = await api.confirmArrival(bookingId, lat, lng);
      showToast(res.message || 'Arrival confirmed!', 'success');
      setActiveModalBooking(null);
      await fetchBookings();
    } catch (err) {
      showToast(err.message || 'GPS confirmation failed', 'error');
    } finally {
      setIsConfirmingGps(false);
    }
  };

  const handleRelease = async (bookingId) => {
    setReleasingId(bookingId);
    try {
      const res = await api.releaseBooking(bookingId);
      showToast(res.message || 'Slot released successfully', 'success');
      await fetchBookings();
    } catch (err) {
      showToast(err.message || 'Failed to release slot', 'error');
    } finally {
      setReleasingId(null);
    }
  };

  const activeBookings = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'confirmed'
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'released' || b.status === 'expired'
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Alert */}
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

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Calendar className="w-6 h-6 text-blue-600" />
          <span>My Parking Bookings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Track your reservations, confirm your arrival with GPS, and release slots when departing.
        </p>
      </div>

      {/* Active Bookings Section */}
      <div className="mb-10 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Active Reservations ({activeBookings.length})</span>
        </h3>

        {activeBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800">No active bookings right now</h4>
            <p className="text-xs text-slate-500 mt-1">
              You can reserve any available parking slot from the Live Slots map.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onConfirmClick={handleOpenGpsModal}
                onReleaseClick={handleRelease}
                isReleasing={releasingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past History Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <span>Past History ({pastBookings.length})</span>
        </h3>

        {pastBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-400">
            No past booking history yet.
          </div>
        ) : (
          <div className="space-y-3">
            {pastBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onConfirmClick={handleOpenGpsModal}
                onReleaseClick={handleRelease}
                isReleasing={releasingId}
              />
            ))}
          </div>
        )}
      </div>

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

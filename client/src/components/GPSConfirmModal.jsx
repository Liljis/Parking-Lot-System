import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Navigation, AlertTriangle, CheckCircle, Loader2, X, Info } from 'lucide-react';

export function GPSConfirmModal({ booking, isOpen, onClose, onConfirm, isConfirming }) {
  const { lotInfo } = useAuth();
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');

  const lotLat = lotInfo?.lat || 37.774929;
  const lotLng = lotInfo?.lng || -122.419416;
  const lotRadius = lotInfo?.radiusMeters || 150;

  useEffect(() => {
    if (isOpen) {
      handleGetBrowserGps();
    } else {
      setCoords(null);
      setGeoError(null);
      setManualMode(false);
    }
  }, [isOpen]);

  const handleGetBrowserGps = () => {
    setAcquiringGps(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setAcquiringGps(false);
      setManualMode(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setAcquiringGps(false);
      },
      (error) => {
        setGeoError(
          error.message ||
            'Unable to acquire GPS position. Make sure location permission is enabled.'
        );
        setAcquiringGps(false);
        setManualMode(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSimulateInside = () => {
    // Exact lot center or slight offset (5m)
    const simulated = {
      lat: lotLat + 0.00001,
      lng: lotLng + 0.00001,
      simulated: true,
    };
    setCoords(simulated);
    setGeoError(null);
  };

  const handleSimulateOutside = () => {
    // 500m away
    const simulated = {
      lat: lotLat + 0.005,
      lng: lotLng + 0.005,
      simulated: true,
    };
    setCoords(simulated);
    setGeoError(null);
  };

  const handleSubmit = () => {
    if (manualMode && (!coords || customLat || customLng)) {
      const lat = parseFloat(customLat);
      const lng = parseFloat(customLng);
      if (isNaN(lat) || isNaN(lng)) {
        setGeoError('Please enter valid numeric latitude and longitude');
        return;
      }
      onConfirm(booking.id, lat, lng);
    } else if (coords) {
      onConfirm(booking.id, coords.lat, coords.lng);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isConfirming}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Confirm GPS Arrival
            </h3>
            <p className="text-xs text-slate-500">
              Slot {booking.slot?.slot_number || booking.slot_number} • Must be inside {lotRadius}m boundary
            </p>
          </div>
        </div>

        {/* GPS Info Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-semibold text-slate-700">Parking Lot Center:</span>
            <span>{lotLat.toFixed(6)}, {lotLng.toFixed(6)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="font-semibold text-slate-700">Allowed Radius:</span>
            <span className="font-bold text-blue-600">{lotRadius} meters</span>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Your Current GPS:</span>
              {acquiringGps && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> Acquiring...
                </span>
              )}
            </div>

            {coords ? (
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] flex items-center justify-between">
                <span>
                  Lat: {coords.lat.toFixed(6)} | Lng: {coords.lng.toFixed(6)}
                </span>
                {coords.simulated ? (
                  <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-sans font-semibold">
                    Simulated
                  </span>
                ) : (
                  <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-sans font-semibold">
                    Live GPS
                  </span>
                )}
              </div>
            ) : (
              <div className="text-slate-400 italic">No GPS coordinates acquired yet</div>
            )}
          </div>
        </div>

        {/* Geolocation Error Alert if any */}
        {geoError && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">GPS Warning</p>
              <p className="text-[11px] text-amber-700">{geoError}</p>
            </div>
          </div>
        )}

        {/* Simulation / Dev Helper Controls */}
        <div className="mb-6 p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 mb-2">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Developer / Local Testing Controls</span>
          </div>
          <p className="text-[11px] text-blue-700 mb-2.5">
            You can test the arrival geofence verification using simulated coordinates:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSimulateInside}
              className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs transition"
            >
              Simulate Inside Lot (&lt;10m)
            </button>
            <button
              type="button"
              onClick={handleSimulateOutside}
              className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-2xs transition"
            >
              Simulate Outside Lot (500m)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!coords && !manualMode) || isConfirming || acquiringGps}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying Location...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verify & Confirm Arrival</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

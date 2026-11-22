import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, MapPin, User, LogOut, Calendar } from 'lucide-react';

export function Navbar() {
  const { user, logout, lotInfo } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Lot name */}
          <div className="flex items-center gap-6">
            <Link to="/slots" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight leading-none block">
                  ParkSmart
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  w3id Verified
                </span>
              </div>
            </Link>

            {lotInfo && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-slate-800">{lotInfo.name}</span>
                <span className="text-slate-400">({lotInfo.radiusMeters}m geofence)</span>
              </div>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/slots"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                isActive('/slots')
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Available Slots</span>
            </Link>

            <Link
              to="/my-bookings"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                isActive('/my-bookings')
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings</span>
            </Link>
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                {user.email}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car, ShieldCheck, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { user, loginDev, lotInfo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(searchParams.get('error') || '');

  // Custom dev mock inputs
  const [devW3id, setDevW3id] = useState('w3id-employee-42');
  const [devName, setDevName] = useState('Alex Morgan');
  const [devEmail, setDevEmail] = useState('alex.morgan@ibm.com');

  if (user) {
    navigate('/slots', { replace: true });
    return null;
  }

  const handleOidcLogin = () => {
    window.location.href = '/auth/login';
  };

  const handleDevLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await loginDev({
        w3id: devW3id,
        name: devName,
        email: devEmail,
      });
      navigate('/slots');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
            <Car className="w-9 h-9" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-3xl font-extrabold tracking-tight text-white">
          Parking Lot System
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Smart 15-minute slot reservation with GPS arrival confirmation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Standard w3id SSO Button */}
          <div className="space-y-4">
            <button
              onClick={handleOidcLogin}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Sign In with w3id SSO</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
            <div className="text-[11px] text-center text-slate-500">
              Only authorized IBM employees via OpenID Connect (OIDC)
            </div>
          </div>

          {/* Dev / Local Testing Mock Auth Form */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Quick Dev Mock Login
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Allows instant local browser testing without live corporate OIDC server:
            </p>

            <form onSubmit={handleDevLogin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  w3id / Email
                </label>
                <input
                  type="text"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                {loading ? 'Logging in...' : 'Sign in as Demo User'}
              </button>
            </form>
          </div>
        </div>

        {lotInfo && (
          <div className="mt-6 text-center text-xs text-slate-400">
            Target Lot: <span className="text-slate-300 font-semibold">{lotInfo.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

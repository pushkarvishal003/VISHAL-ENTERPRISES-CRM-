/**
 * Vishal Enterprises CRM - First Login Modal
 * Forces new password and 4/6-digit PIN creation on first access
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { fetchApi } from '../lib/api.ts';

interface FirstLoginModalProps {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({ user, onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (pin.length !== pinLength || !/^\d+$/.test(pin)) {
      setError(`PIN must be exactly ${pinLength} numerical digits.`);
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN and confirmation PIN do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi<{ message: string; user: any }>('/api/auth/complete-first-login', {
        method: 'POST',
        body: JSON.stringify({ newPassword, pin }),
      });

      onComplete(res.user);
    } catch (err: any) {
      setError(err.message || 'Failed to configure security credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 sm:p-8 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">First Login Security Setup</h2>
            <p className="text-xs text-slate-400">Account: {user.userId} ({user.role})</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 leading-relaxed">
          Welcome to Vishal Enterprises CRM. For security, you must set your private password and create a 4 or 6 digit PIN.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Step 1: New Password */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Step 1: Create New Private Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                id="input-first-new-password"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Confirm New Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                id="input-first-confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                required
              />
            </div>
          </div>

          {/* Step 2: PIN selection */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-medium">Step 2: Choose PIN Length</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(4);
                    setPin('');
                    setConfirmPin('');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    pinLength === 4 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  4-Digit PIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(6);
                    setPin('');
                    setConfirmPin('');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    pinLength === 6 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  6-Digit PIN
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-slate-300 mb-1">Enter {pinLength}-Digit PIN *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    id="input-first-pin"
                    type="password"
                    maxLength={pinLength}
                    placeholder={`${pinLength} digits`}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white tracking-widest text-center font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Confirm PIN *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    id="input-first-confirm-pin"
                    type="password"
                    maxLength={pinLength}
                    placeholder="Re-enter PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white tracking-widest text-center font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            id="btn-first-login-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2"
          >
            {loading ? (
              'Securing Credentials...'
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Save Credentials & Open Dashboard
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

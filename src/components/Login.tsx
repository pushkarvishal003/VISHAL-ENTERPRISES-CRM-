/**
 * Vishal Enterprises CRM - Master Login Component
 * Strictly isolates ADMIN, STAFF, and DSA authentication portals.
 * Default admin credentials are NEVER shown or hinted on UI.
 */

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Briefcase, Lock, User, KeyRound, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { UserRole, StaffDepartment, StaffDesignation } from '../types/crm.ts';
import { fetchApi, setStoredToken } from '../lib/api.ts';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [activeRole, setActiveRole] = useState<UserRole>('ADMIN');
  const [loginMode, setLoginMode] = useState<'password' | 'pin'>('password');

  // Form states
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [department, setDepartment] = useState<StaffDepartment>('Sales');
  const [designation, setDesignation] = useState<StaffDesignation>('Sales Executive');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string } | null>(null);

  // DSA Registration Modal state
  const [showDsaRegister, setShowDsaRegister] = useState(false);
  const [dsaRegData, setDsaRegData] = useState({
    fullName: '',
    mobile: '',
    whatsapp: '',
    email: '',
    city: '',
    state: '',
    businessName: '',
    businessType: 'Individual Partner',
    experience: '1-2 years',
    password: '',
  });
  const [dsaRegSuccess, setDsaRegSuccess] = useState<string | null>(null);

  const handleRoleChange = (role: UserRole) => {
    setActiveRole(role);
    setError(null);
    setPassword('');
    setPin('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        role: activeRole,
        loginMode,
        userId: userId.trim(),
      };

      if (loginMode === 'pin') {
        payload.pin = pin.trim();
      } else {
        payload.password = password;
      }

      if (activeRole === 'STAFF') {
        payload.department = department;
        payload.designation = designation;
      }

      const res = await fetchApi<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setStoredToken(res.token);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDsaRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetchApi<{ message: string; dsaId: string }>('/api/auth/register-dsa', {
        method: 'POST',
        body: JSON.stringify(dsaRegData),
      });

      setDsaRegSuccess(
        `Registration Successful! Your Partner ID is ${res.dsaId}. You can now log in using your Partner ID and password.`
      );
      setUserId(res.dsaId);
      setPassword(dsaRegData.password);
      setShowDsaRegister(false);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">VISHAL ENTERPRISES</h1>
        <p className="text-slate-400 text-sm mt-1">Website Sales & Web Services CRM</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Role Selector Tabs: ADMIN | STAFF | DSA */}
        <div className="grid grid-cols-3 border-b border-slate-700 bg-slate-900/50 p-1.5 gap-1">
          <button
            id="role-tab-admin"
            type="button"
            onClick={() => handleRoleChange('ADMIN')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeRole === 'ADMIN'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ADMIN
          </button>
          <button
            id="role-tab-staff"
            type="button"
            onClick={() => handleRoleChange('STAFF')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeRole === 'STAFF'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            STAFF
          </button>
          <button
            id="role-tab-dsa"
            type="button"
            onClick={() => handleRoleChange('DSA')}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              activeRole === 'DSA'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            DSA
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* DSA Registration Promo (Visible on DSA tab) */}
          {activeRole === 'DSA' && (
            <div className="mb-6 p-4 rounded-xl bg-blue-950/40 border border-blue-800/50 text-xs">
              <p className="text-slate-300 font-medium mb-2">Don&apos;t have a DSA ID yet?</p>
              <p className="text-slate-400 mb-3">Register new DSA Partner ID for instant Admin panel sync.</p>
              <button
                id="btn-register-dsa"
                type="button"
                onClick={() => setShowDsaRegister(true)}
                className="w-full py-2 bg-blue-600/90 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
              >
                Register DSA ID
              </button>
            </div>
          )}

          {/* Success Banner */}
          {dsaRegSuccess && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{dsaRegSuccess}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Staff Department & Role Selection */}
            {activeRole === 'STAFF' && (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department *</label>
                  <select
                    id="staff-department-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as StaffDepartment)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="Sales">Sales</option>
                    <option value="Verification">Verification</option>
                    <option value="HR">HR</option>
                    <option value="Accounts">Accounts</option>
                    <option value="IT">IT</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Designation *</label>
                  <select
                    id="staff-designation-select"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value as StaffDesignation)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="Manager">Manager</option>
                    <option value="Branch Manager">Branch Manager</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Sales Executive">Sales Executive</option>
                    <option value="DSA">DSA</option>
                    <option value="Telecaller">Telecaller</option>
                  </select>
                </div>
              </div>
            )}

            {/* User ID Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {activeRole === 'ADMIN' && 'Super Admin User ID / Mobile'}
                {activeRole === 'STAFF' && 'Staff User ID / Employee ID / Mobile'}
                {activeRole === 'DSA' && 'User ID / Partner ID / Mobile'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-user-id"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Login Mode Toggle: Password vs PIN */}
            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-medium text-slate-300">
                {loginMode === 'pin' ? 'Security PIN' : 'Private Password'}
              </label>
              <button
                type="button"
                onClick={() => setLoginMode(loginMode === 'password' ? 'pin' : 'password')}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
              >
                {loginMode === 'password' ? 'Login with PIN instead' : 'Use Password Instead'}
              </button>
            </div>

            {/* Password or PIN Field */}
            {loginMode === 'password' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="input-pin"
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white tracking-widest focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            {/* Forgot PIN / Forgot Password Links */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'Forgot PIN',
                    message:
                      activeRole === 'ADMIN'
                        ? 'Super Admin can reset PIN by logging in with the Private Password and navigating to Change PIN in the profile menu.'
                        : 'Please contact the Super Admin or HR Department to reset your security PIN.',
                  })
                }
                className="hover:text-slate-200"
              >
                Forgot PIN?
              </button>
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'Forgot Password',
                    message:
                      activeRole === 'ADMIN'
                        ? 'If you have misplaced Super Admin credentials, access must be restored via secure server console or database credentials reset.'
                        : 'Please contact Super Admin to generate a temporary password for your account.',
                  })
                }
                className="hover:text-slate-200"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition shadow-lg shadow-blue-600/25 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : activeRole === 'DSA' ? 'Login to DSA Portal' : 'Submit'}
            </button>
          </form>
        </div>
      </div>

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-sm w-full p-6 text-slate-200">
            <h3 className="text-base font-semibold text-white mb-2">{infoModal.title}</h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">{infoModal.message}</p>
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* DSA Registration Modal */}
      {showDsaRegister && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200 my-8">
            <h3 className="text-lg font-bold text-white mb-1">Register New DSA Partner</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create your partner account. Generates unique Partner ID and syncs instantly with Admin.
            </p>

            <form onSubmit={handleDsaRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={dsaRegData.fullName}
                  onChange={(e) => setDsaRegData({ ...dsaRegData, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    value={dsaRegData.mobile}
                    onChange={(e) => setDsaRegData({ ...dsaRegData, mobile: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={dsaRegData.whatsapp}
                    onChange={(e) => setDsaRegData({ ...dsaRegData, whatsapp: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={dsaRegData.email}
                  onChange={(e) => setDsaRegData({ ...dsaRegData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={dsaRegData.city}
                    onChange={(e) => setDsaRegData({ ...dsaRegData, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={dsaRegData.state}
                    onChange={(e) => setDsaRegData({ ...dsaRegData, state: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Agency / Business Name</label>
                <input
                  type="text"
                  value={dsaRegData.businessName}
                  onChange={(e) => setDsaRegData({ ...dsaRegData, businessName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Create Initial Password *</label>
                <input
                  type="password"
                  value={dsaRegData.password}
                  onChange={(e) => setDsaRegData({ ...dsaRegData, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDsaRegister(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  {loading ? 'Creating...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

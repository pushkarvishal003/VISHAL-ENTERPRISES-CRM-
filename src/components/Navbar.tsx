/**
 * Vishal Enterprises CRM - Main Navbar
 * Displays branding, role indicator, live notifications, and customized profile menu
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Bell,
  User as UserIcon,
  LogOut,
  KeyRound,
  Lock,
  FileCheck,
  HelpCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
  Check,
  ChevronDown,
  Menu,
  Search,
} from 'lucide-react';
import { User, NotificationItem } from '../types/crm.ts';
import { fetchApi, clearStoredToken } from '../lib/api.ts';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onToggleMobileMenu?: () => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onNavigate, onToggleMobileMenu, onOpenSearch }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);

  // Form states for password change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  // Form states for pin change
  const [currentPinOrPass, setCurrentPinOrPass] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchApi<NotificationItem[]>('/api/notifications');
      setNotifications(data || []);
    } catch {
      // Ignore background notification fetch errors
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetchApi(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);
    try {
      await fetchApi('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      setPassSuccess('Password updated successfully.');
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setShowChangePassword(false), 1500);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password.');
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);
    try {
      await fetchApi('/api/auth/change-pin', {
        method: 'POST',
        body: JSON.stringify({ currentPinOrPassword: currentPinOrPass, newPin }),
      });
      setPinSuccess('Security PIN updated successfully.');
      setCurrentPinOrPass('');
      setNewPin('');
      setTimeout(() => setShowChangePin(false), 1500);
    } catch (err: any) {
      setPinError(err.message || 'Failed to update PIN.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-2.5 sm:px-6 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            id="btn-mobile-menu-toggle"
            onClick={onToggleMobileMenu}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg lg:hidden transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-white tracking-wide">
              VISHAL ENTERPRISES
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                user.role === 'ADMIN'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : user.role === 'STAFF'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {user.role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Website Sales & Web Services CRM
          </p>
        </div>
      </div>

      {/* Right Controls: Notifications & Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Omnibox Search Trigger */}
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-400 hover:text-white text-xs transition shadow-sm"
            title="Global Search (Ctrl+K / Cmd+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Search CRM...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            id="btn-notifications-toggle"
            type="button"
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowProfileMenu(false);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 relative transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
                <span className="font-semibold text-white">Notifications</span>
                <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/60">
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-slate-500 text-xs">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleMarkAsRead(n.id);
                        if (n.link) onNavigate(n.link.replace('/', ''));
                        setShowNotifMenu(false);
                      }}
                      className={`p-2.5 hover:bg-slate-700/50 cursor-pointer rounded transition ${
                        !n.read ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-slate-200">{n.title}</span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                      </div>
                      <p className="text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            id="btn-profile-menu-toggle"
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center">
              {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-none">{user.fullName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{user.userId}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-700">
                <p className="font-semibold text-white">{user.fullName}</p>
                <p className="text-slate-400 text-[11px]">{user.email}</p>
                <p className="text-blue-400 text-[10px] font-mono mt-0.5">ID: {user.userId}</p>
              </div>

              <div className="py-1">
                {/* ADMIN Profile Menu */}
                {user.role === 'ADMIN' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('settings');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePin(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      Change PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('notifications');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Bell className="w-4 h-4 text-slate-400" />
                      Notifications
                    </button>
                  </>
                )}

                {/* STAFF Profile Menu */}
                {user.role === 'STAFF' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePin(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      Change PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('kyc');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <FileCheck className="w-4 h-4 text-slate-400" />
                      My KYC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('requests');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      Request
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('complaints');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      Complaint
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('notifications');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Bell className="w-4 h-4 text-slate-400" />
                      Notifications
                    </button>
                  </>
                )}

                {/* DSA Profile Menu */}
                {user.role === 'DSA' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePin(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      Change PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('kyc');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <FileCheck className="w-4 h-4 text-slate-400" />
                      My KYC
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('agreement');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      Agreement
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('commission');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      Commission
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('withdrawals');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      Withdrawal History
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('notifications');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-700/60 text-slate-300 flex items-center gap-2.5"
                    >
                      <Bell className="w-4 h-4 text-slate-400" />
                      Notifications
                    </button>
                  </>
                )}

                <div className="border-t border-slate-700 my-1" />

                {/* Logout Button */}
                <button
                  id="btn-navbar-logout"
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 flex items-center gap-2.5 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-sm w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2">Change Account Password</h3>
            {passError && <p className="text-red-400 text-xs mb-3">{passError}</p>}
            {passSuccess && <p className="text-emerald-400 text-xs mb-3">{passSuccess}</p>}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showChangePin && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-sm w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2">Change Security PIN</h3>
            {pinError && <p className="text-red-400 text-xs mb-3">{pinError}</p>}
            {pinSuccess && <p className="text-emerald-400 text-xs mb-3">{pinSuccess}</p>}

            <form onSubmit={handleChangePinSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Current PIN or Account Password *</label>
                <input
                  type="password"
                  value={currentPinOrPass}
                  onChange={(e) => setCurrentPinOrPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">New PIN (4 or 6 digits) *</label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white tracking-widest text-center font-mono"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePin(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

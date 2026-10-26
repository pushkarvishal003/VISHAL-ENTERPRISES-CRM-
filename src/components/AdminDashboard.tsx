/**
 * Vishal Enterprises CRM v2.0 - Administrator Control Center
 * 100% Real Database Analytics, Date Range Filters, Operations & Follow-up Actions
 */

import React, { useState, useEffect, useId } from 'react';
import {
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Layers,
  RotateCcw,
  Wallet,
  Calendar,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  Eye,
  Camera,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  UserCheck,
  UserX,
  Bell,
  LogOut,
  ExternalLink,
  Search,
  ArrowUpRight,
  CheckCircle,
  HelpCircle,
  XCircle,
  Clock3,
  CalendarDays,
  Award,
  BarChart3,
  PieChart,
  FileCheck,
} from 'lucide-react';
import { User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface AdminDashboardProps {
  user: User;
  onNavigate: (view: string, filter?: any) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onNavigate, onLogout }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Global Date Filter State
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

  // Modals & Panels State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cameraPhotoModal, setCameraPhotoModal] = useState<{ photo: string; staffName: string; time: string; dept: string } | null>(null);
  const [selectedSaleOrder, setSelectedSaleOrder] = useState<any | null>(null);
  const [followupModal, setFollowupModal] = useState<{
    action: 'complete' | 'reschedule';
    followup: any;
  } | null>(null);
  const [followupResultText, setFollowupResultText] = useState('');
  const [followupNewDate, setFollowupNewDate] = useState('');
  const [followupNewTime, setFollowupNewTime] = useState('11:00');
  const [followupNotes, setFollowupNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Upcoming renewals filter
  const [renewalsFilterDays, setRenewalsFilterDays] = useState<number>(30);

  // Dynamic formatted current date
  const [currentFormattedDate, setCurrentFormattedDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      setCurrentFormattedDate(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Dashboard Analytics
  const loadDashboardStats = async (rangeKey = dateRange, start = customStart, end = customEnd) => {
    try {
      setRefreshing(true);
      let query = `?range=${encodeURIComponent(rangeKey)}`;
      if (rangeKey === 'custom' && start && end) {
        query += `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
      }
      const res = await fetchApi<any>(`/api/admin/dashboard-stats${query}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load admin dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardStats(dateRange);
  }, [dateRange]);

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) return;
    setDateRange('custom');
    setShowCustomPicker(false);
    loadDashboardStats('custom', customStart, customEnd);
  };

  const handleResetDateRange = () => {
    setDateRange('all');
    setCustomStart('');
    setCustomEnd('');
    setShowCustomPicker(false);
  };

  // Follow-up quick action: Mark Completed
  const handleCompleteFollowup = async () => {
    if (!followupModal?.followup) return;
    setActionLoading(true);
    try {
      await fetchApi(`/api/followups/${followupModal.followup.id || followupModal.followup.followupId}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ result: followupResultText || 'Follow-up completed from Admin Console' }),
      });
      setFollowupModal(null);
      setFollowupResultText('');
      loadDashboardStats();
    } catch (err: any) {
      alert(err.message || 'Failed to complete follow-up.');
    } finally {
      setActionLoading(false);
    }
  };

  // Follow-up quick action: Reschedule
  const handleRescheduleFollowup = async () => {
    if (!followupModal?.followup || !followupNewDate) return;
    setActionLoading(true);
    try {
      await fetchApi(`/api/followups/${followupModal.followup.id || followupModal.followup.followupId}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({
          date: followupNewDate,
          time: followupNewTime,
          notes: followupNotes,
        }),
      });
      setFollowupModal(null);
      setFollowupNewDate('');
      setFollowupNewTime('11:00');
      setFollowupNotes('');
      loadDashboardStats();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule follow-up.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading Administrator Control Center...</p>
      </div>
    );
  }

  const sc = data?.summaryCards || {};
  const sr = data?.salesAndRevenue || {};
  const pipeline = data?.pipeline || [];
  const recentSales = data?.recentSales || [];
  const todayFollowups = data?.todayFollowups || [];
  const overdueFollowups = data?.overdueFollowups || [];
  const staffPerf = data?.staffPerformance || [];
  const dsaPerf = data?.dsaPerformance || [];
  const projectStatuses = data?.projectStatuses || { counts: {}, total: 0 };
  const paymentOverview = data?.paymentOverview || {};
  const attendanceToday = data?.attendanceToday || {};
  const kycAlerts = data?.kycAlerts || {};
  const dsaWithdrawals = data?.dsaWithdrawals || {};
  const pendingWork = data?.pendingWork || [];
  const upcomingRenewals = (data?.upcomingRenewals || []).filter(
    (r: any) => renewalsFilterDays === 0 || r.daysRemaining <= renewalsFilterDays
  );
  const conversionAnalytics = data?.conversionAnalytics || {};
  const lostLeads = data?.lostLeadsAnalysis || {};
  const recentActivity = data?.recentActivity || [];
  const notifications = data?.notifications || { unreadCount: 0, list: [] };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. ADMIN DASHBOARD HEADER */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Brand, Console Title, Greeting */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                VISHAL ENTERPRISES CRM v2.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Administrator Console
              </span>
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {currentFormattedDate}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-blue-400">{user.fullName || 'Super Admin'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Enterprise control center for sales pipelines, project deliverables, payment verifications, staff attendance, and DSA commission disbursements.
            </p>
          </div>

          {/* Right: Notification Bell, Profile, Refresh & Logout */}
          <div className="flex items-center gap-2.5 self-start lg:self-center">
            {/* Live Refresh Button */}
            <button
              type="button"
              onClick={() => loadDashboardStats()}
              title="Refresh Dashboard Data"
              className={`p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition ${
                refreshing ? 'animate-spin text-blue-400' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                type="button"
                id="btn-admin-notifications"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                className="relative p-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <Bell className="w-4 h-4" />
                {notifications.unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
                    {notifications.unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3.5 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        System Notifications
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {notifications.unreadCount} unread
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/60 text-xs">
                    {notifications.list.length === 0 ? (
                      <p className="p-5 text-center text-slate-400 text-xs">No notifications yet.</p>
                    ) : (
                      notifications.list.map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-3.5 hover:bg-slate-700/40 transition cursor-pointer ${
                            !n.read ? 'bg-blue-950/20' : ''
                          }`}
                          onClick={() => {
                            if (n.link) onNavigate(n.link.replace('/', ''));
                            setNotificationsOpen(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-white">{n.title}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {n.createdAt?.split('T')[0]}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                id="btn-admin-profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow">
                  {user.fullName ? user.fullName[0].toUpperCase() : 'A'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-white leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-blue-400 leading-tight">Admin • {user.userId}</p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 p-4 space-y-3 text-xs">
                  <div className="pb-3 border-b border-slate-700">
                    <p className="font-bold text-white text-sm">{user.fullName}</p>
                    <p className="text-slate-400 text-[11px]">{user.email || user.mobile}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                      System Administrator
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <p className="flex justify-between">
                      <span className="text-slate-400">User ID:</span>
                      <span className="font-mono font-bold text-white">{user.userId}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span>Management</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Security PIN:</span>
                      <span className="text-emerald-400">Active</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-700 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        onNavigate('audit-logs');
                      }}
                      className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-center font-medium transition"
                    >
                      Audit Trail
                    </button>
                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onLogout();
                        }}
                        className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-lg font-medium transition flex items-center justify-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Logout Button */}
            {onLogout && (
              <button
                type="button"
                id="btn-admin-logout"
                onClick={onLogout}
                title="Secure Logout"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. GLOBAL DATE FILTER BAR */}
      {/* ========================================================================= */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            Time Filter:
          </span>

          {[
            { key: 'all', label: 'All Time' },
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'year', label: 'This Year' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setDateRange(item.key);
                setShowCustomPicker(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dateRange === item.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              dateRange === 'custom'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Custom Range</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          {dateRange === 'all'
            ? 'Showing historical lifetime data'
            : dateRange === 'custom' && customStart && customEnd
            ? `Range: ${customStart} to ${customEnd}`
            : `Showing data for ${dateRange}`}
          {' • '}
          <span className="text-slate-500">Live operational queues reflect current status</span>
        </div>
      </section>

      {/* Custom Date Range Picker Drawer */}
      {showCustomPicker && (
        <div className="bg-slate-800/90 border border-blue-500/40 rounded-2xl p-4 flex flex-wrap items-end gap-3 shadow-lg animate-in fade-in duration-150">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Start Date (From)
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              End Date (To)
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustomDate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition"
          >
            Apply Filter
          </button>

          <button
            type="button"
            onClick={handleResetDateRange}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-xl transition"
          >
            Reset
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TOP SUMMARY CARDS (14 REAL DATABASE CARDS) */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            Executive KPIs & Real-Time Business Volume
          </h2>
          <span className="text-[11px] text-slate-500">Click any card to inspect records</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Total Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 rounded-2xl p-4 transition-all duration-200 shadow hover:shadow-blue-500/5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Total Leads</span>
                <Users className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-white">{sc.totalLeads ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>All sources</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
            </p>
          </div>

          {/* 2. New Leads */}
          <div
            onClick={() => onNavigate('leads', 'New')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">New Leads</span>
                <Clock className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-cyan-300">{sc.newLeads ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Unassigned/New</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
            </p>
          </div>

          {/* 3. Today's Follow-ups */}
          <div
            onClick={() => onNavigate('followups')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Today&apos;s Follow-ups</span>
                <Calendar className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-indigo-300">{sc.todayFollowups ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Scheduled today</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
            </p>
          </div>

          {/* 4. Overdue Follow-ups (Warning Highlight) */}
          <div
            onClick={() => onNavigate('followups')}
            className={`group cursor-pointer border rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between ${
              (sc.overdueFollowups || 0) > 0
                ? 'bg-rose-950/30 border-rose-600/50 hover:border-rose-500'
                : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate text-rose-300">Overdue Follow-ups</span>
                <AlertTriangle className={`w-4 h-4 ${sc.overdueFollowups > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
              </div>
              <p className="text-2xl font-black text-rose-400">{sc.overdueFollowups ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Requires action</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-rose-400" />
            </p>
          </div>

          {/* 5. Total Proposals */}
          <div
            onClick={() => onNavigate('proposals')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Total Proposals</span>
                <FileText className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-white">{sc.totalProposals ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Quotations sent</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-purple-400" />
            </p>
          </div>

          {/* 6. Accepted Proposals */}
          <div
            onClick={() => onNavigate('proposals')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Accepted Proposals</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{sc.acceptedProposals ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Won deals</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
            </p>
          </div>

          {/* 7. Total Website Sales */}
          <div
            onClick={() => onNavigate('sales')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Website Sales</span>
                <TrendingUp className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-white">{sc.totalWebsiteSales ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Orders closed</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
            </p>
          </div>

          {/* 8. Total Sales Amount */}
          <div
            onClick={() => onNavigate('sales')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Total Sales Value</span>
                <DollarSign className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-xl font-black text-emerald-400">₹{formatINR(sc.totalSalesAmount || 0)}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Deal volume</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
            </p>
          </div>

          {/* 9. Amount Received (Verified Payments) */}
          <div
            onClick={() => onNavigate('payments')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-teal-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Amount Received</span>
                <FileCheck className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-xl font-black text-teal-300">₹{formatINR(sc.amountReceived || 0)}</p>
            </div>
            <p className="text-[10px] text-teal-400/80 mt-2 flex items-center justify-between">
              <span>Verified payments</span>
              <ArrowUpRight className="w-3 h-3 text-teal-400" />
            </p>
          </div>

          {/* 10. Amount Pending */}
          <div
            onClick={() => onNavigate('payments')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Amount Pending</span>
                <Clock3 className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-xl font-black text-amber-300">₹{formatINR(sc.amountPending || 0)}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Receivable</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
            </p>
          </div>

          {/* 11. Active Website Projects */}
          <div
            onClick={() => onNavigate('projects')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Active Projects</span>
                <Briefcase className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-blue-300">{sc.activeProjects ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>In development</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400" />
            </p>
          </div>

          {/* 12. Websites Delivered */}
          <div
            onClick={() => onNavigate('projects')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Delivered Sites</span>
                <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-emerald-300">{sc.websitesDelivered ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Completed</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
            </p>
          </div>

          {/* 13. Renewals Due */}
          <div
            onClick={() => onNavigate('renewals')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-violet-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">Renewals Due</span>
                <RotateCcw className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-violet-300">{sc.renewalsDue ?? 0}</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Within 30 days</span>
              <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-violet-400" />
            </p>
          </div>

          {/* 14. Pending DSA Withdrawals */}
          <div
            onClick={() => onNavigate('withdrawals')}
            className="group cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 rounded-2xl p-4 transition-all duration-200 shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-medium truncate">DSA Withdrawals</span>
                <Wallet className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
              </div>
              <p className="text-2xl font-black text-amber-400">{sc.pendingWithdrawals ?? 0}</p>
            </div>
            <p className="text-[10px] text-amber-400/80 mt-2 flex items-center justify-between">
              <span>Payout requests</span>
              <ArrowUpRight className="w-3 h-3 text-amber-400" />
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WEBSITE SALES PIPELINE (11 SEQUENTIAL STAGES) */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Website Sales Pipeline Stages (Real Deal Flow)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sequential movement of leads from initial capture through development and delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('leads')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold self-start sm:self-auto flex items-center gap-1"
          >
            Full Pipeline Board →
          </button>
        </div>

        {/* 11 Funnel Stages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2">
          {pipeline.map((st: any, idx: number) => {
            const isWonDelivered = st.stage === 'Won' || st.stage === 'Delivered';
            const isDev = st.stage === 'Development';
            return (
              <div
                key={st.stage}
                onClick={() => {
                  if (st.stage === 'Delivered' || st.stage === 'Development') onNavigate('projects');
                  else if (st.stage === 'Proposal Sent' || st.stage === 'Negotiation') onNavigate('proposals');
                  else if (st.stage === 'Won' || st.stage === 'Payment Pending') onNavigate('sales');
                  else onNavigate('leads', st.stage);
                }}
                className={`cursor-pointer rounded-2xl p-3 border transition-all text-left flex flex-col justify-between hover:scale-[1.02] ${
                  isWonDelivered
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                    : isDev
                    ? 'bg-blue-950/20 border-blue-500/30 hover:border-blue-500/60'
                    : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                    <span className="text-slate-400">#{idx + 1}</span>
                    <span className={`w-2 h-2 rounded-full ${isWonDelivered ? 'bg-emerald-400' : isDev ? 'bg-blue-400' : 'bg-slate-400'}`} />
                  </div>
                  <p className="text-xs font-bold text-white truncate" title={st.stage}>
                    {st.stage}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/50">
                  <p className="text-xl font-black text-white">{st.count}</p>
                  {st.amount > 0 ? (
                    <p className="text-[10px] text-emerald-400 font-semibold truncate">₹{formatINR(st.amount)}</p>
                  ) : (
                    <p className="text-[10px] text-slate-500">Active records</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SALES & REVENUE (METRICS + TREND VISUALIZATION) */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Sales & Revenue Performance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified payment reconciliation, advance collections, and 7-day revenue trend.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            Manage Sales Contracts →
          </button>
        </div>

        {/* 6 Key Revenue Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 font-medium">Number of Sales</p>
            <p className="text-2xl font-black text-white mt-1">{sr.salesCount || 0}</p>
            <p className="text-[10px] text-slate-500 mt-1">Confirmed orders</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 font-medium">Total Sale Amount</p>
            <p className="text-2xl font-black text-white mt-1">₹{formatINR(sr.totalSaleAmount || 0)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Contract value</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 font-medium">Advance Collected</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">₹{formatINR(sr.advanceCollected || 0)}</p>
            <p className="text-[10px] text-emerald-500/80 mt-1">Initial booking</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 font-medium">Total Received</p>
            <p className="text-2xl font-black text-teal-300 mt-1">₹{formatINR(sr.totalReceived || 0)}</p>
            <p className="text-[10px] text-teal-400/80 mt-1">Verified in bank</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 font-medium">Pending Amount</p>
            <p className="text-2xl font-black text-amber-300 mt-1">₹{formatINR(sr.pendingAmount || 0)}</p>
            <p className="text-[10px] text-amber-400/80 mt-1">Due on delivery</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
            <p className="text-[11px] text-slate-400 font-medium">Cancelled Deals</p>
            <p className="text-2xl font-black text-slate-400 mt-1">{sr.cancelledSales || 0}</p>
            <p className="text-[10px] text-slate-500 mt-1">Total dropped</p>
          </div>
        </div>

        {/* Interactive Revenue Trend Chart */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Daily Sales & Payment Realization Trend
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Sales Amount (₹)
              </span>
              <span className="flex items-center gap-1.5 text-teal-400">
                <span className="w-3 h-3 rounded bg-teal-500 inline-block" /> Realized (₹)
              </span>
            </div>
          </div>

          {/* Chart SVG Visualization */}
          {(!sr.trend || sr.trend.length === 0) ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No sales activity recorded in this period.
            </div>
          ) : (
            <div className="pt-2">
              <div className="grid grid-cols-7 gap-2 items-end h-44 border-b border-slate-700 pb-2">
                {sr.trend.map((point: any) => {
                  const maxTrendAmount = Math.max(
                    ...sr.trend.map((t: any) => Math.max(t.saleAmount || 0, t.receivedAmount || 0)),
                    10000
                  );
                  const salesHeightPct = Math.round(((point.saleAmount || 0) / maxTrendAmount) * 100);
                  const recHeightPct = Math.round(((point.receivedAmount || 0) / maxTrendAmount) * 100);

                  return (
                    <div key={point.date} className="flex flex-col items-center h-full justify-end group">
                      {/* Tooltip on hover */}
                      <div className="hidden group-hover:block absolute bottom-24 bg-slate-950 border border-slate-700 rounded-xl p-2 text-[10px] text-white shadow-xl z-20 whitespace-nowrap">
                        <p className="font-bold text-blue-300">{point.label}</p>
                        <p>Sales: ₹{formatINR(point.saleAmount || 0)} ({point.salesCount} deals)</p>
                        <p>Received: ₹{formatINR(point.receivedAmount || 0)}</p>
                      </div>

                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        {/* Bar 1: Sales Amount */}
                        <div
                          style={{ height: `${Math.max(salesHeightPct, 4)}%` }}
                          className="w-1/2 max-w-[24px] bg-blue-600 rounded-t-md transition-all duration-300 group-hover:bg-blue-400"
                        />
                        {/* Bar 2: Received Amount */}
                        <div
                          style={{ height: `${Math.max(recHeightPct, 4)}%` }}
                          className="w-1/2 max-w-[24px] bg-teal-500 rounded-t-md transition-all duration-300 group-hover:bg-teal-400"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 font-medium truncate max-w-full text-center">
                        {point.label.split(',')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TODAY'S FOLLOW-UPS & OVERDUE FOLLOW-UPS (SIDE BY SIDE / SEQUENTIAL) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TODAY'S FOLLOW-UPS */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Today&apos;s Follow-ups ({todayFollowups.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Client calls, WhatsApp discussions & meetings scheduled for today.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('followups')}
              className="text-xs text-blue-400 hover:underline"
            >
              View All →
            </button>
          </div>

          {todayFollowups.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              No follow-ups scheduled for today.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {todayFollowups.map((f: any) => (
                <div
                  key={f.id}
                  className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-2 hover:border-slate-600 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{f.businessName || f.contactPerson}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/20 text-blue-300">
                          {f.time || '11:00'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                          {f.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Contact: <span className="text-slate-300">{f.contactPerson}</span>
                        {f.mobile && ` • ${f.mobile}`}
                      </p>
                      {f.purpose && (
                        <p className="text-[11px] text-slate-300 mt-1 italic line-clamp-1">
                          &ldquo;{f.purpose}&rdquo;
                        </p>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      Staff: {f.assignedPerson || 'Team'}
                    </span>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2">
                      {f.mobile && (
                        <>
                          <a
                            href={`tel:${f.mobile}`}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${f.whatsapp?.replace(/[^0-9]/g, '') || f.mobile.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFollowupModal({ action: 'complete', followup: f })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFollowupModal({ action: 'reschedule', followup: f });
                          setFollowupNewDate(new Date().toISOString().split('T')[0]);
                          setFollowupNewTime(f.time || '11:00');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* OVERDUE FOLLOW-UPS (WARNING QUEUE) */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Overdue Follow-ups ({overdueFollowups.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Past scheduled dates that missed communication completion.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('followups')}
              className="text-xs text-rose-400 hover:underline"
            >
              Open Audit →
            </button>
          </div>

          {overdueFollowups.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              <CheckCircle className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
              Outstanding work is up to date. Zero overdue follow-ups!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {overdueFollowups.map((f: any) => (
                <div
                  key={f.id}
                  className="bg-rose-950/20 border border-rose-600/40 rounded-2xl p-3.5 space-y-2 hover:border-rose-500/80 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{f.businessName || f.contactPerson}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Due: {f.date} {f.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Assigned to: <span className="text-slate-300 font-medium">{f.assignedPerson}</span>
                        {f.mobile && ` • ${f.mobile}`}
                      </p>
                      {f.purpose && (
                        <p className="text-[11px] text-rose-200/80 mt-1 line-clamp-1 italic">
                          &ldquo;{f.purpose}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t border-rose-900/40 text-xs">
                    <div className="flex items-center gap-2">
                      {f.mobile && (
                        <>
                          <a
                            href={`tel:${f.mobile}`}
                            className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <Phone className="w-3 h-3" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${f.whatsapp?.replace(/[^0-9]/g, '') || f.mobile.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </a>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFollowupModal({ action: 'complete', followup: f })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFollowupModal({ action: 'reschedule', followup: f });
                          setFollowupNewDate(new Date().toISOString().split('T')[0]);
                          setFollowupNewTime(f.time || '11:00');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 7. RECENT WEBSITE SALES ORDERS TABLE */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              Recent Website Sales Orders
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Latest client website purchase contracts, billing status, and production lifecycle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            All Sales Records →
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
            No website sales recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-3">Sale ID</th>
                  <th className="py-3 px-3">Customer / Business</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Website Service</th>
                  <th className="py-3 px-3">Sale Amount</th>
                  <th className="py-3 px-3">Received</th>
                  <th className="py-3 px-3">Pending</th>
                  <th className="py-3 px-3">Sales Agent</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {recentSales.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-white">{s.saleId}</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-white">{s.businessName || s.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.customerId}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-slate-300">{s.contactPerson}</p>
                      {s.mobile && (
                        <a href={`tel:${s.mobile}`} className="text-[10px] text-blue-400 hover:underline">
                          {s.mobile}
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-white">{s.serviceName}</p>
                      {s.packageName && <p className="text-[10px] text-slate-500">{s.packageName}</p>}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">₹{formatINR(s.saleAmount)}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">₹{formatINR(s.receivedAmount)}</td>
                    <td className="py-3 px-3 font-semibold text-amber-400">₹{formatINR(s.pendingAmount)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {s.staffOrDsaName || 'Direct'} ({s.staffOrDsaRole})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.deliveryStatus === 'Delivered'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {s.projectStatus || s.deliveryStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{s.saleDate}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleOrder(s)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('projects')}
                          className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[11px] font-semibold transition"
                        >
                          Project
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 8. STAFF PERFORMANCE & DSA PARTNER PERFORMANCE TABLES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* STAFF PERFORMANCE */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Staff Performance & Sales Target Tracking
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Activity breakdown: leads, calls, demos, proposals and quota achievements.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('staff')}
              className="text-xs text-blue-400 hover:underline"
            >
              Staff Roster →
            </button>
          </div>

          {staffPerf.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              No active staff members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2.5">Staff</th>
                    <th className="py-2.5 px-2">Role</th>
                    <th className="py-2.5 px-2 text-center">Leads</th>
                    <th className="py-2.5 px-2 text-center">Follow-ups</th>
                    <th className="py-2.5 px-2 text-center">Sales</th>
                    <th className="py-2.5 px-2">Volume</th>
                    <th className="py-2.5 px-2">Target</th>
                    <th className="py-2.5 px-2 text-right">Achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {staffPerf.map((sp: any) => (
                    <tr
                      key={sp.staffId}
                      onClick={() => onNavigate('staff')}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-2.5">
                        <p className="font-bold text-white">{sp.staffName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{sp.staffId}</p>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-400">
                        {sp.designation}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-white">{sp.leads}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{sp.followups}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-400">{sp.sales}</td>
                      <td className="py-2.5 px-2 font-bold text-white">₹{formatINR(sp.salesAmount)}</td>
                      <td className="py-2.5 px-2 text-slate-400">₹{formatINR(sp.target)}</td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                sp.achievementPct >= 100 ? 'bg-emerald-400' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(sp.achievementPct, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold text-[11px] ${
                              sp.achievementPct >= 100 ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            {sp.achievementPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* DSA PARTNER PERFORMANCE */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                DSA Partner Performance (10% Flat Commission)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Commission accrues on sales and unlocks to Available upon delivery.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dsa')}
              className="text-xs text-blue-400 hover:underline"
            >
              DSA Manager →
            </button>
          </div>

          {dsaPerf.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              No active DSA partners registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-2.5">DSA Partner</th>
                    <th className="py-2.5 px-2 text-center">Leads</th>
                    <th className="py-2.5 px-2 text-center">Sales</th>
                    <th className="py-2.5 px-2">Volume</th>
                    <th className="py-2.5 px-2 text-center">Delivered</th>
                    <th className="py-2.5 px-2 text-emerald-400">Available (₹)</th>
                    <th className="py-2.5 px-2 text-amber-400">Withdrawal Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {dsaPerf.map((dp: any) => (
                    <tr
                      key={dp.dsaId}
                      onClick={() => onNavigate('dsa')}
                      className="hover:bg-slate-800/40 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-2.5">
                        <p className="font-bold text-white">{dp.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{dp.dsaId}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-white">{dp.leads}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-blue-400">{dp.websiteSales}</td>
                      <td className="py-2.5 px-2 font-bold text-white">₹{formatINR(dp.salesAmount)}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {dp.deliveredWebsites}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-bold text-emerald-400">
                        ₹{formatINR(dp.availableCommission)}
                      </td>
                      <td className="py-2.5 px-2 font-bold text-amber-400">
                        ₹{formatINR(dp.pendingWithdrawal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 9. WEBSITE PROJECT STATUS (10 STAGES) & PAYMENT OVERVIEW */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WEBSITE PROJECT STATUS (10 STAGES) */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                Website Development Production Pipeline (10 Stages)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Total active deliverables: {projectStatuses.total} projects
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs text-blue-400 hover:underline"
            >
              Open Project Board →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              'Payment Received',
              'Requirements Pending',
              'Content Pending',
              'Design Started',
              'Development',
              'Customer Review',
              'Revision',
              'Final Approval',
              'Live',
              'Delivered',
            ].map((st) => {
              const count = projectStatuses.counts[st] || 0;
              const isDone = st === 'Delivered' || st === 'Live';
              return (
                <div
                  key={st}
                  onClick={() => onNavigate('projects')}
                  className={`cursor-pointer rounded-2xl p-3 border transition flex flex-col justify-between hover:scale-105 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : count > 0
                      ? 'bg-slate-800 border-blue-500/40'
                      : 'bg-slate-800/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <p className="text-[11px] font-semibold text-slate-300 truncate" title={st}>
                    {st}
                  </p>
                  <p className={`text-xl font-black mt-2 ${count > 0 ? 'text-white' : 'text-slate-600'}`}>
                    {count}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* PAYMENT OVERVIEW */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Payment Realization & Verification Overview
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict segregation: only verified payments are recorded as received.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('payments')}
              className="text-xs text-blue-400 hover:underline"
            >
              Verify Transactions →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
              <p className="text-[11px] text-slate-400">Total Receivable</p>
              <p className="text-lg font-black text-white mt-1">₹{formatINR(paymentOverview.totalReceivable || 0)}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
              <p className="text-[11px] text-teal-400">Total Received</p>
              <p className="text-lg font-black text-teal-300 mt-1">₹{formatINR(paymentOverview.totalReceived || 0)}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5">
              <p className="text-[11px] text-amber-400">Pending Verification</p>
              <p className="text-lg font-black text-amber-300 mt-1">
                {paymentOverview.verificationPendingCount || 0} (₹{formatINR(paymentOverview.verificationPendingAmount || 0)})
              </p>
            </div>
          </div>

          {/* Recently Received Payments Sub-list */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Recently Realized Transactions
            </p>
            {(!paymentOverview.recentlyReceived || paymentOverview.recentlyReceived.length === 0) ? (
              <p className="text-xs text-slate-500 py-3 text-center">No realized payments found.</p>
            ) : (
              <div className="space-y-1.5">
                {paymentOverview.recentlyReceived.map((p: any) => (
                  <div
                    key={p.id}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{p.customerName}</span>
                      <span className="text-slate-400 text-[10px] ml-2">
                        {p.paymentMethod} • Ref: {p.transactionNumber}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400">₹{formatINR(p.amount)}</span>
                      <span className="text-[10px] text-slate-500 ml-2">{p.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 10. STAFF ATTENDANCE TODAY (CAMERA PHOTOS) & KYC ALERTS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* STAFF ATTENDANCE TODAY */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Staff Attendance Today & Camera Snapshots
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Selfie verification captured during daily clock-in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs text-blue-400 hover:underline"
            >
              Full Attendance Log →
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-slate-400">Total Staff</p>
              <p className="text-xl font-bold text-white mt-1">{attendanceToday.totalStaff || 0}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-emerald-400">Present</p>
              <p className="text-xl font-bold text-emerald-300 mt-1">{attendanceToday.presentCount || 0}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-rose-400">Not Marked</p>
              <p className="text-xl font-bold text-rose-300 mt-1">{attendanceToday.absentCount || 0}</p>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-amber-400">Late (&gt;10 AM)</p>
              <p className="text-xl font-bold text-amber-300 mt-1">{attendanceToday.lateCount || 0}</p>
            </div>
          </div>

          {/* Camera Photo Thumbnails */}
          {(!attendanceToday.records || attendanceToday.records.length === 0) ? (
            <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              No staff attendance records submitted today yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {attendanceToday.records.map((a: any) => (
                <div
                  key={a.id}
                  onClick={() =>
                    setCameraPhotoModal({
                      photo: a.capturedPhoto,
                      staffName: a.staffName,
                      time: a.exactTime,
                      dept: a.department,
                    })
                  }
                  className="group cursor-pointer bg-slate-800 border border-slate-700 rounded-xl p-2 space-y-1.5 hover:border-blue-500 transition"
                >
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                    {a.capturedPhoto ? (
                      <img
                        src={a.capturedPhoto}
                        alt={a.staffName}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-mono rounded">
                      {a.exactTime}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs truncate">{a.staffName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{a.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* KYC VERIFICATION ALERTS & DSA WITHDRAWALS */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          {/* KYC Alerts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  KYC Verification Queue
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aadhaar, PAN & Bank documentation compliance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('kyc')}
                className="text-xs text-purple-400 hover:underline font-semibold"
              >
                Review Documents →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Staff KYC</p>
                <p className="text-lg font-black text-white mt-1">{kycAlerts.newStaffKyc || 0}</p>
                <p className="text-[10px] text-blue-400">New Submitted</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Staff Correction</p>
                <p className="text-lg font-black text-amber-300 mt-1">{kycAlerts.staffCorrection || 0}</p>
                <p className="text-[10px] text-slate-500">Action Pending</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">DSA KYC</p>
                <p className="text-lg font-black text-white mt-1">{kycAlerts.newDsaKyc || 0}</p>
                <p className="text-[10px] text-blue-400">New Submitted</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase">DSA Correction</p>
                <p className="text-lg font-black text-amber-300 mt-1">{kycAlerts.dsaCorrection || 0}</p>
                <p className="text-[10px] text-slate-500">Action Pending</p>
              </div>
            </div>
          </div>

          {/* DSA Withdrawals */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  DSA Commission Payout Requests
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Bi-monthly schedule: eligible on the <strong>7th & 14th</strong> of each month.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('withdrawals')}
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                Review & Disburse →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400">Pending Requests</p>
                <p className="text-lg font-black text-amber-400 mt-1">{dsaWithdrawals.pendingRequestsCount || 0}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400">Requested Value</p>
                <p className="text-lg font-black text-white mt-1">₹{formatINR(dsaWithdrawals.totalRequestedAmount || 0)}</p>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-400">Approved / Processing</p>
                <p className="text-lg font-black text-emerald-400 mt-1">
                  {(dsaWithdrawals.approvedCount || 0) + (dsaWithdrawals.processingCount || 0)}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 11. PENDING WORK CHECKLIST (17 CONSOLIDATED AUDIT ITEMS) */}
      {/* ========================================================================= */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Consolidated Pending Work & Operational Audits (17 Items)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time actionable backlog across leads, projects, renewals, staff and finance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {pendingWork.map((item: any) => (
            <div
              key={item.key}
              onClick={() => onNavigate(item.module, item.filter)}
              className={`cursor-pointer rounded-2xl p-3 border transition flex items-center justify-between group hover:scale-[1.02] ${
                item.urgent && item.count > 0
                  ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                  : item.count > 0
                  ? 'bg-slate-800/80 border-slate-700/80 hover:border-blue-500/50'
                  : 'bg-slate-800/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="pr-2 truncate">
                <p className="text-xs font-semibold text-white truncate" title={item.label}>
                  {item.label}
                </p>
                <span className="text-[10px] text-slate-500 capitalize">{item.module}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${
                  item.urgent && item.count > 0
                    ? 'bg-rose-500 text-white shadow-sm'
                    : item.count > 0
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 12. UPCOMING RENEWALS & CONVERSION ANALYTICS & RECENT AUDIT ACTIVITY */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UPCOMING RENEWALS */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-violet-400" />
              Upcoming Renewals
            </h2>
            <div className="flex gap-1 text-[10px]">
              {[7, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRenewalsFilterDays(d)}
                  className={`px-2 py-0.5 rounded ${
                    renewalsFilterDays === d ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          {upcomingRenewals.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              No renewals due in next {renewalsFilterDays} days.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs">
              {upcomingRenewals.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => onNavigate('renewals')}
                  className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between hover:border-violet-500/60 transition cursor-pointer"
                >
                  <div>
                    <p className="font-bold text-white">{r.businessName || r.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{r.websiteDomain}</p>
                    <p className="text-[10px] text-violet-300 mt-0.5">Due: {r.renewalDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">₹{formatINR(r.renewalAmount)}</p>
                    <span className="text-[10px] text-amber-400 font-semibold">
                      {r.daysRemaining} days left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CONVERSION ANALYTICS & LOST REASONS */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-400" />
              Conversion Analytics & Funnel
            </h2>
            <span className="text-[10px] text-slate-400">Total Leads: {conversionAnalytics.totalLeads || 0}</span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: 'Contacted Rate', pct: conversionAnalytics.contactedPct, count: conversionAnalytics.contactedCount, color: 'bg-blue-500' },
              { label: 'Interested Rate', pct: conversionAnalytics.interestedPct, count: conversionAnalytics.interestedCount, color: 'bg-cyan-500' },
              { label: 'Demo Shared', pct: conversionAnalytics.demoPct, count: conversionAnalytics.demoCount, color: 'bg-indigo-500' },
              { label: 'Proposal Sent', pct: conversionAnalytics.proposalPct, count: conversionAnalytics.proposalCount, color: 'bg-purple-500' },
              { label: 'Negotiation', pct: conversionAnalytics.negotiationPct, count: conversionAnalytics.negotiationCount, color: 'bg-amber-500' },
              { label: 'Won & Closed', pct: conversionAnalytics.wonPct, count: conversionAnalytics.wonCount, color: 'bg-emerald-500' },
            ].map((step) => (
              <div key={step.label} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">{step.label} ({step.count})</span>
                  <span className="font-bold text-white">{step.pct || 0}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${Math.min(step.pct || 0, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Lost Leads Analysis */}
          <div className="pt-3 border-t border-slate-800">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Lost Leads Reasons
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
              {Object.entries(lostLeads).map(([reason, count]) => (
                <div key={reason} className="bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/60">
                  <p className="text-slate-400 truncate">{reason}</p>
                  <p className="font-bold text-white text-xs mt-0.5">{count as number}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RECENT AUDIT & ACTIVITY LOGS */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Live Audit & Security Activity
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('audit-logs')}
              className="text-xs text-blue-400 hover:underline"
            >
              Full Trail →
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 text-xs">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px] truncate max-w-[150px]">
                      {log.userName || log.userId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{log.exactDate} {log.exactTime}</span>
                  </div>
                  <p className="text-blue-400 text-[11px] font-semibold">{log.action}</p>
                  {log.details && <p className="text-slate-400 text-[10px] truncate">{log.details}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 13. QUICK ACTIONS TOOLBAR */}
      {/* ========================================================================= */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-4 h-4 text-blue-400" />
          Administrative Quick Action Shortcuts:
        </span>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('leads')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            + Add Lead
          </button>
          <button
            type="button"
            onClick={() => onNavigate('proposals')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            + New Proposal
          </button>
          <button
            type="button"
            onClick={() => onNavigate('sales')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            + Book Sale
          </button>
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            + Customer
          </button>
          <button
            type="button"
            onClick={() => onNavigate('staff')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            + Add Staff
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dsa')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            + Register DSA
          </button>
          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Manage Services
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CAMERA SNAPSHOT HIGH-RES MODAL */}
      {/* ========================================================================= */}
      {cameraPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setCameraPhotoModal(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-bold text-white text-base">{cameraPhotoModal.staffName}</h3>
                <p className="text-xs text-slate-400">
                  {cameraPhotoModal.dept} • Clock-in: {cameraPhotoModal.time}
                </p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 max-h-[380px] flex items-center justify-center">
              <img
                src={cameraPhotoModal.photo}
                alt={cameraPhotoModal.staffName}
                className="w-full h-auto object-contain"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setCameraPhotoModal(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SALE ORDER DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedSaleOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setSelectedSaleOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Sale Order: {selectedSaleOrder.saleId}
            </h3>

            <div className="bg-slate-800/80 rounded-2xl p-4 space-y-2 text-slate-300">
              <p className="flex justify-between">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-bold text-white">{selectedSaleOrder.customerName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Business:</span>
                <span className="font-semibold text-white">{selectedSaleOrder.businessName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Website Package:</span>
                <span className="text-blue-300">{selectedSaleOrder.serviceName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Sale Amount:</span>
                <span className="font-bold text-white">₹{formatINR(selectedSaleOrder.saleAmount)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Received (Verified):</span>
                <span className="font-bold text-emerald-400">₹{formatINR(selectedSaleOrder.receivedAmount)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Balance Pending:</span>
                <span className="font-bold text-amber-400">₹{formatINR(selectedSaleOrder.pendingAmount)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Partner / Agent:</span>
                <span>{selectedSaleOrder.staffOrDsaName} ({selectedSaleOrder.staffOrDsaRole})</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">Project Status:</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                  {selectedSaleOrder.projectStatus}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSaleOrder(null);
                  onNavigate('sales');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
              >
                Go to Sales Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FOLLOW-UP ACTION MODAL (COMPLETE OR RESCHEDULE) */}
      {/* ========================================================================= */}
      {followupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-xs">
            <button
              type="button"
              onClick={() => setFollowupModal(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-white text-base flex items-center gap-2">
              {followupModal.action === 'complete' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Mark Follow-up Completed
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 text-blue-400" />
                  Reschedule Follow-up
                </>
              )}
            </h3>

            <p className="text-slate-300">
              Client: <strong>{followupModal.followup.businessName || followupModal.followup.contactPerson}</strong>
              {followupModal.followup.mobile && ` (${followupModal.followup.mobile})`}
            </p>

            {followupModal.action === 'complete' ? (
              <div className="space-y-2">
                <label className="block text-slate-400 font-semibold text-[11px]">
                  Meeting / Call Outcome & Result:
                </label>
                <textarea
                  rows={3}
                  value={followupResultText}
                  onChange={(e) => setFollowupResultText(e.target.value)}
                  placeholder="e.g. Client agreed on Standard Package, requested formal proposal by evening..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold text-[11px] mb-1">
                    New Follow-up Date:
                  </label>
                  <input
                    type="date"
                    value={followupNewDate}
                    onChange={(e) => setFollowupNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold text-[11px] mb-1">
                    New Time:
                  </label>
                  <input
                    type="time"
                    value={followupNewTime}
                    onChange={(e) => setFollowupNewTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold text-[11px] mb-1">
                    Reschedule Reason / Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={followupNotes}
                    onChange={(e) => setFollowupNotes(e.target.value)}
                    placeholder="e.g. Client requested call after 3 PM tomorrow..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFollowupModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={
                  followupModal.action === 'complete' ? handleCompleteFollowup : handleRescheduleFollowup
                }
                className={`px-5 py-2 font-bold rounded-xl text-white shadow transition ${
                  followupModal.action === 'complete'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {actionLoading ? 'Saving...' : 'Save & Update DB'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

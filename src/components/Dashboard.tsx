/**
 * Vishal Enterprises CRM - Role-Adaptive Executive Dashboard
 * Real-time statistics, camera attendance status, 10% commission cards, and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Camera,
  DollarSign,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Globe,
  Plus,
} from 'lucide-react';
import { User, Sale, AttendanceRecord } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';
import { AdminDashboard } from './AdminDashboard.tsx';

interface DashboardProps {
  user: User;
  onNavigate: (view: string, filter?: any) => void;
  onLogout?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, onLogout }) => {
  // If user is Admin, render the upgraded Vishal Enterprises CRM v2.0 Administrator Dashboard
  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onNavigate={onNavigate} onLogout={onLogout} />;
  }

  const [stats, setStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [dsaCommission, setDsaCommission] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (user.role === 'ADMIN') {
        const [sales, attendance, leads, customers, dsa, withdrawals] = await Promise.all([
          fetchApi<Sale[]>('/api/sales').catch(() => []),
          fetchApi<AttendanceRecord[]>('/api/admin/attendance').catch(() => []),
          fetchApi<any[]>('/api/leads').catch(() => []),
          fetchApi<any[]>('/api/customers').catch(() => []),
          fetchApi<any[]>('/api/admin/dsa').catch(() => []),
          fetchApi<any[]>('/api/admin/withdrawals').catch(() => []),
        ]);

        const salesList: Sale[] = Array.isArray(sales) ? sales : [];
        const totalRevenue = salesList.reduce((acc: number, s: Sale) => acc + (s.finalAmount || 0), 0);
        const advanceCollected = salesList.reduce(
          (acc: number, s: Sale) =>
            acc +
            (s.advancePaid ??
              (s.paymentStatus === 'Fully Paid' ? s.finalAmount : s.paymentStatus === 'Advance Paid' ? s.finalAmount * 0.5 : 0)),
          0
        );
        const balancePending = salesList.reduce(
          (acc: number, s: Sale) =>
            acc +
            (s.balanceAmount ??
              (s.paymentStatus === 'Fully Paid' ? 0 : s.paymentStatus === 'Advance Paid' ? s.finalAmount * 0.5 : s.finalAmount)),
          0
        );
        const pendingWithdrawalsCount = Array.isArray(withdrawals) ? withdrawals.filter((w) => w.status === 'Pending').length : 0;

        setStats({
          totalRevenue,
          advanceCollected,
          balancePending,
          totalSales: salesList.length,
          totalLeads: Array.isArray(leads) ? leads.length : 0,
          totalClients: Array.isArray(customers) ? customers.length : 0,
          totalDsa: Array.isArray(dsa) ? dsa.length : 0,
          todayAttendanceCount: Array.isArray(attendance) ? attendance.filter((a) => a.date === new Date().toISOString().split('T')[0]).length : 0,
          pendingWithdrawalsCount,
        });

        setRecentSales(salesList.slice(0, 5));
        setRecentAttendance(Array.isArray(attendance) ? attendance.slice(0, 4) : []);
      } else if (user.role === 'STAFF') {
        const [myAttendance, mySales, myLeads] = await Promise.all([
          fetchApi<any>('/api/attendance/today').catch(() => null),
          fetchApi<Sale[]>(`/api/sales?agentId=${user.userId}`).catch(() => []),
          fetchApi<any[]>(`/api/leads?assignedTo=${user.userId}`).catch(() => []),
        ]);

        setTodayAttendance(myAttendance);
        const staffSalesList: Sale[] = Array.isArray(mySales) ? mySales : [];
        const myRevenue = staffSalesList.reduce((acc: number, s: Sale) => acc + (s.finalAmount || 0), 0);

        setStats({
          mySalesCount: staffSalesList.length,
          myRevenue,
          myLeadsCount: Array.isArray(myLeads) ? myLeads.length : 0,
          attendanceMarked: myAttendance?.marked,
        });
        setRecentSales(staffSalesList.slice(0, 5));
      } else if (user.role === 'DSA') {
        const [comm, mySales] = await Promise.all([
          fetchApi<any>('/api/dsa/commission').catch(() => null),
          fetchApi<Sale[]>('/api/dsa/sales').catch(() => []),
        ]);

        setDsaCommission(comm);
        setRecentSales(Array.isArray(mySales) ? mySales.slice(0, 5) : []);
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {user.role === 'ADMIN'
                  ? 'Administrator Console'
                  : user.role === 'STAFF'
                  ? `Staff Portal • ${user.department}`
                  : 'Authorized DSA Partner Portal'}
              </span>
              <span className="text-slate-400 text-xs">• {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">
              Welcome back, {user.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              {user.role === 'ADMIN'
                ? 'Oversee Vishal Enterprises website sales, camera attendance verification, client deliverables, and DSA commission payouts.'
                : user.role === 'STAFF'
                ? 'Manage assigned website pipeline leads, mark biometric camera attendance, and track monthly sales targets.'
                : 'Promote Vishal Enterprises website packages, earn 10% commission on delivered projects, and track 7th & 14th monthly payouts.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.role === 'ADMIN' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('sales')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> New Sale
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('admin-withdrawals')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Payouts ({stats?.pendingWithdrawalsCount || 0})
                </button>
              </>
            )}

            {user.role === 'STAFF' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg ${
                    todayAttendance?.marked
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {todayAttendance?.marked ? 'Attendance Present ✓' : 'Mark Camera Attendance'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('leads')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-blue-400" /> View Leads
                </button>
              </>
            )}

            {user.role === 'DSA' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('dsa-commission')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" /> Request Payout
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('dsa-agreement')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" /> Agreement
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards: Admin View */}
      {user.role === 'ADMIN' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">Total Website Deal Volume</p>
            <p className="text-2xl font-bold text-white mt-1">
              ₹{formatINR(stats?.totalRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.totalSales || 0} confirmed website sales</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">Advance Collected</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              ₹{formatINR(stats?.advanceCollected)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Deposited into accounts</p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">Staff Attendance Today</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {stats.todayAttendanceCount} Present
            </p>
            <button
              onClick={() => onNavigate('admin-attendance')}
              className="text-[11px] text-blue-300 hover:underline mt-1 flex items-center gap-1"
            >
              <Camera className="w-3 h-3" /> View Camera Photos →
            </button>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">Pending DSA Withdrawals</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {stats.pendingWithdrawalsCount} Requests
            </p>
            <button
              onClick={() => onNavigate('admin-withdrawals')}
              className="text-[11px] text-amber-300 hover:underline mt-1 flex items-center gap-1"
            >
              Review & Disburse →
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Staff View */}
      {user.role === 'STAFF' && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">Today&apos;s Attendance Status</p>
            <p className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              {todayAttendance?.marked ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> Marked Present
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-5 h-5" /> Not Marked Yet
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayAttendance?.marked
                ? `Clocked in at ${todayAttendance.record?.exactTime}`
                : 'Selfie camera capture mandatory'}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">My Assigned Active Leads</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.myLeadsCount}</p>
            <button
              onClick={() => onNavigate('leads')}
              className="text-[11px] text-blue-300 hover:underline mt-1"
            >
              Open Pipeline →
            </button>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
            <p className="text-slate-400 text-xs font-medium">Website Deals Closed</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              ₹{formatINR(stats?.myRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.mySalesCount || 0} total client contracts</p>
          </div>
        </div>
      )}

      {/* KPI Cards: DSA Partner View (10% Commission Highlights) */}
      {user.role === 'DSA' && dsaCommission && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-medium">Available Payout Balance</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                ₹{formatINR(dsaCommission.availableBalance)}
              </p>
              <p className="text-[10px] text-emerald-400/80 mt-1">Ready for 7th / 14th withdrawal</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-medium">Pending Commission</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                ₹{formatINR(dsaCommission.pendingBalance)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Available once site is delivered</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-medium">Commission Rate</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">10% Flat</p>
              <p className="text-[10px] text-slate-400 mt-1">On all verified website sales</p>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-medium">Scheduled Payout Days</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">7th & 14th</p>
              <p className="text-[10px] text-slate-400 mt-1">Bi-monthly automated cycle</p>
            </div>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/60 rounded-2xl p-4 text-xs text-blue-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Direct Selling Partner Policy</p>
              <p className="mt-0.5 leading-relaxed">
                As an authorized DSA of Vishal Enterprises, you earn a 10% commission on the total value of each website
                package closed. Your commission moves to <strong>Available</strong> status immediately when our
                engineering team completes and delivers the website to the client.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Biometric Camera Feeds Preview for Admin */}
      {user.role === 'ADMIN' && recentAttendance.length > 0 && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Live Staff Biometric Attendance Snapshots
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Front-facing camera selfies captured with timestamp and device coordinates.
              </p>
            </div>
            <button
              onClick={() => onNavigate('admin-attendance')}
              className="text-xs text-blue-400 hover:underline"
            >
              View Full Audit Board →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentAttendance.map((a) => (
              <div
                key={a.id}
                className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 space-y-2"
              >
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <img
                    src={a.capturedPhoto}
                    alt={a.staffName}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-mono rounded">
                    {a.exactTime}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-white text-xs truncate">{a.staffName}</p>
                  <p className="text-[10px] text-slate-400">{a.department} • {a.staffId}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales Orders */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Recent Website Sales Orders
          </h3>
          <button
            onClick={() => onNavigate(user.role === 'DSA' ? 'dsa-commission' : 'sales')}
            className="text-xs text-blue-400 hover:underline"
          >
            View All Sales →
          </button>
        </div>

        {recentSales.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No website orders recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2 px-3">Sale ID</th>
                  <th className="py-2 px-3">Client / Business</th>
                  <th className="py-2 px-3">Website Package</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Advance</th>
                  <th className="py-2 px-3">Delivery Status</th>
                  {user.role === 'DSA' && <th className="py-2 px-3">10% Commission</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2 px-3 font-mono font-medium text-white">{s.saleId}</td>
                    <td className="py-2 px-3">
                      <p className="font-semibold text-white">{s.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.customerId}</p>
                    </td>
                    <td className="py-2 px-3">{s.serviceName}</td>
                    <td className="py-2 px-3 font-bold text-white">₹{formatINR(s.finalAmount)}</td>
                    <td className="py-2 px-3 text-emerald-400">₹{formatINR(s.advancePaid)}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.deliveryStatus === 'Delivered'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : s.deliveryStatus === 'In Progress'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {s.deliveryStatus}
                      </span>
                    </td>
                    {user.role === 'DSA' && (
                      <td className="py-2 px-3">
                        <span className="font-bold text-emerald-300">
                          ₹{formatINR(s.commissionAmount)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">({s.commissionStatus})</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

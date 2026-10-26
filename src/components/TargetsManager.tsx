import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Award, Calendar, Plus, Edit2, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { User, Sale, FollowUp, Proposal, StaffTarget } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface TargetsManagerProps {
  user: User;
}

export const TargetsManager: React.FC<TargetsManagerProps> = ({ user }) => {
  const [month, setMonth] = useState('2026-09');
  const [staffList, setStaffList] = useState<User[]>([]);
  const [targets, setTargets] = useState<StaffTarget[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit / Set Target Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [targetForm, setTargetForm] = useState({
    leadsTarget: 30,
    callsTarget: 100,
    followupsTarget: 50,
    proposalsTarget: 15,
    salesCountTarget: 5,
    salesRevenueTarget: 75000,
    deliveriesTarget: 5,
    renewalsTarget: 10,
  });

  useEffect(() => {
    loadData();
  }, [month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, salesRes, followupsRes, proposalsRes] = await Promise.all([
        fetchApi<User[]>('/api/admin/users'),
        fetchApi<Sale[]>('/api/sales'),
        fetchApi<FollowUp[]>('/api/followups'),
        fetchApi<Proposal[]>('/api/proposals'),
      ]);

      const staff = (usersRes || []).filter((u) => u.role === 'STAFF' || u.role === 'ADMIN');
      setStaffList(staff);
      setSales(salesRes || []);
      setFollowups(followupsRes || []);
      setProposals(proposalsRes || []);

      // Load targets from local DB/settings or generate clean month target records
      const existingTargets: StaffTarget[] = staff.map((s, idx) => {
        // Calculate achievements from real data
        const staffSales = (salesRes || []).filter((sale) => sale.staffOrDsaId === s.userId);
        const salesCountAchieved = staffSales.length;
        const salesRevenueAchieved = staffSales.reduce((sum, sale) => sum + (sale.finalAmount || 0), 0);

        const staffFollowups = (followupsRes || []).filter((f) => f.assignedUserId === s.userId && f.status === 'Completed');
        const followupsAchieved = staffFollowups.length;

        const staffProposals = (proposalsRes || []).filter((p) => p.assignedStaffId === s.userId || p.preparedByUserId === s.userId);
        const proposalsAchieved = staffProposals.length;

        // Default targets if not customized
        const salesCountTarget = 5;
        const salesRevenueTarget = 80000;

        return {
          id: `target-${s.userId}-${month}`,
          staffId: s.userId,
          staffName: s.fullName,
          department: s.department || 'Sales & Web Solutions',
          month,
          leadsTarget: 30,
          leadsAchieved: 0,
          callsTarget: 100,
          callsAchieved: 0,
          followupsTarget: 40,
          followupsAchieved,
          proposalsTarget: 15,
          proposalsAchieved,
          salesCountTarget,
          salesCountAchieved,
          salesRevenueTarget,
          salesRevenueAchieved,
          deliveriesTarget: 5,
          deliveriesAchieved: staffSales.filter((x) => x.deliveryStatus === 'Delivered').length,
          renewalsTarget: 10,
          renewalsAchieved: 0,
          status: salesRevenueAchieved >= salesRevenueTarget ? 'Achieved' : 'In Progress',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      setTargets(existingTargets);
    } catch (err) {
      console.error('Error loading targets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    setTargets((prev) =>
      prev.map((t) => {
        if (t.staffId === selectedStaffId) {
          return {
            ...t,
            ...targetForm,
            status: (t.salesRevenueAchieved || 0) >= targetForm.salesRevenueTarget ? 'Achieved' : 'In Progress',
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    setShowModal(false);
  };

  const visibleTargets = user.role === 'ADMIN' ? targets : targets.filter((t) => t.staffId === user.userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Staff Targets & Performance Evaluation (Section 12)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of monthly business targets, sales conversion goals, and performance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs text-white">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
          </div>

          {user.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => {
                if (staffList.length > 0) {
                  setSelectedStaffId(staffList[0].userId);
                }
                setShowModal(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              Set Staff Target
            </button>
          )}
        </div>
      </div>

      {/* Target Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {visibleTargets.map((t) => {
          const revPercent = Math.min(100, Math.round(((t.salesRevenueAchieved || 0) / (t.salesRevenueTarget || 1)) * 100));
          const salesPercent = Math.min(100, Math.round(((t.salesCountAchieved || 0) / (t.salesCountTarget || 1)) * 100));
          const followupsPercent = Math.min(100, Math.round(((t.followupsAchieved || 0) / (t.followupsTarget || 1)) * 100));

          const getBadge = () => {
            if (revPercent >= 100) {
              return { label: 'Goal Achieved', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
            }
            if (revPercent >= 75) {
              return { label: 'Strong Performer', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
            }
            if (revPercent >= 40) {
              return { label: 'In Progress', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
            }
            return { label: 'Needs Follow-up', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
          };

          const badge = getBadge();

          return (
            <div
              key={t.staffId}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{t.staffName}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                      {t.staffId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{t.department} • Month: {month}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${badge.color}`}>
                    {badge.label}
                  </span>
                  {user.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStaffId(t.staffId);
                        setTargetForm({
                          leadsTarget: t.leadsTarget,
                          callsTarget: t.callsTarget,
                          followupsTarget: t.followupsTarget,
                          proposalsTarget: t.proposalsTarget,
                          salesCountTarget: t.salesCountTarget,
                          salesRevenueTarget: t.salesRevenueTarget,
                          deliveriesTarget: t.deliveriesTarget,
                          renewalsTarget: t.renewalsTarget,
                        });
                        setShowModal(true);
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Revenue Target Progress Bar */}
              <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Monthly Sales Revenue Target</span>
                  <span className="font-bold text-white">
                    ₹{formatINR(t.salesRevenueAchieved)} / ₹{formatINR(t.salesRevenueTarget)} ({revPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      revPercent >= 100
                        ? 'bg-emerald-500'
                        : revPercent >= 60
                        ? 'bg-blue-500'
                        : revPercent >= 30
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${revPercent}%` }}
                  />
                </div>
              </div>

              {/* Sub-metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Website Sales</span>
                  <span className="font-bold text-white text-sm">
                    {t.salesCountAchieved} / {t.salesCountTarget}
                  </span>
                  <span className="block text-[10px] text-blue-400 font-medium mt-0.5">{salesPercent}%</span>
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Follow-ups Done</span>
                  <span className="font-bold text-white text-sm">
                    {t.followupsAchieved} / {t.followupsTarget}
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-medium mt-0.5">{followupsPercent}%</span>
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Quotations Sent</span>
                  <span className="font-bold text-white text-sm">
                    {t.proposalsAchieved} / {t.proposalsTarget}
                  </span>
                  <span className="block text-[10px] text-purple-400 font-medium mt-0.5">
                    {Math.round(((t.proposalsAchieved || 0) / (t.proposalsTarget || 1)) * 100)}%
                  </span>
                </div>

                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/40">
                  <span className="text-slate-400 block text-[11px]">Deliveries</span>
                  <span className="font-bold text-white text-sm">
                    {t.deliveriesAchieved} / {t.deliveriesTarget}
                  </span>
                  <span className="block text-[10px] text-cyan-400 font-medium mt-0.5">
                    {Math.round(((t.deliveriesAchieved || 0) / (t.deliveriesTarget || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Set Target Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Configure Monthly Staff Target
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                >
                  {staffList.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.fullName} ({s.userId} - {s.department || 'Sales'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Revenue Target (₹)</label>
                  <input
                    type="number"
                    required
                    value={targetForm.salesRevenueTarget}
                    onChange={(e) => setTargetForm({ ...targetForm, salesRevenueTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Sales Count Target</label>
                  <input
                    type="number"
                    required
                    value={targetForm.salesCountTarget}
                    onChange={(e) => setTargetForm({ ...targetForm, salesCountTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Follow-ups Target</label>
                  <input
                    type="number"
                    required
                    value={targetForm.followupsTarget}
                    onChange={(e) => setTargetForm({ ...targetForm, followupsTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Quotations Target</label>
                  <input
                    type="number"
                    required
                    value={targetForm.proposalsTarget}
                    onChange={(e) => setTargetForm({ ...targetForm, proposalsTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Website Deliveries</label>
                  <input
                    type="number"
                    required
                    value={targetForm.deliveriesTarget}
                    onChange={(e) => setTargetForm({ ...targetForm, deliveriesTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Renewals Target</label>
                  <input
                    type="number"
                    required
                    value={targetForm.renewalsTarget}
                    onChange={(e) => setTargetForm({ ...targetForm, renewalsTarget: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  Save Targets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

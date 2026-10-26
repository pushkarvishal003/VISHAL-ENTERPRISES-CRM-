import React, { useState, useEffect } from 'react';
import { DollarSign, Award, Clock, CheckCircle2, AlertCircle, Edit, Search, Filter, ShieldCheck, ArrowDownRight } from 'lucide-react';
import { CommissionRecord, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface CommissionsManagerProps {
  user: User;
}

export const CommissionsManager: React.FC<CommissionsManagerProps> = ({ user }) => {
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Adjust Modal
  const [adjustingComm, setAdjustingComm] = useState<CommissionRecord | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    newAmount: 0,
    status: 'Available' as any,
    reason: 'Approved performance incentive or milestone bonus',
  });

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CommissionRecord[]>('/api/commissions');
      setCommissions(data || []);
    } catch (err) {
      console.error('Error loading commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingComm) return;

    try {
      await fetchApi(`/api/commissions/${adjustingComm.id}/adjust`, {
        method: 'PUT',
        body: JSON.stringify(adjustForm),
      });
      setAdjustingComm(null);
      loadCommissions();
    } catch (err: any) {
      alert(err.message || 'Error adjusting commission.');
    }
  };

  const filteredCommissions = commissions.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.commissionId.toLowerCase().includes(q) ||
        c.dsaName.toLowerCase().includes(q) ||
        c.dsaId.toLowerCase().includes(q) ||
        c.businessName.toLowerCase().includes(q) ||
        c.saleId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalGross = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalAvailable = commissions
    .filter((c) => c.status === 'Available')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalPendingDelivery = commissions
    .filter((c) => c.status === 'Pending' || c.eligibilityStatus === 'Pending Delivery')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  const totalWithdrawn = commissions
    .filter((c) => c.status === 'Withdrawn')
    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            DSA Commission Management (Section 20)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of partner sales commissions, eligibility criteria, project delivery releases, and payouts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Rule: 10% on Sale • Released on Delivery • Paid on 7th & 14th</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/70 border border-slate-700/70 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Total Gross Commission</span>
          <p className="text-xl font-bold text-white mt-1">₹{formatINR(totalGross)}</p>
          <span className="text-[10px] text-slate-500">{commissions.length} total records</span>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/70 p-4 rounded-xl">
          <span className="text-xs text-emerald-400">Available For Payout</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">₹{formatINR(totalAvailable)}</p>
          <span className="text-[10px] text-slate-500">Website Delivered</span>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/70 p-4 rounded-xl">
          <span className="text-xs text-amber-400">Pending Delivery</span>
          <p className="text-xl font-bold text-amber-400 mt-1">₹{formatINR(totalPendingDelivery)}</p>
          <span className="text-[10px] text-slate-500">Locked until completion</span>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/70 p-4 rounded-xl">
          <span className="text-xs text-blue-400">Withdrawn / Paid Out</span>
          <p className="text-xl font-bold text-blue-400 mt-1">₹{formatINR(totalWithdrawn)}</p>
          <span className="text-[10px] text-slate-500">Processed via bank transfer</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Commission ID, Partner Name, Business, Sale ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
          >
            <option value="">All Commission Statuses</option>
            <option value="Available">Available (Delivered)</option>
            <option value="Pending">Pending (In Development)</option>
            <option value="Withdrawn">Withdrawn / Paid</option>
            <option value="Adjusted">Adjusted by Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Commission Ledger ({filteredCommissions.length})</h3>
          {loading && <span className="text-xs text-emerald-400 animate-pulse">Loading commissions...</span>}
        </div>

        {filteredCommissions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No commission records found in database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Commission ID</th>
                  <th className="py-2.5 px-3">DSA Partner</th>
                  <th className="py-2.5 px-3">Sale & Customer</th>
                  <th className="py-2.5 px-3">Sale Amount</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3">Commission</th>
                  <th className="py-2.5 px-3">Status</th>
                  {user.role === 'ADMIN' && <th className="py-2.5 px-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filteredCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{c.commissionId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{c.dsaName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.dsaId}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-white">{c.businessName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Sale: {c.saleId}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono">₹{formatINR(c.saleAmount)}</td>
                    <td className="py-2.5 px-3 font-mono font-medium">{c.commissionRate}%</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      ₹{formatINR(c.commissionAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          c.status === 'Available'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : c.status === 'Pending'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : c.status === 'Withdrawn'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.adjustmentReason && (
                        <p className="text-[9px] text-purple-300 mt-0.5 max-w-[140px] truncate" title={c.adjustmentReason}>
                          Adj: {c.adjustmentReason}
                        </p>
                      )}
                    </td>
                    {user.role === 'ADMIN' && (
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingComm(c);
                            setAdjustForm({
                              newAmount: c.commissionAmount,
                              status: c.status as any,
                              reason: c.adjustmentReason || 'Admin approved manual bonus/adjustment',
                            });
                          }}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Commission Modal */}
      {adjustingComm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-400" />
                Adjust Commission: {adjustingComm.commissionId}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustingComm(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-slate-300 space-y-1">
                <p>
                  <span className="text-slate-400">DSA Partner:</span> {adjustingComm.dsaName} ({adjustingComm.dsaId})
                </p>
                <p>
                  <span className="text-slate-400">Sale:</span> {adjustingComm.businessName} (₹
                  {formatINR(adjustingComm.saleAmount)})
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Commission Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={adjustForm.newAmount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, newAmount: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Status</label>
                <select
                  value={adjustForm.status}
                  onChange={(e) => setAdjustForm({ ...adjustForm, status: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="Available">Available (Eligible for payout)</option>
                  <option value="Pending">Pending (Awaiting delivery)</option>
                  <option value="Withdrawn">Withdrawn (Paid)</option>
                  <option value="Adjusted">Adjusted / On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Adjustment Reason (Recorded in Audit Log)</label>
                <textarea
                  rows={2}
                  required
                  placeholder="State reason for audit compliance..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingComm(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

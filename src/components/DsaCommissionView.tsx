/**
 * Vishal Enterprises CRM - DSA Commission & Withdrawal View
 * 10% website commission, Delivered delivery validation, and 7th & 14th withdrawal workflow
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowDownToLine,
  Upload,
  Calendar,
  Building,
  ShieldAlert,
} from 'lucide-react';
import { User, DsaCommissionSummary, WithdrawalRequest, Sale } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface DsaCommissionViewProps {
  user: User;
}

export const DsaCommissionView: React.FC<DsaCommissionViewProps> = ({ user }) => {
  const [summary, setSummary] = useState<DsaCommissionSummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  // Form states for withdrawal request
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'Bank Transfer' | 'UPI' | 'Cheque'>('Bank Transfer');
  const [upiId, setUpiId] = useState('');
  const [bankProof, setBankProof] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Determine current day of month
  const today = new Date();
  const currentDay = today.getDate();
  const isWithdrawalAllowed = currentDay === 7 || currentDay === 14;

  useEffect(() => {
    loadCommissionData();
  }, []);

  const loadCommissionData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<{
        summary: DsaCommissionSummary;
        sales: Sale[];
        withdrawals: WithdrawalRequest[];
      }>('/api/dsa/commission');

      setSummary(data.summary);
      setSales(data.sales || []);
      setWithdrawals(data.withdrawals || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBankProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBankProof(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }

    if (summary && amountNum > summary.availableBalance) {
      setError(`Amount exceeds your available balance of ₹${formatINR(summary.availableBalance)}`);
      return;
    }

    if (!bankProof) {
      setError('Upload of Bank Passbook, Cancelled Cheque, or Statement is mandatory.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchApi<{ message: string; withdrawal: WithdrawalRequest; request?: WithdrawalRequest }>('/api/dsa/withdrawals/request', {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          payoutMethod,
          upiId: payoutMethod === 'UPI' ? upiId : undefined,
          bankProof,
          forceSubmit: !isWithdrawalAllowed,
        }),
      });

      const reqId = res.withdrawal?.requestId || res.withdrawal?.withdrawalId || res.request?.withdrawalId || 'REQUESTED';
      setSuccessMsg(`Withdrawal requested successfully! Request ID: ${reqId}`);
      setShowWithdrawalModal(false);
      setWithdrawAmount('');
      setBankProof(null);
      loadCommissionData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            DSA Partner Commission & Payouts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Flat 10% commission on website sales. Commission becomes available upon delivery.
          </p>
        </div>

        {/* Withdrawal Trigger Button */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-withdrawal"
            type="button"
            onClick={() => {
              setError(null);
              setShowWithdrawalModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Request Withdrawal
            {isWithdrawalAllowed ? (
              <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded">Cycle Active</span>
            ) : (
              <span className="text-[10px] bg-amber-600/60 px-1.5 py-0.5 rounded">7th & 14th Cycle</span>
            )}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block font-medium">Total Website Sales</span>
          <p className="text-xl font-bold text-white mt-1">
            ₹{formatINR((summary as any)?.totalWebsiteSales ?? summary?.totalSalesAmount)}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{sales.length} Deals closed</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block font-medium">Total Commission (10%)</span>
          <p className="text-xl font-bold text-blue-400 mt-1">
            ₹{formatINR(summary?.totalCommission)}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Lifetime earned</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block font-medium">Available Balance</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            ₹{formatINR(summary?.availableBalance)}
          </p>
          <span className="text-[10px] text-emerald-500/80 mt-0.5 block">Ready for payout</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block font-medium">Pending Commission</span>
          <p className="text-xl font-bold text-amber-400 mt-1">
            ₹{formatINR(summary?.pendingCommission)}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Awaiting website delivery</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
          <span className="text-[11px] text-slate-400 block font-medium">Paid Commission</span>
          <p className="text-xl font-bold text-purple-400 mt-1">
            ₹{formatINR(summary?.paidCommission)}
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Transferred to bank</span>
        </div>
      </div>

      {/* Commission Rules Info Banner */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Official Vishal Enterprises Partner Payout Policy:</p>
          <p className="text-slate-400">
            1. Commission is strictly 10% of total website sale amount.
            <br />
            2. Commission moves from <strong className="text-amber-300">Pending</strong> to{' '}
            <strong className="text-emerald-300">Available</strong> when delivery status is marked{' '}
            <strong className="text-emerald-300">&quot;Delivered&quot;</strong> by Admin.
            <br />
            3. Withdrawal requests are processed on the <strong>7th and 14th</strong> of each month with
            mandatory verification of bank passbook or cancelled cheque.
          </p>
        </div>
      </div>

      {/* Website Sales & Commission Status Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Website Sales & Commission Breakdown</h3>

        {sales.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No sales recorded under your Partner ID yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Sale ID</th>
                  <th className="py-2.5 px-3">Client / Business</th>
                  <th className="py-2.5 px-3">Website Service</th>
                  <th className="py-2.5 px-3">Sale Amount</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                  <th className="py-2.5 px-3">Commission (10%)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{s.saleId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-white">{s.customerName}</p>
                      <p className="text-[10px] text-slate-500">{s.customerMobile}</p>
                    </td>
                    <td className="py-2.5 px-3">{s.serviceName}</td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      ₹{formatINR(s.finalAmount)}
                    </td>
                    <td className="py-2.5 px-3">
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
                    <td className="py-2.5 px-3 font-semibold text-blue-300">
                      ₹{formatINR(s.commissionAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.commissionStatus === 'Available' || s.commissionStatus === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {s.commissionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal Requests History */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Payout Withdrawal History</h3>

        {withdrawals.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No withdrawal requests placed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payout Mode</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Note / Rejection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{w.requestId || w.withdrawalId}</td>
                    <td className="py-2.5 px-3">{((w as any).requestedAt || w.requestDate || w.createdAt || '').split('T')[0]}</td>
                    <td className="py-2.5 px-3 font-bold text-white">₹{formatINR((w as any).amount ?? w.requestedAmount)}</td>
                    <td className="py-2.5 px-3">{w.payoutMethod}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          w.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : w.status === 'Rejected'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {w.rejectionReason || (w.status === 'Paid' ? 'Transferred' : 'Processing')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal Request Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Request Commission Withdrawal</h3>
            <p className="text-xs text-slate-400 mb-4">
              Available Balance: <strong className="text-emerald-400">₹{formatINR(summary?.availableBalance)}</strong>
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Withdrawal Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Payout Method *</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Cheque">Account Payee Cheque</option>
                </select>
              </div>

              {payoutMethod === 'UPI' && (
                <div>
                  <label className="block text-slate-300 mb-1">UPI ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. mobile@upi or id@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">
                  Upload Bank Passbook / Cancelled Cheque / Statement *
                </label>
                <label className="w-full py-2 bg-slate-900 border border-dashed border-slate-700 rounded-lg text-center cursor-pointer block text-slate-400 hover:text-slate-200">
                  <Upload className="w-4 h-4 inline mr-1 text-blue-400" />
                  {bankProof ? 'Bank Proof Attached (Click to Change)' : 'Upload Bank Proof Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBankProofUpload}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

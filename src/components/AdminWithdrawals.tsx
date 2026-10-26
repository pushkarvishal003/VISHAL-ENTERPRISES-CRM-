/**
 * Vishal Enterprises CRM - Admin Withdrawal Management
 * Payout review, bank verification, payment processing, UTR recording, and rejection handling
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Building,
  Search,
} from 'lucide-react';
import { WithdrawalRequest } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

export const AdminWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Bank Proof Image
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  // Process / Action Modal
  const [activeRequest, setActiveRequest] = useState<WithdrawalRequest | null>(null);
  const [newStatus, setNewStatus] = useState<
    'Bank Details Verified' | 'Approved' | 'Payment Processing' | 'Paid' | 'Rejected'
  >('Bank Details Verified');
  const [transactionRef, setTransactionRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadWithdrawals();
  }, [statusFilter]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      let q = '';
      if (statusFilter) q = `?status=${statusFilter}`;
      const data = await fetchApi<WithdrawalRequest[]>(`/api/admin/withdrawals${q}`);
      setWithdrawals(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;
    setActionError(null);

    if (newStatus === 'Rejected' && !rejectionReason.trim()) {
      setActionError('Rejection reason is required.');
      return;
    }

    try {
      await fetchApi(`/api/admin/withdrawals/${activeRequest.id}/action`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: newStatus === 'Rejected' ? rejectionReason : undefined,
          transactionRef: newStatus === 'Paid' ? transactionRef : undefined,
        }),
      });

      setActiveRequest(null);
      setTransactionRef('');
      setRejectionReason('');
      loadWithdrawals();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update withdrawal.');
    }
  };

  const filtered = withdrawals.filter(
    (w) =>
      w.dsaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.dsaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.requestId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-blue-400" />
            DSA Partner Withdrawal Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review partner payout requests, verify bank proof, and log UTR payment settlements.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Partner Name, ID, or Request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
          >
            <option value="">All Payout Statuses</option>
            <option value="Request Submitted">Request Submitted</option>
            <option value="Bank Details Verified">Bank Details Verified</option>
            <option value="Approved">Approved</option>
            <option value="Payment Processing">Payment Processing</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Withdrawals List Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Payout Requests ({filtered.length})
          </h3>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading payouts...</span>}
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No withdrawal requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Request ID</th>
                  <th className="py-2.5 px-3">DSA Partner</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Payout Method</th>
                  <th className="py-2.5 px-3">Bank Proof</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{w.requestId || w.withdrawalId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{w.dsaName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{w.dsaId}</p>
                    </td>
                    <td className="py-2.5 px-3">{((w as any).requestedAt || w.requestDate || w.createdAt || '').split('T')[0]}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-300">
                      ₹{formatINR((w as any).amount ?? w.requestedAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <p>{w.payoutMethod}</p>
                      {w.upiId && <p className="text-[10px] text-blue-400 font-mono">{w.upiId}</p>}
                    </td>
                    <td className="py-2.5 px-3">
                      {w.bankProof ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProof(w.bankProof!)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-blue-300 flex items-center gap-1 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Proof
                        </button>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
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
                      {w.transactionRef && (
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                          UTR: {w.transactionRef}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRequest(w);
                          setNewStatus(
                            w.status === 'Request Submitted'
                              ? 'Bank Details Verified'
                              : w.status === 'Bank Details Verified'
                              ? 'Approved'
                              : w.status === 'Approved'
                              ? 'Payment Processing'
                              : w.status === 'Payment Processing'
                              ? 'Paid'
                              : 'Paid'
                          );
                          setTransactionRef(w.transactionRef || '');
                          setRejectionReason(w.rejectionReason || '');
                          setActionError(null);
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-semibold text-white">Bank Passbook / Cheque Scan</span>
              <button
                onClick={() => setSelectedProof(null)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-3 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img src={selectedProof} alt="Bank Proof" className="max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Process DSA Payout</h3>
            <p className="text-xs text-slate-400 mb-4">
              Partner: {activeRequest.dsaName} ({activeRequest.requestId || activeRequest.withdrawalId}) • ₹
              {formatINR((activeRequest as any).amount ?? activeRequest.requestedAmount)}
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Next Payout Stage *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Bank Details Verified">Bank Details Verified</option>
                  <option value="Approved">Approved</option>
                  <option value="Payment Processing">Payment Processing</option>
                  <option value="Paid">Mark as Paid (Disbursed)</option>
                  <option value="Rejected">Reject Request</option>
                </select>
              </div>

              {newStatus === 'Paid' && (
                <div>
                  <label className="block text-slate-300 mb-1">Bank UTR / Transaction Reference *</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR12398492048"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              )}

              {newStatus === 'Rejected' && (
                <div>
                  <label className="block text-slate-300 mb-1">Rejection Reason *</label>
                  <textarea
                    rows={3}
                    placeholder="State reason (e.g. Incorrect bank IFSC or invalid cheque)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

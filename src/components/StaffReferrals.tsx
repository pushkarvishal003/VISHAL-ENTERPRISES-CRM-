/**
 * Vishal Enterprises CRM - Staff & Partner Referrals Engine
 * Client recommendation pipeline, tracking from submission to deal won and reward disbursement
 */

import React, { useState, useEffect } from 'react';
import { Gift, Plus, Search, CheckCircle, Clock } from 'lucide-react';
import { StaffReferral, User } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface StaffReferralsProps {
  user: User;
}

export const StaffReferrals: React.FC<StaffReferralsProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [referrals, setReferrals] = useState<StaffReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    clientName: '',
    clientMobile: '',
    clientEmail: '',
    serviceNeeded: 'Corporate Business Website',
    notes: '',
  });

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<StaffReferral[]>('/api/referrals');
      setReferrals(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/referrals', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({
        clientName: '',
        clientMobile: '',
        clientEmail: '',
        serviceNeeded: 'Corporate Business Website',
        notes: '',
      });
      loadReferrals();
    } catch (err: any) {
      alert(err.message || 'Error submitting referral.');
    }
  };

  const handleUpdateStatus = async (id: string, status: any, rewardStatus?: any) => {
    try {
      await fetchApi(`/api/referrals/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, rewardStatus }),
      });
      loadReferrals();
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-blue-400" />
            Website Client Referral Network
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Refer corporate clients, track consultation progress, and earn referral perks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Submit New Referral
        </button>
      </div>

      {/* Referrals List */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Tracked Referrals ({referrals.length})</h3>

        {referrals.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No referrals recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Referral ID</th>
                  <th className="py-2.5 px-3">Referred Client</th>
                  <th className="py-2.5 px-3">Service Inquired</th>
                  <th className="py-2.5 px-3">Referred By</th>
                  <th className="py-2.5 px-3">Pipeline Status</th>
                  <th className="py-2.5 px-3">Reward Status</th>
                  {isAdmin && <th className="py-2.5 px-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{r.referralId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{r.clientName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{r.clientMobile}</p>
                    </td>
                    <td className="py-2.5 px-3">{r.serviceNeeded}</td>
                    <td className="py-2.5 px-3">
                      <p className="text-white">{r.referredByName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.referredById}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          r.status === 'Won'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : r.status === 'Lost'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-medium text-amber-300">{r.rewardStatus}</span>
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            handleUpdateStatus(
                              r.id,
                              e.target.value,
                              e.target.value === 'Won' ? 'Disbursed' : r.rewardStatus
                            )
                          }
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Won">Deal Won</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">Submit Client Referral</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Prospective Client Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Client Mobile *</label>
                  <input
                    type="tel"
                    value={formData.clientMobile}
                    onChange={(e) => setFormData({ ...formData, clientMobile: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Website Scope / Requirement</label>
                <select
                  value={formData.serviceNeeded}
                  onChange={(e) => setFormData({ ...formData, serviceNeeded: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Corporate Business Website">Corporate Business Website</option>
                  <option value="E-Commerce Online Store">E-Commerce Online Store</option>
                  <option value="Custom Web Portal / CRM">Custom Web Portal / CRM</option>
                  <option value="Landing Page & Lead Gen">Landing Page & Lead Gen</option>
                  <option value="Website Redesign & Speed Optimization">Website Redesign</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Notes / Context</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Client industry, estimated budget, urgency..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

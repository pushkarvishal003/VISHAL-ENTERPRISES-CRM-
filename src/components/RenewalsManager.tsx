/**
 * Vishal Enterprises CRM - Website Hosting & Domain Renewals Tracker
 * Expiration monitoring, automated countdown badges, AMC billing cycles, and renewal actions
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Search, AlertTriangle, CheckCircle, Globe, Calendar } from 'lucide-react';
import { RenewalRecord, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface RenewalsManagerProps {
  user: User;
}

export const RenewalsManager: React.FC<RenewalsManagerProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    customerName: '',
    domain: '',
    serviceType: 'Cloud Hosting & SSL' as 'Domain' | 'Cloud Hosting & SSL' | 'Annual AMC' | 'Combined Package',
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    renewalAmount: 5000,
  });

  useEffect(() => {
    loadRenewals();
  }, []);

  const loadRenewals = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<RenewalRecord[]>('/api/renewals');
      setRenewals(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/renewals', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      loadRenewals();
    } catch (err: any) {
      alert(err.message || 'Error saving renewal.');
    }
  };

  const handleRenew = async (id: string) => {
    if (!confirm('Confirm renewal for another 1-year billing cycle?')) return;
    try {
      await fetchApi(`/api/renewals/${id}/renew`, { method: 'PUT' });
      loadRenewals();
    } catch (err: any) {
      alert(err.message || 'Error renewing service.');
    }
  };

  const calculateDaysLeft = (expiryDate: string) => {
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filtered = renewals.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.domain.toLowerCase().includes(search.toLowerCase()) ||
      r.serviceType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            Website Hosting, Domain & AMC Renewals
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated alerts for upcoming domain expirations, server renewals, and annual maintenance contracts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Renewal Entry
        </button>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search renewals by Client Name, Domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Renewals Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Renewal Portfolio ({filtered.length})</h3>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No renewals registered.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Renewal ID</th>
                  <th className="py-2.5 px-3">Client & Domain</th>
                  <th className="py-2.5 px-3">Service Type</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Days Remaining</th>
                  <th className="py-2.5 px-3">Renewal Fee</th>
                  <th className="py-2.5 px-3">Status</th>
                  {isAdmin && <th className="py-2.5 px-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filtered.map((r) => {
                  const days = calculateDaysLeft(r.expiryDate);
                  return (
                    <tr key={r.id} className="hover:bg-slate-700/30 transition">
                      <td className="py-2.5 px-3 font-mono font-medium text-white">{r.renewalId}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-white">{r.customerName}</p>
                        <a
                          href={`https://${r.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline font-mono inline-flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" /> {r.domain}
                        </a>
                      </td>
                      <td className="py-2.5 px-3">{r.serviceType}</td>
                      <td className="py-2.5 px-3 font-mono">{r.expiryDate}</td>
                      <td className="py-2.5 px-3">
                        {days < 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                            Expired {Math.abs(days)}d ago
                          </span>
                        ) : days <= 15 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                            ⚠️ {days} days left
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">{days} days</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        ₹{formatINR(r.renewalAmount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            r.status === 'Renewed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : r.status === 'Expired'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleRenew(r.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Renew 1-Year
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">Register Website Renewal Item</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Client / Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Global Solutions"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Domain Name *</label>
                <input
                  type="text"
                  placeholder="e.g. apexsolutions.in"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Domain">Domain Name (.com / .in)</option>
                    <option value="Cloud Hosting & SSL">Cloud SSD Hosting & SSL</option>
                    <option value="Annual AMC">Annual Maintenance (AMC)</option>
                    <option value="Combined Package">Complete Combo (Domain + Host + AMC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Renewal Amount (₹) *</label>
                  <input
                    type="number"
                    value={formData.renewalAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, renewalAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Current Expiration Date *</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

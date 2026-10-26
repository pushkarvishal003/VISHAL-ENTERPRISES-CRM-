/**
 * Vishal Enterprises CRM - Customers & Website Accounts Directory
 * Client profiles, assigned domain, hosting renewal tracking, and project history
 */

import React, { useState, useEffect } from 'react';
import { Building, Plus, Search, Globe, Phone, Mail, Calendar, Edit, ExternalLink } from 'lucide-react';
import { Customer, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface CustomersManagerProps {
  user: User;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    city: '',
    websiteDomain: '',
    hostingRenewalDate: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Customer[]>('/api/customers');
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await fetchApi(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/api/customers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Error saving customer.');
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.customerId.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.websiteDomain && c.websiteDomain.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            Customers & Website Accounts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registered business clients, active domains, and annual hosting renewals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setFormData({
              name: '',
              companyName: '',
              email: '',
              phone: '',
              city: '',
              websiteDomain: '',
              hostingRenewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'Active',
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add New Client
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Client ID, Name, Company, Phone, Domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Client Portfolio ({filtered.length})</h3>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading accounts...</span>}
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No customer accounts registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Customer ID</th>
                  <th className="py-2.5 px-3">Company / Client</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Active Website Domain</th>
                  <th className="py-2.5 px-3">Renewal Date</th>
                  <th className="py-2.5 px-3">Total Paid</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{c.customerId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{c.companyName}</p>
                      <p className="text-[10px] text-slate-400">{c.name} • {c.city}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono">{c.phone}</p>
                      <p className="text-[10px] text-slate-500">{c.email}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      {c.websiteDomain ? (
                        <a
                          href={`https://${c.websiteDomain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline font-mono"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {c.websiteDomain}
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">In Development</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono">{c.hostingRenewalDate || 'N/A'}</p>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-300">
                      ₹{formatINR(c.totalRevenue)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomer(c);
                          setFormData({
                            name: c.name,
                            companyName: c.companyName,
                            email: c.email,
                            phone: c.phone,
                            city: c.city,
                            websiteDomain: c.websiteDomain || '',
                            hostingRenewalDate: c.hostingRenewalDate || '',
                            status: c.status,
                          });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded"
                        title="Edit Customer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">
              {editingCustomer ? `Edit Client (${editingCustomer.customerId})` : 'Register Client Account'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Company / Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Logistics India Pvt Ltd"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Website Domain Name</label>
                  <input
                    type="text"
                    placeholder="e.g. apexlogistics.in"
                    value={formData.websiteDomain}
                    onChange={(e) => setFormData({ ...formData, websiteDomain: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Hosting Renewal Date</label>
                  <input
                    type="date"
                    value={formData.hostingRenewalDate}
                    onChange={(e) => setFormData({ ...formData, hostingRenewalDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Active">Active Client</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

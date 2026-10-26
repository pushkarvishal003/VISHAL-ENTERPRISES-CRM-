/**
 * Vishal Enterprises CRM - Leads Manager
 * Pipeline tracking, status filtering, assignment to Staff/DSA, and lead conversion
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  Phone,
  Mail,
  Edit,
  Trash2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Lead, LeadStatus, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface LeadsManagerProps {
  user: User;
}

export const LeadsManager: React.FC<LeadsManagerProps> = ({ user }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [dsaList, setDsaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null);
  const [assignedToId, setAssignedToId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    businessName: '',
    serviceInterested: 'Corporate Business Website',
    budget: 15000,
    source: 'Direct Enquiry',
    status: 'New' as LeadStatus,
    notes: '',
  });

  useEffect(() => {
    loadLeads();
    if (user.role === 'ADMIN') {
      loadAssignees();
    }
  }, [statusFilter]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      let q = '';
      if (statusFilter) q = `?status=${statusFilter}`;
      const data = await fetchApi<Lead[]>(`/api/leads${q}`);
      setLeads(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignees = async () => {
    try {
      const res = await fetchApi<{ staff: any[]; dsa: any[] }>('/api/admin/assignees');
      setStaffList(Array.isArray(res?.staff) ? res.staff : []);
      setDsaList(Array.isArray(res?.dsa) ? res.dsa : []);
    } catch (e) {
      console.error(e);
      setStaffList([]);
      setDsaList([]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await fetchApi(`/api/leads/${editingLead.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/api/leads', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingLead(null);
      loadLeads();
    } catch (err: any) {
      alert(err.message || 'Error saving lead.');
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalLead || !assignedToId) return;

    try {
      await fetchApi(`/api/leads/${assignModalLead.id}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedToId }),
      });
      setAssignModalLead(null);
      setAssignedToId('');
      loadLeads();
    } catch (err: any) {
      alert(err.message || 'Error assigning lead.');
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.businessName.toLowerCase().includes(search.toLowerCase()) ||
      l.leadId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Website Leads Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track inquiries, website requirements, follow-ups, and partner lead routing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingLead(null);
            setFormData({
              name: '',
              phone: '',
              email: '',
              businessName: '',
              serviceInterested: 'Corporate Business Website',
              budget: 15000,
              source: 'Direct Enquiry',
              status: 'New',
              notes: '',
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add New Lead
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Lead ID, Client Name, Business, Phone..."
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
            <option value="">All Pipeline Stages</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Requirements Gathering">Requirements Gathering</option>
            <option value="Quotation Sent">Quotation Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Converted">Converted (Deal Won)</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Leads ({filteredLeads.length})</h3>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading leads...</span>}
        </div>

        {filteredLeads.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No leads found in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Lead ID</th>
                  <th className="py-2.5 px-3">Client / Business</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Service & Budget</th>
                  <th className="py-2.5 px-3">Assigned To</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{l.leadId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{l.name}</p>
                      <p className="text-[10px] text-slate-400">{l.businessName || 'Individual'}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono">{(l as any).phone || l.mobile}</p>
                      {l.email && <p className="text-[10px] text-slate-400">{l.email}</p>}
                    </td>
                    <td className="py-2.5 px-3">
                      <p>{(l as any).serviceInterested || l.businessCategory}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">
                        ₹{formatINR((l as any).budget)}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      {l.assignedToName ? (
                        <div>
                          <p className="text-white font-medium">{l.assignedToName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{l.assignedToId}</p>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          l.status === 'Converted'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : l.status === 'Lost'
                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLead(l);
                            setFormData({
                              name: l.name,
                              phone: l.phone,
                              email: l.email || '',
                              businessName: l.businessName || '',
                              serviceInterested: l.serviceInterested,
                              budget: l.budget,
                              source: l.source,
                              status: l.status,
                              notes: l.notes || '',
                            });
                            setShowModal(true);
                          }}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded"
                          title="Edit Lead"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {user.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignModalLead(l);
                              setAssignedToId(l.assignedToId || '');
                            }}
                            className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-slate-700 rounded"
                            title="Assign to Staff or DSA"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 my-8">
            <h3 className="text-base font-bold text-white mb-4">
              {editingLead ? `Edit Lead (${editingLead.leadId})` : 'Create New Website Lead'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Client Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Mobile / Phone *</label>
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
                  <label className="block text-slate-300 mb-1">Business Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Tech LLP"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Service Interested</label>
                  <select
                    value={formData.serviceInterested}
                    onChange={(e) => setFormData({ ...formData, serviceInterested: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Corporate Business Website">Corporate Business Website</option>
                    <option value="E-Commerce Online Store">E-Commerce Online Store</option>
                    <option value="Custom Web Portal / CRM">Custom Web Portal / CRM</option>
                    <option value="Landing Page & Lead Gen">Landing Page & Lead Gen</option>
                    <option value="Website Redesign & Speed Optimization">Website Redesign</option>
                    <option value="Annual Maintenance & Cloud Hosting">Cloud Hosting & AMC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Client Budget (₹)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Pipeline Stage</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Requirements Gathering">Requirements Gathering</option>
                    <option value="Quotation Sent">Quotation Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Converted">Converted (Deal Won)</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Lead Source</label>
                  <input
                    type="text"
                    placeholder="e.g. WhatsApp, Google, Referral"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Requirements / Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Website pages needed, domain preference, references..."
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
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Modal for Admin */}
      {assignModalLead && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Assign Lead to Staff or Partner</h3>
            <p className="text-xs text-slate-400 mb-4">
              Lead: {assignModalLead.name} ({assignModalLead.leadId})
            </p>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Assignee *</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                >
                  <option value="">-- Choose Staff or DSA Partner --</option>
                  <optgroup label="Staff Members">
                    {(Array.isArray(staffList) ? staffList : []).map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.fullName} ({s.userId} - {s.department})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="DSA Partners">
                    {(Array.isArray(dsaList) ? dsaList : []).map((d) => (
                      <option key={d.userId} value={d.userId}>
                        {d.fullName} ({d.userId} - {d.businessName || 'DSA'})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalLead(null)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

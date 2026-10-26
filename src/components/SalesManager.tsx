/**
 * Vishal Enterprises CRM - Website Sales Management
 * Sales recording, advance/balance tracking, 10% DSA commission, and delivery milestone updates
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Eye,
  Edit,
} from 'lucide-react';
import { Sale, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface SalesManagerProps {
  user: User;
}

export const SalesManager: React.FC<SalesManagerProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<{ staff: any[]; dsa: any[] }>({ staff: [], dsa: [] });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  // Delivery status update modal
  const [deliveryModalSale, setDeliveryModalSale] = useState<Sale | null>(null);
  const [newDeliveryStatus, setNewDeliveryStatus] = useState<'Pending' | 'In Progress' | 'Review' | 'Delivered'>('In Progress');

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerMobile: '',
    serviceName: 'Corporate Business Website',
    finalAmount: 18000,
    advancePaid: 9000,
    closingAgentId: user.userId,
    closingAgentName: user.fullName,
    closingAgentRole: user.role as any,
    deliveryStatus: 'Pending' as 'Pending' | 'In Progress' | 'Review' | 'Delivered',
    notes: '',
  });

  useEffect(() => {
    loadSales();
    loadLookups();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<Sale[]>('/api/sales');
      setSales(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [cData, sData] = await Promise.all([
        fetchApi('/api/customers'),
        fetchApi('/api/services'),
      ]);
      setCustomers(cData || []);
      setServices(sData || []);

      if (isAdmin) {
        const aData = await fetchApi('/api/admin/assignees');
        setAssignees(aData || { staff: [], dsa: [] });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCustomerSelect = (custId: string) => {
    const cust = customers.find((c) => c.customerId === custId);
    if (cust) {
      setFormData({
        ...formData,
        customerId: cust.customerId,
        customerName: `${cust.companyName} (${cust.name})`,
        customerMobile: cust.phone,
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSale) {
        await fetchApi(`/api/sales/${editingSale.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/api/sales', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingSale(null);
      loadSales();
    } catch (err: any) {
      alert(err.message || 'Error saving sale.');
    }
  };

  const handleDeliveryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryModalSale) return;

    try {
      await fetchApi(`/api/sales/${deliveryModalSale.id}/delivery`, {
        method: 'PUT',
        body: JSON.stringify({ deliveryStatus: newDeliveryStatus }),
      });
      setDeliveryModalSale(null);
      loadSales();
    } catch (err: any) {
      alert(err.message || 'Error updating delivery status.');
    }
  };

  const filtered = sales.filter(
    (s) =>
      s.saleId.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      (s.closingAgentName && s.closingAgentName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Website Sales & Delivery Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Confirmed website orders, billing progress, and automated 10% partner commissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingSale(null);
            setFormData({
              customerId: '',
              customerName: '',
              customerMobile: '',
              serviceName: 'Corporate Business Website',
              finalAmount: 18000,
              advancePaid: 9000,
              closingAgentId: user.userId,
              closingAgentName: user.fullName,
              closingAgentRole: user.role as any,
              deliveryStatus: 'Pending',
              notes: '',
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Record New Website Sale
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Sale ID, Client Name, Website Package, Agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Closed Sales Deals ({filtered.length})</h3>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading orders...</span>}
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No website sales found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Sale ID</th>
                  <th className="py-2.5 px-3">Client / Business</th>
                  <th className="py-2.5 px-3">Service Package</th>
                  <th className="py-2.5 px-3">Deal Value</th>
                  <th className="py-2.5 px-3">Advance / Balance</th>
                  <th className="py-2.5 px-3">Closing Agent</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                  <th className="py-2.5 px-3">Commission (10%)</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{s.saleId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{s.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.customerId}</p>
                    </td>
                    <td className="py-2.5 px-3">{s.serviceName}</td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      ₹{formatINR(s.finalAmount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-emerald-400">Adv: ₹{formatINR(s.advancePaid)}</p>
                      <p className="text-amber-400 text-[10px]">
                        Bal: ₹{formatINR(s.balanceAmount ?? ((s.finalAmount || 0) - (s.advancePaid || 0)))}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-white font-medium">{s.closingAgentName}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {s.closingAgentRole} ({s.closingAgentId})
                      </span>
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
                    <td className="py-2.5 px-3">
                      {s.commissionAmount > 0 ? (
                        <div>
                          <p className="font-semibold text-blue-300">
                            ₹{formatINR(s.commissionAmount)}
                          </p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded ${
                              s.commissionStatus === 'Available'
                                ? 'text-emerald-300 bg-emerald-950/60'
                                : 'text-amber-300 bg-amber-950/60'
                            }`}
                          >
                            {s.commissionStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">In-house</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeliveryModalSale(s);
                              setNewDeliveryStatus(s.deliveryStatus);
                            }}
                            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-amber-300 text-[11px] font-medium"
                          >
                            Update Delivery
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSale(s);
                            setFormData({
                              customerId: s.customerId,
                              customerName: s.customerName,
                              customerMobile: s.customerMobile,
                              serviceName: s.serviceName,
                              finalAmount: s.finalAmount,
                              advancePaid: s.advancePaid,
                              closingAgentId: s.closingAgentId,
                              closingAgentName: s.closingAgentName,
                              closingAgentRole: s.closingAgentRole,
                              deliveryStatus: s.deliveryStatus,
                              notes: s.notes || '',
                            });
                            setShowModal(true);
                          }}
                          className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
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
              {editingSale ? `Edit Sale Record (${editingSale.saleId})` : 'Record New Website Sale'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Client / Customer Account *</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                >
                  <option value="">-- Choose Existing Client --</option>
                  {customers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.companyName} ({c.name} - {c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Website Service / Package *</label>
                <select
                  value={formData.serviceName}
                  onChange={(e) => {
                    const sName = e.target.value;
                    const matched = services.find((s) => s.name === sName);
                    setFormData({
                      ...formData,
                      serviceName: sName,
                      finalAmount: matched ? (matched.price || matched.basePrice || formData.finalAmount) : formData.finalAmount,
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                >
                  <option value="">-- Select Website Service --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.category || 'Service'}) - ₹{formatINR(s.price || s.basePrice || 0)}
                    </option>
                  ))}
                  {services.length === 0 && (
                    <>
                      <option value="Business Website">Business Website</option>
                      <option value="Landing Page">Landing Page</option>
                      <option value="E-commerce Website">E-commerce Website</option>
                      <option value="Custom Web Application">Custom Web Application</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Final Deal Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.finalAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, finalAmount: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Advance Received (₹) *</label>
                  <input
                    type="number"
                    value={formData.advancePaid}
                    onChange={(e) =>
                      setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-emerald-400 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Balance display */}
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 flex justify-between items-center text-xs">
                <span className="text-slate-400">Balance Pending:</span>
                <span className="font-bold text-amber-400 font-mono">
                  ₹{formatINR(Math.max(0, (formData.finalAmount || 0) - (formData.advancePaid || 0)))}
                </span>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-slate-300 mb-1">Closing Agent *</label>
                  <select
                    value={formData.closingAgentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const all = [...assignees.staff, ...assignees.dsa];
                      const matched = all.find((a) => a.userId === id);
                      if (matched) {
                        setFormData({
                          ...formData,
                          closingAgentId: matched.userId,
                          closingAgentName: matched.fullName,
                          closingAgentRole: matched.role,
                        });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <optgroup label="Staff Members">
                      {assignees.staff.map((s) => (
                        <option key={s.userId} value={s.userId}>
                          {s.fullName} ({s.userId} - Staff)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="DSA Partners (Eligible for 10% Commission)">
                      {assignees.dsa.map((d) => (
                        <option key={d.userId} value={d.userId}>
                          {d.fullName} ({d.userId} - DSA)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Website Delivery Status</label>
                <select
                  value={formData.deliveryStatus}
                  onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Pending">Pending Setup</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review & Testing</option>
                  {isAdmin && <option value="Delivered">Delivered (Unlocks Commission)</option>}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Project Notes / Features</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Website scope, domain info, milestones..."
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
                  Save Sale Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Delivery Milestone Modal */}
      {deliveryModalSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Update Delivery Milestone</h3>
            <p className="text-xs text-slate-400 mb-4">
              Sale Order: {deliveryModalSale.saleId} • {deliveryModalSale.customerName}
            </p>

            <form onSubmit={handleDeliveryUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Delivery Status *</label>
                <select
                  value={newDeliveryStatus}
                  onChange={(e) => setNewDeliveryStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review & Testing</option>
                  <option value="Delivered">Delivered (Unlocks Commission for Partner)</option>
                </select>
              </div>

              {newDeliveryStatus === 'Delivered' && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Setting milestone to <strong>&quot;Delivered&quot;</strong> will instantly move any DSA
                    partner commission (₹{formatINR(deliveryModalSale.commissionAmount)}) from
                    Pending to <strong>Available Balance</strong>.
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliveryModalSale(null)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Update Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Check,
  ChevronRight,
  UserCheck,
  FileText,
} from 'lucide-react';
import { FollowUp, User, Lead, Customer } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface FollowUpsManagerProps {
  user: User;
}

export const FollowUpsManager: React.FC<FollowUpsManagerProps> = ({ user }) => {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'overdue' | 'completed' | 'all'>('today');
  const [search, setSearch] = useState('');

  // Add Follow-up Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    relatedType: 'lead' as 'lead' | 'customer',
    relatedId: '',
    date: new Date().toISOString().split('T')[0],
    time: '11:00',
    type: 'Call' as 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Demo',
    purpose: 'Discuss website requirements & pricing',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    notes: '',
    assignedStaffId: user.role === 'STAFF' ? user.userId : '',
  });

  // Complete Follow-up Modal
  const [completingFollowup, setCompletingFollowup] = useState<FollowUp | null>(null);
  const [completionData, setCompletionData] = useState({
    result: 'Connected - Positive Interest',
    customerResponse: 'Client agreed to review proposal and requested a follow-up demo.',
    discussionSummary: 'Covered corporate website features, online booking, and delivery timeframe.',
    hasNextFollowup: true,
    nextDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    nextTime: '15:00',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, lData, cData, assignees] = await Promise.all([
        fetchApi<FollowUp[]>('/api/followups'),
        fetchApi<Lead[]>('/api/leads'),
        fetchApi<Customer[]>('/api/customers'),
        user.role === 'ADMIN' ? fetchApi<{ staff: any[]; dsa: any[] }>('/api/admin/assignees') : Promise.resolve({ staff: [], dsa: [] }),
      ]);
      setFollowups(fData || []);
      setLeads(lData || []);
      setCustomers(cData || []);
      setStaffList(assignees.staff || []);
    } catch (err) {
      console.error('Error loading follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredFollowups = followups.filter((f) => {
    // Filter by tab
    if (activeTab === 'today') {
      if (f.status === 'Completed' || f.date !== todayStr) return false;
    } else if (activeTab === 'pending') {
      if (f.status === 'Completed') return false;
    } else if (activeTab === 'overdue') {
      if (f.status === 'Completed' || f.date >= todayStr) return false;
    } else if (activeTab === 'completed') {
      if (f.status !== 'Completed') return false;
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchLead = f.leadName?.toLowerCase().includes(q) || f.leadId?.toLowerCase().includes(q);
      const matchNotes = f.notes?.toLowerCase().includes(q);
      const matchPurpose = (f as any).purpose?.toLowerCase().includes(q);
      return matchLead || matchNotes || matchPurpose;
    }
    return true;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let leadName = '';
      if (formData.relatedType === 'lead') {
        const sel = leads.find((l) => l.id === formData.relatedId || l.leadId === formData.relatedId);
        leadName = sel?.businessName || sel?.ownerName || 'Lead';
      } else {
        const sel = customers.find((c) => c.id === formData.relatedId || c.customerId === formData.relatedId);
        leadName = sel?.businessName || sel?.ownerName || 'Customer';
      }

      await fetchApi('/api/followups', {
        method: 'POST',
        body: JSON.stringify({
          leadId: formData.relatedId,
          leadName,
          date: formData.date,
          time: formData.time,
          type: formData.type,
          purpose: formData.purpose,
          priority: formData.priority,
          notes: formData.notes,
          assignedUserId: formData.assignedStaffId || user.userId,
        }),
      });

      setShowAddModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error scheduling follow-up.');
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingFollowup) return;

    try {
      await fetchApi(`/api/followups/${completingFollowup.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Completed',
          result: completionData.result,
          customerResponse: completionData.customerResponse,
          notes: `${completingFollowup.notes || ''}\n[Completed on ${todayStr}]: ${completionData.discussionSummary}`,
          hasNextFollowup: completionData.hasNextFollowup,
          nextDate: completionData.nextDate,
          nextTime: completionData.nextTime,
        }),
      });

      // If next follow-up requested, schedule it
      if (completionData.hasNextFollowup && completionData.nextDate) {
        await fetchApi('/api/followups', {
          method: 'POST',
          body: JSON.stringify({
            leadId: completingFollowup.leadId,
            leadName: completingFollowup.leadName,
            date: completionData.nextDate,
            time: completionData.nextTime || '11:00',
            type: completingFollowup.type,
            purpose: `Next follow-up after ${completionData.result}`,
            priority: completingFollowup.priority || 'Medium',
            notes: `Follow-up to previous call on ${todayStr}. Response: ${completionData.customerResponse}`,
            assignedUserId: completingFollowup.assignedUserId || user.userId,
          }),
        });
      }

      setCompletingFollowup(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating follow-up.');
    }
  };

  const todayCount = followups.filter((f) => f.status !== 'Completed' && f.date === todayStr).length;
  const overdueCount = followups.filter((f) => f.status !== 'Completed' && f.date < todayStr).length;
  const completedCount = followups.filter((f) => f.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Website Sales Follow-ups
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track daily calls, scheduled meetings, website demos, and customer responses with full history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Schedule Follow-up
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('today')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            activeTab === 'today'
              ? 'bg-blue-600/20 border-blue-500/50 text-white'
              : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Due Today</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{todayCount}</p>
        </div>

        <div
          onClick={() => setActiveTab('overdue')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            activeTab === 'overdue'
              ? 'bg-rose-600/20 border-rose-500/50 text-white'
              : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-rose-400">{overdueCount}</p>
        </div>

        <div
          onClick={() => setActiveTab('pending')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            activeTab === 'pending'
              ? 'bg-amber-600/20 border-amber-500/50 text-white'
              : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">All Pending</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold mt-2">{followups.filter((f) => f.status !== 'Completed').length}</p>
        </div>

        <div
          onClick={() => setActiveTab('completed')}
          className={`cursor-pointer p-4 rounded-xl border transition ${
            activeTab === 'completed'
              ? 'bg-emerald-600/20 border-emerald-500/50 text-white'
              : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold mt-2 text-emerald-400">{completedCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {(['today', 'pending', 'overdue', 'completed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {tab === 'today' ? "Today's Follow-ups" : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client, business, purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Follow-ups List */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            Follow-up Queue ({filteredFollowups.length})
          </h3>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading follow-ups...</span>}
        </div>

        {filteredFollowups.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-400">No follow-ups found in this view</p>
            <p className="mt-1">All caught up or try switching tabs.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFollowups.map((f) => {
              const isOverdue = f.status !== 'Completed' && f.date < todayStr;
              const isToday = f.date === todayStr;

              return (
                <div
                  key={f.id}
                  className={`p-4 rounded-xl border transition ${
                    f.status === 'Completed'
                      ? 'bg-slate-900/40 border-slate-800 opacity-80'
                      : isOverdue
                      ? 'bg-rose-950/20 border-rose-800/40'
                      : isToday
                      ? 'bg-blue-950/20 border-blue-800/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">
                          {f.leadName || 'Business Contact'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                          {f.type}
                        </span>
                        {f.priority && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              f.priority === 'Urgent'
                                ? 'bg-rose-500/20 text-rose-300'
                                : f.priority === 'High'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {f.priority}
                          </span>
                        )}
                        {f.status === 'Completed' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                            <Check className="w-3 h-3" /> Completed
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                            Overdue
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-300">
                        <span className="font-medium text-blue-400">Purpose:</span>{' '}
                        {(f as any).purpose || f.notes || 'Website enquiry follow-up'}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {f.date} at {(f as any).time || '11:00'}
                        </span>
                        {f.assignedUserId && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            Assigned: {f.assignedUserId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {f.status !== 'Completed' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCompletingFollowup(f);
                            setCompletionData({
                              result: 'Connected - Positive Interest',
                              customerResponse: 'Client is interested in the website package and requested next step.',
                              discussionSummary: '',
                              hasNextFollowup: true,
                              nextDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                              nextTime: '15:00',
                            });
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Log Result & Complete
                        </button>
                      ) : (
                        <div className="text-right text-[11px] text-emerald-400">
                          <p className="font-semibold">Result Logged</p>
                          <p className="text-[10px] text-slate-400">{(f as any).result || 'Call Done'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Schedule New Follow-up
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Related Record</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, relatedType: 'lead', relatedId: '' })}
                    className={`py-1.5 rounded-lg border font-semibold ${
                      formData.relatedType === 'lead'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, relatedType: 'customer', relatedId: '' })}
                    className={`py-1.5 rounded-lg border font-semibold ${
                      formData.relatedType === 'customer'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Customer
                  </button>
                </div>

                <select
                  required
                  value={formData.relatedId}
                  onChange={(e) => setFormData({ ...formData, relatedId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">Select {formData.relatedType === 'lead' ? 'Lead' : 'Customer'}...</option>
                  {formData.relatedType === 'lead'
                    ? leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.leadId} - {l.businessName} ({l.ownerName})
                        </option>
                      ))
                    : customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.customerId} - {c.businessName} ({c.ownerName})
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Contact Method</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Meeting">Meeting (In-person / Virtual)</option>
                    <option value="Demo">Website Live Demo</option>
                    <option value="Email">Email Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Follow-up Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Present quotation, discuss features, finalize order..."
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Preparation Notes / Agenda</label>
                <textarea
                  rows={3}
                  placeholder="Points to discuss during this interaction..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Follow-up Modal */}
      {completingFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Complete Follow-up: {completingFollowup.leadName}
              </h3>
              <button
                type="button"
                onClick={() => setCompletingFollowup(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Call / Interaction Result</label>
                <select
                  value={completionData.result}
                  onChange={(e) => setCompletionData({ ...completionData, result: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="Connected - Positive Interest">Connected - Positive Interest</option>
                  <option value="Connected - Quotation Requested">Connected - Quotation Requested</option>
                  <option value="Connected - Demo Scheduled">Connected - Demo Scheduled</option>
                  <option value="Connected - Price Negotiation">Connected - Price Negotiation</option>
                  <option value="Connected - Callback Requested">Connected - Callback Requested</option>
                  <option value="Deal Closed - Converted to Sale">Deal Closed - Converted to Sale</option>
                  <option value="Not Interested - Lost">Not Interested - Lost</option>
                  <option value="Not Reachable / No Answer">Not Reachable / No Answer</option>
                  <option value="Busy / Call Later">Busy / Call Later</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Customer Response / Feedback</label>
                <textarea
                  rows={2}
                  required
                  placeholder="What did the customer say regarding features, price, delivery?"
                  value={completionData.customerResponse}
                  onChange={(e) => setCompletionData({ ...completionData, customerResponse: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Discussion Summary & Next Steps</label>
                <textarea
                  rows={2}
                  placeholder="Action items or summary of conversation..."
                  value={completionData.discussionSummary}
                  onChange={(e) => setCompletionData({ ...completionData, discussionSummary: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              {/* Next Follow-up Switch */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Schedule Next Follow-up?</span>
                  <input
                    type="checkbox"
                    checked={completionData.hasNextFollowup}
                    onChange={(e) => setCompletionData({ ...completionData, hasNextFollowup: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                </div>

                {completionData.hasNextFollowup && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Next Date</label>
                      <input
                        type="date"
                        required
                        value={completionData.nextDate}
                        onChange={(e) => setCompletionData({ ...completionData, nextDate: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Next Time</label>
                      <input
                        type="time"
                        required
                        value={completionData.nextTime}
                        onChange={(e) => setCompletionData({ ...completionData, nextTime: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingFollowup(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold"
                >
                  Save & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

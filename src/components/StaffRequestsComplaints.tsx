/**
 * Vishal Enterprises CRM - Requests & Complaints Hub
 * Leave requests, profile updates, HR tickets, and administrative resolutions
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { StaffRequest, StaffComplaint, User } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface StaffRequestsComplaintsProps {
  user: User;
}

export const StaffRequestsComplaints: React.FC<StaffRequestsComplaintsProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'requests' | 'complaints'>('requests');
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [complaints, setComplaints] = useState<StaffComplaint[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showReqModal, setShowReqModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);

  // Resolution modal for Admin
  const [resolvingItem, setResolvingItem] = useState<{ id: string; type: 'req' | 'comp' } | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');

  // Request Form
  const [reqForm, setReqForm] = useState({
    type: 'Leave' as 'Leave' | 'Profile Update' | 'Advance Salary' | 'Asset Request' | 'Other',
    title: '',
    description: '',
  });

  // Complaint Form
  const [compForm, setCompForm] = useState({
    subject: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rData, cData] = await Promise.all([
        fetchApi<StaffRequest[]>('/api/requests'),
        fetchApi<StaffComplaint[]>('/api/complaints'),
      ]);
      setRequests(rData || []);
      setComplaints(cData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/requests', {
        method: 'POST',
        body: JSON.stringify(reqForm),
      });
      setShowReqModal(false);
      setReqForm({ type: 'Leave', title: '', description: '' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error submitting request.');
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/complaints', {
        method: 'POST',
        body: JSON.stringify(compForm),
      });
      setShowCompModal(false);
      setCompForm({ subject: '', description: '', priority: 'Medium' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error submitting complaint.');
    }
  };

  const handleResolve = async (status: 'Approved' | 'Rejected' | 'Resolved') => {
    if (!resolvingItem) return;
    try {
      if (resolvingItem.type === 'req') {
        await fetchApi(`/api/requests/${resolvingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status, remarks: adminRemarks }),
        });
      } else {
        await fetchApi(`/api/complaints/${resolvingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'Resolved', resolutionNotes: adminRemarks }),
        });
      }
      setResolvingItem(null);
      setAdminRemarks('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            Staff Requests & Grievance Complaints
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit leave requests, profile adjustments, workplace issues, and administrative reviews.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowReqModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
          <button
            type="button"
            onClick={() => setShowCompModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Log Grievance
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'requests' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Official Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'complaints' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Grievances & Complaints ({complaints.length})
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Requests Registry</h3>

          {requests.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No staff requests found.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-xs space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-blue-400 font-semibold">{r.type}</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{r.title}</h4>
                      <p className="text-slate-400 text-[11px]">
                        Submitted by <strong className="text-slate-200">{r.staffName}</strong> ({r.staffId}) on{' '}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.status === 'Approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : r.status === 'Rejected'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{r.description}</p>

                  {r.adminRemarks && (
                    <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-slate-300">
                      <strong className="text-slate-400">Admin Remarks:</strong> {r.adminRemarks}
                    </div>
                  )}

                  {isAdmin && r.status === 'Pending' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setResolvingItem({ id: r.id, type: 'req' })}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded text-xs font-semibold"
                      >
                        Action Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Grievance Issues</h3>

          {complaints.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No grievance tickets logged.</p>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 text-xs space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          c.priority === 'Urgent'
                            ? 'bg-red-950 text-red-300'
                            : c.priority === 'High'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-blue-950 text-blue-300'
                        }`}
                      >
                        Priority: {c.priority}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1">{c.subject}</h4>
                      <p className="text-slate-400 text-[11px]">
                        Logged by <strong className="text-slate-200">{c.staffName}</strong> ({c.staffId})
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        c.status === 'Resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{c.description}</p>

                  {c.resolutionNotes && (
                    <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 text-slate-300">
                      <strong className="text-slate-400">Resolution:</strong> {c.resolutionNotes}
                    </div>
                  )}

                  {isAdmin && c.status !== 'Resolved' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setResolvingItem({ id: c.id, type: 'comp' })}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded text-xs font-semibold"
                      >
                        Resolve Grievance
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Request Modal */}
      {showReqModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">Submit Staff Request</h3>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Request Category *</label>
                <select
                  value={reqForm.type}
                  onChange={(e) => setReqForm({ ...reqForm, type: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Leave">Leave of Absence</option>
                  <option value="Profile Update">Profile Information Update</option>
                  <option value="Advance Salary">Advance Salary Request</option>
                  <option value="Asset Request">IT / Office Asset Request</option>
                  <option value="Other">Other Operational Request</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Request Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Leave for 3 days due to personal emergency"
                  value={reqForm.title}
                  onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Detailed Explanation *</label>
                <textarea
                  rows={3}
                  value={reqForm.description}
                  onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Grievance Modal */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">Log Workplace Grievance</h3>

            <form onSubmit={handleCreateComplaint} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Subject *</label>
                <input
                  type="text"
                  placeholder="e.g. Software license issue / Device overheating"
                  value={compForm.subject}
                  onChange={(e) => setCompForm({ ...compForm, subject: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Priority</label>
                <select
                  value={compForm.priority}
                  onChange={(e) => setCompForm({ ...compForm, priority: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Issue Description *</label>
                <textarea
                  rows={3}
                  value={compForm.description}
                  onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                >
                  Submit Grievance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Action Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">
              {resolvingItem.type === 'req' ? 'Review Staff Request' : 'Resolve Grievance'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Administrative Remarks / Decision Notes *</label>
                <textarea
                  rows={3}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Notes explaining approval, rejection, or resolution..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>

              {resolvingItem.type === 'req' ? (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleResolve('Approved')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve('Rejected')}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolvingItem(null)}
                    className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg font-semibold"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleResolve('Resolved')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                  >
                    Mark as Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolvingItem(null)}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

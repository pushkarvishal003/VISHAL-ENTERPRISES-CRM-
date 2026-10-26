import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  Clock,
  FileText,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Upload,
  RefreshCw,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { User, Customer, WebsiteProject, Sale, Payment, RenewalRecord } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface ClientPortalProps {
  user: User;
}

interface PortalData {
  customer: Customer | null;
  projects: WebsiteProject[];
  sales: Sale[];
  payments: Payment[];
  proposals: any[];
  renewals: RenewalRecord[];
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ user }) => {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [submittingRev, setSubmittingRev] = useState(false);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<PortalData>('/api/client/portal-data');
      setData(res);
      if (res.projects && res.projects.length > 0) {
        setSelectedProjectId(res.projects[0].id);
      }
    } catch (err) {
      console.error('Error loading portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !revisionNotes.trim()) return;

    setSubmittingRev(true);
    try {
      await fetchApi(`/api/projects/${selectedProjectId}/revisions`, {
        method: 'POST',
        body: JSON.stringify({ notes: revisionNotes }),
      });
      setShowRevisionModal(false);
      setRevisionNotes('');
      alert('Revision request submitted successfully to our development team!');
      loadPortalData();
    } catch (err: any) {
      alert(err.message || 'Error submitting revision request.');
    } finally {
      setSubmittingRev(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-400" />
        Loading your Client Portal & Project Dashboard...
      </div>
    );
  }

  const customer = data?.customer;
  const project = data?.projects?.[0];
  const sales = data?.sales || [];
  const payments = data?.payments || [];
  const renewals = data?.renewals || [];

  const totalAmount = sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0) || customer?.totalAmount || 0;
  const amountPaid = payments.filter((p) => p.status === 'Verified').reduce((sum, p) => sum + (p.amount || 0), 0) || customer?.amountReceived || 0;
  const amountPending = Math.max(0, totalAmount - amountPaid);

  const getStatusIndex = (status?: string) => {
    switch (status) {
      case 'Planning':
        return 0;
      case 'Design':
      case 'Wireframing':
        return 1;
      case 'Development':
        return 2;
      case 'Testing':
      case 'Review':
        return 3;
      case 'Live':
        return 4;
      case 'Delivered':
        return 5;
      default:
        return 0;
    }
  };

  const stages = ['Planning & Scope', 'Design & Wireframe', 'Development', 'Client Review', 'Go Live', 'Delivered'];
  const currentStageIndex = getStatusIndex(project?.status);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 to-slate-900/80 border border-blue-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              Vishal Enterprises Client Portal
            </span>
            <h1 className="text-2xl font-bold text-white mt-2">
              Welcome, {customer?.businessName || user.businessName || user.fullName}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Customer ID: <strong className="font-mono text-white">{customer?.customerId || user.customerId || 'CUST-ACTIVE'}</strong> • Client Login: <strong className="font-mono text-white">{user.userId}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {project?.liveUrl && (
              <a
                href={project.liveUrl.startsWith('http') ? project.liveUrl : `https://${project.liveUrl}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <Globe className="w-4 h-4" />
                Visit Live Website
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>
            )}
            {project && (
              <button
                type="button"
                onClick={() => setShowRevisionModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                Request Revision
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Website Project Progress Card */}
      {project ? (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">{project.businessName} Website Project</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Domain: <span className="text-white font-mono">{project.websiteDomain || 'Pending Registration'}</span> • Package: {project.packageName || project.websiteType || 'Custom Website'}
              </p>
            </div>

            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold self-start sm:self-auto">
              Status: {project.status}
            </span>
          </div>

          {/* Stepper Progress */}
          <div>
            <p className="text-xs text-slate-400 mb-3 font-semibold">Development Milestones</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {stages.map((stage, idx) => {
                const isDone = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div
                    key={stage}
                    className={`p-3 rounded-xl border text-center transition ${
                      isDone
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-blue-950/40 border-blue-500 text-white font-semibold ring-1 ring-blue-500/50'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex justify-center mb-1.5">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] leading-tight">{stage}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* URLs & Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Developer in Charge</span>
              <span className="font-semibold text-white">{project.developer || 'Vishal Web Team'}</span>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Staging / Demo Preview</span>
              {project.stagingUrl || project.demoUrl ? (
                <a
                  href={project.stagingUrl || project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-400 hover:underline flex items-center gap-1"
                >
                  Open Preview Link <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-500 italic">Preparing demo build</span>
              )}
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block mb-1">Target Delivery Date</span>
              <span className="font-semibold text-white font-mono">
                {project.expectedDeliveryDate || project.deliveryDate || 'Within 7 Business Days'}
              </span>
            </div>
          </div>

          {/* Revisions History */}
          {project.revisions && project.revisions.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-2 font-semibold">Your Revision Requests ({project.revisions.length})</p>
              <div className="space-y-2">
                {project.revisions.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Revision #{rev.revisionNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                          {rev.status}
                        </span>
                      </div>
                      <p className="text-slate-300 mt-1">{rev.notes}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                      {new Date(rev.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 text-center text-slate-400 text-xs">
          <Globe className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="font-semibold text-white">No active website project assigned yet</p>
          <p className="mt-1">Once your order is confirmed, your live project tracker will appear here.</p>
        </div>
      )}

      {/* Financials & Payments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <span className="text-xs text-slate-400">Total Website Value</span>
          <p className="text-2xl font-bold text-white mt-1">₹{formatINR(totalAmount)}</p>
          <span className="text-[10px] text-slate-500">Includes hosting & domain</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <span className="text-xs text-emerald-400">Total Paid</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">₹{formatINR(amountPaid)}</p>
          <span className="text-[10px] text-slate-500">Verified receipts</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
          <span className="text-xs text-amber-400">Balance Pending</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">₹{formatINR(amountPending)}</p>
          <span className="text-[10px] text-slate-500">Due upon live delivery</span>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Invoices & Payment Receipts</h3>
        {payments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No payment records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2 px-3">Receipt / Payment ID</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Mode</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3 font-mono text-white">{p.paymentId}</td>
                    <td className="py-2 px-3">{p.paymentDate}</td>
                    <td className="py-2 px-3 font-bold text-emerald-400">₹{formatINR(p.amount)}</td>
                    <td className="py-2 px-3">{p.mode}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Submit Website Revision Request
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRevisionSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-300">
                Please describe the specific text changes, image swaps, color adjustments, or layout updates you would like our team to make:
              </p>

              <div>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Change banner headline to 'Premium Hair & Beauty Salon in Mumbai', replace hero image with attachment, add WhatsApp chat bubble on footer..."
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRev}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {submittingRev ? 'Submitting...' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

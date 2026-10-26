import React, { useState } from 'react';
import {
  X,
  Printer,
  ShoppingBag,
  Send,
  Copy,
  Check,
  Clock,
  Building,
  UserCheck,
  DollarSign,
  Calendar,
  MessageSquare,
  History,
  FileText,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit,
  Repeat,
} from 'lucide-react';
import { Proposal, ProposalStatus, User, ProposalCommunication } from '../../types/crm.ts';
import { fetchApi, formatINR, formatDate } from '../../lib/api.ts';

interface ProposalDetailModalProps {
  proposal: Proposal;
  user: User;
  onClose: () => void;
  onUpdate: (updated: Proposal) => void;
  onEdit: (proposal: Proposal) => void;
  onPrint: (proposal: Proposal) => void;
  onConvertToSale: (proposal: Proposal) => void;
  onDuplicate: (proposal: Proposal) => void;
}

export const ProposalDetailModal: React.FC<ProposalDetailModalProps> = ({
  proposal,
  user,
  onClose,
  onUpdate,
  onEdit,
  onPrint,
  onConvertToSale,
  onDuplicate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'communication'>('overview');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<ProposalStatus>(proposal.status);

  // Communication Log Form
  const [showAddCommModal, setShowAddCommModal] = useState(false);
  const [commType, setCommType] = useState<'WhatsApp' | 'Email' | 'Phone Call' | 'In-Person Meeting'>('Phone Call');
  const [commNotes, setCommNotes] = useState('');
  const [commSubmitting, setCommSubmitting] = useState(false);

  // WhatsApp Send Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [waSending, setWaSending] = useState(false);

  const isExpired = proposal.validUntil && proposal.validUntil < new Date().toISOString().split('T')[0];
  const isConverted = proposal.status === 'Converted to Sale' || Boolean(proposal.saleId);

  // Formatted WhatsApp Message
  const cleanPhone = (proposal.whatsapp || proposal.mobile || '').replace(/\D/g, '');
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const whatsappMessage = `*OFFICIAL WEBSITE DEVELOPMENT QUOTATION*
*Vishal Enterprises*
Quote ID: *${proposal.proposalId}*
Client: *${proposal.businessName}* (Attn: ${proposal.contactPerson})

Website Solution: *${proposal.serviceName}* ${proposal.packageName ? `(${proposal.packageName})` : ''}
Delivery Timeline: *${proposal.deliveryTimeline || '5-7 Working Days'}*

*Commercial Investment Breakdown:*
• Base Package: ₹${formatINR(proposal.basePrice)}
${proposal.discount > 0 ? `• Promotional Discount: -₹${formatINR(proposal.discount)}\n` : ''}• GST / Tax: ₹${formatINR(proposal.taxAmount)}
*Total Payable Amount:* *₹${formatINR(proposal.finalAmount)}*

Advance Required (50%): ₹${formatINR(proposal.advancePaymentAmount || Math.round(proposal.finalAmount * 0.5))}
Quotation Valid Until: ${proposal.validUntil || '15 Days'}

For approvals or modifications, please reply directly or contact our desk.
Official Support: +91 98765 43210 | contact@vishalenterprises.in`;

  // Status Change Handler
  const handleStatusChangeSubmit = async () => {
    setStatusUpdating(true);
    try {
      const updated = await fetchApi<Proposal>(`/api/proposals/${proposal.id || proposal.proposalId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: targetStatus,
          notes: statusNotes,
        }),
      });
      onUpdate(updated);
      setShowStatusModal(false);
      setStatusNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Add Communication Record
  const handleAddCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commNotes.trim()) return;

    setCommSubmitting(true);
    try {
      const res = await fetchApi<{ success: boolean; proposal: Proposal }>(
        `/api/proposals/${proposal.id || proposal.proposalId}/communication`,
        {
          method: 'POST',
          body: JSON.stringify({
            type: commType,
            recipient: proposal.contactPerson,
            notes: commNotes,
          }),
        }
      );
      if (res.proposal) {
        onUpdate(res.proposal);
      }
      setShowAddCommModal(false);
      setCommNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to save communication record.');
    } finally {
      setCommSubmitting(false);
    }
  };

  // Dispatch via WhatsApp & Log
  const handleDispatchWhatsApp = async () => {
    setWaSending(true);
    try {
      // 1. Record backend send activity
      const res = await fetchApi<{ success: boolean; proposal: Proposal }>(
        `/api/proposals/${proposal.id || proposal.proposalId}/send`,
        {
          method: 'POST',
          body: JSON.stringify({
            method: 'WhatsApp',
            recipient: proposal.whatsapp || proposal.mobile,
          }),
        }
      );
      if (res.proposal) {
        onUpdate(res.proposal);
      }

      // 2. Open WhatsApp Web or mobile app
      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(waUrl, '_blank');
      setShowWhatsAppModal(false);
    } catch (err: any) {
      alert(err.message || 'Error recording WhatsApp dispatch.');
    } finally {
      setWaSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const getStatusBadge = (status: ProposalStatus) => {
    const badgeConfig: Record<ProposalStatus, { bg: string; text: string; border: string }> = {
      Draft: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600' },
      Sent: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
      Viewed: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
      Negotiation: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
      Accepted: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
      Rejected: { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/30' },
      Expired: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/30' },
      'Converted to Sale': { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/30' },
    };
    const c = badgeConfig[status] || badgeConfig.Draft;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full text-slate-100 shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 rounded-t-2xl flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white">{proposal.proposalId}</span>
                {getStatusBadge(proposal.status)}
                {isExpired && proposal.status !== 'Converted to Sale' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Validity Expired
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {proposal.businessName} • Attn: {proposal.contactPerson} ({proposal.mobile})
              </p>
            </div>
          </div>

          {/* Quick Actions Top Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Convert to Sale Button */}
            {!isConverted && (
              <button
                id="convert-proposal-top-btn"
                type="button"
                onClick={() => onConvertToSale(proposal)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Convert to Sale
              </button>
            )}

            {/* Change Status */}
            <button
              type="button"
              onClick={() => {
                setTargetStatus(proposal.status);
                setShowStatusModal(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
            >
              Status
            </button>

            {/* WhatsApp Send */}
            <button
              id="send-proposal-whatsapp-btn"
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" /> Send Quote
            </button>

            {/* Print / PDF */}
            <button
              id="view-print-proposal-btn"
              type="button"
              onClick={() => onPrint(proposal)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Official PDF
            </button>

            {/* Edit */}
            {!isConverted && (
              <button
                type="button"
                onClick={() => onEdit(proposal)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700"
                title="Edit Proposal"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Duplicate */}
            <button
              type="button"
              onClick={() => onDuplicate(proposal)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition border border-slate-700"
              title="Duplicate Proposal"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 border-b border-slate-800 bg-slate-900 flex gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Overview & Financials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> Activity Trail ({proposal.activities?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('communication')}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'communication'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Client Touchpoints ({proposal.communications?.length || 0})
          </button>
        </div>

        {/* Scrollable Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Linked Sale Banner if converted */}
              {isConverted && proposal.saleId && (
                <div className="p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-between text-teal-300">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      Converted into Official Sale: <strong className="font-mono text-white">{proposal.saleId}</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-400 font-semibold">Active in Website Sales</span>
                </div>
              )}

              {/* Customer & Partner Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/70 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Building className="w-3 h-3 text-blue-400" /> Client Profile
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{proposal.businessName}</h4>
                    <p className="text-slate-300 font-medium">Contact: {proposal.contactPerson}</p>
                    <p className="text-slate-400 font-mono">Mobile: {proposal.mobile}</p>
                    {proposal.whatsapp && proposal.whatsapp !== proposal.mobile && (
                      <p className="text-slate-400 font-mono">WhatsApp: {proposal.whatsapp}</p>
                    )}
                    {proposal.email && <p className="text-slate-400">Email: {proposal.email}</p>}
                    {(proposal.city || proposal.state) && (
                      <p className="text-slate-400">
                        Location: {[proposal.address, proposal.city, proposal.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/70 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-400" /> Executive & Validity
                    </span>
                    <div className="mt-1 space-y-1">
                      <p className="text-slate-300">
                        Prepared By: <strong className="text-white">{proposal.createdByName}</strong> ({proposal.createdByRole})
                      </p>
                      <p className="text-slate-300">
                        Assigned Partner:{' '}
                        <strong className="text-white">
                          {proposal.assignedDsaName || proposal.assignedStaffName || 'Direct Company Account'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Created On:</span>
                      <span className="font-mono text-slate-200">{proposal.createdAt.split('T')[0]}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Valid Until:</span>
                      <span className={`font-mono font-bold ${isExpired ? 'text-rose-400' : 'text-amber-400'}`}>
                        {proposal.validUntil || '15 Days'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service & Deliverables */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                  <div>
                    <h4 className="text-sm font-bold text-white">{proposal.serviceName}</h4>
                    {proposal.packageName && (
                      <p className="text-xs text-blue-400 font-mono">Package: {proposal.packageName}</p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-slate-800 rounded-lg text-slate-300 font-mono text-[11px]">
                    Timeline: {proposal.deliveryTimeline || '5-7 Working Days'}
                  </span>
                </div>

                {proposal.features && proposal.features.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {proposal.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                        <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Commercials Breakdown Table */}
              <div className="border border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-800/80 px-4 py-2.5 font-semibold text-slate-200 flex justify-between">
                  <span>Scope Item</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-slate-800 p-4 space-y-2 bg-slate-900/60">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold text-white">{proposal.serviceName}</p>
                      <p className="text-[10px] text-slate-400">Base Website Architecture & Delivery</p>
                    </div>
                    <span className="font-mono font-bold text-white">₹{formatINR(proposal.basePrice)}</span>
                  </div>

                  {proposal.additionalCharges && proposal.additionalCharges.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {proposal.additionalCharges.map((item) => (
                        <div key={item.id} className="flex justify-between text-slate-300">
                          <span>+ {item.description}</span>
                          <span className="font-mono">₹{formatINR(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-700 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Quoted Subtotal:</span>
                      <span className="font-mono">₹{formatINR(proposal.quotedAmount)}</span>
                    </div>

                    {proposal.discount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount:</span>
                        <span className="font-mono">- ₹{formatINR(proposal.discount)}</span>
                      </div>
                    )}

                    {proposal.taxRate !== undefined && (
                      <div className="flex justify-between text-slate-400">
                        <span>Tax / GST ({proposal.taxRate}%):</span>
                        <span className="font-mono">₹{formatINR(proposal.taxAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-700">
                      <span>Final Payable Total:</span>
                      <span className="text-emerald-400 font-mono">₹{formatINR(proposal.finalAmount)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                      <div className="text-blue-400 font-semibold">
                        Advance ({proposal.advancePaymentPercent || 50}%): ₹{formatINR(proposal.advancePaymentAmount || Math.round(proposal.finalAmount * 0.5))}
                      </div>
                      <div className="text-right text-slate-400">
                        Balance on Delivery: ₹{formatINR(proposal.balanceAmount || Math.round(proposal.finalAmount * 0.5))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment & Terms */}
              {proposal.paymentTerms && (
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 text-[11px]">
                  <span className="font-semibold text-slate-300 block mb-1">Payment & Milestone Terms:</span>
                  <p className="text-slate-400 leading-relaxed">{proposal.paymentTerms}</p>
                </div>
              )}

              {proposal.notes && (
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 text-[11px]">
                  <span className="font-semibold text-slate-300 block mb-1">Special Notes / Inclusions:</span>
                  <p className="text-slate-400 leading-relaxed">{proposal.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Activity Log / Audit Trail */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">Audit Trail & Action History</h4>
                <span className="text-slate-400 text-[11px]">{proposal.activities?.length || 0} recorded events</span>
              </div>

              {!proposal.activities || proposal.activities.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800 text-slate-500">
                  No activity history logged yet.
                </div>
              ) : (
                <div className="relative border-l border-slate-700 ml-4 space-y-4 py-2">
                  {proposal.activities.map((act) => (
                    <div key={act.id} className="relative pl-6">
                      <div className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-slate-900" />
                      <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold text-white text-xs">{act.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {act.date} {act.exactTime}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">{act.notes}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Actor: {act.userName} ({act.userRole})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Client Touchpoints / Communication */}
          {activeTab === 'communication' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-white">Client Communications & Touchpoints</h4>
                  <p className="text-[10px] text-slate-400">Phone calls, WhatsApp chats, meetings, and emails</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCommModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1"
                >
                  + Log Touchpoint
                </button>
              </div>

              {!proposal.communications || proposal.communications.length === 0 ? (
                <div className="p-8 text-center bg-slate-800/30 rounded-xl border border-slate-800 text-slate-500">
                  No communication touchpoints logged yet. Click "+ Log Touchpoint" to record a call or meeting note.
                </div>
              ) : (
                <div className="space-y-2">
                  {proposal.communications.map((comm) => (
                    <div key={comm.id} className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        {comm.type === 'WhatsApp' ? (
                          <Send className="w-4 h-4 text-emerald-400" />
                        ) : comm.type === 'Email' ? (
                          <Mail className="w-4 h-4 text-sky-400" />
                        ) : (
                          <Phone className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white text-xs">{comm.type}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {comm.date} {comm.time}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] mt-1 whitespace-pre-wrap">{comm.notes}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Logged by: {comm.senderOrAgent}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Status Change Popup */}
        {showStatusModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-5 text-slate-100 shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-sm">Update Proposal Status</h3>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Select Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ProposalStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Viewed">Viewed</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Reason / Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Client requested 5% discount, discussed over call"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusChangeSubmit}
                  disabled={statusUpdating}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  {statusUpdating ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Communication Popup */}
        {showAddCommModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleAddCommunication}
              className="bg-slate-800 border border-slate-700 rounded-2xl max-w-sm w-full p-5 text-slate-100 shadow-2xl space-y-4"
            >
              <h3 className="font-bold text-white text-sm">Log Client Touchpoint</h3>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Type</label>
                <select
                  value={commType}
                  onChange={(e) => setCommType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                >
                  <option value="Phone Call">Phone Call</option>
                  <option value="WhatsApp">WhatsApp Conversation</option>
                  <option value="Email">Email Communication</option>
                  <option value="In-Person Meeting">In-Person Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Discussion Notes *</label>
                <textarea
                  rows={3}
                  value={commNotes}
                  onChange={(e) => setCommNotes(e.target.value)}
                  placeholder="Summary of conversation, questions raised, or agreed follow-up date..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCommModal(false)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commSubmitting}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  {commSubmitting ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* WhatsApp Dispatch Modal */}
        {showWhatsAppModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" /> Dispatch Proposal via WhatsApp
                </h3>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
                <p className="text-slate-400">Recipient:</p>
                <p className="font-semibold text-white">
                  {proposal.contactPerson} ({proposal.whatsapp || proposal.mobile})
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 text-xs">Generated WhatsApp Message:</label>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedText ? 'Copied' : 'Copy Text'}
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-700 max-h-44 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                  {whatsappMessage}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="w-1/3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  id="open-whatsapp-dispatch-btn"
                  type="button"
                  onClick={handleDispatchWhatsApp}
                  disabled={waSending}
                  className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {waSending ? 'Opening...' : 'Open in WhatsApp & Log'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

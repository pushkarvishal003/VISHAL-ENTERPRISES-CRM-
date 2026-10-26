import React, { useState, useEffect } from 'react';
import { Printer, X, Download, ShieldCheck, CheckSquare, Calendar, Building, UserCheck } from 'lucide-react';
import { Proposal, CrmSettings } from '../../types/crm.ts';
import { formatINR, formatDate, fetchApi } from '../../lib/api.ts';

interface ProposalPrintViewProps {
  proposal: Proposal;
  onClose: () => void;
}

export const ProposalPrintView: React.FC<ProposalPrintViewProps> = ({ proposal, onClose }) => {
  const [settings, setSettings] = useState<CrmSettings | null>(null);

  useEffect(() => {
    fetchApi<CrmSettings>('/api/settings')
      .then((data) => setSettings(data))
      .catch(() => null);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const isExpired = proposal.validUntil && proposal.validUntil < new Date().toISOString().split('T')[0];

  const companyName = settings?.companyName || settings?.companyProfile?.companyName || 'Vishal Enterprises';
  const companyTagline = settings?.companyTagline || settings?.companyProfile?.tagline || 'Website Development & Digital Architecture Division';
  const officeAddress = settings?.registeredAddress || settings?.companyProfile?.address || 'Plot 42, Cyber Heights, Sector 18';
  const city = settings?.city || settings?.companyProfile?.city || 'Gurugram';
  const state = settings?.state || settings?.companyProfile?.state || 'Haryana';
  const pinCode = settings?.pinCode || settings?.companyProfile?.pinCode || '122002';
  const supportEmail = settings?.supportEmail || settings?.companyProfile?.email || 'contact@vishalenterprises.in';
  const supportPhone = settings?.supportPhone || settings?.companyProfile?.phone || '+91 98765 43210';
  const gstin = settings?.gstin || settings?.companyProfile?.gstin || '06AABCV1234F1Z8';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      {/* Container - Printable Card */}
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black my-auto">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">Official Quotation Document</span>
            <span className="text-xs text-slate-400 font-mono">({proposal.proposalId})</span>
            {isExpired && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Expired
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              id="print-proposal-btn"
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE SHEET */}
        <div id="quotation-print-sheet" className="p-6 sm:p-10 space-y-6 text-xs print:text-[11px] print:p-6 print:text-slate-900 print:bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-700 print:border-slate-300 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-wider uppercase">
                  {companyName.slice(0, 2)}
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white print:text-slate-950 uppercase">
                    {companyName}
                  </h1>
                  <p className="text-[11px] text-blue-400 print:text-blue-700 font-medium">
                    {companyTagline}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 print:text-slate-600 mt-2 max-w-xs leading-relaxed">
                Registered Office: {officeAddress}, {city}, {state} - {pinCode}
                <br />
                Email: {supportEmail} | Support: {supportPhone}
                <br />
                GSTIN: {gstin}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-blue-500/10 text-blue-400 print:bg-blue-50 print:text-blue-800 border border-blue-500/20 font-mono font-bold text-xs">
                QUOTATION / PROPOSAL
              </span>
              <div className="mt-2 space-y-0.5 text-slate-300 print:text-slate-700 font-mono text-[11px]">
                <p>
                  <span className="text-slate-400 print:text-slate-500 font-sans">Quote No:</span>{' '}
                  <strong className="text-white print:text-black">{proposal.proposalId}</strong>
                </p>
                <p>
                  <span className="text-slate-400 print:text-slate-500 font-sans">Date:</span>{' '}
                  {proposal.createdAt.split('T')[0]}
                </p>
                <p>
                  <span className="text-slate-400 print:text-slate-500 font-sans">Valid Until:</span>{' '}
                  <strong className={isExpired ? 'text-rose-400 print:text-rose-600' : 'text-amber-400 print:text-amber-700'}>
                    {proposal.validUntil || '15 Days from issue'}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          {/* Client & Assigned Executive Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 print:bg-slate-50 p-3.5 rounded-xl border border-slate-700 print:border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                Prepared For:
              </span>
              <p className="text-sm font-bold text-white print:text-black mt-1">
                {proposal.businessName}
              </p>
              <p className="text-slate-300 print:text-slate-700 font-medium">
                Attn: {proposal.contactPerson}
              </p>
              <p className="text-slate-400 print:text-slate-600 font-mono">
                Phone: {proposal.mobile} {proposal.whatsapp && proposal.whatsapp !== proposal.mobile ? `• WA: ${proposal.whatsapp}` : ''}
              </p>
              {proposal.email && (
                <p className="text-slate-400 print:text-slate-600">Email: {proposal.email}</p>
              )}
              {(proposal.city || proposal.state) && (
                <p className="text-slate-400 print:text-slate-600">
                  Location: {[proposal.address, proposal.city, proposal.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            <div className="bg-slate-800/60 print:bg-slate-50 p-3.5 rounded-xl border border-slate-700 print:border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                  Account Representative:
                </span>
                <p className="text-sm font-bold text-white print:text-black mt-1">
                  {proposal.assignedDsaName || proposal.assignedStaffName || proposal.createdByName}
                </p>
                <p className="text-slate-400 print:text-slate-600">
                  Role: {proposal.assignedDsaName ? 'Authorized Direct Selling Agent (DSA)' : 'Client Solutions Specialist'}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 print:text-slate-500 pt-2 border-t border-slate-700/60 print:border-slate-200">
                <span>Direct Support Desk: tech@vishalenterprises.in</span>
              </div>
            </div>
          </div>

          {/* Scope of Work & Deliverables Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wide text-white print:text-black">
                1. Project Scope & Deliverables
              </span>
              <span className="text-[10px] font-medium text-slate-400 print:text-slate-600">
                Timeline: {proposal.deliveryTimeline || '5-7 Working Days'}
              </span>
            </div>

            <div className="bg-slate-800/40 print:bg-slate-50 p-3.5 rounded-xl border border-slate-700/80 print:border-slate-200">
              <div className="flex items-center justify-between font-semibold text-white print:text-black pb-2 border-b border-slate-700/60 print:border-slate-200">
                <span>{proposal.serviceName}</span>
                {proposal.packageName && (
                  <span className="text-blue-400 print:text-blue-800 font-mono text-[11px]">
                    Package: {proposal.packageName}
                  </span>
                )}
              </div>

              {/* Features inclusions */}
              {proposal.features && proposal.features.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                  {proposal.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-slate-300 print:text-slate-700">
                      <CheckSquare className="w-3 h-3 text-emerald-400 print:text-emerald-600 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Commercial Pricing Table */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-white print:text-black">
              2. Commercial Investment Breakdown
            </span>

            <div className="border border-slate-700 print:border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-800 print:bg-slate-100 text-slate-400 print:text-slate-700 border-b border-slate-700 print:border-slate-300 font-medium">
                  <tr>
                    <th className="py-2 px-3">Scope Description</th>
                    <th className="py-2 px-3 text-center w-16">Qty</th>
                    <th className="py-2 px-3 text-right w-28">Rate (₹)</th>
                    <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-200 print:text-slate-800">
                  {/* Base Package Line */}
                  <tr>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white print:text-black">{proposal.serviceName}</p>
                      <p className="text-[10px] text-slate-400 print:text-slate-500">
                        {proposal.packageName ? `Official ${proposal.packageName} package configuration` : 'Standard comprehensive package'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">1</td>
                    <td className="py-2.5 px-3 text-right font-mono">₹{formatINR(proposal.basePrice)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white print:text-black">
                      ₹{formatINR(proposal.basePrice)}
                    </td>
                  </tr>

                  {/* Additional Add-ons */}
                  {proposal.additionalCharges && proposal.additionalCharges.length > 0 &&
                    proposal.additionalCharges.map((addon) => (
                      <tr key={addon.id}>
                        <td className="py-2 px-3">
                          <p className="font-medium text-slate-300 print:text-slate-700">+ {addon.description}</p>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">1</td>
                        <td className="py-2 px-3 text-right font-mono">₹{formatINR(addon.amount)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300 print:text-slate-800">
                          ₹{formatINR(addon.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="bg-slate-800/60 print:bg-slate-50 p-4 border-t border-slate-700 print:border-slate-300 flex justify-end">
                <div className="w-72 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400 print:text-slate-600">
                    <span>Quoted Subtotal:</span>
                    <span className="font-mono">₹{formatINR(proposal.quotedAmount)}</span>
                  </div>

                  {proposal.discount > 0 && (
                    <div className="flex justify-between text-emerald-400 print:text-emerald-700">
                      <span>Special Promotional Discount:</span>
                      <span className="font-mono">- ₹{formatINR(proposal.discount)}</span>
                    </div>
                  )}

                  {proposal.taxRate !== undefined && (
                    <div className="flex justify-between text-slate-400 print:text-slate-600">
                      <span>Applicable GST / Taxes ({proposal.taxRate}%):</span>
                      <span className="font-mono">₹{formatINR(proposal.taxAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-bold text-white print:text-black border-t border-slate-700 print:border-slate-300 pt-2">
                    <span>Final Net Total:</span>
                    <span className="font-mono text-emerald-400 print:text-emerald-700">
                      ₹{formatINR(proposal.finalAmount)}
                    </span>
                  </div>

                  {/* Advance & Balance split */}
                  <div className="pt-2 border-t border-slate-700/50 print:border-slate-200 space-y-1 text-[10px]">
                    <div className="flex justify-between text-blue-400 print:text-blue-800 font-semibold">
                      <span>Advance Required ({proposal.advancePaymentPercent || 50}%):</span>
                      <span className="font-mono">₹{formatINR(proposal.advancePaymentAmount || Math.round(proposal.finalAmount * 0.5))}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 print:text-slate-600">
                      <span>Balance Due on Delivery:</span>
                      <span className="font-mono">₹{formatINR(proposal.balanceAmount || Math.round(proposal.finalAmount * 0.5))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms, Milestones & Payment Info */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="p-3 bg-slate-800/40 print:bg-slate-50 rounded-xl border border-slate-700/80 print:border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                Payment & Delivery Terms:
              </span>
              <p className="text-[10px] text-slate-300 print:text-slate-700 leading-relaxed">
                1. <strong>Milestone:</strong> {proposal.paymentTerms || '50% advance to initiate design; 50% upon final sign-off & domain deployment.'}
              </p>
              <p className="text-[10px] text-slate-300 print:text-slate-700 leading-relaxed">
                2. <strong>Delivery:</strong> Guaranteed completion within {proposal.deliveryTimeline || '5-7 working days'} from client asset handover.
              </p>
              <p className="text-[10px] text-slate-300 print:text-slate-700 leading-relaxed">
                3. <strong>Validity:</strong> This quotation is binding until {proposal.validUntil || '15 days'}.
              </p>
            </div>

            <div className="p-3 bg-slate-800/40 print:bg-slate-50 rounded-xl border border-slate-700/80 print:border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-500">
                Bank Remittance Details:
              </span>
              <div className="text-[10px] font-mono text-slate-300 print:text-slate-800 space-y-0.5">
                <p><span className="font-sans text-slate-400 print:text-slate-500">Account Name:</span> VISHAL ENTERPRISES</p>
                <p><span className="font-sans text-slate-400 print:text-slate-500">Bank Name:</span> HDFC Bank Ltd</p>
                <p><span className="font-sans text-slate-400 print:text-slate-500">Account No:</span> 50200088991122</p>
                <p><span className="font-sans text-slate-400 print:text-slate-500">IFSC Code:</span> HDFC0001234</p>
                <p><span className="font-sans text-slate-400 print:text-slate-500">UPI Handle:</span> vishalenterprises@hdfcbank</p>
              </div>
            </div>
          </div>

          {/* Signatures & Footer */}
          <div className="pt-6 border-t border-slate-700 print:border-slate-300 flex justify-between items-end text-center">
            <div className="w-48 text-left">
              <p className="text-[10px] text-slate-400 print:text-slate-500 mb-8">Client Acceptance Stamp & Sign:</p>
              <div className="border-t border-slate-600 print:border-slate-400 pt-1 text-[10px] text-slate-400 print:text-slate-600">
                Authorised Representative
              </div>
            </div>

            <div className="w-56 text-right">
              <div className="inline-block border border-blue-500/30 print:border-blue-700/30 px-3 py-1 rounded text-[9px] font-bold text-blue-400 print:text-blue-800 mb-6 uppercase tracking-wider">
                VISHAL ENTERPRISES AUTH SEAL
              </div>
              <div className="border-t border-slate-600 print:border-slate-400 pt-1 text-[10px] text-slate-400 print:text-slate-600">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

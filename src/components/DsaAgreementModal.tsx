/**
 * Vishal Enterprises CRM - Digital Partner Agreement for DSA
 * Terms, commission terms, code of conduct, and digital signature acceptance
 */

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, ShieldCheck, Printer } from 'lucide-react';
import { User } from '../types/crm.ts';
import { fetchApi, formatDate } from '../lib/api.ts';

interface DsaAgreementModalProps {
  user: User;
}

export const DsaAgreementModal: React.FC<DsaAgreementModalProps> = ({ user }) => {
  const [agreementStatus, setAgreementStatus] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadAgreement();
  }, []);

  const loadAgreement = async () => {
    try {
      const data = await fetchApi('/api/dsa/agreement');
      setAgreementStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      const res = await fetchApi('/api/dsa/agreement/accept', {
        method: 'POST',
      });
      setMsg(res.message);
      loadAgreement();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            DSA Partner Digital Agreement
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Binding terms and conditions governing the partner engagement with Vishal Enterprises.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Agreement Document Card */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-xs text-slate-300 space-y-4 leading-relaxed max-w-4xl mx-auto">
        <div className="text-center border-b border-slate-700 pb-4">
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
            VISHAL ENTERPRISES
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Website Sales & Web Services Division</p>
          <p className="text-blue-400 text-xs font-semibold mt-2 uppercase tracking-wider">
            Official Direct Selling Agent (DSA) Agreement • Version 2026-A
          </p>
        </div>

        <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60 flex flex-wrap justify-between gap-2 text-[11px]">
          <div>
            <strong>Partner ID:</strong> <span className="font-mono text-white">{user.userId}</span>
          </div>
          <div>
            <strong>Partner Name:</strong> <span className="text-white">{user.fullName}</span>
          </div>
          <div>
            <strong>Business / Agency:</strong>{' '}
            <span className="text-white">{user.businessName || 'Authorized Partner'}</span>
          </div>
          <div>
            <strong>Status:</strong>{' '}
            <span className="text-emerald-400 font-semibold">
              {agreementStatus?.signed ? 'Digitally Signed & Active' : 'Pending Signature'}
            </span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h4 className="font-bold text-white text-sm">1. Scope of Engagement</h4>
          <p>
            The Direct Selling Agent (&quot;Partner&quot;) is authorized to solicit and present Vishal Enterprises web
            design, e-commerce development, business portals, custom software, and digital marketing services to
            prospective clients in accordance with the official service guidelines and pricing structures established by
            Vishal Enterprises.
          </p>

          <h4 className="font-bold text-white text-sm">2. Commission Structure & Delivery Milestones</h4>
          <p>
            The Partner shall receive a flat commission rate of <strong>10% (ten percent)</strong> on the net sale amount of
            completed website and digital development packages closed through the Partner&apos;s assigned tracking link or
            Partner ID.
          </p>
          <p className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
            <strong>Mandatory Delivery Prerequisite:</strong> Commission becomes{' '}
            <span className="text-emerald-300 font-semibold">Available</span> for payout exclusively when the website
            project status reaches the <span className="text-emerald-300 font-semibold">&quot;Delivered&quot;</span>{' '}
            milestone and the client final payment has been fully received and verified by Vishal Enterprises Accounts.
          </p>

          <h4 className="font-bold text-white text-sm">3. Payout Calendar</h4>
          <p>
            Commission disbursements occur strictly on the <strong>7th and 14th</strong> calendar day of each month. Payout
            requests submitted outside these scheduled cycles shall remain queued until the subsequent active payout window.
            All payouts are subject to verified bank account documentation.
          </p>

          <h4 className="font-bold text-white text-sm">4. Confidentiality & Code of Professional Conduct</h4>
          <p>
            The Partner agrees to safeguard all client data, enterprise quotations, and technical workflows. Any misrepresentation
            of project timelines or pricing without explicit written administrative approval shall result in immediate
            termination of partner privileges and forfeiture of accrued commissions.
          </p>
        </div>

        {/* Digital Signature Acceptance Block */}
        <div className="border-t border-slate-700 pt-6 mt-6">
          {agreementStatus?.signed ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-white">Agreement Digitally Executed</p>
                <p className="text-[11px] text-emerald-300">
                  Accepted by {user.fullName} ({user.userId}) on {formatDate(agreementStatus.signedAt)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-900 rounded-xl border border-slate-700">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-0"
                />
                <span className="text-xs text-slate-200">
                  I hereby confirm that I have read, understood, and agree to be bound by the Vishal Enterprises DSA
                  Partner Agreement terms, 10% commission delivery milestone policy, and scheduled payout calendar.
                </span>
              </label>

              <button
                type="button"
                disabled={!agreed || loading}
                onClick={handleAccept}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? 'Recording Digital Acceptance...' : 'Digitally Accept & Sign Agreement'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

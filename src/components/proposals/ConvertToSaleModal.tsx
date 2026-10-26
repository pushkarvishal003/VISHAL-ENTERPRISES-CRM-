import React, { useState } from 'react';
import { ShoppingBag, CheckCircle, AlertCircle, ArrowRight, X, ShieldCheck } from 'lucide-react';
import { Proposal, Sale } from '../../types/crm.ts';
import { fetchApi, formatINR } from '../../lib/api.ts';

interface ConvertToSaleModalProps {
  proposal: Proposal;
  onClose: () => void;
  onSuccess: (updatedProposal: Proposal, newSale: Sale) => void;
  onNavigateToSales?: () => void;
}

export const ConvertToSaleModal: React.FC<ConvertToSaleModalProps> = ({
  proposal,
  onClose,
  onSuccess,
  onNavigateToSales,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedResult, setConvertedResult] = useState<{ sale: Sale; proposal: Proposal } | null>(null);

  const alreadyConverted = proposal.status === 'Converted to Sale' || Boolean(proposal.saleId);

  const handleConvert = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi<{
        success: boolean;
        message: string;
        sale: Sale;
        proposal: Proposal;
      }>(`/api/proposals/${proposal.id || proposal.proposalId}/convert-to-sale`, {
        method: 'POST',
      });

      if (res.success && res.sale) {
        setConvertedResult({ sale: res.sale, proposal: res.proposal });
        onSuccess(res.proposal, res.sale);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to convert proposal to sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative my-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {convertedResult ? (
          <div className="text-center py-3 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Quotation Successfully Converted!</h3>
              <p className="text-xs text-slate-400 mt-1">
                The proposal has been converted into an official verified sale and linked into the development pipeline.
              </p>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Official Sale ID:</span>
                <span className="font-bold text-white">{convertedResult.sale.saleId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Customer:</span>
                <span className="text-slate-200 truncate">{convertedResult.sale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Service:</span>
                <span className="text-blue-300">{convertedResult.sale.serviceName}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-700">
                <span className="text-slate-400 font-sans">Final Amount:</span>
                <span className="font-bold text-emerald-400">₹{formatINR(convertedResult.sale.finalAmount)}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {onNavigateToSales && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToSales();
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <ShoppingBag className="w-4 h-4" /> View in Website Sales Module
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Convert Proposal to Sale</h3>
                <p className="text-xs text-slate-400 font-mono">{proposal.proposalId}</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {alreadyConverted ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-xs space-y-1">
                <p className="font-semibold">Already Converted to Sale</p>
                <p className="text-slate-300">
                  This proposal is already linked to Sale record{' '}
                  <strong className="font-mono text-white">{proposal.saleId}</strong>.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client / Business:</span>
                    <span className="font-semibold text-white truncate">{proposal.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="text-slate-200">{proposal.contactPerson} ({proposal.mobile})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Website Service:</span>
                    <span className="text-blue-300">{proposal.serviceName}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-700">
                    <span className="text-slate-400">Final Agreed Amount:</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{formatINR(proposal.finalAmount)}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Conversion Workflow Automation:</p>
                  <p>• Automatically records an official Sale (SALE-YYYY-XXX)</p>
                  <p>• Ensures a linked Customer entry exists in database</p>
                  <p>• Sets proposal status to "Converted to Sale"</p>
                  {proposal.leadId && <p>• Updates linked Lead ({proposal.leadId}) status to "Won"</p>}
                  <p>• Creates new Website Project in production pipeline</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-convert-to-sale-btn"
                    type="button"
                    onClick={handleConvert}
                    disabled={loading}
                    className="w-1/2 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-lg shadow-teal-900/30"
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Confirm & Convert
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

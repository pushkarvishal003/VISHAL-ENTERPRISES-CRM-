/**
 * Vishal Enterprises CRM - Payments & Receipts Manager
 * Client transaction logging, advance/balance receipts, proof upload, and accounts reconciliation
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, CheckCircle2, Upload, Eye, AlertCircle } from 'lucide-react';
import { PaymentRecord, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface PaymentsManagerProps {
  user: User;
}

export const PaymentsManager: React.FC<PaymentsManagerProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [receiptViewer, setReceiptViewer] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    saleId: '',
    customerName: '',
    amount: 10000,
    paymentType: 'Advance' as 'Advance' | 'Balance' | 'Full Payment',
    paymentMode: 'UPI' as 'UPI' | 'Bank Transfer' | 'Card' | 'Cash',
    transactionRef: '',
    receiptUrl: '',
  });

  useEffect(() => {
    loadPayments();
    loadSales();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<PaymentRecord[]>('/api/payments');
      setPayments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      const data = await fetchApi('/api/sales');
      setSales(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaleSelect = (saleId: string) => {
    const sale = sales.find((s) => s.saleId === saleId);
    if (sale) {
      setFormData({
        ...formData,
        saleId: sale.saleId,
        customerName: sale.customerName,
        amount: sale.balanceAmount > 0 ? sale.balanceAmount : sale.advancePaid,
      });
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData({ ...formData, receiptUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/payments', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      loadPayments();
    } catch (err: any) {
      alert(err.message || 'Error recording payment.');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await fetchApi(`/api/payments/${id}/verify`, { method: 'PUT' });
      loadPayments();
    } catch (err: any) {
      alert(err.message || 'Error verifying payment.');
    }
  };

  const filtered = payments.filter(
    (p) =>
      p.paymentId.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.saleId.toLowerCase().includes(search.toLowerCase()) ||
      (p.transactionRef && p.transactionRef.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Client Payments & Billing Ledgers
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reconcile client advance and milestone payments with transaction references.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormData({
              saleId: '',
              customerName: '',
              amount: 10000,
              paymentType: 'Advance',
              paymentMode: 'UPI',
              transactionRef: '',
              receiptUrl: '',
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Record Client Payment
        </button>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search payments by ID, Customer Name, Sale ID, Transaction Ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Payment Receipts ({filtered.length})</h3>

        {filtered.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No payments logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Payment ID</th>
                  <th className="py-2.5 px-3">Client / Sale Order</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Type & Mode</th>
                  <th className="py-2.5 px-3">Transaction Ref</th>
                  <th className="py-2.5 px-3">Receipt Scan</th>
                  <th className="py-2.5 px-3">Status</th>
                  {isAdmin && <th className="py-2.5 px-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{p.paymentId}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-white">{p.customerName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.saleId}</p>
                    </td>
                    <td className="py-2.5 px-3">{(p.paymentDate || '').split('T')[0] || 'N/A'}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-300">
                      ₹{formatINR(p.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <p>{p.paymentType}</p>
                      <p className="text-[10px] text-slate-400">{p.paymentMode}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      {p.transactionRef || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3">
                      {p.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => setReceiptViewer(p.receiptUrl!)}
                          className="text-blue-400 hover:underline text-[11px] flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          p.verified
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {p.verified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3">
                        {!p.verified && (
                          <button
                            type="button"
                            onClick={() => handleVerify(p.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold"
                          >
                            Verify
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">Record Client Payment</h3>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Select Website Sale Order *</label>
                <select
                  value={formData.saleId}
                  onChange={(e) => handleSaleSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                >
                  <option value="">-- Choose Sale Order --</option>
                  {sales.map((s) => (
                    <option key={s.saleId} value={s.saleId}>
                      {s.saleId} - {s.customerName} (₹{s.finalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Payment Type</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Advance">Advance Deposit</option>
                    <option value="Balance">Final Milestone Balance</option>
                    <option value="Full Payment">Full 100% Upfront</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cash">Cash Deposit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Amount Received (₹) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Bank UTR / Transaction ID</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI48920198"
                    value={formData.transactionRef}
                    onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Upload Receipt / Screenshot</label>
                <label className="w-full py-2 bg-slate-900 border border-dashed border-slate-700 rounded-lg text-center cursor-pointer block text-slate-400 hover:text-slate-200">
                  <Upload className="w-4 h-4 inline mr-1 text-blue-400" />
                  {formData.receiptUrl ? 'Receipt Image Attached' : 'Choose Receipt Screenshot'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                </label>
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
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview */}
      {receiptViewer && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-xs">
              <span className="font-semibold text-white">Payment Receipt Proof</span>
              <button onClick={() => setReceiptViewer(null)} className="text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-3 rounded-xl overflow-hidden bg-black">
              <img src={receiptViewer} alt="Receipt proof" className="w-full max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

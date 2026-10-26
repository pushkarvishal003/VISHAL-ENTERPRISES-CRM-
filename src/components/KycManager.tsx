/**
 * Vishal Enterprises CRM - KYC Management & Document Inspector
 * Staff & DSA KYC submissions and Admin document viewer with Zoom/Rotate/Approval
 */

import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Upload,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Building,
  UserCheck,
} from 'lucide-react';
import { User, StaffKyc, DsaKyc } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface KycManagerProps {
  user: User;
}

export const KycManager: React.FC<KycManagerProps> = ({ user }) => {
  const isAdmin = user.role === 'ADMIN';

  // State for Staff/DSA own KYC
  const [ownKyc, setOwnKyc] = useState<StaffKyc | DsaKyc | null>(null);
  const [staffForm, setStaffForm] = useState<any>({});
  const [dsaForm, setDsaForm] = useState<any>({
    bankDetails: { accountHolderName: '', bankName: '', accountNumber: '', ifsc: '', branch: '', accountType: 'Savings' },
  });

  // State for Admin
  const [adminStaffList, setAdminStaffList] = useState<StaffKyc[]>([]);
  const [adminDsaList, setAdminDsaList] = useState<DsaKyc[]>([]);
  const [activeTab, setActiveTab] = useState<'staff' | 'dsa'>('staff');

  // Document Inspection Viewer State
  const [viewerDoc, setViewerDoc] = useState<{ title: string; url: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Admin Action Modal
  const [actionModal, setActionModal] = useState<{ type: 'staff' | 'dsa'; id: string; name: string } | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'correction_needed'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadAdminKycList();
    } else {
      loadOwnKyc();
    }
  }, [isAdmin]);

  const loadOwnKyc = async () => {
    try {
      const res = await fetchApi<{ kyc: any }>('/api/kyc/status');
      if (res.kyc) {
        setOwnKyc(res.kyc);
        if (user.role === 'STAFF') setStaffForm(res.kyc);
        if (user.role === 'DSA') setDsaForm(res.kyc);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAdminKycList = async () => {
    setLoading(true);
    try {
      const res = await fetchApi<{ staffKyc: StaffKyc[]; dsaKyc: DsaKyc[] }>('/api/admin/kyc');
      setAdminStaffList(res.staffKyc || []);
      setAdminDsaList(res.dsaKyc || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Convert uploaded image file to high-resolution base64 string
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    isDsa: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (isDsa) {
        setDsaForm((prev: any) => ({
          ...prev,
          documents: { ...(prev.documents || {}), [field]: base64 },
        }));
      } else {
        setStaffForm((prev: any) => ({
          ...prev,
          documents: { ...(prev.documents || {}), [field]: base64 },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetchApi('/api/kyc/staff/submit', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setMsg(res.message);
      loadOwnKyc();
    } catch (error: any) {
      setErr(error.message || 'Failed to submit KYC.');
    } finally {
      setLoading(false);
    }
  };

  const handleDsaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const res = await fetchApi('/api/kyc/dsa/submit', {
        method: 'POST',
        body: JSON.stringify(dsaForm),
      });
      setMsg(res.message);
      loadOwnKyc();
    } catch (error: any) {
      setErr(error.message || 'Failed to submit KYC.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;

    setLoading(true);
    try {
      await fetchApi(`/api/admin/kyc/${actionModal.type}/${actionModal.id}/action`, {
        method: 'PUT',
        body: JSON.stringify({
          action: actionType,
          reason: rejectionReason,
        }),
      });
      setActionModal(null);
      setRejectionReason('');
      loadAdminKycList();
    } catch (error: any) {
      setErr(error.message || 'Failed to process KYC action.');
    } finally {
      setLoading(false);
    }
  };

  const openDocumentViewer = (title: string, url?: string) => {
    if (!url) return;
    setViewerDoc({ title, url });
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-400" />
            {isAdmin ? 'KYC Verification Administration' : 'My KYC Verification'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Review and verify identity and bank credentials with full document viewer.'
              : 'Submit mandatory identification and banking documents for administrative verification.'}
          </p>
        </div>

        {/* Current status pill for Staff/DSA */}
        {!isAdmin && ownKyc && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Current Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                ownKyc.status === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : ownKyc.status === 'rejected'
                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {ownKyc.status}
            </span>
          </div>
        )}
      </div>

      {msg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {err && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* ====================================================================
          ADMIN VIEW: LIST OF STAFF & DSA KYC
         ==================================================================== */}
      {isAdmin ? (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-3">
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'staff' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Staff KYC Submissions ({adminStaffList.length})
            </button>
            <button
              onClick={() => setActiveTab('dsa')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === 'dsa' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              DSA Partner KYC Submissions ({adminDsaList.length})
            </button>
          </div>

          {activeTab === 'staff' ? (
            <div className="space-y-4">
              {adminStaffList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No Staff KYC submissions yet.</p>
              ) : (
                adminStaffList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div>
                        <span className="font-bold text-white text-sm">{item.fullName}</span>
                        <span className="text-slate-400 ml-2 font-mono">({item.staffId})</span>
                        <span className="text-slate-400 ml-2">
                          • {item.department} / {item.designation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : item.status === 'rejected'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          onClick={() => {
                            setActionModal({ type: 'staff', id: item.id, name: item.fullName });
                            setActionType(item.status === 'approved' ? 'approved' : 'approved');
                            setRejectionReason(item.rejectionReason || '');
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Review & Action
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400">
                      <div>Mobile: <span className="text-slate-200">{item.mobile}</span></div>
                      <div>Email: <span className="text-slate-200">{item.email}</span></div>
                      <div>City/State: <span className="text-slate-200">{item.city}, {item.state}</span></div>
                      <div>Qual: <span className="text-slate-200">{item.highestQualification} ({item.passingYear})</span></div>
                    </div>

                    {/* Document Thumbnails */}
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-2">Uploaded Identity Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.documents.aadhaarFront && (
                          <button
                            onClick={() => openDocumentViewer('Aadhaar Front', item.documents.aadhaarFront)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Aadhaar Front
                          </button>
                        )}
                        {item.documents.aadhaarBack && (
                          <button
                            onClick={() => openDocumentViewer('Aadhaar Back', item.documents.aadhaarBack)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Aadhaar Back
                          </button>
                        )}
                        {item.documents.pan && (
                          <button
                            onClick={() => openDocumentViewer('PAN Card', item.documents.pan)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> PAN Card
                          </button>
                        )}
                        {item.documents.educationCert && (
                          <button
                            onClick={() => openDocumentViewer('Education Certificate', item.documents.educationCert)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Education Cert
                          </button>
                        )}
                        {item.documents.bankProof && (
                          <button
                            onClick={() => openDocumentViewer('Bank Proof', item.documents.bankProof)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Bank Passbook
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {adminDsaList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No DSA KYC submissions yet.</p>
              ) : (
                adminDsaList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div>
                        <span className="font-bold text-white text-sm">{item.fullName}</span>
                        <span className="text-slate-400 ml-2 font-mono">({item.dsaId})</span>
                        <span className="text-slate-400 ml-2">• {item.businessName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : item.status === 'rejected'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                        <button
                          onClick={() => {
                            setActionModal({ type: 'dsa', id: item.id, name: item.fullName });
                            setActionType(item.status === 'approved' ? 'approved' : 'approved');
                            setRejectionReason(item.rejectionReason || '');
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Review & Action
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400">
                      <div>Mobile: <span className="text-slate-200">{item.mobile}</span></div>
                      <div>Bank: <span className="text-slate-200">{item.bankDetails?.bankName}</span></div>
                      <div>A/C: <span className="text-slate-200 font-mono">{item.bankDetails?.accountNumber}</span></div>
                      <div>IFSC: <span className="text-slate-200 font-mono">{item.bankDetails?.ifsc}</span></div>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-2">Uploaded Bank & ID Documents:</p>
                      <div className="flex flex-wrap gap-2">
                        {item.documents.aadhaarFront && (
                          <button
                            onClick={() => openDocumentViewer('Aadhaar Front', item.documents.aadhaarFront)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Aadhaar Front
                          </button>
                        )}
                        {item.documents.pan && (
                          <button
                            onClick={() => openDocumentViewer('PAN Card', item.documents.pan)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> PAN Card
                          </button>
                        )}
                        {item.documents.bankPassbook && (
                          <button
                            onClick={() => openDocumentViewer('Bank Passbook', item.documents.bankPassbook)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Bank Passbook
                          </button>
                        )}
                        {item.documents.cancelledCheque && (
                          <button
                            onClick={() => openDocumentViewer('Cancelled Cheque', item.documents.cancelledCheque)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg flex items-center gap-1.5 border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" /> Cancelled Cheque
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : user.role === 'STAFF' ? (
        /* ====================================================================
            STAFF KYC FORM
           ==================================================================== */
        <form onSubmit={handleStaffSubmit} className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">1. Personal Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={staffForm.fullName || user.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Father / Mother Name *</label>
                <input
                  type="text"
                  value={staffForm.parentsName || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, parentsName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  value={staffForm.dob || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, dob: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Current Address *</label>
                <input
                  type="text"
                  value={staffForm.currentAddress || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, currentAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">City *</label>
                <input
                  type="text"
                  value={staffForm.city || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">PIN Code *</label>
                <input
                  type="text"
                  value={staffForm.pinCode || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, pinCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Professional & Qualifications */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">2. Professional & Academic Records</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Highest Qualification *</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech / BCA / MBA"
                  value={staffForm.highestQualification || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, highestQualification: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Passing Year *</label>
                <input
                  type="text"
                  placeholder="e.g. 2023"
                  value={staffForm.passingYear || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, passingYear: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Skills</label>
                <input
                  type="text"
                  placeholder="Website Sales, Client Negotiation"
                  value={staffForm.skills || ''}
                  onChange={(e) => setStaffForm({ ...staffForm, skills: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Document Uploads */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">3. Mandatory Document Scans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Aadhaar Front Scan', key: 'aadhaarFront' },
                { label: 'Aadhaar Back Scan', key: 'aadhaarBack' },
                { label: 'PAN Card Scan', key: 'pan' },
                { label: 'Education Certificate', key: 'educationCert' },
                { label: 'Address Proof', key: 'addressProof' },
                { label: 'Bank Passbook / Proof', key: 'bankProof' },
              ].map((doc) => (
                <div key={doc.key} className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="font-semibold text-slate-300 block mb-2">{doc.label}</span>
                    {staffForm.documents?.[doc.key] ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-700 mb-2">
                        <img
                          src={staffForm.documents[doc.key]}
                          alt={doc.label}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => openDocumentViewer(doc.label, staffForm.documents[doc.key])}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition"
                        >
                          <Eye className="w-4 h-4 mr-1" /> View High-Res
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 mb-2">
                        No Document Uploaded
                      </div>
                    )}
                  </div>

                  <label className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-center cursor-pointer block">
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    {staffForm.documents?.[doc.key] ? 'Replace Scan' : 'Upload Scan'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, doc.key, false)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Submitting KYC Scans...' : 'Submit KYC for Admin Verification'}
          </button>
        </form>
      ) : (
        /* ====================================================================
            DSA KYC FORM
           ==================================================================== */
        <form onSubmit={handleDsaSubmit} className="space-y-6">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">1. Business & Personal Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Partner Full Name *</label>
                <input
                  type="text"
                  value={dsaForm.fullName || user.fullName}
                  onChange={(e) => setDsaForm({ ...dsaForm, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={dsaForm.businessName || user.businessName || ''}
                  onChange={(e) => setDsaForm({ ...dsaForm, businessName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">City / State *</label>
                <input
                  type="text"
                  value={dsaForm.city || ''}
                  onChange={(e) => setDsaForm({ ...dsaForm, city: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* DSA Bank Account Details */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">2. Payout Banking Information (For Commission)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  value={dsaForm.bankDetails?.accountHolderName || ''}
                  onChange={(e) =>
                    setDsaForm({
                      ...dsaForm,
                      bankDetails: { ...dsaForm.bankDetails, accountHolderName: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={dsaForm.bankDetails?.bankName || ''}
                  onChange={(e) =>
                    setDsaForm({
                      ...dsaForm,
                      bankDetails: { ...dsaForm.bankDetails, bankName: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Account Number *</label>
                <input
                  type="text"
                  value={dsaForm.bankDetails?.accountNumber || ''}
                  onChange={(e) =>
                    setDsaForm({
                      ...dsaForm,
                      bankDetails: { ...dsaForm.bankDetails, accountNumber: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  value={dsaForm.bankDetails?.ifsc || ''}
                  onChange={(e) =>
                    setDsaForm({
                      ...dsaForm,
                      bankDetails: { ...dsaForm.bankDetails, ifsc: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono uppercase"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={dsaForm.bankDetails?.branch || ''}
                  onChange={(e) =>
                    setDsaForm({
                      ...dsaForm,
                      bankDetails: { ...dsaForm.bankDetails, branch: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Account Type</label>
                <select
                  value={dsaForm.bankDetails?.accountType || 'Savings'}
                  onChange={(e) =>
                    setDsaForm({
                      ...dsaForm,
                      bankDetails: { ...dsaForm.bankDetails, accountType: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="Savings">Savings Account</option>
                  <option value="Current">Current Account</option>
                </select>
              </div>
            </div>
          </div>

          {/* DSA Document Scans */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-white">3. Verification Documents</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Aadhaar Card Front', key: 'aadhaarFront' },
                { label: 'PAN Card Scan', key: 'pan' },
                { label: 'Bank Passbook / Statement', key: 'bankPassbook' },
                { label: 'Cancelled Cheque', key: 'cancelledCheque' },
              ].map((doc) => (
                <div key={doc.key} className="p-3 bg-slate-900 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="font-semibold text-slate-300 block mb-2">{doc.label}</span>
                    {dsaForm.documents?.[doc.key] ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-700 mb-2">
                        <img
                          src={dsaForm.documents[doc.key]}
                          alt={doc.label}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => openDocumentViewer(doc.label, dsaForm.documents[doc.key])}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition"
                        >
                          <Eye className="w-4 h-4 mr-1" /> View High-Res
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 mb-2">
                        No Document Uploaded
                      </div>
                    )}
                  </div>

                  <label className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-center cursor-pointer block">
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    {dsaForm.documents?.[doc.key] ? 'Replace Scan' : 'Upload Scan'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, doc.key, true)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Submitting DSA Documents...' : 'Submit KYC for Admin Verification'}
          </button>
        </form>
      )}

      {/* ====================================================================
          HIGH RESOLUTION DOCUMENT VIEWER (ZOOM / ROTATE / FIT)
         ==================================================================== */}
      {viewerDoc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-white pb-3 border-b border-slate-800">
            <span className="font-bold text-sm">{viewerDoc.title}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg"
                title="Rotate Clockwise"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Fit
              </button>
              <button
                onClick={() => setViewerDoc(null)}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg font-semibold ml-3"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img
              src={viewerDoc.url}
              alt="Inspected Document"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out',
              }}
              className="max-h-[80vh] max-w-[90vw] object-contain shadow-2xl rounded-lg"
            />
          </div>
        </div>
      )}

      {/* ====================================================================
          ADMIN APPROVAL / REJECTION / CORRECTION MODAL
         ==================================================================== */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-1">Verify KYC Documents</h3>
            <p className="text-xs text-slate-400 mb-4">
              Applicant: {actionModal.name} ({actionModal.type.toUpperCase()})
            </p>

            <form onSubmit={handleAdminAction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Verification Decision *</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="approved">Approve KYC (Verified)</option>
                  <option value="correction_needed">Request Correction / Re-upload</option>
                  <option value="rejected">Reject KYC</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Reason / Administrative Note {actionType !== 'approved' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={
                    actionType === 'approved'
                      ? 'All documents verified against records.'
                      : 'State what documents need clearer upload or reason for rejection...'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  required={actionType !== 'approved'}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="w-1/2 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  {loading ? 'Processing...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

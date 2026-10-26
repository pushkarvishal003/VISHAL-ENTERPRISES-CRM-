/**
 * Vishal Enterprises CRM - DSA Partner Management & Directory
 * Full-scale Direct Selling Agent Administration, Onboarding, 20-Tab Profile Inspector,
 * Bank Details Verification, Permitted Website Services, Commission Ledger & Security Control
 */

import React, { useState, useEffect } from 'react';
import {
  Network,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertCircle,
  Eye,
  DollarSign,
  Briefcase,
  Building,
  CreditCard,
  FileText,
  Lock,
  RefreshCw,
  Sliders,
  Filter,
  Users,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Globe,
  KeyRound,
  LogOut,
  Calendar,
  Check,
} from 'lucide-react';
import { User, WebsiteService, CommissionRecord, WithdrawalRequest } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface DsaManagerProps {
  user?: User;
}

export const DsaManager: React.FC<DsaManagerProps> = ({ user }) => {
  const [dsaList, setDsaList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<WebsiteService[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [agreementFilter, setAgreementFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');

  // Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardTab, setOnboardTab] = useState<'personal' | 'business' | 'professional' | 'services' | 'commission' | 'security'>('personal');
  const [onboardForm, setOnboardForm] = useState({
    // Personal
    fullName: '',
    fathersName: '',
    dob: '',
    gender: 'Male',
    profilePhoto: '',
    mobile: '',
    whatsapp: '',
    alternateMobile: '',
    email: '',
    personalEmail: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    // Business
    businessName: '',
    businessType: 'Digital Marketing & Web Agency',
    businessRegType: 'Proprietorship',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessPin: '',
    businessEmail: '',
    businessMobile: '',
    website: '',
    googleBusinessProfile: '',
    yearsExperience: '3-5 years',
    businessActivity: 'Website promotion, client acquisition, software sales',
    employeeCount: '1-5',
    serviceArea: 'Pan-India',
    // Professional
    partnerType: 'Individual Agency',
    joiningDate: new Date().toISOString().split('T')[0],
    reportingManager: 'Admin',
    referralSource: 'Direct Agency Partner',
    notes: '',
    // Services
    permittedServices: [] as string[],
    // Commission & Bank
    commissionRate: 10,
    bankDetails: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upiId: '',
      accountType: 'Current',
      verificationStatus: 'Pending Verification',
    },
    // Login & Security
    temporaryPassword: '',
    forcePasswordChange: true,
  });

  // Profile Modal (20 Tabs)
  const [selectedDsaId, setSelectedDsaId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<string>('overview');

  // Quick Action Modals
  const [adjustCommissionModal, setAdjustCommissionModal] = useState<any | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const [bankModal, setBankModal] = useState<any | null>(null);
  const [bankFormData, setBankFormData] = useState<any>({});

  const [securityModal, setSecurityModal] = useState<any | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');

  const [statusModal, setStatusModal] = useState<any | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [statusReason, setStatusReason] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDsa();
    loadServices();
  }, []);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadDsa = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<any[]>('/api/admin/dsa');
      setDsaList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setDsaList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetchApi<WebsiteService[]>('/api/services');
      if (Array.isArray(res)) {
        setServicesList(res);
        // Pre-select all services for onboarding form by default
        setOnboardForm((prev) => ({
          ...prev,
          permittedServices: res.map((s) => s.id),
        }));
      }
    } catch (e) {
      console.error('Error fetching services:', e);
    }
  };

  const loadFullProfile = async (id: string) => {
    setSelectedDsaId(id);
    setProfileLoading(true);
    try {
      const res = await fetchApi<any>(`/api/admin/dsa/${id}/profile`);
      setProfileData(res);
      setProfileTab('overview');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to load partner profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateDsa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/admin/dsa', {
        method: 'POST',
        body: JSON.stringify(onboardForm),
      });
      showNotice('success', 'DSA Partner onboarded successfully!');
      setShowOnboardModal(false);
      loadDsa();
    } catch (err: any) {
      showNotice('error', err.message || 'Error creating partner.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModal) return;
    try {
      await fetchApi(`/api/admin/dsa/${statusModal.userId || statusModal.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatusValue, reason: statusReason }),
      });
      showNotice('success', `Partner status updated to ${newStatusValue}.`);
      setStatusModal(null);
      loadDsa();
      if (selectedDsaId) loadFullProfile(selectedDsaId);
    } catch (err: any) {
      showNotice('error', err.message || 'Error updating status.');
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankModal) return;
    try {
      await fetchApi(`/api/admin/users/${bankModal.userId || bankModal.id}/bank-details`, {
        method: 'PUT',
        body: JSON.stringify(bankFormData),
      });
      showNotice('success', 'Bank details updated successfully.');
      setBankModal(null);
      loadDsa();
      if (selectedDsaId) loadFullProfile(selectedDsaId);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update bank details.');
    }
  };

  const handleVerifyBank = async (status: 'Verified' | 'Rejected', reason?: string) => {
    const target = bankModal || profileData?.dsa;
    if (!target) return;
    try {
      await fetchApi(`/api/admin/users/${target.userId || target.id}/verify-bank`, {
        method: 'POST',
        body: JSON.stringify({ status, rejectionReason: reason || '' }),
      });
      showNotice('success', `Bank details marked as ${status}.`);
      setBankModal(null);
      loadDsa();
      if (selectedDsaId) loadFullProfile(selectedDsaId);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to verify bank details.');
    }
  };

  const handleAdjustCommission = async () => {
    if (!adjustCommissionModal) return;
    try {
      await fetchApi('/api/admin/commissions/adjust', {
        method: 'POST',
        body: JSON.stringify({
          dsaId: adjustCommissionModal.userId,
          adjustmentAmount,
          reason: adjustmentReason,
        }),
      });
      showNotice('success', `Commission adjustment of ₹${adjustmentAmount} applied.`);
      setAdjustCommissionModal(null);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
      loadDsa();
      if (selectedDsaId) loadFullProfile(selectedDsaId);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to apply commission adjustment.');
    }
  };

  const handleSavePermittedServices = async (permittedServices: string[]) => {
    if (!profileData?.dsa) return;
    try {
      await fetchApi(`/api/admin/users/${profileData.dsa.userId}/services`, {
        method: 'PUT',
        body: JSON.stringify({ permittedServices }),
      });
      showNotice('success', 'Permitted website services updated successfully.');
      loadFullProfile(profileData.dsa.userId);
      loadDsa();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update service permissions.');
    }
  };

  // Security actions
  const handleResetPassword = async () => {
    if (!securityModal) return;
    try {
      await fetchApi(`/api/admin/users/${securityModal.userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ temporaryPassword: newTempPassword || undefined }),
      });
      showNotice('success', 'Password reset successfully. Partner will be required to set new credentials.');
      setSecurityModal(null);
      setNewTempPassword('');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to reset password.');
    }
  };

  const handleResetPin = async () => {
    if (!securityModal) return;
    try {
      await fetchApi(`/api/admin/users/${securityModal.userId}/reset-pin`, {
        method: 'POST',
      });
      showNotice('success', 'Security PIN cleared. Partner will set a new PIN on next login.');
      setSecurityModal(null);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to reset PIN.');
    }
  };

  const handleForcePasswordChange = async () => {
    if (!securityModal) return;
    try {
      await fetchApi(`/api/admin/users/${securityModal.userId}/force-password-change`, {
        method: 'POST',
      });
      showNotice('success', 'Password change will be mandatory on next login.');
      setSecurityModal(null);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to set forced password change.');
    }
  };

  const handleTerminateSessions = async () => {
    if (!securityModal) return;
    try {
      const res = await fetchApi<any>(`/api/admin/users/${securityModal.userId}/logout-sessions`, {
        method: 'POST',
      });
      showNotice('success', res.message || 'Active sessions revoked.');
      setSecurityModal(null);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to terminate sessions.');
    }
  };

  // Metrics computation for summary cards
  const totalDsas = dsaList.length;
  const activeDsas = dsaList.filter((d) => (d.status || '').toLowerCase() === 'active').length;
  const kycApproved = dsaList.filter((d) => (d.kycStatus || '').toLowerCase() === 'approved').length;
  const agreementSigned = dsaList.filter((d) => d.agreementAccepted).length;
  const totalCommissions = dsaList.reduce((sum, d) => sum + (d.totalCommission || 0), 0);
  const totalAvailableCommissions = dsaList.reduce((sum, d) => sum + (d.availableCommission || 0), 0);
  const pendingWithdrawalSum = dsaList.reduce((sum, d) => sum + (d.pendingWithdrawal || 0), 0);

  // Filtered table rows
  const filtered = dsaList.filter((d) => {
    const matchSearch =
      (d.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.businessName && d.businessName.toLowerCase().includes(search.toLowerCase())) ||
      (d.userId || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.mobile && d.mobile.includes(search)) ||
      (d.city && d.city.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'all' || (d.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchKyc = kycFilter === 'all' || (d.kycStatus || '').toLowerCase() === kycFilter.toLowerCase();
    const matchAgreement =
      agreementFilter === 'all' ||
      (agreementFilter === 'signed' && d.agreementAccepted) ||
      (agreementFilter === 'pending' && !d.agreementAccepted);
    const matchBank =
      bankFilter === 'all' ||
      (bankFilter === 'verified' && d.bankVerificationStatus === 'Verified') ||
      (bankFilter === 'pending' && d.bankVerificationStatus === 'Pending Verification') ||
      (bankFilter === 'not_submitted' && (!d.bankVerificationStatus || d.bankVerificationStatus === 'Not Submitted'));

    return matchSearch && matchStatus && matchKyc && matchAgreement && matchBank;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-2xl transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-red-950/80 border-red-700 text-red-300'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">DSA Partner Network Management</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Onboard authorized sales partners, configure 10% commission, verify KYC & bank details, and track performance.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOnboardTab('personal');
            setShowOnboardModal(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Onboard New DSA Partner
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Total Partners</span>
          <p className="text-xl font-bold text-white mt-1">{totalDsas}</p>
          <span className="text-[10px] text-blue-400 mt-1 block">Registered DSAs</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Active Partners</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{activeDsas}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">{totalDsas - activeDsas} Inactive/Suspended</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">KYC Approved</span>
          <p className="text-xl font-bold text-teal-400 mt-1">{kycApproved}</p>
          <span className="text-[10px] text-amber-400 mt-1 block">{totalDsas - kycApproved} Pending / Review</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Agreements Signed</span>
          <p className="text-xl font-bold text-indigo-400 mt-1">{agreementSigned}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Digital Legal Terms</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Total Commissions</span>
          <p className="text-xl font-bold text-amber-400 mt-1 font-mono">₹{totalCommissions.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Gross 10% Accrued</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Available Balance</span>
          <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">₹{totalAvailableCommissions.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">Eligible for Withdrawal</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Pending Withdrawals</span>
          <p className="text-xl font-bold text-purple-400 mt-1 font-mono">₹{pendingWithdrawalSum.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-purple-400/80 mt-1 block">7th / 14th Cycle</span>
        </div>
      </div>

      {/* Advanced Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Partner ID, Name, Business, Phone, City..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Partners</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="all">All KYC Status</option>
              <option value="approved">KYC Approved</option>
              <option value="pending">KYC Pending</option>
              <option value="correction_needed">Correction Needed</option>
              <option value="rejected">KYC Rejected</option>
              <option value="not submitted">Not Submitted</option>
            </select>
          </div>

          <div>
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="all">All Bank Status</option>
              <option value="verified">Bank Verified</option>
              <option value="pending">Bank Pending</option>
              <option value="not_submitted">Not Submitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main DSA Partners Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Authorized DSA Partners</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">{filtered.length}</span>
          </h3>
          <button
            onClick={loadDsa}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <Network className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
            No DSA partners match the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Partner Details</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">KYC & Agreement</th>
                  <th className="py-3 px-4">Bank Status</th>
                  <th className="py-3 px-4">Commission Ledger</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((d) => (
                  <tr key={d.id || d.userId} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                          {d.fullName ? d.fullName[0].toUpperCase() : 'D'}
                        </div>
                        <div>
                          <p className="font-semibold text-white hover:text-blue-400 cursor-pointer" onClick={() => loadFullProfile(d.userId)}>
                            {d.fullName}
                          </p>
                          <p className="text-[11px] text-slate-400">{d.businessName || 'DSA Partner'}</p>
                          <span className="font-mono text-[10px] text-blue-400/80">{d.userId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-mono">{d.mobile}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{d.email}</p>
                      {d.city && <p className="text-[10px] text-slate-400">{d.city}</p>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                        {d.servicesCount || 15} Websites
                      </span>
                    </td>

                    <td className="py-3 px-4 space-y-1">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            (d.kycStatus || '').toLowerCase() === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : (d.kycStatus || '').toLowerCase() === 'correction_needed'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          KYC: {d.kycStatus || 'Not Submitted'}
                        </span>
                      </div>
                      <div>
                        {d.agreementAccepted ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                            <ShieldCheck className="w-3 h-3" /> Signed
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px]">Pending Agreement</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setBankModal(d);
                          setBankFormData(d.bankDetails || {});
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border text-left transition ${
                          d.bankVerificationStatus === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : d.bankVerificationStatus === 'Pending Verification'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {d.bankVerificationStatus || 'Not Submitted'}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-mono font-semibold text-emerald-400">
                        ₹{(d.availableCommission || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Gross: ₹{(d.totalCommission || 0).toLocaleString('en-IN')}
                      </p>
                      {d.pendingWithdrawal > 0 && (
                        <p className="text-[10px] text-purple-400">
                          Pending w/d: ₹{d.pendingWithdrawal.toLocaleString('en-IN')}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setStatusModal(d);
                          setNewStatusValue((d.status?.toLowerCase() as any) || 'active');
                          setStatusReason('');
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                          (d.status || '').toLowerCase() === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : (d.status || '').toLowerCase() === 'suspended'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {d.status || 'Active'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => loadFullProfile(d.userId)}
                          className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                          title="View 20-Tab Full DSA Profile"
                        >
                          <Eye className="w-3 h-3" /> Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdjustCommissionModal(d);
                            setAdjustmentAmount(0);
                            setAdjustmentReason('');
                          }}
                          className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded transition"
                          title="Manual Commission Adjustment"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSecurityModal(d);
                            setNewTempPassword('');
                          }}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition"
                          title="Security & Password Actions"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
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

      {/* ========================================================= */}
      {/* 1. ONBOARD DSA PARTNER MODAL (6 Multi-Section Tabs)      */}
      {/* ========================================================= */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 text-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-blue-400" />
                  Onboard New DSA Partner (Complete Flow)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter personal, business, professional, permitted website services, and commission configuration.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-800 mt-3 text-xs overflow-x-auto gap-1">
              {[
                { key: 'personal', label: '1. Personal Details' },
                { key: 'business', label: '2. Business Details' },
                { key: 'professional', label: '3. Professional' },
                { key: 'services', label: '4. Website Access' },
                { key: 'commission', label: '5. Commission & Bank' },
                { key: 'security', label: '6. Login & Security' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setOnboardTab(t.key as any)}
                  className={`px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
                    onboardTab === t.key
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateDsa} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* TAB 1: PERSONAL DETAILS */}
              {onboardTab === 'personal' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">A. Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Partner Full Name *</label>
                      <input
                        type="text"
                        value={onboardForm.fullName}
                        onChange={(e) => setOnboardForm({ ...onboardForm, fullName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="e.g. Ramesh Kumar"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Father's / Husband's Name</label>
                      <input
                        type="text"
                        value={onboardForm.fathersName}
                        onChange={(e) => setOnboardForm({ ...onboardForm, fathersName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={onboardForm.dob}
                        onChange={(e) => setOnboardForm({ ...onboardForm, dob: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Gender</label>
                      <select
                        value={onboardForm.gender}
                        onChange={(e) => setOnboardForm({ ...onboardForm, gender: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Mobile Number (Login ID) *</label>
                      <input
                        type="tel"
                        value={onboardForm.mobile}
                        onChange={(e) => setOnboardForm({ ...onboardForm, mobile: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="10-digit mobile"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">WhatsApp Number</label>
                      <input
                        type="tel"
                        value={onboardForm.whatsapp}
                        onChange={(e) => setOnboardForm({ ...onboardForm, whatsapp: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="WhatsApp contact"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Official Email Address *</label>
                      <input
                        type="email"
                        value={onboardForm.email}
                        onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="partner@agency.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Personal Email</label>
                      <input
                        type="email"
                        value={onboardForm.personalEmail}
                        onChange={(e) => setOnboardForm({ ...onboardForm, personalEmail: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Alternate Phone</label>
                      <input
                        type="tel"
                        value={onboardForm.alternateMobile}
                        onChange={(e) => setOnboardForm({ ...onboardForm, alternateMobile: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={onboardForm.address}
                        onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">City</label>
                      <input
                        type="text"
                        value={onboardForm.city}
                        onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">State & PIN Code</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="State"
                          value={onboardForm.state}
                          onChange={(e) => setOnboardForm({ ...onboardForm, state: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                        <input
                          type="text"
                          placeholder="PIN Code"
                          value={onboardForm.pinCode}
                          onChange={(e) => setOnboardForm({ ...onboardForm, pinCode: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BUSINESS DETAILS */}
              {onboardTab === 'business' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">B. Business & Firm Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Business / Agency Name</label>
                      <input
                        type="text"
                        value={onboardForm.businessName}
                        onChange={(e) => setOnboardForm({ ...onboardForm, businessName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="e.g. Acme Media Solutions"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Business Entity Type</label>
                      <select
                        value={onboardForm.businessRegType}
                        onChange={(e) => setOnboardForm({ ...onboardForm, businessRegType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="Partnership">Partnership</option>
                        <option value="LLP">LLP</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Individual Freelancer">Individual Freelancer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Nature of Activity</label>
                      <input
                        type="text"
                        value={onboardForm.businessActivity}
                        onChange={(e) => setOnboardForm({ ...onboardForm, businessActivity: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 mb-1">Office / Business Address</label>
                      <input
                        type="text"
                        value={onboardForm.businessAddress}
                        onChange={(e) => setOnboardForm({ ...onboardForm, businessAddress: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Business City & PIN</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="City"
                          value={onboardForm.businessCity}
                          onChange={(e) => setOnboardForm({ ...onboardForm, businessCity: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                        <input
                          type="text"
                          placeholder="PIN Code"
                          value={onboardForm.businessPin}
                          onChange={(e) => setOnboardForm({ ...onboardForm, businessPin: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Website URL</label>
                      <input
                        type="url"
                        placeholder="https://agency.com"
                        value={onboardForm.website}
                        onChange={(e) => setOnboardForm({ ...onboardForm, website: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Google Business Profile URL</label>
                      <input
                        type="url"
                        value={onboardForm.googleBusinessProfile}
                        onChange={(e) => setOnboardForm({ ...onboardForm, googleBusinessProfile: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Service Area / Coverage</label>
                      <input
                        type="text"
                        value={onboardForm.serviceArea}
                        onChange={(e) => setOnboardForm({ ...onboardForm, serviceArea: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="e.g. Mumbai Metro, Maharashtra"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROFESSIONAL DETAILS */}
              {onboardTab === 'professional' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">C. Professional & Partnership Terms</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Partner Type</label>
                      <select
                        value={onboardForm.partnerType}
                        onChange={(e) => setOnboardForm({ ...onboardForm, partnerType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Individual Agency">Individual Agency</option>
                        <option value="Direct Selling Associate">Direct Selling Associate</option>
                        <option value="IT Vendor / Partner">IT Vendor / Partner</option>
                        <option value="Corporate Affiliate">Corporate Affiliate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={onboardForm.joiningDate}
                        onChange={(e) => setOnboardForm({ ...onboardForm, joiningDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Referral Source / Channel</label>
                      <input
                        type="text"
                        value={onboardForm.referralSource}
                        onChange={(e) => setOnboardForm({ ...onboardForm, referralSource: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="Direct / Referral"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Administrative Notes</label>
                    <textarea
                      rows={3}
                      value={onboardForm.notes}
                      onChange={(e) => setOnboardForm({ ...onboardForm, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      placeholder="Special instructions, background verification notes..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: WEBSITE SERVICES ACCESS */}
              {onboardTab === 'services' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        D. Authorized Website Packages & Services
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Choose which website services this DSA partner can promote, generate proposals, and close sales for.
                      </p>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setOnboardForm({
                            ...onboardForm,
                            permittedServices: servicesList.map((s) => s.id),
                          })
                        }
                        className="px-2 py-1 bg-slate-800 text-blue-400 rounded hover:bg-slate-700"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOnboardForm({
                            ...onboardForm,
                            permittedServices: [],
                          })
                        }
                        className="px-2 py-1 bg-slate-800 text-slate-400 rounded hover:bg-slate-700"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1 border border-slate-800 rounded-xl">
                    {servicesList.map((srv) => {
                      const isSelected = onboardForm.permittedServices.includes(srv.id);
                      return (
                        <label
                          key={srv.id}
                          className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-600/10 border-blue-500/40 text-white'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setOnboardForm({
                                  ...onboardForm,
                                  permittedServices: [...onboardForm.permittedServices, srv.id],
                                });
                              } else {
                                setOnboardForm({
                                  ...onboardForm,
                                  permittedServices: onboardForm.permittedServices.filter((id) => id !== srv.id),
                                });
                              }
                            }}
                            className="mt-0.5 rounded text-blue-600 focus:ring-0"
                          />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold block">{srv.name}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{srv.category}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">From ₹{srv.startingPrice?.toLocaleString('en-IN')}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: COMMISSION & BANK DETAILS */}
              {onboardTab === 'commission' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">E. Commission Terms</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <label className="block text-slate-400 mb-1 font-medium">Standard Commission Rate (%)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={onboardForm.commissionRate}
                            onChange={(e) => setOnboardForm({ ...onboardForm, commissionRate: Number(e.target.value) })}
                            className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold"
                          />
                          <span className="text-slate-400 text-xs">Flat Rule (Default is 10% on delivered sales)</span>
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-slate-400 text-[11px]">
                        <p className="font-semibold text-white mb-1">Withdrawal Policy</p>
                        <p>Commission becomes eligible upon successful website delivery. Payout requests are executed on the 7th and 14th of each month.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Bank Details for Payouts</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      <div>
                        <label className="block text-slate-400 mb-1">Account Holder Name</label>
                        <input
                          type="text"
                          value={onboardForm.bankDetails.accountHolderName}
                          onChange={(e) =>
                            setOnboardForm({
                              ...onboardForm,
                              bankDetails: { ...onboardForm.bankDetails, accountHolderName: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                          placeholder="As per bank record"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={onboardForm.bankDetails.bankName}
                          onChange={(e) =>
                            setOnboardForm({
                              ...onboardForm,
                              bankDetails: { ...onboardForm.bankDetails, bankName: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                          placeholder="e.g. HDFC Bank, SBI"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Account Number</label>
                        <input
                          type="text"
                          value={onboardForm.bankDetails.accountNumber}
                          onChange={(e) =>
                            setOnboardForm({
                              ...onboardForm,
                              bankDetails: { ...onboardForm.bankDetails, accountNumber: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={onboardForm.bankDetails.ifsc}
                          onChange={(e) =>
                            setOnboardForm({
                              ...onboardForm,
                              bankDetails: { ...onboardForm.bankDetails, ifsc: e.target.value.toUpperCase() },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono uppercase"
                          placeholder="HDFC0001234"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Branch Name</label>
                        <input
                          type="text"
                          value={onboardForm.bankDetails.branch}
                          onChange={(e) =>
                            setOnboardForm({
                              ...onboardForm,
                              bankDetails: { ...onboardForm.bankDetails, branch: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">UPI ID (Optional)</label>
                        <input
                          type="text"
                          value={onboardForm.bankDetails.upiId}
                          onChange={(e) =>
                            setOnboardForm({
                              ...onboardForm,
                              bankDetails: { ...onboardForm.bankDetails, upiId: e.target.value },
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                          placeholder="partner@upi"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: LOGIN & SECURITY */}
              {onboardTab === 'security' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">F. Account Credentials & Security</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Initial Temporary Password *</label>
                      <input
                        type="text"
                        value={onboardForm.temporaryPassword}
                        onChange={(e) => setOnboardForm({ ...onboardForm, temporaryPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                        placeholder="Leave blank for auto-generated Dsa1@$"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Default fallback: Dsa1@$</span>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="forcePass"
                        checked={onboardForm.forcePasswordChange}
                        onChange={(e) => setOnboardForm({ ...onboardForm, forcePasswordChange: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <label htmlFor="forcePass" className="text-slate-300 cursor-pointer">
                        Force password & 4-digit PIN setup on first login
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-3 text-[11px] text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      Automatic Credentials & Digital Agreement
                    </p>
                    <p>
                      A unique Partner ID format (VE-DSA-XXX) will be generated. On first login, the partner will be required to digitally accept the DSA Agreement and complete KYC before receiving payouts.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  {onboardTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: any[] = ['personal', 'business', 'professional', 'services', 'commission', 'security'];
                        const idx = tabs.indexOf(onboardTab);
                        if (idx > 0) setOnboardTab(tabs[idx - 1]);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
                    >
                      Back
                    </button>
                  )}

                  {onboardTab !== 'security' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: any[] = ['personal', 'business', 'professional', 'services', 'commission', 'security'];
                        const idx = tabs.indexOf(onboardTab);
                        if (idx < tabs.length - 1) setOnboardTab(tabs[idx + 1]);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Complete Onboarding
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DETAILED 20-TAB DSA PROFILE MODAL                      */}
      {/* ========================================================= */}
      {selectedDsaId && profileData && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full p-6 text-slate-200 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                  {profileData.dsa?.fullName ? profileData.dsa.fullName[0].toUpperCase() : 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{profileData.dsa?.fullName}</h2>
                    <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {profileData.dsa?.userId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        (profileData.dsa?.status || '').toLowerCase() === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {profileData.dsa?.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {profileData.dsa?.businessName || 'DSA Partner'} • Joined {profileData.dsa?.joiningDate || 'N/A'} • Commission: {profileData.dsa?.commissionRate || 10}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustCommissionModal(profileData.dsa);
                    setAdjustmentAmount(0);
                    setAdjustmentReason('');
                  }}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Adjust Commission
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDsaId(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 20 Profile Tabs Bar */}
            <div className="flex border-b border-slate-800 text-xs overflow-x-auto gap-1 py-1">
              {[
                { id: 'overview', label: 'Overview & Metrics' },
                { id: 'personal', label: 'Personal Details' },
                { id: 'business', label: 'Business Details' },
                { id: 'professional', label: 'Professional' },
                { id: 'services', label: 'Website Services' },
                { id: 'commissions', label: 'Commissions' },
                { id: 'bank', label: 'Bank Details' },
                { id: 'kyc', label: 'KYC Status' },
                { id: 'agreement', label: 'Digital Agreement' },
                { id: 'leads', label: `Leads (${profileData.leads?.length || 0})` },
                { id: 'proposals', label: `Proposals (${profileData.proposals?.length || 0})` },
                { id: 'sales', label: `Sales (${profileData.sales?.length || 0})` },
                { id: 'customers', label: `Clients (${profileData.customers?.length || 0})` },
                { id: 'projects', label: `Projects (${profileData.projects?.length || 0})` },
                { id: 'withdrawals', label: `Withdrawals (${profileData.withdrawals?.length || 0})` },
                { id: 'performance', label: 'Performance Tracker' },
                { id: 'requests', label: `Requests (${profileData.requests?.length || 0})` },
                { id: 'complaints', label: `Complaints (${profileData.complaints?.length || 0})` },
                { id: 'notifications', label: `Notifications (${profileData.notifications?.length || 0})` },
                { id: 'audit', label: 'Audit & Security' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProfileTab(t.id)}
                  className={`px-3 py-2 border-b-2 font-medium transition whitespace-nowrap ${
                    profileTab === t.id
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto py-4 text-xs space-y-4">
              {/* TAB 1: OVERVIEW */}
              {profileTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Total Leads Generated</span>
                      <p className="text-xl font-bold text-white mt-1">{profileData.metrics?.totalLeads || 0}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Closed Sales</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">{profileData.metrics?.totalSales || 0}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Revenue Generated</span>
                      <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
                        ₹{(profileData.metrics?.salesAmount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Delivered Websites</span>
                      <p className="text-xl font-bold text-teal-400 mt-1">{profileData.metrics?.deliveredWebsites || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-amber-400" /> Commission Balance
                      </h4>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Total Accrued (10%):</span>
                        <span className="font-mono font-semibold text-white">₹{(profileData.metrics?.totalCommission || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Available to Withdraw:</span>
                        <span className="font-mono font-semibold text-emerald-400">₹{(profileData.metrics?.availableCommission || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Withdrawals Paid:</span>
                        <span className="font-mono font-semibold text-slate-300">₹{(profileData.metrics?.withdrawalsPaid || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Pending In Review:</span>
                        <span className="font-mono font-semibold text-purple-400">₹{(profileData.metrics?.pendingWithdrawalAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Compliance Status
                      </h4>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">KYC Status:</span>
                        <span className="font-semibold text-amber-400">{profileData.kyc?.status || profileData.dsa?.kycStatus || 'Not Submitted'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Bank Verification:</span>
                        <span className="font-semibold text-blue-400">{profileData.dsa?.bankDetails?.verificationStatus || 'Not Submitted'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Agreement Signed:</span>
                        <span className="font-semibold text-emerald-400">{profileData.dsa?.agreementAccepted ? 'Yes (Digital)' : 'Pending'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">First Login Configured:</span>
                        <span className="font-semibold text-slate-300">{profileData.dsa?.passwordChanged ? 'Completed' : 'Pending'}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-blue-400" /> Direct Contact
                      </h4>
                      <p className="text-slate-300"><span className="text-slate-500">Phone:</span> {profileData.dsa?.mobile}</p>
                      <p className="text-slate-300"><span className="text-slate-500">WhatsApp:</span> {profileData.dsa?.whatsapp || profileData.dsa?.mobile}</p>
                      <p className="text-slate-300"><span className="text-slate-500">Email:</span> {profileData.dsa?.email}</p>
                      <p className="text-slate-300"><span className="text-slate-500">Address:</span> {profileData.dsa?.address || 'N/A'}, {profileData.dsa?.city}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONAL DETAILS */}
              {profileTab === 'personal' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-white">Full Personal Profile</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Full Legal Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.fullName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Father's Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.fathersName || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Date of Birth</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.dob || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Gender</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.gender || 'Male'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Mobile Number</span>
                      <p className="font-semibold font-mono text-white mt-0.5">{profileData.dsa?.mobile}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">WhatsApp Number</span>
                      <p className="font-semibold font-mono text-white mt-0.5">{profileData.dsa?.whatsapp || profileData.dsa?.mobile}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Official Email</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Personal Email</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.personalEmail || 'Not Provided'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[11px] block">Residential Address</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.address || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">City & State</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.city || 'N/A'}, {profileData.dsa?.state || ''}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">PIN Code</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.pinCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BUSINESS DETAILS */}
              {profileTab === 'business' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-white">Business Organization Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Business Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.businessName || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Business Entity Type</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.businessRegType || 'Proprietorship'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Years in Business</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.yearsExperience || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[11px] block">Office Address</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.businessAddress || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Service Area</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.serviceArea || 'Pan-India'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Website URL</span>
                      <p className="font-semibold text-blue-400 mt-0.5">{profileData.dsa?.website || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Business Email</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.businessEmail || profileData.dsa?.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Nature of Activity</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.dsa?.businessActivity || 'Website Sales & Promotion'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: WEBSITE SERVICES ACCESS (INTERACTIVE TOGGLE) */}
              {profileTab === 'services' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">Authorized Website Products</h4>
                      <p className="text-slate-400 text-[11px] mt-0.5">Toggle which services this DSA can offer to clients.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {servicesList.map((srv) => {
                      const isAllowed = (profileData.permittedServices || []).includes(srv.id);
                      return (
                        <div
                          key={srv.id}
                          className={`p-3 rounded-xl border flex items-center justify-between ${
                            isAllowed ? 'bg-blue-600/10 border-blue-500/40 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-xs block">{srv.name}</span>
                            <span className="text-[10px] text-slate-500">{srv.category}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const current = profileData.permittedServices || [];
                              const updated = isAllowed ? current.filter((id: string) => id !== srv.id) : [...current, srv.id];
                              handleSavePermittedServices(updated);
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                              isAllowed ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isAllowed ? 'Authorized' : 'Disabled'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: COMMISSIONS & EARNINGS */}
              {profileTab === 'commissions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div>
                      <h4 className="font-bold text-white">Commission Ledger & Earnings</h4>
                      <p className="text-slate-400 text-[11px]">Real-time commission accrual based on 10% delivered sales.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustCommissionModal(profileData.dsa);
                        setAdjustmentAmount(0);
                        setAdjustmentReason('');
                      }}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Adjust Commission
                    </button>
                  </div>

                  {(!profileData.commissions || profileData.commissions.length === 0) ? (
                    <p className="text-center py-8 text-slate-500">No commission records yet for this partner.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Commission ID</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Client / Sale</th>
                            <th className="py-2.5 px-3">Sale Amount</th>
                            <th className="py-2.5 px-3">Rate</th>
                            <th className="py-2.5 px-3">Commission</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.commissions.map((c: any) => (
                            <tr key={c.id || c.commissionId} className="hover:bg-slate-900/40">
                              <td className="py-2.5 px-3 font-mono font-medium text-white">{c.commissionId}</td>
                              <td className="py-2.5 px-3 text-slate-400">{(c.createdAt || '').split('T')[0]}</td>
                              <td className="py-2.5 px-3 text-white">{c.customerName || c.saleId}</td>
                              <td className="py-2.5 px-3 font-mono">₹{(c.saleAmount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono">{c.commissionRate || 10}%</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{(c.commissionAmount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                                  {c.status || 'Available'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: BANK DETAILS */}
              {profileTab === 'bank' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">Registered Bank Details</h4>
                      <p className="text-slate-400 text-[11px]">Required for automated 7th/14th withdrawal payouts.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyBank('Verified')}
                        className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-600/30"
                      >
                        Mark as Verified
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyBank('Rejected', 'IFSC or Account number mismatch')}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold hover:bg-red-600/30"
                      >
                        Reject Details
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Account Holder Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.bankDetails?.accountHolderName || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Bank Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.bankDetails?.bankName || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Account Number</span>
                      <p className="font-semibold font-mono text-white mt-0.5">{profileData.bankDetails?.accountNumber || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">IFSC Code</span>
                      <p className="font-semibold font-mono text-white mt-0.5 uppercase">{profileData.bankDetails?.ifsc || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Branch</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.bankDetails?.branch || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">UPI ID</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.bankDetails?.upiId || 'Not Set'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Verification Status</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${
                          profileData.bankDetails?.verificationStatus === 'Verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {profileData.bankDetails?.verificationStatus || 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: KYC STATUS */}
              {profileTab === 'kyc' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-white">Partner KYC Documentation</h4>
                  {profileData.kyc ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <span className="text-slate-500 text-[11px] block">PAN Number</span>
                          <p className="font-semibold font-mono text-white mt-0.5">{profileData.kyc.panNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">Aadhaar Number</span>
                          <p className="font-semibold font-mono text-white mt-0.5">{profileData.kyc.aadhaarNumber ? `•••• •••• ${profileData.kyc.aadhaarNumber.slice(-4)}` : 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">GST Number</span>
                          <p className="font-semibold font-mono text-white mt-0.5">{profileData.kyc.gstNumber || 'Not Registered'}</p>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px] block">KYC Status</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold mt-0.5 inline-block">
                            {profileData.kyc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500">KYC documents have not been submitted yet.</p>
                  )}
                </div>
              )}

              {/* TAB 9: DIGITAL AGREEMENT */}
              {profileTab === 'agreement' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h4 className="font-bold text-white">DSA Digital Legal Agreement</h4>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Direct Selling Agent Terms (v1.0)</span>
                      <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        {profileData.dsa?.agreementAccepted ? <ShieldCheck className="w-4 h-4" /> : null}
                        {profileData.dsa?.agreementAccepted ? 'Digitally Signed & Accepted' : 'Pending Acceptance'}
                      </span>
                    </div>
                    {profileData.dsa?.agreementAcceptedAt && (
                      <p className="text-[11px] text-slate-400">Accepted on: {profileData.dsa.agreementAcceptedAt}</p>
                    )}
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Governs 10% commission on delivered website services, withdrawal cycles on 7th/14th of each month, non-solicitation, confidentiality, and anti-fraud representations.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 10: LEADS */}
              {profileTab === 'leads' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white">Leads Tracked by this DSA ({profileData.leads?.length || 0})</h4>
                  {(!profileData.leads || profileData.leads.length === 0) ? (
                    <p className="text-slate-500 text-center py-8">No leads created by this partner.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Lead ID</th>
                            <th className="py-2.5 px-3">Business</th>
                            <th className="py-2.5 px-3">Owner & Mobile</th>
                            <th className="py-2.5 px-3">City</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.leads.map((l: any) => (
                            <tr key={l.id || l.leadId}>
                              <td className="py-2.5 px-3 font-mono font-medium text-white">{l.leadId}</td>
                              <td className="py-2.5 px-3 text-white">{l.businessName}</td>
                              <td className="py-2.5 px-3">{l.ownerName} ({l.mobile})</td>
                              <td className="py-2.5 px-3">{l.city}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px]">
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 11: PROPOSALS */}
              {profileTab === 'proposals' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white">Proposals Generated ({profileData.proposals?.length || 0})</h4>
                  {(!profileData.proposals || profileData.proposals.length === 0) ? (
                    <p className="text-slate-500 text-center py-8">No proposals generated for this partner.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Proposal ID</th>
                            <th className="py-2.5 px-3">Client</th>
                            <th className="py-2.5 px-3">Service</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.proposals.map((p: any) => (
                            <tr key={p.id || p.proposalId}>
                              <td className="py-2.5 px-3 font-mono font-medium text-white">{p.proposalId}</td>
                              <td className="py-2.5 px-3 text-white">{p.businessName}</td>
                              <td className="py-2.5 px-3">{p.serviceName}</td>
                              <td className="py-2.5 px-3 font-mono text-emerald-400">₹{(p.totalPrice || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3">{p.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 12: SALES & REVENUE */}
              {profileTab === 'sales' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white">Closed Sales ({profileData.sales?.length || 0})</h4>
                  {(!profileData.sales || profileData.sales.length === 0) ? (
                    <p className="text-slate-500 text-center py-8">No closed sales recorded for this partner.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Sale ID</th>
                            <th className="py-2.5 px-3">Client</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">10% Commission</th>
                            <th className="py-2.5 px-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.sales.map((s: any) => (
                            <tr key={s.id || s.saleId}>
                              <td className="py-2.5 px-3 font-mono font-medium text-white">{s.saleId}</td>
                              <td className="py-2.5 px-3 text-white">{s.customerName}</td>
                              <td className="py-2.5 px-3 font-mono text-white">₹{(s.finalAmount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{(s.commissionAmount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-slate-400">{(s.createdAt || '').split('T')[0]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 15: WITHDRAWALS */}
              {profileTab === 'withdrawals' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white">Withdrawal History & Requests ({profileData.withdrawals?.length || 0})</h4>
                  {(!profileData.withdrawals || profileData.withdrawals.length === 0) ? (
                    <p className="text-slate-500 text-center py-8">No withdrawal requests filed yet.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Request ID</th>
                            <th className="py-2.5 px-3">Requested Amount</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Payout Date</th>
                            <th className="py-2.5 px-3">Reference / Txn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.withdrawals.map((w: any) => (
                            <tr key={w.id || w.withdrawalId}>
                              <td className="py-2.5 px-3 font-mono font-medium text-white">{w.withdrawalId}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">₹{(w.requestedAmount || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px]">
                                  {w.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{w.payoutDate || 'Scheduled (7th/14th)'}</td>
                              <td className="py-2.5 px-3 font-mono">{w.transactionReference || 'In Progress'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 20: AUDIT & SECURITY LOGS */}
              {profileTab === 'audit' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-white">Partner Activity & Audit Trail</h4>
                  {(!profileData.recentActivity || profileData.recentActivity.length === 0) ? (
                    <p className="text-slate-500 text-center py-8">No audit logs recorded for this partner.</p>
                  ) : (
                    <div className="space-y-2">
                      {profileData.recentActivity.map((log: any) => (
                        <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">{log.action}</span>
                            <span className="text-[10px] text-slate-500 block">{log.module} • {log.newValue || log.oldValue || ''}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{(log.timestamp || '').replace('T', ' ').slice(0, 19)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. COMMISSION MANUAL ADJUSTMENT MODAL                     */}
      {/* ========================================================= */}
      {adjustCommissionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              Adjust Partner Commission
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Apply a credit or deduction to <strong className="text-white">{adjustCommissionModal.fullName}</strong> ({adjustCommissionModal.userId}).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Adjustment Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 5000 or -2000"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Positive number adds credit, negative number deducts.</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mandatory Business Reason *</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Special promotional bonus for enterprise website closing"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAdjustCommissionModal(null)}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdjustCommission}
                  disabled={!adjustmentAmount || !adjustmentReason}
                  className="w-1/2 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-semibold"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. BANK VERIFICATION / EDIT MODAL                         */}
      {/* ========================================================= */}
      {bankModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              Manage Bank Details: {bankModal.fullName}
            </h3>

            <div className="space-y-3 text-xs mt-3">
              <div>
                <label className="block text-slate-400 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  value={bankFormData.accountHolderName || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountHolderName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={bankFormData.bankName || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Account Number *</label>
                <input
                  type="text"
                  value={bankFormData.accountNumber || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">IFSC Code *</label>
                <input
                  type="text"
                  value={bankFormData.ifsc || ''}
                  onChange={(e) => setBankFormData({ ...bankFormData, ifsc: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => handleVerifyBank('Verified')}
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  Verify Bank
                </button>
                <button
                  type="button"
                  onClick={handleSaveBankDetails}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SECURITY ACTIONS MODAL                                 */}
      {/* ========================================================= */}
      {securityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-400" />
              Security Control: {securityModal.fullName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Partner ID: {securityModal.userId}</p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h5 className="font-semibold text-white">Reset Account Password</h5>
                <input
                  type="text"
                  placeholder="New Temporary Password (default: Dsa1@$)"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium"
                >
                  Confirm Password Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetPin}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-slate-700"
                >
                  <span className="font-semibold text-white block">Reset PIN</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Clears 4-digit PIN</span>
                </button>
                <button
                  type="button"
                  onClick={handleForcePasswordChange}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-slate-700"
                >
                  <span className="font-semibold text-white block">Force Reset</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Prompt on next login</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleTerminateSessions}
                className="w-full py-2 bg-red-950/60 text-red-300 border border-red-800 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-900/60"
              >
                <LogOut className="w-4 h-4" /> Terminate All Active Sessions
              </button>

              <button
                type="button"
                onClick={() => setSecurityModal(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. STATUS UPDATE MODAL                                    */}
      {/* ========================================================= */}
      {statusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2">Update Partner Status</h3>
            <p className="text-xs text-slate-400 mb-4">{statusModal.fullName} ({statusModal.userId})</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">New Status</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Reason for Status Change</label>
                <input
                  type="text"
                  placeholder="e.g. Inactive partner review"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStatusModal(null)}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
                >
                  Save Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

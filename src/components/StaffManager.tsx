/**
 * Vishal Enterprises CRM - Staff Administration & Directory
 * Full-scale Staff Management, 6-Section Onboarding Flow, 21-Tab Profile Inspector,
 * Permissions Matrix, Payroll & Salary Records, Biometric Attendance Photo Logs,
 * Bank Details Verification & Security Control
 */

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Sliders,
  Eye,
  Camera,
  TrendingUp,
  History,
  Shield,
  Briefcase,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Building,
  CreditCard,
  FileText,
  Lock,
  RefreshCw,
  Clock,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  LogOut,
  Target,
  Check,
  Percent,
} from 'lucide-react';
import { User, StaffDepartment, StaffDesignation, AttendanceRecord, Sale } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface StaffManagerProps {
  user?: User;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ user }) => {
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');

  // Add Staff Onboarding Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [onboardTab, setOnboardTab] = useState<'personal' | 'professional' | 'salary' | 'bank' | 'targets' | 'security'>('personal');
  const [newStaffForm, setNewStaffForm] = useState({
    // Personal
    fullName: '',
    fathersName: '',
    dob: '',
    gender: 'Male',
    mobile: '',
    whatsapp: '',
    alternateMobile: '',
    email: '',
    personalEmail: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    // Professional
    department: 'Sales' as StaffDepartment,
    designation: 'Sales Executive' as StaffDesignation,
    employeeType: 'Full-time',
    joiningDate: new Date().toISOString().split('T')[0],
    reportingManager: 'Admin',
    workLocation: 'Office',
    notes: '',
    // Salary
    baseSalary: 25000,
    salaryType: 'Fixed + Commission',
    paymentCycle: 'Monthly',
    effectiveDate: new Date().toISOString().split('T')[0],
    salaryNotes: '',
    // Bank Details
    bankDetails: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upiId: '',
      accountType: 'Savings',
      verificationStatus: 'Pending Verification',
    },
    // Targets
    monthlySalesTarget: 10,
    monthlySalesAmountTarget: 50000,
    monthlyLeadsTarget: 30,
    monthlyDemosTarget: 15,
    // Security
    temporaryPassword: '',
    forcePasswordChange: true,
  });

  // Profile Modal (21 Tabs)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<string>('overview');

  // Permissions Matrix Modal
  const [permStaff, setPermStaff] = useState<any | null>(null);
  const [permMatrix, setPermMatrix] = useState<any>({});
  const [permScope, setPermScope] = useState<'own' | 'department' | 'all'>('own');

  // Quick Action Modals
  const [payrollModal, setPayrollModal] = useState<any | null>(null);
  const [payrollForm, setPayrollForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    baseSalary: 25000,
    incentive: 0,
    deductions: 0,
    bonus: 0,
    notes: 'Monthly salary credit',
    paymentReference: '',
    paymentDate: new Date().toISOString().split('T')[0],
    status: 'Paid',
  });

  const [bankModal, setBankModal] = useState<any | null>(null);
  const [bankFormData, setBankFormData] = useState<any>({});

  const [securityModal, setSecurityModal] = useState<any | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');

  const [statusModal, setStatusModal] = useState<any | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [statusReason, setStatusReason] = useState('');

  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<any[]>('/api/admin/staff');
      setStaffMembers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setStaffMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFullProfile = async (userId: string) => {
    setSelectedStaffId(userId);
    setProfileLoading(true);
    try {
      const res = await fetchApi<any>(`/api/admin/staff/${userId}/profile`);
      setProfileData(res);
      setProfileTab('overview');
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to load staff profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(newStaffForm),
      });
      showNotice('success', 'Staff employee onboarded successfully!');
      setShowAddModal(false);
      loadStaff();
    } catch (err: any) {
      showNotice('error', err.message || 'Error creating staff employee.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusModal) return;
    try {
      await fetchApi(`/api/admin/staff/${statusModal.userId || statusModal.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatusValue, reason: statusReason }),
      });
      showNotice('success', `Staff status updated to ${newStatusValue}.`);
      setStatusModal(null);
      loadStaff();
      if (selectedStaffId) loadFullProfile(selectedStaffId);
    } catch (err: any) {
      showNotice('error', err.message || 'Error updating status.');
    }
  };

  const handleOpenPermissions = (staff: any) => {
    setPermStaff(staff);
    setPermMatrix(staff.permissions?.modules || {});
    setPermScope(staff.permissions?.dataScope || 'own');
  };

  const handleSavePermissions = async () => {
    if (!permStaff) return;
    try {
      await fetchApi(`/api/admin/staff/${permStaff.id || permStaff.userId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          modules: permMatrix,
          dataScope: permScope,
        }),
      });
      showNotice('success', 'Permissions matrix & data scope updated.');
      setPermStaff(null);
      loadStaff();
      if (selectedStaffId) loadFullProfile(selectedStaffId);
    } catch (err: any) {
      showNotice('error', err.message || 'Error updating permissions.');
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
      loadStaff();
      if (selectedStaffId) loadFullProfile(selectedStaffId);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update bank details.');
    }
  };

  const handleVerifyBank = async (status: 'Verified' | 'Rejected', reason?: string) => {
    const target = bankModal || profileData?.staff;
    if (!target) return;
    try {
      await fetchApi(`/api/admin/users/${target.userId || target.id}/verify-bank`, {
        method: 'POST',
        body: JSON.stringify({ status, rejectionReason: reason || '' }),
      });
      showNotice('success', `Bank details marked as ${status}.`);
      setBankModal(null);
      loadStaff();
      if (selectedStaffId) loadFullProfile(selectedStaffId);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to verify bank details.');
    }
  };

  const handleRecordPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollModal) return;
    try {
      const netPay =
        Number(payrollForm.baseSalary) +
        Number(payrollForm.incentive) +
        Number(payrollForm.bonus) -
        Number(payrollForm.deductions);

      await fetchApi(`/api/admin/staff/${payrollModal.userId}/payroll`, {
        method: 'POST',
        body: JSON.stringify({
          ...payrollForm,
          netSalary: netPay,
        }),
      });
      showNotice('success', `Salary payment recorded for ${payrollModal.fullName}.`);
      setPayrollModal(null);
      loadStaff();
      if (selectedStaffId) loadFullProfile(selectedStaffId);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to record payroll.');
    }
  };

  // Security controls
  const handleResetPassword = async () => {
    if (!securityModal) return;
    try {
      await fetchApi(`/api/admin/users/${securityModal.userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ temporaryPassword: newTempPassword || undefined }),
      });
      showNotice('success', 'Password reset successfully.');
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
      showNotice('success', '4-digit PIN cleared. Employee will set a new PIN on next login.');
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
      showNotice('success', 'Forced credential change enabled for next login.');
      setSecurityModal(null);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to set forced reset.');
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

  // Summary Metrics calculations
  const totalStaff = staffMembers.length;
  const activeStaff = staffMembers.filter((s) => (s.status || '').toLowerCase() === 'active').length;
  const presentToday = staffMembers.filter((s) => s.attendanceToday === 'Present' || s.attendanceToday === 'Late').length;
  const lateToday = staffMembers.filter((s) => s.attendanceToday === 'Late').length;
  const kycApproved = staffMembers.filter((s) => (s.kycStatus || '').toLowerCase() === 'approved').length;
  const bankVerified = staffMembers.filter((s) => s.bankVerificationStatus === 'Verified').length;
  const totalSalesRevenue = staffMembers.reduce((sum, s) => sum + (s.revenueGenerated || 0), 0);

  // Filtered rows
  const filtered = staffMembers.filter((s) => {
    const matchSearch =
      (s.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.userId || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.mobile && s.mobile.includes(search)) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()));

    const matchDept = deptFilter === 'all' || s.department === deptFilter;
    const matchStatus = statusFilter === 'all' || (s.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchKyc = kycFilter === 'all' || (s.kycStatus || '').toLowerCase() === kycFilter.toLowerCase();
    const matchBank =
      bankFilter === 'all' ||
      (bankFilter === 'verified' && s.bankVerificationStatus === 'Verified') ||
      (bankFilter === 'pending' && s.bankVerificationStatus === 'Pending Verification') ||
      (bankFilter === 'not_submitted' && (!s.bankVerificationStatus || s.bankVerificationStatus === 'Not Submitted'));

    return matchSearch && matchDept && matchStatus && matchKyc && matchBank;
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Staff Team Administration</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive employee directory, biometric camera attendance, targets vs achievement, permissions matrix & payroll.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOnboardTab('personal');
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Onboard New Staff Employee
        </button>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Total Staff</span>
          <p className="text-xl font-bold text-white mt-1">{totalStaff}</p>
          <span className="text-[10px] text-blue-400 mt-1 block">Active Employees</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Active Team</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{activeStaff}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">{totalStaff - activeStaff} Inactive/Suspended</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Present Today</span>
          <p className="text-xl font-bold text-teal-400 mt-1">{presentToday}</p>
          <span className="text-[10px] text-amber-400 mt-1 block">{lateToday} Marked Late</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">KYC Approved</span>
          <p className="text-xl font-bold text-indigo-400 mt-1">{kycApproved}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">{totalStaff - kycApproved} Pending / Review</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-[11px]">Bank Verified</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{bankVerified}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Salary Payout Ready</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl col-span-2">
          <span className="text-slate-400 text-[11px]">Total Sales Revenue Closed</span>
          <p className="text-xl font-bold text-amber-400 mt-1 font-mono">₹{totalSalesRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Across all sales staff</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search staff by Name, Staff ID, Mobile, Email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="all">All Departments</option>
              <option value="Sales">Sales</option>
              <option value="Development">Development</option>
              <option value="Operations">Operations</option>
              <option value="Management">Management</option>
              <option value="Accounts">Accounts</option>
              <option value="HR">HR</option>
              <option value="Support">Support</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
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
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
              <option value="correction_needed">Correction Needed</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Staff Directory</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs">{filtered.length}</span>
          </h3>
          <button
            onClick={loadStaff}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
            No staff members match the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Employee Details</th>
                  <th className="py-3 px-4">Role & Dept</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Today's Attendance</th>
                  <th className="py-3 px-4">Monthly Target & Sales</th>
                  <th className="py-3 px-4">KYC & Bank</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((s) => (
                  <tr key={s.id || s.userId} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                          {s.fullName ? s.fullName[0].toUpperCase() : 'S'}
                        </div>
                        <div>
                          <p
                            className="font-semibold text-white hover:text-blue-400 cursor-pointer"
                            onClick={() => loadFullProfile(s.userId)}
                          >
                            {s.fullName}
                          </p>
                          <span className="font-mono text-[10px] text-blue-400/80">{s.userId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-medium text-white">{s.designation}</p>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] border border-slate-700">
                        {s.department}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-mono">{s.mobile}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[130px]">{s.email}</p>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          s.attendanceToday === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : s.attendanceToday === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {s.attendanceToday}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {s.attendanceDays || 0} days this month
                      </span>
                    </td>

                    <td className="py-3 px-4 min-w-[130px]">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>{s.salesCount || 0} / {s.monthlyTarget || 10}</span>
                        <span className="font-semibold text-blue-400">{s.achievementPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${s.achievementPercentage || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        ₹{(s.revenueGenerated || 0).toLocaleString('en-IN')} rev
                      </span>
                    </td>

                    <td className="py-3 px-4 space-y-1">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            (s.kycStatus || '').toLowerCase() === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          KYC: {s.kycStatus || 'Pending'}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            s.bankVerificationStatus === 'Verified'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          Bank: {s.bankVerificationStatus || 'Pending'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      ₹{(s.salary || 25000).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setStatusModal(s);
                          setNewStatusValue((s.status?.toLowerCase() as any) || 'active');
                          setStatusReason('');
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                          (s.status || '').toLowerCase() === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                        }`}
                      >
                        {s.status || 'Active'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => loadFullProfile(s.userId)}
                          className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition"
                          title="View Full Profile"
                        >
                          <Eye className="w-3 h-3" /> Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPermissions(s)}
                          className="p-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded transition"
                          title="Permissions Matrix & Data Scope"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPayrollModal(s);
                            setPayrollForm({
                              month: new Date().toISOString().slice(0, 7),
                              baseSalary: s.salary || 25000,
                              incentive: 0,
                              deductions: 0,
                              bonus: 0,
                              notes: 'Monthly salary credit',
                              paymentReference: `SAL-${Date.now().toString().slice(-6)}`,
                              paymentDate: new Date().toISOString().split('T')[0],
                              status: 'Paid',
                            });
                          }}
                          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded transition"
                          title="Record Payroll / Salary Payment"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSecurityModal(s);
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
      {/* 1. ONBOARD STAFF MODAL (6 Multi-Section Tabs)             */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 text-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-400" />
                  Onboard New Staff Employee (Complete Flow)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter personal, professional, salary structure, bank details, monthly targets, and credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Sub-Tabs */}
            <div className="flex border-b border-slate-800 mt-3 text-xs overflow-x-auto gap-1">
              {[
                { key: 'personal', label: '1. Personal' },
                { key: 'professional', label: '2. Professional & Role' },
                { key: 'salary', label: '3. Salary & Payroll' },
                { key: 'bank', label: '4. Bank Details' },
                { key: 'targets', label: '5. Monthly Targets' },
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
            <form onSubmit={handleCreateStaff} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* TAB 1: PERSONAL DETAILS */}
              {onboardTab === 'personal' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">A. Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={newStaffForm.fullName}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="e.g. Vikas Sharma"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Father's / Husband's Name</label>
                      <input
                        type="text"
                        value={newStaffForm.fathersName}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, fathersName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={newStaffForm.dob}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, dob: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Gender</label>
                      <select
                        value={newStaffForm.gender}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, gender: e.target.value })}
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
                        value={newStaffForm.mobile}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, mobile: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="10-digit mobile"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">WhatsApp Number</label>
                      <input
                        type="tel"
                        value={newStaffForm.whatsapp}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, whatsapp: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Official Email Address *</label>
                      <input
                        type="email"
                        value={newStaffForm.email}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        placeholder="employee@vishalenterprises.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Personal Email</label>
                      <input
                        type="email"
                        value={newStaffForm.personalEmail}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, personalEmail: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Alternate Phone</label>
                      <input
                        type="tel"
                        value={newStaffForm.alternateMobile}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, alternateMobile: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={newStaffForm.address}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, address: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">City</label>
                      <input
                        type="text"
                        value={newStaffForm.city}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, city: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">State & PIN Code</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="State"
                          value={newStaffForm.state}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, state: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                        <input
                          type="text"
                          placeholder="PIN"
                          value={newStaffForm.pinCode}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, pinCode: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROFESSIONAL & ROLE */}
              {onboardTab === 'professional' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">B. Department & Professional Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Department *</label>
                      <select
                        value={newStaffForm.department}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Sales">Sales</option>
                        <option value="Development">Development</option>
                        <option value="Operations">Operations</option>
                        <option value="Management">Management</option>
                        <option value="Accounts">Accounts</option>
                        <option value="HR">HR</option>
                        <option value="Support">Support</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Designation *</label>
                      <select
                        value={newStaffForm.designation}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, designation: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Sales Executive">Sales Executive</option>
                        <option value="Senior Sales Executive">Senior Sales Executive</option>
                        <option value="Team Leader">Team Leader</option>
                        <option value="Branch Manager">Branch Manager</option>
                        <option value="Full Stack Developer">Full Stack Developer</option>
                        <option value="Frontend Developer">Frontend Developer</option>
                        <option value="UI/UX Designer">UI/UX Designer</option>
                        <option value="Operations Executive">Operations Executive</option>
                        <option value="Accounts Manager">Accounts Manager</option>
                        <option value="HR Manager">HR Manager</option>
                        <option value="Support Specialist">Support Specialist</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Employment Type</label>
                      <select
                        value={newStaffForm.employeeType}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, employeeType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={newStaffForm.joiningDate}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, joiningDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Work Location</label>
                      <select
                        value={newStaffForm.workLocation}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, workLocation: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Office">Office</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Reporting Manager</label>
                      <input
                        type="text"
                        value={newStaffForm.reportingManager}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, reportingManager: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Administrative Notes</label>
                    <textarea
                      rows={2}
                      value={newStaffForm.notes}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SALARY & PAYROLL */}
              {onboardTab === 'salary' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">C. Salary & Compensation Structure</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Monthly Base Salary (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        value={newStaffForm.baseSalary}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, baseSalary: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Salary Type</label>
                      <select
                        value={newStaffForm.salaryType}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, salaryType: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      >
                        <option value="Fixed">Fixed Monthly</option>
                        <option value="Fixed + Commission">Fixed + Sales Commission</option>
                        <option value="Commission Only">Commission Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Effective Date</label>
                      <input
                        type="date"
                        value={newStaffForm.effectiveDate}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, effectiveDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BANK DETAILS */}
              {onboardTab === 'bank' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">D. Bank Account for Salary Transfer</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={newStaffForm.bankDetails.accountHolderName}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            bankDetails: { ...newStaffForm.bankDetails, accountHolderName: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={newStaffForm.bankDetails.bankName}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            bankDetails: { ...newStaffForm.bankDetails, bankName: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={newStaffForm.bankDetails.accountNumber}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            bankDetails: { ...newStaffForm.bankDetails, accountNumber: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={newStaffForm.bankDetails.ifsc}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            bankDetails: { ...newStaffForm.bankDetails, ifsc: e.target.value.toUpperCase() },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Branch</label>
                      <input
                        type="text"
                        value={newStaffForm.bankDetails.branch}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            bankDetails: { ...newStaffForm.bankDetails, branch: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">UPI ID</label>
                      <input
                        type="text"
                        value={newStaffForm.bankDetails.upiId}
                        onChange={(e) =>
                          setNewStaffForm({
                            ...newStaffForm,
                            bankDetails: { ...newStaffForm.bankDetails, upiId: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: MONTHLY TARGETS */}
              {onboardTab === 'targets' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">E. Initial Monthly Targets Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Monthly Closed Sales Target (Deals)</label>
                      <input
                        type="number"
                        min="0"
                        value={newStaffForm.monthlySalesTarget}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, monthlySalesTarget: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Monthly Revenue Target (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={newStaffForm.monthlySalesAmountTarget}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, monthlySalesAmountTarget: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Monthly Leads Assigned / Handled</label>
                      <input
                        type="number"
                        min="0"
                        value={newStaffForm.monthlyLeadsTarget}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, monthlyLeadsTarget: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Monthly Website Demos Completed</label>
                      <input
                        type="number"
                        min="0"
                        value={newStaffForm.monthlyDemosTarget}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, monthlyDemosTarget: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                      />
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
                        value={newStaffForm.temporaryPassword}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, temporaryPassword: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                        placeholder="Leave blank for Staff1@$"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Default fallback: Staff1@$</span>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="forceStaffPass"
                        checked={newStaffForm.forcePasswordChange}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, forcePasswordChange: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <label htmlFor="forceStaffPass" className="text-slate-300 cursor-pointer">
                        Force password & 4-digit PIN setup on first login
                      </label>
                    </div>
                  </div>

                  <div className="bg-blue-950/20 border border-blue-800/40 rounded-xl p-3 text-[11px] text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-blue-400" />
                      Automatic ID Generation
                    </p>
                    <p>
                      A unique Staff ID (VE-STAFF-XXX) will be assigned. Default department permissions will be mapped automatically based on the selected role.
                    </p>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
                >
                  Cancel
                </button>

                <div className="flex gap-2">
                  {onboardTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: any[] = ['personal', 'professional', 'salary', 'bank', 'targets', 'security'];
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
                        const tabs: any[] = ['personal', 'professional', 'salary', 'bank', 'targets', 'security'];
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
      {/* 2. DETAILED 21-TAB STAFF PROFILE MODAL                    */}
      {/* ========================================================= */}
      {selectedStaffId && profileData && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full p-6 text-slate-200 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                  {profileData.staff?.fullName ? profileData.staff.fullName[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{profileData.staff?.fullName}</h2>
                    <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {profileData.staff?.userId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        (profileData.staff?.status || '').toLowerCase() === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}
                    >
                      {profileData.staff?.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {profileData.staff?.designation} • {profileData.staff?.department} • Base Salary: ₹{(profileData.staff?.salary || 25000).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPermissions(profileData.staff)}
                  className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Sliders className="w-3.5 h-3.5" /> Permissions Matrix
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStaffId(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 21 Profile Tabs Bar */}
            <div className="flex border-b border-slate-800 text-xs overflow-x-auto gap-1 py-1">
              {[
                { id: 'overview', label: 'Overview & Stats' },
                { id: 'personal', label: 'Personal Details' },
                { id: 'professional', label: 'Employment Details' },
                { id: 'attendance', label: `Attendance (${profileData.attendance?.length || 0})` },
                { id: 'targets', label: 'Targets & Achievement' },
                { id: 'sales', label: `Sales (${profileData.sales?.length || 0})` },
                { id: 'leads', label: `Leads (${profileData.leads?.length || 0})` },
                { id: 'proposals', label: `Proposals (${profileData.proposals?.length || 0})` },
                { id: 'customers', label: `Customers (${profileData.customers?.length || 0})` },
                { id: 'projects', label: `Projects (${profileData.projects?.length || 0})` },
                { id: 'payroll', label: `Payroll (${profileData.payroll?.length || 0})` },
                { id: 'bank', label: 'Bank Details' },
                { id: 'kyc', label: 'KYC Status' },
                { id: 'requests', label: `Requests (${profileData.requests?.length || 0})` },
                { id: 'complaints', label: `Complaints (${profileData.complaints?.length || 0})` },
                { id: 'audit', label: 'Audit & Activity' },
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
                      <span className="text-slate-400 text-[11px]">Leads Contacted</span>
                      <p className="text-xl font-bold text-white mt-1">{profileData.metrics?.contacted || 0}</p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Closed Sales (Month)</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1">{profileData.metrics?.monthSales || 0}</p>
                      <span className="text-[10px] text-blue-400 mt-0.5 block">Target: {profileData.metrics?.targetSales || 10}</span>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Sales Revenue (Month)</span>
                      <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
                        ₹{(profileData.metrics?.monthRevenue || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <span className="text-slate-400 text-[11px]">Attendance Days</span>
                      <p className="text-xl font-bold text-teal-400 mt-1">{profileData.metrics?.presentCount || 0}</p>
                      <span className="text-[10px] text-amber-400 mt-0.5 block">{profileData.metrics?.lateCount || 0} Late Markings</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-blue-400" /> Target vs Real Performance
                      </h4>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Sales Deals Target:</span>
                        <span className="font-semibold text-white">{profileData.metrics?.targetSales || 10} deals</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Sales Achievement:</span>
                        <span className="font-semibold text-emerald-400">{profileData.metrics?.salesAchievementPct || 0}%</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Revenue Achievement:</span>
                        <span className="font-semibold text-blue-400">{profileData.metrics?.revenueAchievementPct || 0}%</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-emerald-400" /> Verification Status
                      </h4>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">KYC Status:</span>
                        <span className="font-semibold text-amber-400">{profileData.kyc?.status || profileData.staff?.kycStatus || 'Pending'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">Bank Verification:</span>
                        <span className="font-semibold text-blue-400">{profileData.staff?.bankDetails?.verificationStatus || 'Pending'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Base Salary:</span>
                        <span className="font-mono font-semibold text-white">₹{(profileData.staff?.salary || 25000).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-blue-400" /> Contact Info
                      </h4>
                      <p className="text-slate-300"><span className="text-slate-500">Phone:</span> {profileData.staff?.mobile}</p>
                      <p className="text-slate-300"><span className="text-slate-500">Email:</span> {profileData.staff?.email}</p>
                      <p className="text-slate-300"><span className="text-slate-500">Location:</span> {profileData.staff?.workLocation || 'Office'} ({profileData.staff?.city || 'N/A'})</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PERSONAL */}
              {profileTab === 'personal' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-white">Personal Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Full Legal Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.fullName}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Father's / Husband's Name</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.fathersName || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Date of Birth</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.dob || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Gender</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.gender || 'Male'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Mobile Number</span>
                      <p className="font-semibold font-mono text-white mt-0.5">{profileData.staff?.mobile}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">WhatsApp Number</span>
                      <p className="font-semibold font-mono text-white mt-0.5">{profileData.staff?.whatsapp || profileData.staff?.mobile}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Official Email</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Personal Email</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.personalEmail || 'Not Provided'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 text-[11px] block">Address</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.address || 'Not Provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">City & State</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.city || 'N/A'}, {profileData.staff?.state || ''}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">PIN Code</span>
                      <p className="font-semibold text-white mt-0.5">{profileData.staff?.pinCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ATTENDANCE LOGS WITH PHOTOS */}
              {profileTab === 'attendance' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">Biometric Camera Attendance Logs</h4>
                      <p className="text-slate-400 text-[11px]">Real photographic check-ins with timestamps and statuses.</p>
                    </div>
                  </div>

                  {(!profileData.attendance || profileData.attendance.length === 0) ? (
                    <p className="text-center py-8 text-slate-500">No attendance records logged for this employee.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Check-in Time</th>
                            <th className="py-2.5 px-3">Camera Photo</th>
                            <th className="py-2.5 px-3">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.attendance.map((att: any) => (
                            <tr key={att.id} className="hover:bg-slate-900/40">
                              <td className="py-2.5 px-3 font-medium text-white">{att.date}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    att.status === 'Present'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{att.checkInTime || 'N/A'}</td>
                              <td className="py-2.5 px-3">
                                {att.photo ? (
                                  <button
                                    onClick={() => setPhotoViewerUrl(att.photo)}
                                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                                  >
                                    <Camera className="w-3 h-3" /> View Photo
                                  </button>
                                ) : (
                                  <span className="text-slate-600">No Photo</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{att.location || 'Vishal Enterprises Office'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 11: PAYROLL HISTORY */}
              {profileTab === 'payroll' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl">
                    <div>
                      <h4 className="font-bold text-white">Monthly Payroll & Salary Slips</h4>
                      <p className="text-slate-400 text-[11px]">Salary disbursements, bonuses, and deductions history.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPayrollModal(profileData.staff);
                        setPayrollForm({
                          month: new Date().toISOString().slice(0, 7),
                          baseSalary: profileData.staff?.salary || 25000,
                          incentive: 0,
                          deductions: 0,
                          bonus: 0,
                          notes: 'Monthly salary credit',
                          paymentReference: `SAL-${Date.now().toString().slice(-6)}`,
                          paymentDate: new Date().toISOString().split('T')[0],
                          status: 'Paid',
                        });
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Record Salary Payment
                    </button>
                  </div>

                  {(!profileData.payroll || profileData.payroll.length === 0) ? (
                    <p className="text-center py-8 text-slate-500">No payroll disbursements recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Payroll ID</th>
                            <th className="py-2.5 px-3">Month</th>
                            <th className="py-2.5 px-3">Base</th>
                            <th className="py-2.5 px-3">Incentives</th>
                            <th className="py-2.5 px-3">Deductions</th>
                            <th className="py-2.5 px-3">Net Pay</th>
                            <th className="py-2.5 px-3">Txn Reference</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {profileData.payroll.map((p: any) => (
                            <tr key={p.id || p.payrollId} className="hover:bg-slate-900/40">
                              <td className="py-2.5 px-3 font-mono font-medium text-white">{p.payrollId}</td>
                              <td className="py-2.5 px-3 text-white">{p.month}</td>
                              <td className="py-2.5 px-3 font-mono">₹{(p.baseSalary || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono text-emerald-400">+₹{(p.incentive || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono text-red-400">-₹{(p.deductions || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-white">₹{(p.netSalary || 0).toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{p.paymentReference || 'N/A'}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
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
              )}

              {/* TAB 12: BANK DETAILS */}
              {profileTab === 'bank' && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white">Registered Bank Account</h4>
                      <p className="text-slate-400 text-[11px]">Used for salary disbursements.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyBank('Verified')}
                        className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold hover:bg-emerald-600/30"
                      >
                        Verify Bank
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerifyBank('Rejected', 'Details mismatch')}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold hover:bg-red-600/30"
                      >
                        Reject
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PERMISSIONS MATRIX & DATA SCOPE MODAL                  */}
      {/* ========================================================= */}
      {permStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  Role & Module Permissions Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure access rights for <strong className="text-white">{permStaff.fullName}</strong> ({permStaff.department})
                </p>
              </div>
              <button onClick={() => setPermStaff(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {/* Data Scope Selector */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <label className="block text-slate-300 font-semibold mb-1">Record Visibility Scope</label>
                <select
                  value={permScope}
                  onChange={(e) => setPermScope(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="own">Own Records Only (Individual sales & leads)</option>
                  <option value="department">Department Records (Entire {permStaff.department} team)</option>
                  <option value="all">All Organization Records (Full Visibility)</option>
                </select>
              </div>

              {/* Module Permissions Matrix */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300">Module Access Controls</h4>
                <div className="space-y-1.5 border border-slate-800 rounded-xl overflow-hidden">
                  {[
                    'leads',
                    'customers',
                    'sales',
                    'proposals',
                    'payments',
                    'projects',
                    'services',
                    'packages',
                    'renewals',
                    'referrals',
                    'requests',
                    'complaints',
                    'kyc',
                  ].map((mod) => {
                    const current = permMatrix[mod] || { view: false, add: false, edit: false, delete: false };
                    return (
                      <div
                        key={mod}
                        className="p-2.5 bg-slate-950/60 flex items-center justify-between border-b border-slate-800/40 last:border-0"
                      >
                        <span className="font-semibold text-white capitalize w-28">{mod}</span>
                        <div className="flex items-center gap-4">
                          {['view', 'add', 'edit', 'delete'].map((action) => (
                            <label key={action} className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!current[action]}
                                onChange={(e) => {
                                  const updated = { ...current, [action]: e.target.checked };
                                  setPermMatrix({ ...permMatrix, [mod]: updated });
                                }}
                                className="rounded text-blue-600 focus:ring-0"
                              />
                              <span className="text-slate-400 capitalize">{action}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setPermStaff(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
              >
                Save Permissions Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. RECORD PAYROLL MODAL                                   */}
      {/* ========================================================= */}
      {payrollModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Disburse Salary: {payrollModal.fullName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Record formal monthly salary credit & generate slip.</p>

            <form onSubmit={handleRecordPayroll} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Salary Month *</label>
                  <input
                    type="month"
                    value={payrollForm.month}
                    onChange={(e) => setPayrollForm({ ...payrollForm, month: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Base Salary (₹) *</label>
                  <input
                    type="number"
                    value={payrollForm.baseSalary}
                    onChange={(e) => setPayrollForm({ ...payrollForm, baseSalary: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Incentive (+)</label>
                  <input
                    type="number"
                    value={payrollForm.incentive}
                    onChange={(e) => setPayrollForm({ ...payrollForm, incentive: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Bonus (+)</label>
                  <input
                    type="number"
                    value={payrollForm.bonus}
                    onChange={(e) => setPayrollForm({ ...payrollForm, bonus: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Deductions (-)</label>
                  <input
                    type="number"
                    value={payrollForm.deductions}
                    onChange={(e) => setPayrollForm({ ...payrollForm, deductions: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                <span className="font-semibold text-slate-300">Net Calculated Payout:</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  ₹{(
                    Number(payrollForm.baseSalary) +
                    Number(payrollForm.incentive) +
                    Number(payrollForm.bonus) -
                    Number(payrollForm.deductions)
                  ).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Transaction / Reference Number</label>
                <input
                  type="text"
                  value={payrollForm.paymentReference}
                  onChange={(e) => setPayrollForm({ ...payrollForm, paymentReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono"
                  placeholder="e.g. UTR / NEFT / IMPS Reference"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPayrollModal(null)}
                  className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
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
            <p className="text-xs text-slate-400 mb-4">Staff ID: {securityModal.userId}</p>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h5 className="font-semibold text-white">Reset Account Password</h5>
                <input
                  type="text"
                  placeholder="New Temporary Password (default: Staff1@$)"
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
            <h3 className="text-base font-bold text-white mb-2">Update Staff Status</h3>
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
                  placeholder="e.g. Leave of absence / Performance review"
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

      {/* ========================================================= */}
      {/* 7. CAMERA ATTENDANCE PHOTO VIEWER MODAL                   */}
      {/* ========================================================= */}
      {photoViewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 text-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Biometric Attendance Verification Photo
              </h4>
              <button onClick={() => setPhotoViewerUrl(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black max-h-[70vh] flex items-center justify-center">
              <img src={photoViewerUrl} alt="Attendance Capture" className="max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

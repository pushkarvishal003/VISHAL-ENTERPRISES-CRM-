/**
 * Vishal Enterprises CRM - Master Application Component
 * Handles Authentication, Navigation, Role Gates, and Module Wiring
 */

import React, { useState, useEffect } from 'react';
import { User } from './types/crm.ts';
import { getStoredToken, clearStoredToken, fetchApi } from './lib/api.ts';

// Components
import { Login } from './components/Login.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { LeadsManager } from './components/LeadsManager.tsx';
import { CustomersManager } from './components/CustomersManager.tsx';
import { SalesManager } from './components/SalesManager.tsx';
import { ProposalsManager } from './components/ProposalsManager.tsx';
import { PaymentsManager } from './components/PaymentsManager.tsx';
import { ProjectsManager } from './components/ProjectsManager.tsx';
import { ServicesPackagesManager } from './components/ServicesPackagesManager.tsx';
import { AttendanceCamera } from './components/AttendanceCamera.tsx';
import { AdminAttendance } from './components/AdminAttendance.tsx';
import { StaffManager } from './components/StaffManager.tsx';
import { DsaManager } from './components/DsaManager.tsx';
import { DsaCommissionView } from './components/DsaCommissionView.tsx';
import { AdminWithdrawals } from './components/AdminWithdrawals.tsx';
import { DsaAgreementModal } from './components/DsaAgreementModal.tsx';
import { KycManager } from './components/KycManager.tsx';
import { RenewalsManager } from './components/RenewalsManager.tsx';
import { StaffReferrals } from './components/StaffReferrals.tsx';
import { StaffRequestsComplaints } from './components/StaffRequestsComplaints.tsx';
import { ReportsManager } from './components/ReportsManager.tsx';
import { AuditLogsViewer } from './components/AuditLogsViewer.tsx';
import { FirstLoginModal } from './components/FirstLoginModal.tsx';
import { FollowUpsManager } from './components/FollowUpsManager.tsx';
import { TargetsManager } from './components/TargetsManager.tsx';
import { CommissionsManager } from './components/CommissionsManager.tsx';
import { SettingsManager } from './components/SettingsManager.tsx';
import { ClientPortal } from './components/ClientPortal.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [attendanceSubTab, setAttendanceSubTab] = useState<'my' | 'admin'>('admin');
  const [searchOpen, setSearchOpen] = useState(false);

  // Global hotkey Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Verify stored credentials on initial load
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetchApi<{ user: User }>('/api/auth/me')
      .then((res) => {
        if (res?.user) {
          setUser(res.user);
        } else {
          clearStoredToken();
        }
      })
      .catch((err) => {
        console.warn('Session verification failed, logging out:', err);
        clearStoredToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      clearStoredToken();
      setUser(null);
      setCurrentView('dashboard');
    }
  };

  const handleFirstLoginComplete = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-lg text-slate-100">Vishal Enterprises CRM</p>
        <p className="text-sm text-slate-400">Loading secure environment...</p>
      </div>
    );
  }

  // Not logged in -> Render Login Portal
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render view router based on currentView
  const renderView = () => {
    // If Client role, default home view is the Client Self-Service Portal
    if (user.role === 'CLIENT' && (currentView === 'dashboard' || currentView === 'clientPortal')) {
      return <ClientPortal user={user} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={setCurrentView} onLogout={handleLogout} />;

      case 'clientPortal':
        return <ClientPortal user={user} />;

      case 'leads':
        return <LeadsManager user={user} />;

      case 'followups':
        return <FollowUpsManager user={user} />;

      case 'customers':
        return <CustomersManager user={user} />;

      case 'sales':
        return <SalesManager user={user} />;

      case 'proposals':
        return <ProposalsManager user={user} onNavigate={setCurrentView} />;

      case 'payments':
        return <PaymentsManager user={user} />;

      case 'projects':
        return <ProjectsManager user={user} />;

      case 'services':
      case 'packages':
        return (
          <ServicesPackagesManager
            user={user}
            onNavigate={setCurrentView}
            initialTab={currentView === 'packages' ? 'packages' : 'services'}
          />
        );

      case 'attendance':
        if (user.role === 'ADMIN') {
          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                <div className="flex gap-2">
                  <button
                    id="tab-attendance-admin"
                    onClick={() => setAttendanceSubTab('admin')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      attendanceSubTab === 'admin'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Staff Attendance Feed & Status
                  </button>
                  <button
                    id="tab-attendance-self"
                    onClick={() => setAttendanceSubTab('my')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      attendanceSubTab === 'my'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    My Camera Check-in
                  </button>
                </div>
              </div>
              {attendanceSubTab === 'admin' ? (
                <AdminAttendance user={user} />
              ) : (
                <AttendanceCamera user={user} />
              )}
            </div>
          );
        }
        return <AttendanceCamera user={user} />;

      case 'staff':
        return <StaffManager user={user} />;

      case 'dsa':
        return <DsaManager user={user} />;

      case 'targets':
        return <TargetsManager user={user} />;

      case 'commission':
        if (user.role === 'ADMIN') {
          return <CommissionsManager user={user} />;
        }
        return <DsaCommissionView user={user} />;

      case 'withdrawals':
        if (user.role === 'ADMIN') {
          return <AdminWithdrawals user={user} />;
        }
        return <DsaCommissionView user={user} />;

      case 'agreement':
        return <DsaAgreementModal user={user} />;

      case 'kyc':
        return <KycManager user={user} />;

      case 'renewals':
        return <RenewalsManager user={user} />;

      case 'referrals':
        return <StaffReferrals user={user} />;

      case 'requests':
      case 'complaints':
        return <StaffRequestsComplaints user={user} />;

      case 'reports':
        return <ReportsManager user={user} />;

      case 'auditLogs':
      case 'audit-logs':
        return <AuditLogsViewer />;

      case 'settings':
        return <SettingsManager user={user} onNavigate={setCurrentView} />;

      default:
        return <Dashboard user={user} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* First Login Credential Setup Guard */}
      {user.firstLogin && (
        <FirstLoginModal user={user} onComplete={handleFirstLoginComplete} />
      )}

      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onNavigate={setCurrentView}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Global Universal Search Omnibox */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(mod) => setCurrentView(mod)}
      />

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar
          user={user}
          currentView={currentView}
          onNavigate={setCurrentView}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950/40">
          <div className="max-w-7xl mx-auto">{renderView()}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * Vishal Enterprises CRM - Dynamic Sidebar
 * Strict role-based & permission-filtered navigation
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building,
  PhoneCall,
  TrendingUp,
  FileSpreadsheet,
  CreditCard,
  FolderGit2,
  Layers,
  Package,
  UserCheck,
  Briefcase,
  Target,
  Camera,
  RefreshCw,
  BarChart3,
  Bell,
  HelpCircle,
  AlertCircle,
  FileCheck,
  DollarSign,
  ArrowDownToLine,
  Sliders,
  History,
  FileText,
  UserPlus,
  X,
} from 'lucide-react';
import { User, CrmModule } from '../types/crm.ts';

interface SidebarProps {
  user: User;
  currentView: string;
  onNavigate: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: CrmModule;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentView,
  onNavigate,
  mobileOpen,
  onMobileClose,
}) => {
  // Master menu item definitions
  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'customers', label: 'Customers', icon: Building },
    { id: 'followups', label: 'Follow-ups', icon: PhoneCall },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'proposals', label: 'Proposals / Quotations', icon: FileSpreadsheet },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'projects', label: 'Website Projects', icon: FolderGit2 },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'staff', label: 'Staff', icon: UserCheck },
    { id: 'dsa', label: 'DSA Partners', icon: Briefcase },
    { id: 'targets', label: 'Targets', icon: Target },
    { id: 'attendance', label: 'Attendance', icon: Camera },
    { id: 'renewals', label: 'Renewals', icon: RefreshCw },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'requests', label: 'Requests', icon: HelpCircle },
    { id: 'complaints', label: 'Complaints', icon: AlertCircle },
    { id: 'kyc', label: 'KYC Verification', icon: FileCheck },
    { id: 'commission', label: 'Commission', icon: DollarSign },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
    { id: 'settings', label: 'Settings & Company Profile', icon: Sliders },
    { id: 'auditLogs', label: 'Audit Logs', icon: History },
  ];

  const staffMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
    { id: 'leads', label: 'Leads', icon: Users, moduleKey: 'leads' },
    { id: 'customers', label: 'Customers', icon: Building, moduleKey: 'customers' },
    { id: 'followups', label: 'Follow-ups', icon: PhoneCall, moduleKey: 'followups' },
    { id: 'sales', label: 'Sales', icon: TrendingUp, moduleKey: 'sales' },
    { id: 'proposals', label: 'Proposals', icon: FileSpreadsheet, moduleKey: 'proposals' },
    { id: 'payments', label: 'Payments', icon: CreditCard, moduleKey: 'payments' },
    { id: 'projects', label: 'Website Projects', icon: FolderGit2, moduleKey: 'projects' },
    { id: 'attendance', label: 'Attendance (Camera)', icon: Camera, moduleKey: 'attendance' },
    { id: 'services', label: 'Services Catalog', icon: Layers, moduleKey: 'services' },
    { id: 'packages', label: 'Packages', icon: Package, moduleKey: 'packages' },
    { id: 'targets', label: 'My Targets', icon: Target, moduleKey: 'targets' },
    { id: 'renewals', label: 'Renewals', icon: RefreshCw, moduleKey: 'renewals' },
    { id: 'referrals', label: 'Staff Referrals', icon: UserPlus, moduleKey: 'referrals' },
    { id: 'requests', label: 'My Requests', icon: HelpCircle, moduleKey: 'requests' },
    { id: 'complaints', label: 'My Complaints', icon: AlertCircle, moduleKey: 'complaints' },
    { id: 'kyc', label: 'My KYC', icon: FileCheck, moduleKey: 'kyc' },
    { id: 'settings', label: 'Company Profile & Rules', icon: Sliders },
    { id: 'notifications', label: 'Notifications', icon: Bell, moduleKey: 'notifications' },
  ];

  const dsaMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'My Leads', icon: Users },
    { id: 'proposals', label: 'Proposals / Quotations', icon: FileSpreadsheet },
    { id: 'sales', label: 'My Website Sales', icon: TrendingUp },
    { id: 'customers', label: 'Customers', icon: Building },
    { id: 'services', label: 'Website Services', icon: Layers },
    { id: 'commission', label: 'Sales Commission', icon: DollarSign },
    { id: 'withdrawals', label: 'Withdrawals (7th & 14th)', icon: ArrowDownToLine },
    { id: 'settings', label: 'Company Profile & Rules', icon: Sliders },
    { id: 'kyc', label: 'KYC Verification', icon: FileCheck },
    { id: 'agreement', label: 'Partner Agreement', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const clientMenuItems: MenuItem[] = [
    { id: 'clientPortal', label: 'Client Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Website Progress', icon: FolderGit2 },
    { id: 'payments', label: 'Invoices & Receipts', icon: CreditCard },
    { id: 'proposals', label: 'Quotations', icon: FileSpreadsheet },
    { id: 'renewals', label: 'Domain Renewals', icon: RefreshCw },
    { id: 'requests', label: 'Support & Tickets', icon: HelpCircle },
  ];

  // Dynamic filter for Staff based on Admin permissions
  const filteredStaffItems = staffMenuItems.filter((item) => {
    if (!item.moduleKey) return true;
    if (!user.permissions?.modules) return true;
    const mod = user.permissions.modules[item.moduleKey];
    return mod ? mod.view : true;
  });

  const menuToRender =
    user.role === 'ADMIN'
      ? adminMenuItems
      : user.role === 'STAFF'
      ? filteredStaffItems
      : user.role === 'CLIENT'
      ? clientMenuItems
      : dsaMenuItems;

  const handleItemClick = (id: string) => {
    onNavigate(id);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header inside sidebar for mobile */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <span className="font-bold text-sm text-white">Menu</span>
          <button
            onClick={onMobileClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-4 py-3 border-b border-slate-800/80">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {user.role} WORKSPACE
          </p>
          <p className="text-xs text-slate-500 truncate">{user.fullName}</p>
        </div>

        {/* Menu Items List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
          {menuToRender.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                id={`sidebar-nav-${item.id}`}
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
          Vishal Enterprises CRM v2.0
        </div>
      </aside>
    </>
  );
};

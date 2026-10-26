import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  ShieldCheck,
  DollarSign,
  FileText,
  CheckCircle2,
  Save,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Info,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CrmSettings, User } from '../types/crm.ts';
import { fetchApi } from '../lib/api.ts';

interface SettingsManagerProps {
  user: User;
  onNavigate?: (view: string) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ user, onNavigate }) => {
  const isAdmin = user.role === 'ADMIN';
  const isDsa = user.role === 'DSA';
  const isStaff = user.role === 'STAFF';

  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'crm' | 'dsa' | 'terms'>('company');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New item inputs
  const [newCategory, setNewCategory] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newPaymentTerm, setNewPaymentTerm] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CrmSettings>('/api/settings');
      if (data) {
        // Ensure all arrays and nested values are present
        setSettings({
          ...data,
          companyName: data.companyName || data.companyProfile?.companyName || 'Vishal Enterprises',
          companyTagline: data.companyTagline || data.companyProfile?.tagline || 'Premium Website Design & Custom Web Solutions',
          supportEmail: data.supportEmail || data.companyProfile?.email || 'contact@vishalenterprises.com',
          supportPhone: data.supportPhone || data.companyProfile?.phone || '+91 98765 43210',
          whatsappNumber: data.whatsappNumber || data.supportPhone || '+91 98765 43210',
          websiteUrl: data.websiteUrl || data.companyProfile?.websiteUrl || 'https://vishalenterprises.com',
          registeredAddress: data.registeredAddress || data.companyProfile?.address || 'Suite 402, Vishal Commercial Complex, Station Road',
          city: data.city || data.companyProfile?.city || 'Mumbai',
          state: data.state || data.companyProfile?.state || 'Maharashtra',
          pinCode: data.pinCode || data.companyProfile?.pinCode || '400001',
          gstin: data.gstin || data.companyProfile?.gstin || '27AABCV1234F1Z5',
          proposalValidityDays: data.proposalValidityDays ?? 15,
          defaultFollowupDays: data.defaultFollowupDays ?? 3,
          dsaCommissionPercentage: data.dsaCommissionPercentage ?? 10,
          dsaWithdrawalDates: (data.dsaWithdrawalDates && data.dsaWithdrawalDates.length > 0) ? data.dsaWithdrawalDates : [7, 14],
          paymentTermsPresets: (data.paymentTermsPresets && data.paymentTermsPresets.length > 0)
            ? data.paymentTermsPresets
            : (data.paymentTermsList || [
                '50% Advance upon initiation, 50% on Final Website Delivery & Domain Pointing',
                '40% Advance, 40% on Beta Design Approval, 20% on Final Delivery',
                '100% Full Advance Payment (5% Instant Settlement Discount Included)',
                '30% Advance, 40% Development Milestone, 30% Delivery & Handover',
              ]),
          businessCategories: (data.businessCategories && data.businessCategories.length > 0)
            ? data.businessCategories
            : ['Salon & Beauty', 'Coaching & Education', 'Restaurant & Cafe', 'Retail & Supermarket', 'Hospital & Clinic', 'Diagnostic Lab', 'CSC & Online Center', 'Agency & Consultant', 'Professional Services', 'E-commerce Store', 'Manufacturing & Industrial', 'Finance & DSA Services', 'Other'],
          leadSources: (data.leadSources && data.leadSources.length > 0)
            ? data.leadSources
            : ['Google Maps', 'Website', 'WhatsApp', 'Facebook', 'Instagram', 'LinkedIn', 'Referral', 'Existing Customer', 'Direct Call', 'Walk-in', 'Other'],
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings || !isAdmin) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await fetchApi<CrmSettings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (updated) {
        setSettings(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPresets = () => {
    if (!settings || !isAdmin) return;
    const defaultPresets = [
      '50% Advance upon initiation, 50% on Final Website Delivery & Domain Pointing',
      '40% Advance, 40% on Beta Design Approval, 20% on Final Delivery',
      '100% Full Advance Payment (5% Instant Settlement Discount Included)',
      '30% Advance, 40% Development Milestone, 30% Delivery & Handover',
    ];
    setSettings({
      ...settings,
      paymentTermsPresets: defaultPresets,
      paymentTermsList: defaultPresets,
    });
  };

  if (!settings || loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <Settings className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
        Loading CRM Master Settings & Official Profiles...
      </div>
    );
  }

  const companyCardText = `${settings.companyName}\n${settings.companyTagline}\nAddress: ${settings.registeredAddress}, ${settings.city}, ${settings.state} - ${settings.pinCode}\nSupport Phone: ${settings.supportPhone} | WhatsApp: ${settings.whatsappNumber}\nEmail: ${settings.supportEmail}\nWebsite: ${settings.websiteUrl}\nGSTIN: ${settings.gstin}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Company Profile, Rules & System Settings
            </h2>
            {isAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Admin Control
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Official Guidelines • {user.role} View
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Configure company branding, quotation policies, DSA commission schedules, and payment terms presets.'
              : 'Official company contact details, sales pipeline rules, DSA payout schedules, and approved quotation presets.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => handleCopy(companyCardText, 'fullCard')}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copiedKey === 'fullCard' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
              {copiedKey === 'fullCard' ? 'Card Copied!' : 'Copy Brand Card'}
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition"
            >
              {saving ? <Settings className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Settings successfully updated and persisted across the CRM database!
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            activeTab === 'company'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          Company & Brand Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            activeTab === 'crm'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Lead & Sales Rules
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dsa')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            activeTab === 'dsa'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          DSA Commission & Payout
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shrink-0 ${
            activeTab === 'terms'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Payment Terms Presets
        </button>
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Official Company & Brand Identity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                These branding and contact details appear dynamically on official client quotations, website invoices, and system contracts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(companyCardText, 'card1')}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition"
            >
              {copiedKey === 'card1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedKey === 'card1' ? 'Copied' : 'Copy All Brand Info'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Company / Brand Name</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Brand Tagline / Slogan</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.companyTagline || ''}
                onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Official Support Email</label>
              <div className="relative">
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={settings.supportEmail || ''}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pr-8 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(settings.supportEmail || '', 'email')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                  title="Copy Email"
                >
                  {copiedKey === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Official Support Phone</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.supportPhone || ''}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pr-8 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(settings.supportPhone || '', 'phone')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                  title="Copy Phone"
                >
                  {copiedKey === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">WhatsApp Hotline</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.whatsappNumber || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pr-8 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(settings.whatsappNumber || '', 'wa')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                  title="Copy WhatsApp Number"
                >
                  {copiedKey === 'wa' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Website URL</label>
              <div className="relative">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.websiteUrl || ''}
                  onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pr-8 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
                <a
                  href={settings.websiteUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2 top-2.5 text-blue-400 hover:text-blue-300"
                  title="Open Website"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Registered Office Address</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.registeredAddress || ''}
                onChange={(e) => setSettings({ ...settings, registeredAddress: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Clean, Individual City / State / PIN Code inputs */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">City</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={settings.city || ''}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">State</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={settings.state || ''}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">PIN Code</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={settings.pinCode || ''}
                    onChange={(e) => setSettings({ ...settings, pinCode: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-mono disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">GSTIN (Goods and Services Tax Number)</label>
              <div className="relative max-w-sm">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                  placeholder="27AABCV1234F1Z5"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 pr-8 text-white font-mono uppercase disabled:opacity-75 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(settings.gstin || '', 'gstin')}
                  className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                  title="Copy GSTIN"
                >
                  {copiedKey === 'gstin' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: CRM & Sales Rules */}
      {activeTab === 'crm' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-700/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Lead Pipeline & Quotation Sales Policies
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rules governing customer quotation validities, follow-up notifications, and permissible business industry categories.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="block text-slate-300 font-semibold">Standard Quotation Validity (Days)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.proposalValidityDays ?? 15}
                onChange={(e) => setSettings({ ...settings, proposalValidityDays: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-sm disabled:opacity-75 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Default expiry window for website proposals sent to clients (typically 15 days).
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="block text-slate-300 font-semibold">Follow-up Reminder Interval (Days)</label>
              <input
                type="number"
                disabled={!isAdmin}
                value={settings.defaultFollowupDays ?? 3}
                onChange={(e) => setSettings({ ...settings, defaultFollowupDays: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-sm disabled:opacity-75 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Frequency for automated follow-up reminders when leads remain in negotiation.
              </p>
            </div>
          </div>

          {/* Discount Policy Info */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-1 text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-blue-300">
              <Info className="w-4 h-4" />
              Sales Discounting Policy (Standard CRM Guardrail)
            </div>
            <p className="text-[11px] text-slate-400">
              Staff & DSA Partners can offer up to a maximum of <strong>15% discount</strong> on website proposals.
              Any discount exceeding 15% requires Admin approval and override.
            </p>
          </div>

          {/* Business Categories List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-white font-semibold text-xs">
                Allowed Business & Industry Categories ({settings.businessCategories?.length || 0})
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings.businessCategories || []).map((cat, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-2"
                >
                  <span>{cat}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (settings.businessCategories || []).filter((_, i) => i !== idx);
                        setSettings({ ...settings, businessCategories: updated });
                      }}
                      className="text-slate-500 hover:text-rose-400 font-bold ml-1"
                      title="Remove Category"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 max-w-sm pt-1">
                <input
                  type="text"
                  placeholder="Add new category (e.g. Travel & Tourism)..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCategory.trim() && !(settings.businessCategories || []).includes(newCategory.trim())) {
                        setSettings({ ...settings, businessCategories: [...(settings.businessCategories || []), newCategory.trim()] });
                        setNewCategory('');
                      }
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCategory.trim() && !(settings.businessCategories || []).includes(newCategory.trim())) {
                      setSettings({ ...settings, businessCategories: [...(settings.businessCategories || []), newCategory.trim()] });
                      setNewCategory('');
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Lead Sources List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-white font-semibold text-xs">
                Standard Lead Acquisition Sources ({settings.leadSources?.length || 0})
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings.leadSources || []).map((src, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg text-xs flex items-center gap-2"
                >
                  <span>{src}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (settings.leadSources || []).filter((_, i) => i !== idx);
                        setSettings({ ...settings, leadSources: updated });
                      }}
                      className="text-slate-500 hover:text-rose-400 font-bold ml-1"
                      title="Remove Lead Source"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2 max-w-sm pt-1">
                <input
                  type="text"
                  placeholder="Add new lead source (e.g. YouTube, Trade Fair)..."
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newSource.trim() && !(settings.leadSources || []).includes(newSource.trim())) {
                        setSettings({ ...settings, leadSources: [...(settings.leadSources || []), newSource.trim()] });
                        setNewSource('');
                      }
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSource.trim() && !(settings.leadSources || []).includes(newSource.trim())) {
                      setSettings({ ...settings, leadSources: [...(settings.leadSources || []), newSource.trim()] });
                      setNewSource('');
                    }
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: DSA Commission & Payout */}
      {activeTab === 'dsa' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                DSA Partner Commission & Payout Schedule
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official commission structure, payment trigger rules, and scheduled monthly payout settlement dates.
              </p>
            </div>
            {onNavigate && (isDsa || isAdmin) && (
              <button
                type="button"
                onClick={() => onNavigate(isDsa ? 'commission' : 'withdrawals')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow"
              >
                {isDsa ? 'View My Commission & Withdrawals' : 'Open Payout Approvals'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="block text-slate-300 font-semibold">Standard DSA Commission Rate (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={settings.dsaCommissionPercentage ?? 10}
                  onChange={(e) => setSettings({ ...settings, dsaCommissionPercentage: Number(e.target.value) })}
                  className="w-32 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-emerald-400 font-mono text-lg font-bold disabled:opacity-75 focus:outline-none focus:border-blue-500"
                />
                <span className="text-sm font-bold text-white">% of Sale Value</span>
              </div>
              <p className="text-[11px] text-slate-400">
                DSA Partners receive <strong>{settings.dsaCommissionPercentage || 10}%</strong> of the net closed website project value.
              </p>
            </div>

            <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-2">
              <label className="block text-slate-300 font-semibold">Scheduled Monthly Withdrawal Dates</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={(settings.dsaWithdrawalDates || [7, 14]).join(', ')}
                onChange={(e) => {
                  const days = e.target.value
                    .split(',')
                    .map((x) => Number(x.trim()))
                    .filter((n) => !isNaN(n) && n >= 1 && n <= 31);
                  setSettings({ ...settings, dsaWithdrawalDates: days });
                }}
                placeholder="7, 14"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-amber-400 font-mono text-lg font-bold disabled:opacity-75 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400">
                Standard payout request days: <strong>{(settings.dsaWithdrawalDates || [7, 14]).join('th & ')}th</strong> of each month.
              </p>
            </div>
          </div>

          {/* Workflow Explanation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                <Clock className="w-4 h-4" />
                1. Pending Status
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When a lead is closed and an advance payment is collected, commission is logged in <strong>Pending</strong> state during development.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                2. Available for Payout
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Once the website is successfully delivered to the customer, the commission automatically switches to <strong>Available Balance</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-700/50 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-400">
                <DollarSign className="w-4 h-4" />
                3. Direct Bank Settlement
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                DSA requests payout on the {(settings.dsaWithdrawalDates || [7, 14]).join('th & ')}th. Admin verifies bank passbook/cheque and releases funds with UTR.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Payment Terms Presets */}
      {activeTab === 'terms' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Quotation & Invoice Payment Terms Presets
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard payment milestone clauses available for 1-click selection inside the Proposal creation form.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleResetPresets}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Restore Standard Presets
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {(settings.paymentTermsPresets || []).map((term, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-xs hover:border-slate-600 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-purple-300 flex items-center justify-center text-xs font-mono font-bold shrink-0 border border-slate-700">
                    {idx + 1}
                  </span>
                  <span className="text-white font-medium leading-relaxed">{term}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(term, `preset-${idx}`)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Copy Preset Clause"
                  >
                    {copiedKey === `preset-${idx}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (settings.paymentTermsPresets || []).filter((_, i) => i !== idx);
                        setSettings({
                          ...settings,
                          paymentTermsPresets: updated,
                          paymentTermsList: updated,
                        });
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Delete Preset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {(!settings.paymentTermsPresets || settings.paymentTermsPresets.length === 0) && (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
                No payment terms presets configured. Click &quot;Restore Standard Presets&quot; or add a new preset below.
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="pt-2">
              <label className="block text-slate-300 font-semibold text-xs mb-2">
                Add Custom Payment Terms Preset
              </label>
              <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                <input
                  type="text"
                  placeholder="e.g. 50% Advance, 50% upon final testing & domain handover..."
                  value={newPaymentTerm}
                  onChange={(e) => setNewPaymentTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newPaymentTerm.trim()) {
                        const updated = [...(settings.paymentTermsPresets || []), newPaymentTerm.trim()];
                        setSettings({
                          ...settings,
                          paymentTermsPresets: updated,
                          paymentTermsList: updated,
                        });
                        setNewPaymentTerm('');
                      }
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white flex-1 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPaymentTerm.trim()) {
                      const updated = [...(settings.paymentTermsPresets || []), newPaymentTerm.trim()];
                      setSettings({
                        ...settings,
                        paymentTermsPresets: updated,
                        paymentTermsList: updated,
                      });
                      setNewPaymentTerm('');
                    }
                  }}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add Preset
                </button>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/50 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              How Presets Work in Proposals
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When creating a new quotation in the Proposals module, selecting any preset automatically populates the
              contract terms and auto-calculates the corresponding advance deposit percentage (e.g. 50%, 40%, or 100%),
              saving time and ensuring milestone consistency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

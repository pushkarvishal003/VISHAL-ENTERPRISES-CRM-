/**
 * Vishal Enterprises CRM - Website Services & Packages Catalog
 * Admin service pricing, feature bundles, transparent web packages,
 * delivery SLAs, and sales/quotation integration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Package,
  Plus,
  Check,
  Edit2,
  Trash2,
  Search,
  Clock,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Server,
  Headphones,
  CreditCard,
  Calendar,
  X,
  Tag,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { WebsiteService, ServicePackage, User } from '../types/crm.ts';
import { fetchApi, formatINR } from '../lib/api.ts';

interface ServicesPackagesManagerProps {
  user: User;
  onNavigate?: (view: string) => void;
  initialTab?: 'services' | 'packages';
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'CORE BUSINESS': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'E-COMMERCE': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'PERSONAL BRANDING': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  'MARKETING': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'EDUCATION': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  'FINANCE & DSA': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'ENTERPRISE': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  'CUSTOM ENGINEERING': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  'MANAGEMENT': { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/20' },
  'DYNAMIC WEB': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  'INTEGRATIONS': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  'REVAMP': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  'SUPPORT': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'ARTIFICIAL INTELLIGENCE': { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
  'BESPOKE': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' },
};

export const ServicesPackagesManager: React.FC<ServicesPackagesManagerProps> = ({
  user,
  onNavigate,
  initialTab = 'services',
}) => {
  const isAdmin = user.role === 'ADMIN';
  const [services, setServices] = useState<WebsiteService[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<WebsiteService | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  // Service Form State
  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'CORE BUSINESS',
    description: '',
    price: 9999,
    basePrice: 9999,
    features: '',
    deliveryDays: 7,
    timeline: '5-7 Days',
    duration: 'Annual',
    status: 'active' as 'active' | 'inactive',
  });

  // Package Form State
  const [pkgForm, setPkgForm] = useState({
    name: '',
    packageId: '',
    subtitle: '',
    badge: '',
    serviceName: 'Business Website',
    suitableFor: '',
    price: 10000,
    features: '',
    pagesIncluded: 10,
    hostingIncluded: '1 Year High-Speed Cloud SSD Hosting',
    supportDuration: '1 Year Priority Support',
    paymentTerms: '50% Advance, 50% on Delivery',
    deliveryTime: '5-7 Days',
    renewalPrice: 3499,
    maintenanceTerms: 'Annual Hosting & Maintenance',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [sData, pData] = await Promise.all([
        fetchApi<WebsiteService[]>('/api/services'),
        fetchApi<ServicePackage[]>('/api/packages'),
      ]);
      setServices(sData || []);
      setPackages(pData || []);
    } catch (e) {
      console.error('Error loading catalog:', e);
    } finally {
      setLoading(false);
    }
  };

  // Distinct categories from actual services
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [services]);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.features.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'ALL' || s.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [services, searchTerm, selectedCategory]);

  // Filtered Packages
  const filteredPackages = useMemo(() => {
    if (!searchTerm.trim()) return packages;
    const q = searchTerm.toLowerCase();
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        p.features.some((f) => f.toLowerCase().includes(q)) ||
        (p.suitableFor && p.suitableFor.some((sf) => sf.toLowerCase().includes(q)))
    );
  }, [packages, searchTerm]);

  // Service Handlers
  const handleOpenNewService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      category: 'CORE BUSINESS',
      description: '',
      price: 9999,
      basePrice: 9999,
      features: 'Up to 10 Custom Pages, Mobile Responsive, Contact Form, WhatsApp Chat, Basic SEO',
      deliveryDays: 7,
      timeline: '5-7 Days',
      duration: 'Annual',
      status: 'active',
    });
    setShowServiceModal(true);
  };

  const handleEditService = (s: WebsiteService) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      category: s.category || 'CORE BUSINESS',
      description: s.description || '',
      price: s.price || s.basePrice || 9999,
      basePrice: s.basePrice || s.price || 9999,
      features: s.features ? s.features.join(', ') : '',
      deliveryDays: s.deliveryDays || 7,
      timeline: s.timeline || '5-7 Days',
      duration: s.duration || 'Annual',
      status: s.status || 'active',
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: serviceForm.name,
        category: serviceForm.category,
        description: serviceForm.description,
        price: Number(serviceForm.price),
        basePrice: Number(serviceForm.price),
        features: serviceForm.features.split(',').map((f) => f.trim()).filter(Boolean),
        deliveryDays: Number(serviceForm.deliveryDays),
        timeline: serviceForm.timeline || `${serviceForm.deliveryDays} Days`,
        duration: serviceForm.duration,
        status: serviceForm.status,
      };

      if (editingService) {
        await fetchApi(`/api/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowServiceModal(false);
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to save service.');
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove the service "${name}"?`)) return;
    try {
      await fetchApi(`/api/services/${id}`, { method: 'DELETE' });
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service.');
    }
  };

  // Package Handlers
  const handleOpenNewPackage = () => {
    setEditingPackage(null);
    setPkgForm({
      name: '',
      packageId: '',
      subtitle: '',
      badge: '',
      serviceName: 'Business Website',
      suitableFor: 'Small businesses, Local shops, Portals',
      price: 10000,
      features: 'Custom Pages, High Speed Hosting, Mobile Responsive, SSL Certificate',
      pagesIncluded: 10,
      hostingIncluded: '1 Year High-Speed Cloud SSD Hosting',
      supportDuration: '1 Year Priority Support',
      paymentTerms: '50% Advance, 50% on Delivery',
      deliveryTime: '5-7 Days',
      renewalPrice: 3499,
      maintenanceTerms: 'Annual Hosting & Maintenance',
      status: 'active',
    });
    setShowPackageModal(true);
  };

  const handleEditPackage = (pkg: ServicePackage) => {
    setEditingPackage(pkg);
    setPkgForm({
      name: pkg.name,
      packageId: pkg.packageId || '',
      subtitle: pkg.subtitle || '',
      badge: pkg.badge || '',
      serviceName: pkg.serviceName || 'Business Website',
      suitableFor: pkg.suitableFor ? pkg.suitableFor.join(', ') : '',
      price: pkg.price,
      features: pkg.features ? pkg.features.join(', ') : '',
      pagesIncluded: pkg.pagesIncluded || 10,
      hostingIncluded: pkg.hostingIncluded || '1 Year High-Speed Cloud SSD Hosting',
      supportDuration: pkg.supportDuration || '1 Year Priority Support',
      paymentTerms: pkg.paymentTerms || '50% Advance, 50% on Delivery',
      deliveryTime: pkg.deliveryTime || '5-7 Days',
      renewalPrice: pkg.renewalPrice || 3499,
      maintenanceTerms: pkg.maintenanceTerms || 'Annual Hosting & Maintenance',
      status: pkg.status || 'active',
    });
    setShowPackageModal(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: pkgForm.name,
        packageId: pkgForm.packageId,
        subtitle: pkgForm.subtitle,
        badge: pkgForm.badge,
        serviceName: pkgForm.serviceName,
        suitableFor: pkgForm.suitableFor.split(',').map((s) => s.trim()).filter(Boolean),
        price: Number(pkgForm.price),
        discount: 0,
        finalPrice: Number(pkgForm.price),
        features: pkgForm.features.split(',').map((f) => f.trim()).filter(Boolean),
        pagesIncluded: Number(pkgForm.pagesIncluded),
        hostingIncluded: pkgForm.hostingIncluded,
        supportDuration: pkgForm.supportDuration,
        paymentTerms: pkgForm.paymentTerms,
        deliveryTime: pkgForm.deliveryTime,
        renewalPrice: Number(pkgForm.renewalPrice),
        maintenanceTerms: pkgForm.maintenanceTerms,
        status: pkgForm.status,
      };

      if (editingPackage) {
        await fetchApi(`/api/packages/${editingPackage.id || editingPackage.packageId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/packages', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowPackageModal(false);
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to save package.');
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove package "${name}"?`)) return;
    try {
      await fetchApi(`/api/packages/${id}`, { method: 'DELETE' });
      await loadCatalog();
    } catch (err: any) {
      alert(err.message || 'Failed to delete package.');
    }
  };

  const handleCreateProposalShortcut = (serviceOrPkgName: string) => {
    if (onNavigate) {
      onNavigate('proposals');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Services & Packages Catalog
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Vishal Enterprises official web design, software development offerings & transparent pricing.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <>
              {activeTab === 'services' ? (
                <button
                  type="button"
                  onClick={handleOpenNewService}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add New Service
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenNewPackage}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add New Package
                </button>
              )}
            </>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('proposals')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Open Proposals
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'services'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 bg-slate-900 border border-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Website Services ({services.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              activeTab === 'packages'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                : 'text-slate-400 bg-slate-900 border border-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Bundled Packages ({packages.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={activeTab === 'services' ? 'Search 15 services...' : 'Search packages...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Category Filter Pills (Only on Services Tab) */}
      {activeTab === 'services' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-slate-200 text-slate-900 font-bold'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            All Categories ({services.length})
          </button>
          {categories.map((cat) => {
            const count = services.filter((s) => s.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Services Grid */}
      {activeTab === 'services' && (
        <>
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-semibold text-sm">No services found</p>
              <p className="text-slate-500 text-xs mt-1">Try modifying your search query or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredServices.map((s) => {
                const catStyle = s.category
                  ? CATEGORY_COLORS[s.category] || { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' }
                  : { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };

                return (
                  <div
                    key={s.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition duration-200"
                  >
                    <div>
                      {/* Top Bar: Category Pill & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {s.category || 'WEBSITE SERVICE'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              s.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                          <span className="text-[11px] font-medium text-slate-400 capitalize">
                            {s.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-base font-bold text-white mt-3 leading-snug">{s.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {s.description || 'Professional end-to-end web engineering with mobile responsive layout and standard delivery.'}
                      </p>

                      {/* Pricing & Timeline Badge */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-slate-400">Starting at</span>
                          <div className="text-xl font-bold text-emerald-400 font-mono tracking-tight">
                            ₹{formatINR(s.price || s.basePrice || 0)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          <span>{s.timeline || `${s.deliveryDays || 7} Days`}</span>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                          Key Deliverables:
                        </div>
                        <ul className="space-y-1.5">
                          {s.features && s.features.length > 0 ? (
                            s.features.slice(0, 6).map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="leading-tight">{feat}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-slate-500 italic">Standard web architecture</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateProposalShortcut(s.name)}
                        className="flex-1 py-2 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Create Quote
                      </button>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditService(s)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                            title="Edit Service"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteService(s.id, s.name)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Delete Service"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Packages Grid (All 4 Transparent Packages from Images) */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Transparent Pricing Packages
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All packages include 1-Year Free Domain & SSD Cloud Hosting, SSL Certificate, WhatsApp Chat Integration, and 1-Year Technical Support.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Hidden Fees
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 50% Advance Terms
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {filteredPackages.map((pkg) => {
              const isPopular = pkg.badge?.includes('POPULAR') || pkg.packageId === 'PKG-BUSINESS' || pkg.id === 'pkg-2';

              return (
                <div
                  key={pkg.id || pkg.packageId}
                  className={`bg-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition duration-200 relative ${
                    isPopular
                      ? 'border-2 border-purple-500/60 shadow-xl shadow-purple-500/10'
                      : 'border border-slate-800 hover:border-slate-700 shadow-lg'
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-lg tracking-wider border border-purple-400/30">
                      ★ MOST POPULAR
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                        {pkg.packageId || 'PACKAGE'}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditPackage(pkg)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                            title="Edit Package"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePackage(pkg.id || pkg.packageId, pkg.name)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded"
                            title="Delete Package"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-white mt-1">{pkg.name}</h4>
                    {pkg.subtitle && (
                      <p className="text-xs text-purple-300/90 font-medium mt-0.5">{pkg.subtitle}</p>
                    )}

                    {/* Big Price */}
                    <div className="mt-4 pt-3 border-t border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white font-mono">
                          ₹{formatINR(pkg.finalPrice || pkg.price)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">+ GST</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Renewal: ₹{formatINR(pkg.renewalPrice || 2499)}/year (Domain, SSL & Hosting)
                      </p>
                    </div>

                    {/* Key Specs Card */}
                    <div className="mt-4 bg-slate-800/60 rounded-xl p-3 space-y-2 border border-slate-700/50 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-400" /> Pages:
                        </span>
                        <span className="font-semibold text-white">Up to {pkg.pagesIncluded || 10} Pages</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" /> Delivery:
                        </span>
                        <span className="font-semibold text-white">{pkg.deliveryTime || '5-7 Days'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Terms:
                        </span>
                        <span className="font-semibold text-emerald-400">{pkg.paymentTerms || '50% Advance'}</span>
                      </div>

                      <div className="pt-1.5 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Server className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate">{pkg.hostingIncluded || '1 Year Cloud SSD Hosting'}</span>
                      </div>
                    </div>

                    {/* Suitable For */}
                    {pkg.suitableFor && pkg.suitableFor.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Ideal For:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.suitableFor.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] rounded-md border border-slate-700/60"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features checklist */}
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                        Included Features:
                      </p>
                      <ul className="space-y-1.5">
                        {pkg.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleCreateProposalShortcut(pkg.name)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                        isPopular
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Generate Proposal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Service */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                {editingService ? 'Edit Website Service' : 'Add New Website Service'}
              </h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Service Name *</label>
                <input
                  type="text"
                  placeholder="e.g. AI-Powered Website"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Category *</label>
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  >
                    <option value="CORE BUSINESS">CORE BUSINESS</option>
                    <option value="E-COMMERCE">E-COMMERCE</option>
                    <option value="PERSONAL BRANDING">PERSONAL BRANDING</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="EDUCATION">EDUCATION</option>
                    <option value="FINANCE & DSA">FINANCE & DSA</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                    <option value="CUSTOM ENGINEERING">CUSTOM ENGINEERING</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                    <option value="DYNAMIC WEB">DYNAMIC WEB</option>
                    <option value="INTEGRATIONS">INTEGRATIONS</option>
                    <option value="REVAMP">REVAMP</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="ARTIFICIAL INTELLIGENCE">ARTIFICIAL INTELLIGENCE</option>
                    <option value="BESPOKE">BESPOKE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Price (₹) *</label>
                  <input
                    type="number"
                    value={serviceForm.price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        price: parseFloat(e.target.value) || 0,
                        basePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Summary of what the client gets with this service..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Delivery SLA (Days)</label>
                  <input
                    type="number"
                    value={serviceForm.deliveryDays}
                    onChange={(e) => {
                      const d = parseInt(e.target.value) || 7;
                      setServiceForm({ ...serviceForm, deliveryDays: d, timeline: `${d} Days` });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Status</label>
                  <select
                    value={serviceForm.status}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, status: e.target.value as 'active' | 'inactive' })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="active">Active & Available</option>
                    <option value="inactive">Inactive / Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  Deliverables & Features (comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={serviceForm.features}
                  onChange={(e) => setServiceForm({ ...serviceForm, features: e.target.value })}
                  placeholder="Up to 10 Custom Pages, Mobile Responsive, Contact Form, WhatsApp Chat, SSL Hosting"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Package */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                {editingPackage ? 'Edit Website Package' : 'Add Bundled Package'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4 text-xs mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Package Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Business Website"
                    value={pkgForm.name}
                    onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Package ID</label>
                  <input
                    type="text"
                    placeholder="e.g. PKG-BUSINESS"
                    value={pkgForm.packageId}
                    onChange={(e) => setPkgForm({ ...pkgForm, packageId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Best Value for Growing Companies"
                    value={pkgForm.subtitle}
                    onChange={(e) => setPkgForm({ ...pkgForm, subtitle: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Badge Highlight</label>
                  <input
                    type="text"
                    placeholder="e.g. ★ MOST POPULAR"
                    value={pkgForm.badge}
                    onChange={(e) => setPkgForm({ ...pkgForm, badge: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Price (₹) *</label>
                  <input
                    type="number"
                    value={pkgForm.price}
                    onChange={(e) => setPkgForm({ ...pkgForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Pages Included</label>
                  <input
                    type="number"
                    value={pkgForm.pagesIncluded}
                    onChange={(e) => setPkgForm({ ...pkgForm, pagesIncluded: parseInt(e.target.value) || 10 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Renewal (₹/yr)</label>
                  <input
                    type="number"
                    value={pkgForm.renewalPrice}
                    onChange={(e) =>
                      setPkgForm({ ...pkgForm, renewalPrice: parseFloat(e.target.value) || 3499 })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Suitable For (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Growing enterprises, Finance & Agencies, Schools & Institutes"
                  value={pkgForm.suitableFor}
                  onChange={(e) => setPkgForm({ ...pkgForm, suitableFor: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Delivery SLA</label>
                  <input
                    type="text"
                    placeholder="e.g. 5-7 Days"
                    value={pkgForm.deliveryTime}
                    onChange={(e) => setPkgForm({ ...pkgForm, deliveryTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. 50% Advance, 50% on Delivery"
                    value={pkgForm.paymentTerms}
                    onChange={(e) => setPkgForm({ ...pkgForm, paymentTerms: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Features (comma-separated)</label>
                <textarea
                  rows={3}
                  value={pkgForm.features}
                  onChange={(e) => setPkgForm({ ...pkgForm, features: e.target.value })}
                  placeholder="Custom Pages, Responsive Luxury UI/UX, Contact & Lead Forms, WhatsApp Live Chat..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/25 transition"
                >
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

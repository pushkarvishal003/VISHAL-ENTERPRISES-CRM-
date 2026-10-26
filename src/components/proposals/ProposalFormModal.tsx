import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Building,
  UserCheck,
  DollarSign,
  Calendar,
  AlertTriangle,
  FileText,
  Percent,
  Sparkles,
} from 'lucide-react';
import {
  Proposal,
  WebsiteService,
  ServicePackage,
  Lead,
  Customer,
  User,
  AdditionalChargeItem,
} from '../../types/crm.ts';
import { fetchApi, formatINR } from '../../lib/api.ts';

interface ProposalFormModalProps {
  user: User;
  initialProposal?: Proposal | null;
  onClose: () => void;
  onSuccess: (savedProposal: Proposal) => void;
}

export const ProposalFormModal: React.FC<ProposalFormModalProps> = ({
  user,
  initialProposal,
  onClose,
  onSuccess,
}) => {
  const isEdit = Boolean(initialProposal);
  const isAdmin = user.role === 'ADMIN';

  // Available data from real backend
  const [services, setServices] = useState<WebsiteService[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Creation mode
  const [creationMode, setCreationMode] = useState<'fresh' | 'lead' | 'customer'>(
    initialProposal?.leadId ? 'lead' : initialProposal?.customerId ? 'customer' : 'fresh'
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialProposal?.leadId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialProposal?.customerId || '');

  // Form fields
  const [businessName, setBusinessName] = useState(initialProposal?.businessName || '');
  const [contactPerson, setContactPerson] = useState(initialProposal?.contactPerson || '');
  const [mobile, setMobile] = useState(initialProposal?.mobile || '');
  const [whatsapp, setWhatsapp] = useState(initialProposal?.whatsapp || '');
  const [email, setEmail] = useState(initialProposal?.email || '');
  const [address, setAddress] = useState(initialProposal?.address || '');
  const [city, setCity] = useState(initialProposal?.city || '');
  const [state, setState] = useState(initialProposal?.state || '');

  // Service & Package
  const [serviceId, setServiceId] = useState(initialProposal?.serviceId || '');
  const [packageId, setPackageId] = useState(initialProposal?.packageId || '');
  const [deliveryTimeline, setDeliveryTimeline] = useState(initialProposal?.deliveryTimeline || '5-7 Working Days');
  const [features, setFeatures] = useState<string[]>(initialProposal?.features || []);
  const [newFeatureInput, setNewFeatureInput] = useState('');

  // Pricing breakdown
  const [basePrice, setBasePrice] = useState<number>(initialProposal?.basePrice || 14999);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeItem[]>(
    initialProposal?.additionalCharges || []
  );
  const [discount, setDiscount] = useState<number>(initialProposal?.discount || 0);
  const [taxRate, setTaxRate] = useState<number>(initialProposal?.taxRate ?? 18);
  const [advancePercent, setAdvancePercent] = useState<number>(initialProposal?.advancePaymentPercent ?? 50);

  // Terms & Validity
  const [validityDays, setValidityDays] = useState<number>(15);
  const [paymentTerms, setPaymentTerms] = useState(
    initialProposal?.paymentTerms || '50% Advance upon initiation, 50% on Final Website Delivery & Domain Pointing'
  );
  const [paymentPresets, setPaymentPresets] = useState<string[]>([
    '50% Advance upon initiation, 50% on Final Website Delivery & Domain Pointing',
    '40% Advance, 40% on Beta Design Approval, 20% on Final Delivery',
    '100% Full Advance Payment (5% Instant Settlement Discount Included)',
    '30% Advance, 40% Development Milestone, 30% Delivery & Handover',
  ]);
  const [appliedPresetNotice, setAppliedPresetNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialProposal?.notes || '');

  // Staff/DSA Assignment (Admin only)
  const [assignedPartnerId, setAssignedPartnerId] = useState(
    initialProposal?.assignedDsaId || initialProposal?.assignedStaffId || (isAdmin ? '' : user.userId)
  );

  // Load backend catalog, leads/customers, and system settings presets
  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [servRes, pkgRes, leadsRes, custsRes, settingsRes] = await Promise.all([
          fetchApi<WebsiteService[]>('/api/services').catch(() => []),
          fetchApi<ServicePackage[]>('/api/packages').catch(() => []),
          fetchApi<Lead[]>('/api/leads').catch(() => []),
          fetchApi<Customer[]>('/api/customers').catch(() => []),
          fetchApi<any>('/api/settings').catch(() => null),
        ]);

        setServices(servRes || []);
        setPackages(pkgRes || []);
        setLeads(leadsRes || []);
        setCustomers(custsRes || []);

        if (settingsRes?.paymentTermsPresets && Array.isArray(settingsRes.paymentTermsPresets) && settingsRes.paymentTermsPresets.length > 0) {
          setPaymentPresets(settingsRes.paymentTermsPresets);
          if (!initialProposal) {
            setPaymentTerms(settingsRes.paymentTermsPresets[0]);
          }
        }
        if (!initialProposal && settingsRes?.proposalValidityDays) {
          setValidityDays(settingsRes.proposalValidityDays);
        }

        if (isAdmin) {
          const usersRes = await fetchApi<User[]>('/api/admin/users').catch(() => []);
          const partners = (usersRes || []).filter((u) => u.role === 'STAFF' || u.role === 'DSA');
          setStaffUsers(partners);
        }

        // If creating fresh and services exist, default to first service
        if (!initialProposal && servRes && servRes.length > 0 && !serviceId) {
          const firstServ = servRes[0];
          setServiceId(firstServ.id);
          setBasePrice(firstServ.price || 14999);
          setFeatures(firstServ.features || []);
          if (firstServ.timeline) setDeliveryTimeline(firstServ.timeline);
        }
      } catch (err: any) {
        console.error('Error loading proposal dependencies:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [isAdmin, initialProposal]);

  const handleApplyPaymentPreset = (presetText: string) => {
    if (!presetText) return;
    setPaymentTerms(presetText);

    // Auto-detect advance payment percentage from the preset text
    if (presetText.includes('100%')) {
      setAdvancePercent(100);
    } else if (presetText.includes('50%')) {
      setAdvancePercent(50);
    } else if (presetText.includes('40%')) {
      setAdvancePercent(40);
    } else if (presetText.includes('30%')) {
      setAdvancePercent(30);
    } else if (presetText.includes('25%')) {
      setAdvancePercent(25);
    }

    const shortSnippet = presetText.length > 40 ? presetText.slice(0, 40) + '...' : presetText;
    setAppliedPresetNotice(`Preset Applied: "${shortSnippet}"`);
    setTimeout(() => setAppliedPresetNotice(null), 3000);
  };

  // Handle lead selection
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId || l.leadId === leadId);
    if (lead) {
      setBusinessName(lead.businessName || '');
      setContactPerson(lead.ownerName || '');
      setMobile(lead.mobile || '');
      setWhatsapp(lead.whatsapp || lead.mobile || '');
      setEmail(lead.email || '');
      setAddress(lead.address || '');
      setCity(lead.city || '');
      setState(lead.state || '');
      if (lead.notes) setNotes(lead.notes);
    }
  };

  // Handle customer selection
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find((c) => c.id === custId || c.customerId === custId);
    if (cust) {
      setBusinessName(cust.businessName || '');
      setContactPerson(cust.ownerName || '');
      setMobile(cust.mobile || '');
      setWhatsapp(cust.whatsapp || cust.mobile || '');
      setEmail(cust.email || '');
      setAddress(cust.address || '');
      setCity(cust.city || '');
      setState(cust.state || '');
    }
  };

  // Handle service change
  const handleServiceChange = (sId: string) => {
    setServiceId(sId);
    setPackageId(''); // reset package
    const s = services.find((x) => x.id === sId);
    if (s) {
      setBasePrice(s.price || s.basePrice || 9999);
      setFeatures(s.features || []);
      if (s.timeline) setDeliveryTimeline(s.timeline);
    }
  };

  // Handle package change
  const handlePackageChange = (pId: string) => {
    setPackageId(pId);
    if (!pId) {
      const s = services.find((x) => x.id === serviceId);
      if (s) {
        setBasePrice(s.price || s.basePrice || 9999);
        setFeatures(s.features || []);
        if (s.timeline) setDeliveryTimeline(s.timeline);
      }
      return;
    }
    const p = packages.find((x) => x.id === pId || x.packageId === pId);
    if (p) {
      setBasePrice(p.price);
      if (p.features && p.features.length > 0) {
        setFeatures(p.features);
      }
      if (p.deliveryTime) setDeliveryTimeline(p.deliveryTime);
      if (p.paymentTerms) setPaymentTerms(p.paymentTerms);
    }
  };

  // Features tag management
  const handleAddFeature = () => {
    if (!newFeatureInput.trim()) return;
    setFeatures([...features, newFeatureInput.trim()]);
    setNewFeatureInput('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  // Additional charges / add-ons management
  const handleAddChargeItem = () => {
    setAdditionalCharges([
      ...additionalCharges,
      {
        id: `add-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: 'Payment Gateway Integration',
        amount: 2500,
      },
    ]);
  };

  const handleUpdateChargeItem = (id: string, field: 'description' | 'amount', val: any) => {
    setAdditionalCharges(
      additionalCharges.map((item) =>
        item.id === id ? { ...item, [field]: field === 'amount' ? Number(val) || 0 : val } : item
      )
    );
  };

  const handleRemoveChargeItem = (id: string) => {
    setAdditionalCharges(additionalCharges.filter((item) => item.id !== id));
  };

  // Calculations
  const addChargesSum = additionalCharges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const quotedAmount = Number(basePrice || 0) + addChargesSum;

  // Max discount for Staff/DSA is 15% of quoted amount
  const maxDiscountAllowed = !isAdmin ? Math.round(quotedAmount * 0.15) : quotedAmount;
  const isDiscountExceeded = !isAdmin && discount > maxDiscountAllowed;

  const taxableAmount = Math.max(0, quotedAmount - Number(discount || 0));
  const calculatedTax = Math.round(taxableAmount * (Number(taxRate || 0) / 100));
  const finalAmount = taxableAmount + calculatedTax;

  const advanceAmount = Math.round(finalAmount * (Number(advancePercent || 50) / 100));
  const balanceAmount = Math.max(0, finalAmount - advanceAmount);

  // Form submission
  const handleSubmit = async (targetStatus: 'Draft' | 'Sent') => {
    if (!businessName.trim() || !contactPerson.trim() || !mobile.trim()) {
      setError('Business Name, Contact Person, and Mobile Number are required.');
      return;
    }

    if (isDiscountExceeded) {
      setError(`Discount cannot exceed 15% (₹${maxDiscountAllowed}) for Staff and DSA accounts.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const selectedService = services.find((s) => s.id === serviceId);
    const selectedPkg = packages.find((p) => p.id === packageId || p.packageId === packageId);

    // Calculate valid until date
    const validUntilDate = new Date(Date.now() + validityDays * 86400000).toISOString().split('T')[0];

    // Assignment
    let assignedStaffId: string | undefined = undefined;
    let assignedStaffName: string | undefined = undefined;
    let assignedDsaId: string | undefined = undefined;
    let assignedDsaName: string | undefined = undefined;

    if (assignedPartnerId) {
      const partner = staffUsers.find((u) => u.userId === assignedPartnerId);
      if (partner?.role === 'DSA' || user.role === 'DSA') {
        assignedDsaId = partner ? partner.userId : user.userId;
        assignedDsaName = partner ? partner.fullName : user.fullName;
      } else {
        assignedStaffId = partner ? partner.userId : user.userId;
        assignedStaffName = partner ? partner.fullName : user.fullName;
      }
    } else if (user.role === 'STAFF') {
      assignedStaffId = user.userId;
      assignedStaffName = user.fullName;
    } else if (user.role === 'DSA') {
      assignedDsaId = user.userId;
      assignedDsaName = user.fullName;
    }

    const payload = {
      leadId: creationMode === 'lead' ? selectedLeadId || undefined : undefined,
      customerId: creationMode === 'customer' ? selectedCustomerId || undefined : undefined,
      businessName,
      contactPerson,
      mobile,
      whatsapp: whatsapp || mobile,
      email,
      address,
      city,
      state,
      serviceId: serviceId || 'srv-1',
      serviceName: selectedService?.name || 'Business Website Development',
      packageId: packageId || undefined,
      packageName: selectedPkg?.name || undefined,
      deliveryTimeline,
      features,
      basePrice,
      additionalCharges,
      quotedAmount,
      discount,
      taxRate,
      taxAmount: calculatedTax,
      finalAmount,
      advancePaymentPercent: advancePercent,
      advancePaymentAmount: advanceAmount,
      balanceAmount,
      paymentTerms,
      validUntil: validUntilDate,
      notes,
      assignedStaffId,
      assignedStaffName,
      assignedDsaId,
      assignedDsaName,
      status: targetStatus,
    };

    try {
      let saved: Proposal;
      if (isEdit && initialProposal) {
        saved = await fetchApi<Proposal>(`/api/proposals/${initialProposal.id || initialProposal.proposalId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        saved = await fetchApi<Proposal>('/api/proposals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to save proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPackages = packages.filter((p) => !serviceId || p.serviceId === serviceId);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full text-slate-200 shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              {isEdit ? `Edit Proposal: ${initialProposal?.proposalId}` : 'Create Website Development Quotation'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive real quotation engine with automated pricing, tax, and delivery terms
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Creation Mode & Source */}
          {!isEdit && (
            <div className="space-y-3 pb-4 border-b border-slate-800">
              <label className="block text-xs font-semibold text-slate-300">Proposal Source</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode('fresh')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition ${
                    creationMode === 'fresh'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Fresh Client Quotation
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('lead')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition ${
                    creationMode === 'lead'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  From CRM Lead ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('customer')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition ${
                    creationMode === 'customer'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  From Existing Customer ({customers.length})
                </button>
              </div>

              {creationMode === 'lead' && (
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                  <label className="block text-slate-400 mb-1">Select Target Lead *</label>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => handleSelectLead(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Choose Lead to Auto-Populate Details --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.leadId || l.id}>
                        {l.leadId} - {l.businessName} ({l.ownerName} • {l.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {creationMode === 'customer' && (
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                  <label className="block text-slate-400 mb-1">Select Existing Customer *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Choose Customer to Auto-Populate Details --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.customerId || c.id}>
                        {c.customerId} - {c.businessName} ({c.ownerName} • {c.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Client Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              Client & Business Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Business / Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Hospital & Diagnostics"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Verma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  placeholder="Defaults to Mobile"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. contact@apex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-400 mb-1">Address / Street</label>
                <input
                  type="text"
                  placeholder="Plot/Shop No., Street Name"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">City & State</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Website Service & Package Selection */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Website Service & Feature Inclusions
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Website Service *</label>
                <select
                  value={serviceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-medium focus:border-blue-500 focus:outline-none"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.category ? `[${s.category}] ` : ''}{s.name} — ₹{formatINR(s.price || s.basePrice || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Package Tier (Optional)</label>
                <select
                  value={packageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Custom / Standalone Service Pricing --</option>
                  {packages.map((p) => (
                    <option key={p.id || p.packageId} value={p.id || p.packageId}>
                      {p.name} {p.badge ? `(${p.badge}) ` : ''}— ₹{formatINR(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Guaranteed Delivery Timeline</label>
                <input
                  type="text"
                  placeholder="e.g. 5-7 Working Days"
                  value={deliveryTimeline}
                  onChange={(e) => setDeliveryTimeline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Inclusions / Scope Tags */}
            <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
              <span className="font-semibold text-slate-300">Deliverable Features & Scope:</span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/80 text-slate-200 border border-slate-600 text-[11px]"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{feat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="hover:text-rose-400 ml-1 text-slate-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add custom feature tag */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add custom feature (e.g., WhatsApp Chat Widget, SSL Certificate, SEO)"
                  value={newFeatureInput}
                  onChange={(e) => setNewFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-[11px] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-medium"
                >
                  + Add Inclusion
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Commercial Pricing Breakdown */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Commercial Pricing & Financial Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Column: Base & Add-ons */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">Base Package Price (₹) *</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono font-semibold"
                    required
                  />
                </div>

                {/* Additional Add-on Line Items */}
                <div className="border border-slate-700/80 rounded-xl p-3 bg-slate-800/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-300">Custom Add-on Modules</span>
                    <button
                      type="button"
                      onClick={handleAddChargeItem}
                      className="text-blue-400 hover:text-blue-300 text-[11px] font-medium"
                    >
                      + Add Item
                    </button>
                  </div>

                  {additionalCharges.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No additional custom charges added.</p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {additionalCharges.map((item) => (
                        <div key={item.id} className="flex gap-2 items-center bg-slate-900 p-2 rounded-lg border border-slate-700">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateChargeItem(item.id, 'description', e.target.value)}
                            placeholder="Add-on title"
                            className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) => handleUpdateChargeItem(item.id, 'amount', e.target.value)}
                              className="w-20 bg-slate-800 border border-slate-700 rounded p-1 text-white font-mono text-right"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveChargeItem(item.id)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Discount, GST, & Calculated Net */}
              <div className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Quoted Total (Base + Add-ons):</span>
                  <span className="font-mono font-bold text-white">₹{formatINR(quotedAmount)}</span>
                </div>

                {/* Discount */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400">Promotional Discount (₹)</label>
                    {!isAdmin && (
                      <span className="text-[10px] text-amber-400">Max 15% (₹{formatINR(maxDiscountAllowed)})</span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className={`w-full bg-slate-950 border rounded-lg p-2 text-white font-mono ${
                      isDiscountExceeded ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
                    }`}
                  />
                  {isDiscountExceeded && (
                    <p className="text-[10px] text-rose-400 mt-0.5">
                      Staff/DSA discount cap of 15% exceeded.
                    </p>
                  )}
                </div>

                {/* Tax / GST */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Tax Rate (GST)</label>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    >
                      <option value={0}>0% (Tax Exempt)</option>
                      <option value={18}>18% GST (Standard)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Tax Amount (₹)</label>
                    <input
                      type="text"
                      disabled
                      value={`₹${formatINR(calculatedTax)}`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono"
                    />
                  </div>
                </div>

                {/* Final Net Quoted Amount */}
                <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/40 flex justify-between items-center">
                  <div>
                    <span className="block text-[11px] font-semibold text-emerald-400 uppercase">
                      Final Agreed Amount:
                    </span>
                    <span className="text-[10px] text-slate-400">Including taxes and discounts</span>
                  </div>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    ₹{formatINR(finalAmount)}
                  </span>
                </div>

                {/* Advance & Balance Split */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Advance ({advancePercent}%):</span>
                    <span className="font-mono font-bold text-blue-400">₹{formatINR(advanceAmount)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Balance on Delivery:</span>
                    <span className="font-mono font-bold text-slate-300">₹{formatINR(balanceAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Terms, Validity & Assignment */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Validity, Terms & Assignment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Validity Period (Days)</label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 15)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value={7}>7 Days from creation</option>
                  <option value={15}>15 Days (Recommended standard)</option>
                  <option value={30}>30 Days (1 Month)</option>
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-slate-400 mb-1">Assign Partner / Representative</label>
                  <select
                    value={assignedPartnerId}
                    onChange={(e) => setAssignedPartnerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="">-- Unassigned / Direct Company --</option>
                    {staffUsers.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.fullName} ({u.role} • {u.userId})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="block text-slate-300 font-semibold text-xs">
                  Payment & Milestone Terms *
                </label>
                {appliedPresetNotice && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {appliedPresetNotice}
                  </span>
                )}
              </div>

              {/* Quick Preset Selector */}
              <div className="p-3 bg-slate-950/80 border border-slate-700/80 rounded-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-purple-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    Payment Terms Presets (Click or Select to Apply)
                  </span>
                  <select
                    id="payment-terms-preset-dropdown"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyPaymentPreset(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-slate-900 border border-purple-500/40 text-purple-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-400 cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>⚡ Choose Preset from Settings...</option>
                    {paymentPresets.map((preset, pIdx) => (
                      <option key={pIdx} value={preset}>
                        Preset {pIdx + 1}: {preset.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick-select Preset Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {paymentPresets.map((preset, pIdx) => {
                    const isSelected = paymentTerms.trim() === preset.trim();
                    return (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleApplyPaymentPreset(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition text-left flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-purple-600/30 text-purple-200 border-purple-500 font-semibold shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-purple-500/50 hover:text-white'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-purple-300 flex items-center justify-center text-[10px] font-mono shrink-0">
                          {pIdx + 1}
                        </span>
                        <span className="line-clamp-1 max-w-[260px]">
                          {preset}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                id="proposal-payment-terms-textarea"
                rows={2}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Enter customized payment terms or select from presets above..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-blue-500 leading-relaxed"
                required
              />
              <span className="text-[10px] text-slate-500 block">
                Selecting a preset automatically sets the contract clause and adjusts the Advance Payment % slider above. Text remains fully editable.
              </span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Special Inclusions / Notes</label>
              <textarea
                rows={2}
                placeholder="Specific client instructions, custom page lists, or domain preferences..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 rounded-b-2xl flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            <button
              id="save-proposal-draft-btn"
              type="button"
              onClick={() => handleSubmit('Draft')}
              disabled={submitting || isDiscountExceeded}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              id="save-and-send-proposal-btn"
              type="button"
              onClick={() => handleSubmit('Sent')}
              disabled={submitting || isDiscountExceeded}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
            >
              {submitting ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>Save & Mark as Sent</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

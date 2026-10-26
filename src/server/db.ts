/**
 * Vishal Enterprises CRM - Database & Persistence Layer
 * File-based atomic JSON storage with cryptographic security
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Lead,
  Customer,
  FollowUp,
  Sale,
  Proposal,
  Payment,
  WebsiteProject,
  WebsiteService,
  ServicePackage,
  AttendanceRecord,
  StaffKyc,
  DsaKyc,
  DsaAgreement,
  WithdrawalRequest,
  StaffTarget,
  WebsiteRenewal,
  StaffReferral,
  StaffRequest,
  StaffComplaint,
  AuditLog,
  NotificationItem,
  UserRole,
  UserPermissions,
  DataScope,
  CommissionRecord,
  CrmSettings,
  StaffPayrollRecord,
} from '../types/crm.ts';

export interface Session {
  token: string;
  userId: string;
  role: UserRole;
  createdAt: number;
  expiresAt: number;
}

export interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  leads: Lead[];
  customers: Customer[];
  followups: FollowUp[];
  sales: Sale[];
  proposals: Proposal[];
  payments: Payment[];
  projects: WebsiteProject[];
  services: WebsiteService[];
  packages: ServicePackage[];
  attendance: AttendanceRecord[];
  staffKyc: StaffKyc[];
  dsaKyc: DsaKyc[];
  dsaAgreements: DsaAgreement[];
  withdrawals: WithdrawalRequest[];
  targets: StaffTarget[];
  renewals: WebsiteRenewal[];
  staffReferrals: StaffReferral[];
  requests: StaffRequest[];
  complaints: StaffComplaint[];
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  commissions: CommissionRecord[];
  payroll: StaffPayrollRecord[];
  settings: CrmSettings;
  failedLoginAttempts: Record<string, { count: number; lockedUntil: number }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'crm_db.json');

// Cryptographic helpers
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, finalSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: finalSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash, 'hex'), Buffer.from(hash, 'hex'));
}

export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, finalSalt, 50000, 32, 'sha256').toString('hex');
  return { hash, salt: finalSalt };
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const result = hashPin(pin, salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash, 'hex'), Buffer.from(hash, 'hex'));
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getDefaultStaffPermissions(): UserPermissions {
  return {
    dataScope: 'own',
    modules: {
      dashboard: { view: true, add: false, edit: false, delete: false },
      leads: { view: true, add: true, edit: true, delete: false },
      customers: { view: true, add: true, edit: true, delete: false },
      followups: { view: true, add: true, edit: true, delete: false },
      sales: { view: true, add: true, edit: false, delete: false },
      proposals: { view: true, add: true, edit: true, delete: false },
      payments: { view: true, add: true, edit: false, delete: false },
      projects: { view: true, add: false, edit: true, delete: false },
      attendance: { view: true, add: true, edit: false, delete: false },
      services: { view: true, add: false, edit: false, delete: false },
      packages: { view: true, add: false, edit: false, delete: false },
      renewals: { view: true, add: false, edit: false, delete: false },
      referrals: { view: true, add: true, edit: false, delete: false },
      requests: { view: true, add: true, edit: false, delete: false },
      complaints: { view: true, add: true, edit: false, delete: false },
      kyc: { view: true, add: true, edit: true, delete: false },
      notifications: { view: true, add: false, edit: false, delete: false },
    },
  };
}

export function getDefaultDsaPermissions(): UserPermissions {
  return {
    dataScope: 'own',
    modules: {
      dashboard: { view: true, add: false, edit: false, delete: false },
      leads: { view: true, add: true, edit: true, delete: false },
      proposals: { view: true, add: true, edit: true, delete: false },
      sales: { view: true, add: true, edit: false, delete: false },
      customers: { view: true, add: true, edit: false, delete: false },
      services: { view: true, add: false, edit: false, delete: false },
      commission: { view: true, add: false, edit: false, delete: false },
      withdrawals: { view: true, add: true, edit: false, delete: false },
      kyc: { view: true, add: true, edit: true, delete: false },
      notifications: { view: true, add: false, edit: false, delete: false },
    },
    permittedServices: [
      'srv-1', 'srv-2', 'srv-3', 'srv-4', 'srv-5',
      'srv-6', 'srv-7', 'srv-8', 'srv-9', 'srv-10',
      'srv-11', 'srv-12', 'srv-13', 'srv-14', 'srv-15'
    ],
  };
}

export function getInitialServices(): WebsiteService[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'srv-1',
      name: 'Business Website',
      category: 'CORE BUSINESS',
      description: 'Professional multi-page website to establish brand credibility and attract clients online.',
      features: [
        'Up to 10 Custom Pages',
        'Mobile & Tablet Responsive',
        'Contact & Lead Form',
        'WhatsApp Live Chat Integration',
        'Google Maps & Location Integration',
        'Basic On-Page SEO Setup',
      ],
      price: 9999,
      basePrice: 9999,
      discount: 0,
      duration: 'Annual',
      timeline: '5-7 Days',
      deliveryDays: 7,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-2',
      name: 'Landing Page',
      category: 'MARKETING',
      description: 'High-converting single page designed for ad campaigns, products, or marketing promos.',
      features: [
        'Single High-Impact Converting Layout',
        'Hero Call to Action & Lead Form',
        'Fast Loading Speed Optimization',
        'WhatsApp Direct Enquiry Button',
        'Analytics & Pixel Setup Ready',
        '100% Mobile Optimized',
      ],
      price: 4999,
      basePrice: 4999,
      discount: 0,
      duration: 'Annual',
      timeline: '2-3 Days',
      deliveryDays: 3,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-3',
      name: 'E-commerce Website',
      category: 'E-COMMERCE',
      description: 'Complete online store with product catalog, shopping cart, and online payment gateways.',
      features: [
        'Product Management & Categories',
        'Shopping Cart & Checkout Flow',
        'Razorpay / UPI Payment Gateway Integration',
        'Order Confirmation via Email/SMS',
        'Customer Accounts & Order History',
        'Inventory & Coupon Management',
      ],
      price: 19999,
      basePrice: 19999,
      discount: 0,
      duration: 'Annual',
      timeline: '10-14 Days',
      deliveryDays: 14,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-4',
      name: 'School/Institute Website',
      category: 'EDUCATION',
      description: 'Official web portal for schools, colleges, coaching institutes, and universities.',
      features: [
        'Course Catalog & Fee Structure',
        'Online Admission Enquiry Form',
        'Student Notice Board & Circulars',
        'Faculty & Infrastructure Gallery',
        'Parent Enquiry & WhatsApp Desk',
        'Result & Exam Announcement Banner',
      ],
      price: 14999,
      basePrice: 14999,
      discount: 0,
      duration: 'Annual',
      timeline: '7-10 Days',
      deliveryDays: 10,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-5',
      name: 'Portfolio Website',
      category: 'PERSONAL BRANDING',
      description: 'Showcase your work, achievements, photo gallery, and resume with elegant aesthetics.',
      features: [
        'Interactive Project Gallery',
        'Downloadable CV / PDF Attachment',
        'Custom Hero Section & About Me',
        'Client Testimonials & Feedback',
        'Social Media Connections',
        'Fast Dark/Light Mode Styling',
      ],
      price: 6999,
      basePrice: 6999,
      discount: 0,
      duration: 'Annual',
      timeline: '3-5 Days',
      deliveryDays: 5,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-6',
      name: 'Loan/Finance Website',
      category: 'FINANCE & DSA',
      description: 'Specialized portal for DSA, loan agencies, and financial services with EMI calculators.',
      features: [
        'Interactive Loan EMI Calculator',
        'CIBIL Score Redirection / Check Page',
        'Loan Eligibility Check Form',
        'Document Verification Guide',
        'Direct Banking Partner Grid',
        'DSA / Agent Partnership Form',
      ],
      price: 12999,
      basePrice: 12999,
      discount: 0,
      duration: 'Annual',
      timeline: '6-8 Days',
      deliveryDays: 8,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-7',
      name: 'CRM Dashboard',
      category: 'ENTERPRISE',
      description: 'Streamlined customer relationship management dashboard to track leads and sales teams.',
      features: [
        'Lead Status Pipeline (New, Contacted, Won, Lost)',
        'Customer Records & Contact Logs',
        'Role-based Access (Admin, Manager, Staff)',
        'Sales Reports & Visual Analytics',
        'Export Data to Excel / CSV',
        'Follow-up Reminders & Notifications',
      ],
      price: 24999,
      basePrice: 24999,
      discount: 0,
      duration: 'Annual',
      timeline: '14-18 Days',
      deliveryDays: 18,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-8',
      name: 'Custom Web Application',
      category: 'CUSTOM ENGINEERING',
      description: 'Bespoke web application tailored to your exact business workflow and data logic.',
      features: [
        'Tailor-made Business Logic',
        'Scalable Database & API Layer',
        'User Authentication & Roles',
        'Interactive Controls & Real-time Updates',
        'Custom Reports & PDF Exports',
        'Complete Source Code Ownership',
      ],
      price: 29999,
      basePrice: 29999,
      discount: 0,
      duration: 'Annual',
      timeline: '20-30 Days',
      deliveryDays: 30,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-9',
      name: 'Admin Panel',
      category: 'MANAGEMENT',
      description: 'Centralized admin management dashboard to update site content, users, and settings.',
      features: [
        'Secure Admin Password Login',
        'Content & Banner Management',
        'User / Customer List View',
        'Status Updates & Activity Logs',
        'Search & Filter Records',
        'Mobile Friendly Admin Interface',
      ],
      price: 11999,
      basePrice: 11999,
      discount: 0,
      duration: 'Annual',
      timeline: '5-7 Days',
      deliveryDays: 7,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-10',
      name: 'Database-Based Website',
      category: 'DYNAMIC WEB',
      description: 'Dynamic website backed by PostgreSQL or Firestore database for live data storage.',
      features: [
        'Structured Database Schema',
        'CRUD Operations (Create, Read, Update, Delete)',
        'Search & Multi-filter Capabilities',
        'High Speed Data Indexing',
        'Automated Daily Backups',
        'Secure User Authorization',
      ],
      price: 15999,
      basePrice: 15999,
      discount: 0,
      duration: 'Annual',
      timeline: '8-12 Days',
      deliveryDays: 12,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-11',
      name: 'API Integration',
      category: 'INTEGRATIONS',
      description: 'Connect third-party APIs (Payment Gateway, WhatsApp, SMS, AI, Google Maps) to your app.',
      features: [
        'WhatsApp API / Webhook Integration',
        'SMS Gateway Setup (DLT Compliant)',
        'Razorpay / PayTM / PhonePe Integration',
        'Email Notification Services',
        'Google Maps & Location APIs',
        'Custom REST API Consumption',
      ],
      price: 4999,
      basePrice: 4999,
      discount: 0,
      duration: 'Annual',
      timeline: '2-4 Days',
      deliveryDays: 4,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-12',
      name: 'Website Redesign',
      category: 'REVAMP',
      description: 'Modernize your old or outdated website into a fast, beautiful, high-converting portal.',
      features: [
        'Modern Luxe UI/UX Overhaul',
        '100% Mobile Responsive Layout',
        'Speed Optimization & Code Clean up',
        'Content Organization & Restructuring',
        'Enhanced Lead Capture & CTAs',
        'SEO Migration & Meta Tags',
      ],
      price: 7999,
      basePrice: 7999,
      discount: 0,
      duration: 'Annual',
      timeline: '4-6 Days',
      deliveryDays: 6,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-13',
      name: 'Website Maintenance',
      category: 'SUPPORT',
      description: 'Regular security updates, bug fixes, content additions, and performance monitoring.',
      features: [
        'Monthly Backup & Security Audits',
        'Text & Image Content Updates',
        'Uptime Monitoring & Speed Checks',
        'Bug Fixes & Technical Troubleshooting',
        'Domain & Hosting Renewal Tracking',
        'Priority Developer Phone Support',
      ],
      price: 2999,
      basePrice: 2999,
      discount: 0,
      duration: 'Monthly',
      timeline: 'Ongoing',
      deliveryDays: 30,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-14',
      name: 'AI-Powered Website',
      category: 'ARTIFICIAL INTELLIGENCE',
      description: 'Integrate AI chatbots, automated content generators, or smart recommendation engines.',
      features: [
        'Smart Customer Support AI Chatbot',
        'AI Document Summarizer or Generator',
        'Automated Customer Qualification',
        'Gemini / OpenAI API Integration',
        'Context-aware Business Responses',
        'Smart Analytics Dashboard',
      ],
      price: 21999,
      basePrice: 21999,
      discount: 0,
      duration: 'Annual',
      timeline: '10-14 Days',
      deliveryDays: 14,
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'srv-15',
      name: 'Custom Website Development',
      category: 'BESPOKE',
      description: 'Complete end-to-end full-stack web project built strictly to your specific scope & budget.',
      features: [
        'Full Technical Consultation & Scope',
        'Bespoke UI/UX Design Prototypes',
        'Full-Stack Architecture (Frontend + Backend)',
        'Rigorous Security & Penetration Testing',
        'Dedicated Developer Contact',
        'Post-Launch Training & Documentation',
      ],
      price: 24999,
      basePrice: 24999,
      discount: 0,
      duration: 'Annual',
      timeline: '15-25 Days',
      deliveryDays: 25,
      status: 'active',
      active: true,
      createdAt: now,
    },
  ];
}

export function getInitialPackages(): ServicePackage[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'pkg-1',
      packageId: 'PKG-STARTER',
      name: 'Starter Website',
      subtitle: 'Ideal for Small & Local Businesses',
      serviceId: 'srv-1',
      serviceName: 'Business Website',
      suitableFor: ['Small businesses', 'Personal websites', 'Local shops & services'],
      features: [
        'Responsive mobile-friendly design',
        'Up to 5 Custom Pages',
        'Interactive Contact Form',
        'WhatsApp Direct Chat Button',
        'Basic On-Page SEO Setup',
        'Fast Loading Speed',
      ],
      price: 5000,
      discount: 0,
      finalPrice: 5000,
      pagesIncluded: 5,
      hostingIncluded: '1 Year Free SSL & Fast SSD Hosting',
      supportDuration: '1 Year Technical Support',
      paymentTerms: '50% Advance, 50% on Delivery',
      deliveryTime: '3-5 Days',
      renewalPrice: 2499,
      maintenanceTerms: 'Annual Domain & Hosting Renewal with SSL',
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'pkg-2',
      packageId: 'PKG-BUSINESS',
      name: 'Business Website',
      subtitle: 'Best Value for Growing Companies',
      badge: '★ MOST POPULAR',
      serviceId: 'srv-1',
      serviceName: 'Business Website',
      suitableFor: ['Growing enterprises', 'Finance & Agencies', 'Schools & Institutes'],
      features: [
        'Up to 10 Custom Pages',
        'Professional Luxury UI/UX',
        'Contact & Lead Capture Forms',
        'WhatsApp Live Chat Integration',
        'Basic On-Page SEO & Meta Tags',
        'Admin functionality where required',
        'Database integration if required',
      ],
      price: 10000,
      discount: 0,
      finalPrice: 10000,
      pagesIncluded: 10,
      hostingIncluded: '1 Year High-Speed Cloud SSD Hosting',
      supportDuration: '1 Year Priority Support & Content Updates',
      paymentTerms: '50% Advance, 50% on Delivery',
      deliveryTime: '5-7 Days',
      renewalPrice: 3499,
      maintenanceTerms: 'Annual Hosting, Domain, SSL & Security Patches',
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'pkg-3',
      packageId: 'PKG-PROFESSIONAL',
      name: 'Professional Website',
      subtitle: 'Complete Web Portal with Admin Control',
      serviceId: 'srv-3',
      serviceName: 'E-commerce Website',
      suitableFor: ['Established Businesses', 'E-commerce Stores', 'Service Portals'],
      features: [
        'Custom High-End Design',
        'Advanced Multi-Page Layouts',
        'Full Admin Management Panel',
        'Database Integration (PostgreSQL/Firestore)',
        'User Login & Auth System',
        'API Integration (Payment/SMS/Email)',
        'Advanced Functionality & Security',
      ],
      price: 20000,
      discount: 0,
      finalPrice: 20000,
      pagesIncluded: 20,
      hostingIncluded: 'Dedicated High-Performance Cloud VPS',
      supportDuration: '1 Year Full Maintenance & Bug Fixes',
      paymentTerms: '50% Advance, 50% on Delivery',
      deliveryTime: '10-14 Days',
      renewalPrice: 4999,
      maintenanceTerms: 'Annual Cloud Infrastructure & Technical Support',
      status: 'active',
      active: true,
      createdAt: now,
    },
    {
      id: 'pkg-4',
      packageId: 'PKG-CUSTOM-APP',
      name: 'Custom Web Application',
      subtitle: 'Bespoke Full-Stack Web Platform',
      serviceId: 'srv-8',
      serviceName: 'Custom Web Application',
      suitableFor: ['SaaS platforms', 'Custom CRMs', 'Enterprise Workflows'],
      features: [
        'Tailored Custom Requirements',
        'User Authentication & Security',
        'Comprehensive Admin Dashboard',
        'Scalable Database System',
        'Role-Based Access Control',
        'API Integrations & Payment Gateways',
        'Reports & Analytics Modules',
      ],
      price: 30000,
      discount: 0,
      finalPrice: 30000,
      pagesIncluded: 30,
      hostingIncluded: 'Enterprise Cloud Cluster with CDN',
      supportDuration: 'Dedicated Developer Support & SLA',
      paymentTerms: '40% Advance, 30% Milestone, 30% Delivery',
      deliveryTime: '20-30 Days',
      renewalPrice: 7999,
      maintenanceTerms: 'Annual Enterprise SLA, DevOps & Security Monitoring',
      status: 'active',
      active: true,
      createdAt: now,
    },
  ];
}

export function generateEntityId(prefix: string, sequence: number, date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const seqStr = String(sequence).padStart(4, '0');
  return `${prefix}-${dateStr}-${seqStr}`;
}

export function getInitialSettings(): CrmSettings {
  const companyProfile = {
    companyName: 'Vishal Enterprises',
    brandTitle: 'Vishal Enterprises CRM v2.0',
    tagline: 'Premium Website Design, Custom Development & Web Solutions',
    email: 'contact@vishalenterprises.com',
    phone: '+91 98765 43210',
    alternatePhone: '+91 98765 43211',
    address: 'Suite 402, Vishal Commercial Complex, Station Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
    gstin: '27AABCV1234F1Z5',
    websiteUrl: 'https://vishalenterprises.com',
  };

  const crmConfig = {
    defaultLeadPriority: 'Medium' as const,
    defaultValidityDays: 15,
    dsaCommissionRate: 10,
    withdrawalAllowedDays: [7, 14],
    allowDuplicateLeads: false,
    requireKycForWithdrawal: true,
    requireVerifiedBankForWithdrawal: true,
  };

  const defaultPresets = [
    '50% Advance upon initiation, 50% on Final Website Delivery & Domain Pointing',
    '40% Advance, 40% on Beta Design Approval, 20% on Final Delivery',
    '100% Full Advance Payment (5% Instant Settlement Discount Included)',
    '30% Advance, 40% Development Milestone, 30% Delivery & Handover',
  ];

  const leadSources = [
    'Google Maps',
    'Website',
    'WhatsApp',
    'Facebook',
    'Instagram',
    'LinkedIn',
    'Referral',
    'Existing Customer',
    'Direct Call',
    'Walk-in',
    'Other',
  ];

  const businessCategories = [
    'Salon & Beauty',
    'Coaching & Education',
    'Restaurant & Cafe',
    'Retail & Supermarket',
    'Hospital & Clinic',
    'Diagnostic Lab',
    'CSC & Online Center',
    'Agency & Consultant',
    'Professional Services',
    'E-commerce Store',
    'Manufacturing & Industrial',
    'Finance & DSA Services',
    'Real Estate & Construction',
    'Other',
  ];

  return {
    companyProfile,
    crmConfig,
    companyName: companyProfile.companyName,
    companyTagline: companyProfile.tagline,
    supportEmail: companyProfile.email,
    supportPhone: companyProfile.phone,
    whatsappNumber: companyProfile.phone,
    websiteUrl: companyProfile.websiteUrl,
    registeredAddress: companyProfile.address,
    city: companyProfile.city,
    state: companyProfile.state,
    pinCode: companyProfile.pinCode,
    gstin: companyProfile.gstin,
    proposalValidityDays: crmConfig.defaultValidityDays,
    defaultFollowupDays: 3,
    dsaCommissionPercentage: crmConfig.dsaCommissionRate,
    dsaWithdrawalDates: crmConfig.withdrawalAllowedDays,
    paymentTermsPresets: defaultPresets,
    paymentTermsList: defaultPresets,
    leadSources,
    businessCategories,
  };
}

function initializeDatabase(): DatabaseSchema {
  // Ensure data folder exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Initial Admin credentials per prompt specification:
  // User ID: Admin
  // Password: Admin1@$
  // First login will force password change and PIN creation
  const defaultAdminPassword = hashPassword('Admin1@$');
  const now = new Date().toISOString();

  const initialAdmin: User = {
    id: 'user-admin-001',
    userId: 'Admin',
    role: 'ADMIN',
    fullName: 'Super Admin',
    mobile: '9876543210',
    whatsapp: '9876543210',
    email: 'admin@vishalenterprises.com',
    status: 'active',
    firstLogin: true,
    passwordChanged: false,
    pinConfigured: false,
    passwordHash: defaultAdminPassword.hash,
    passwordSalt: defaultAdminPassword.salt,
    pinHash: null,
    pinSalt: null,
    joiningDate: now.split('T')[0],
    createdAt: now,
    updatedAt: now,
  };

  const initialDb: DatabaseSchema = {
    users: [initialAdmin],
    sessions: [],
    leads: [],
    customers: [],
    followups: [],
    sales: [],
    proposals: [],
    payments: [],
    projects: [],
    services: getInitialServices(),
    packages: getInitialPackages(),
    attendance: [],
    staffKyc: [],
    dsaKyc: [],
    dsaAgreements: [],
    withdrawals: [],
    targets: [],
    renewals: [],
    staffReferrals: [],
    requests: [],
    complaints: [],
    auditLogs: [
      {
        id: 'log-init-01',
        logId: 'LOG-INIT-001',
        userId: 'SYSTEM',
        userName: 'System Setup',
        role: 'ADMIN',
        action: 'SYSTEM_INITIALIZATION',
        module: 'system',
        date: now.split('T')[0],
        exactTime: now.split('T')[1].slice(0, 8),
        reason: 'Vishal Enterprises Website Sales CRM Initialized',
        createdAt: now,
      },
    ],
    notifications: [],
    commissions: [],
    payroll: [],
    settings: getInitialSettings(),
    failedLoginAttempts: {},
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  return initialDb;
}

let dbCache: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) {
    return dbCache;
  }

  if (!fs.existsSync(DB_FILE)) {
    dbCache = initializeDatabase();
    return dbCache;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    dbCache = JSON.parse(raw);

    if (dbCache) {
      let changed = false;
      const canonicalServices = getInitialServices();
      const canonicalPackages = getInitialPackages();

      const canonicalNames = new Set(canonicalServices.map((s) => s.name.toLowerCase()));
      const filteredExisting = (dbCache.services || []).filter(
        (s) =>
          ![
            'coaching/institute website',
            'salon/business website',
            'restaurant website',
            'booking website',
            'crm/admin dashboard',
            'maintenance & support',
          ].includes(s.name.toLowerCase())
      );

      const newServicesList: WebsiteService[] = [...canonicalServices];
      for (const ex of filteredExisting) {
        if (!canonicalNames.has(ex.name.toLowerCase()) && !canonicalServices.some((c) => c.id === ex.id)) {
          newServicesList.push(ex);
        }
      }

      if (JSON.stringify(dbCache.services) !== JSON.stringify(newServicesList)) {
        dbCache.services = newServicesList;
        changed = true;
      }

      const canonicalPkgIds = new Set(canonicalPackages.map((p) => p.packageId));
      const newPackagesList: ServicePackage[] = [...canonicalPackages];
      for (const ex of dbCache.packages || []) {
        if (!canonicalPkgIds.has(ex.packageId) && !canonicalPackages.some((c) => c.id === ex.id)) {
          newPackagesList.push(ex);
        }
      }

      if (JSON.stringify(dbCache.packages) !== JSON.stringify(newPackagesList)) {
        dbCache.packages = newPackagesList;
        changed = true;
      }

      if (Array.isArray(dbCache.proposals)) {
        for (const p of dbCache.proposals) {
          if (!p.status) p.status = 'Draft';
          if (!p.businessName && (p as any).recipientName) p.businessName = (p as any).recipientName;
          if (!p.contactPerson && (p as any).recipientName) p.contactPerson = (p as any).recipientName;
          if (p.basePrice === undefined && (p as any).price !== undefined) p.basePrice = (p as any).price;
          if (p.quotedAmount === undefined) p.quotedAmount = p.basePrice || 0;
          if (p.discount === undefined) p.discount = 0;
          if (p.taxRate === undefined) p.taxRate = 0;
          if (p.taxAmount === undefined) p.taxAmount = 0;
          if (p.finalAmount === undefined) p.finalAmount = p.quotedAmount - p.discount;
          if (p.advancePercentage === undefined) p.advancePercentage = 50;
          if (p.advanceAmount === undefined) p.advanceAmount = Math.round(p.finalAmount * 0.5);
          if (p.remainingAmount === undefined) p.remainingAmount = p.finalAmount - p.advanceAmount;
          if (!p.activities) p.activities = [];
          if (!p.additionalCharges) p.additionalCharges = [];
          if (!p.totalAdditionalCharges) p.totalAdditionalCharges = 0;
          if (!p.proposalDate && p.createdAt) p.proposalDate = p.createdAt.split('T')[0];
          if (!p.validUntil && (p as any).validityDate) p.validUntil = (p as any).validityDate;
        }
      }

      if (!Array.isArray(dbCache.commissions)) {
        dbCache.commissions = [];
        changed = true;
      }

      if (!Array.isArray(dbCache.payroll)) {
        dbCache.payroll = [];
        changed = true;
      }

      const initial = getInitialSettings();
      if (!dbCache.settings || !dbCache.settings.companyName || !dbCache.settings.paymentTermsPresets) {
        dbCache.settings = {
          ...initial,
          ...(dbCache.settings || {}),
          paymentTermsPresets: (dbCache.settings?.paymentTermsPresets && dbCache.settings.paymentTermsPresets.length > 0)
            ? dbCache.settings.paymentTermsPresets
            : ((dbCache.settings?.paymentTermsList && dbCache.settings.paymentTermsList.length > 0)
                ? dbCache.settings.paymentTermsList
                : initial.paymentTermsPresets),
          paymentTermsList: (dbCache.settings?.paymentTermsList && dbCache.settings.paymentTermsList.length > 0)
            ? dbCache.settings.paymentTermsList
            : initial.paymentTermsList,
          dsaWithdrawalDates: (dbCache.settings?.dsaWithdrawalDates && dbCache.settings.dsaWithdrawalDates.length > 0)
            ? dbCache.settings.dsaWithdrawalDates
            : initial.dsaWithdrawalDates,
          leadSources: (dbCache.settings?.leadSources && dbCache.settings.leadSources.length > 0)
            ? dbCache.settings.leadSources
            : initial.leadSources,
          businessCategories: (dbCache.settings?.businessCategories && dbCache.settings.businessCategories.length > 0)
            ? dbCache.settings.businessCategories
            : initial.businessCategories,
        };
        changed = true;
      }

      if (!dbCache.users.some((u) => u.role === 'STAFF')) {
        const staffPass = hashPassword('Staff1@$');
        const defaultStaff: User = {
          id: 'user-staff-001',
          userId: 'VE-STAFF-001',
          role: 'STAFF',
          fullName: 'Rajesh Sharma',
          mobile: '9876543211',
          whatsapp: '9876543211',
          email: 'rajesh@vishalenterprises.com',
          status: 'active',
          firstLogin: false,
          passwordChanged: true,
          pinConfigured: true,
          passwordHash: staffPass.hash,
          passwordSalt: staffPass.salt,
          pinHash: null,
          pinSalt: null,
          department: 'Sales',
          designation: 'Sales Executive',
          joiningDate: new Date().toISOString().split('T')[0],
          permissions: getDefaultStaffPermissions(),
          salary: { amount: 30000, type: 'Fixed + Incentive' },
          kycStatus: 'approved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbCache.users.push(defaultStaff);
        changed = true;
      }

      if (!dbCache.users.some((u) => u.role === 'DSA')) {
        const dsaPass = hashPassword('Dsa1@$');
        const defaultDsa: User = {
          id: 'user-dsa-001',
          userId: 'VE-DSA-001',
          role: 'DSA',
          fullName: 'Amit Kumar',
          businessName: 'AK Digital Solutions',
          mobile: '9876543212',
          whatsapp: '9876543212',
          email: 'amit@akdigitalsolutions.com',
          status: 'active',
          firstLogin: false,
          passwordChanged: true,
          pinConfigured: true,
          passwordHash: dsaPass.hash,
          passwordSalt: dsaPass.salt,
          pinHash: null,
          pinSalt: null,
          joiningDate: new Date().toISOString().split('T')[0],
          permissions: getDefaultDsaPermissions(),
          commissionRate: 10,
          kycStatus: 'approved',
          agreementAccepted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbCache.users.push(defaultDsa);
        changed = true;
      }

      if (changed) {
        saveDb(dbCache);
      }
    }
    return dbCache!;
  } catch (err) {
    console.error('Error reading database file, reinitializing:', err);
    dbCache = initializeDatabase();
    return dbCache;
  }
}

export function saveDb(db: DatabaseSchema): void {
  dbCache = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

export function addAuditLog(params: {
  userId: string;
  userName?: string;
  role: UserRole;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  ip?: string;
}): AuditLog {
  const db = getDb();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  const log: AuditLog = {
    id: `log-${Date.now()}-${randomSuffix}`,
    logId: `LOG-${dateStr.replace(/-/g, '')}-${randomSuffix}`,
    userId: params.userId,
    userName: params.userName,
    role: params.role,
    action: params.action,
    module: params.module,
    recordId: params.recordId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    date: dateStr,
    exactTime: timeStr,
    reason: params.reason,
    ip: params.ip,
    createdAt: now.toISOString(),
  };

  db.auditLogs.unshift(log);
  // Keep up to 5000 audit logs
  if (db.auditLogs.length > 5000) {
    db.auditLogs.pop();
  }
  saveDb(db);
  return log;
}

export function addNotification(params: {
  userId: string;
  role?: UserRole;
  title: string;
  message: string;
  link?: string;
}): NotificationItem {
  const db = getDb();
  const notif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    userId: params.userId,
    role: params.role,
    title: params.title,
    message: params.message,
    read: false,
    link: params.link,
    createdAt: new Date().toISOString(),
  };

  db.notifications.unshift(notif);
  if (db.notifications.length > 1000) {
    db.notifications.pop();
  }
  saveDb(db);
  return notif;
}

export function notifyAdmins(title: string, message: string, link?: string): void {
  const db = getDb();
  const admins = db.users.filter((u) => u.role === 'ADMIN');
  admins.forEach((admin) => {
    addNotification({
      userId: admin.userId,
      role: 'ADMIN',
      title,
      message,
      link,
    });
  });
}

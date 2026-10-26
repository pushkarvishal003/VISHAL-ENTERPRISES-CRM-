/**
 * Vishal Enterprises CRM - Master Type Definitions
 * Dedicated Website Sales & Web Services CRM
 */

export type UserRole = 'ADMIN' | 'STAFF' | 'DSA' | 'CLIENT';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type StaffDepartment =
  | 'Sales'
  | 'Verification'
  | 'HR'
  | 'Accounts'
  | 'IT'
  | 'Marketing';

export type StaffDesignation =
  | 'Manager'
  | 'Branch Manager'
  | 'Team Leader'
  | 'Sales Executive'
  | 'DSA'
  | 'Telecaller';

export type DataScope = 'own' | 'assigned' | 'team' | 'all';

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  assign?: boolean;
  export?: boolean;
  verify?: boolean;
  approve?: boolean;
  send?: boolean;
  updateStatus?: boolean;
  upload?: boolean;
  complete?: boolean;
}

export type CrmModule =
  | 'dashboard'
  | 'leads'
  | 'customers'
  | 'followups'
  | 'sales'
  | 'proposals'
  | 'payments'
  | 'projects'
  | 'services'
  | 'packages'
  | 'staff'
  | 'dsa'
  | 'targets'
  | 'attendance'
  | 'renewals'
  | 'reports'
  | 'notifications'
  | 'requests'
  | 'complaints'
  | 'kyc'
  | 'commission'
  | 'withdrawals'
  | 'settings'
  | 'auditLogs'
  | 'referrals';

export interface UserPermissions {
  modules: Partial<Record<CrmModule, ModulePermission>>;
  dataScope: DataScope;
  permittedServices?: string[]; // IDs of services allowed for DSA/Staff
}

export interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch?: string;
  upiId?: string;
  accountType?: 'Savings' | 'Current';
  bankProof?: string;
  verificationStatus?: 'Not Submitted' | 'Pending Verification' | 'Verified' | 'Rejected';
  verifiedBy?: string;
  verifiedDate?: string;
  rejectionReason?: string;
}

export interface User {
  id: string;
  userId: string; // e.g. "Admin", "VE-STAFF-001", "VE-DSA-001"
  role: UserRole;
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email: string;
  status: UserStatus;
  firstLogin: boolean;
  passwordChanged: boolean;
  pinConfigured: boolean;
  passwordHash: string;
  passwordSalt: string;
  pinHash?: string | null;
  pinSalt?: string | null;

  // Personal Info
  fathersName?: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  alternateMobile?: string;
  personalEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  profilePhoto?: string;

  // Professional / Staff Info
  department?: StaffDepartment;
  designation?: StaffDesignation;
  employeeType?: 'Full-time' | 'Part-time' | 'Contract' | 'Probation';
  reportingManager?: string;
  workLocation?: string;
  experienceYears?: string | number;
  previousExperience?: string;
  notes?: string;

  // Business / DSA Info
  partnerType?: string;
  businessName?: string;
  businessType?: string;
  businessRegType?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  businessPin?: string;
  businessEmail?: string;
  businessMobile?: string;
  website?: string;
  googleBusinessProfile?: string;
  yearsExperience?: string | number;
  businessActivity?: string;
  employeeCount?: string | number;
  serviceArea?: string;
  referralSource?: string;

  // Dates & Links
  joiningDate: string;
  customerId?: string;
  clientLoginId?: string;
  permissions?: UserPermissions;

  // Salary & Payroll Info
  salary?: {
    amount: number;
    type: 'Fixed' | 'Performance-linked' | 'Fixed + Incentive';
    target?: number;
    incentiveRule?: string;
  };
  salaryEffectiveDate?: string;
  paymentCycle?: string;
  salaryNotes?: string;

  // Targets
  monthlyLeadTarget?: number;
  monthlyContactTarget?: number;
  monthlyFollowupTarget?: number;
  monthlyDemoTarget?: number;
  monthlyProposalTarget?: number;
  monthlySalesTarget?: number;
  monthlySalesAmountTarget?: number;
  monthlyDeliveryTarget?: number;

  // KYC & Bank Details
  kycStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'correction_needed';
  bankDetails?: BankDetails;

  // DSA Specific
  commissionRate?: number;
  agreementAccepted?: boolean;
  agreementAcceptedAt?: string;
  agreementVersion?: string;

  // Security Flags
  forcePasswordChange?: boolean;
  forcePinChange?: boolean;
  lastLoginAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface StaffPayrollRecord {
  id: string;
  payrollId: string; // PAY-YYYYMM-XXXX
  staffId: string;
  staffName: string;
  salaryMonth: string; // YYYY-MM
  baseSalary: number;
  approvedAdjustments: number;
  deduction?: number;
  bonus?: number;
  netPay: number;
  paymentStatus: 'Pending' | 'Processed' | 'Paid' | 'On Hold';
  paymentDate?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadSource =
  | 'Google Maps'
  | 'WhatsApp'
  | 'Facebook'
  | 'Instagram'
  | 'Referral'
  | 'Direct Call'
  | 'Website'
  | 'Other';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Demo Shared'
  | 'Follow-up'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Payment Pending'
  | 'Won'
  | 'Development'
  | 'Delivered'
  | 'Not Interested'
  | 'Price Issue'
  | 'Already Has Website'
  | 'No Response'
  | 'Competitor'
  | 'Other';

export interface Lead {
  id: string;
  leadId: string; // e.g. LD-2026-001
  businessName: string;
  ownerName: string;
  mobile: string;
  alternateMobile?: string;
  whatsapp?: string;
  email?: string;
  city: string;
  state: string;
  pinCode?: string;
  address?: string;
  businessCategory: string;
  existingWebsite: boolean;
  existingWebsiteUrl?: string;
  websiteRequired?: boolean;
  leadSource: LeadSource;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedDsaId?: string;
  assignedDsaName?: string;
  websiteType?: string;
  interestedServiceId?: string;
  packageId?: string;
  numberOfPages?: number;
  requiredFeatures?: string[];
  onlineBookingRequired?: boolean;
  paymentGatewayRequired?: boolean;
  whatsappIntegration?: boolean;
  contactForm?: boolean;
  adminDashboard?: boolean;
  customerLogin?: boolean;
  ecommerce?: boolean;
  blog?: boolean;
  gallery?: boolean;
  googleMaps?: boolean;
  socialMediaIntegration?: boolean;
  customRequirements?: string;
  expectedDeliveryDate?: string;
  decisionMaker?: boolean;
  competitor?: string;
  requirementNotes?: string;
  interestLevel?: string;
  nextFollowupDate?: string;
  initialContactDate?: string;
  initialContactTime?: string;
  contactMethod?: string;
  discussionSummary?: string;
  customerResponse?: string;
  nextAction?: string;
  estimatedBudget?: number;
  status: LeadStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  notes?: string;
  leadTime?: string;
  designation?: string;
  lostReason?: string;
  lostNotes?: string;
  createdBy: string;
  createdByRole: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  customerId: string; // e.g. CUST-2026-001
  leadId?: string;
  clientLoginId?: string;
  accountStatus?: string;
  businessName: string;
  businessDescription?: string;
  googleBusinessUrl?: string;
  existingWebsite?: boolean;
  existingWebsiteUrl?: string;
  interestedServiceId?: string;
  numberOfPages?: number;
  requiredFeatures?: string[];
  domainAvailable?: boolean;
  hostingAvailable?: boolean;
  domainRequired?: boolean;
  hostingRequired?: boolean;
  specialRequirements?: string;
  kycStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'correction_needed';
  kycProofType?: string;
  kycProofUrl?: string;
  kycNotes?: string;
  businessCategory?: string;
  ownerName: string;
  contactPerson?: string;
  designation?: string;
  mobile: string;
  alternateMobile?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  pinCode?: string;
  websiteDomain?: string;
  websiteType: string;
  packageId?: string;
  packageName?: string;
  totalAmount: number;
  amountReceived: number;
  amountPending: number;
  developer?: string;
  websiteStatus: 'Planning' | 'In Progress' | 'Review' | 'Live' | 'Delivered';
  deliveryDate?: string;
  renewalDate?: string;
  supportStatus: 'Active' | 'Expired' | 'Pending';
  notes?: string;
  createdBy: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedDsaId?: string;
  assignedDsaName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  followupId: string;
  targetType: 'Lead' | 'Customer';
  targetId: string;
  targetName: string;
  date: string;
  time: string;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Other';
  assignedUserId: string;
  assignedUserName: string;
  notes: string;
  result?: string;
  nextFollowup?: string;
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled';
  createdAt: string;
}

export interface Sale {
  id: string;
  saleId: string; // e.g. SALE-2026-001
  proposalId?: string; // Linked Proposal ID
  leadId?: string;
  customerId: string;
  customerName: string;
  clientName?: string;
  contactNumber?: string;
  businessName: string;
  staffOrDsaId: string;
  staffOrDsaName: string;
  staffOrDsaRole: UserRole;
  serviceId: string;
  serviceName: string;
  packageId?: string;
  packageName?: string;
  websiteType?: string;
  saleAmount: number;
  discount: number;
  finalAmount: number;
  advancePaid?: number;
  balanceAmount?: number;
  paymentStatus: 'Pending' | 'Advance Paid' | 'Fully Paid';
  developmentStatus: 'Pending' | 'In Progress' | 'Review' | 'Completed';
  deliveryStatus: 'Pending' | 'Delivered';
  commissionAmount: number; // 10% for DSA
  commissionStatus: 'Pending' | 'Available' | 'Paid';
  deliveryDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProposalStatus =
  | 'Draft'
  | 'Sent'
  | 'Viewed'
  | 'Negotiation'
  | 'Accepted'
  | 'Rejected'
  | 'Expired'
  | 'Converted to Sale';

export interface AdditionalChargeItem {
  id: string;
  title: string;
  amount: number;
}

export interface ProposalTerms {
  validityDays: number;
  paymentTerms: string;
  developmentTimeline: string;
  revisionLimit: string;
  contentResponsibility: string;
  domainHostingTerms: string;
  maintenanceTerms: string;
  cancellationRefundTerms: string;
  otherConditions?: string;
}

export interface ProposalActivity {
  id: string;
  activityId: string;
  proposalId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action:
    | 'Proposal Created'
    | 'Proposal Edited'
    | 'Proposal Sent'
    | 'Proposal Viewed'
    | 'Proposal Downloaded'
    | 'Proposal Printed'
    | 'Proposal Shared'
    | 'Proposal Status Changed'
    | 'Proposal Rejected'
    | 'Proposal Accepted'
    | 'Proposal Converted to Sale'
    | 'Proposal Expired'
    | 'Note Added';
  date: string;
  exactTime: string;
  notes?: string;
  recipient?: string;
  method?: string;
  createdAt: string;
}

export interface ProposalCommunication {
  id: string;
  date: string;
  time: string;
  type: 'WhatsApp' | 'Email' | 'Phone Call' | 'In-Person Meeting' | 'Other';
  senderOrAgent: string;
  recipient: string;
  notes: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  proposalId: string; // e.g. PROP-2026-0001
  status: ProposalStatus;
  leadId?: string;
  customerId?: string;
  businessName: string;
  contactPerson: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;

  // Service & Package
  serviceId: string;
  serviceName: string;
  packageId?: string;
  packageName?: string;
  deliveryTimeline: string;
  features: string[];
  renewalPrice?: number;
  maintenanceTerms?: string;

  // Pricing
  basePrice: number;
  additionalCharges: AdditionalChargeItem[];
  totalAdditionalCharges: number;
  quotedAmount: number; // basePrice + totalAdditionalCharges
  discount: number;
  taxRate: number; // e.g. 18 for 18% GST or 0
  taxAmount: number;
  finalAmount: number; // quotedAmount - discount + taxAmount
  advancePercentage: number; // e.g. 50%
  advanceAmount: number;
  remainingAmount: number;

  // Payment terms
  paymentTerms: string;
  paymentMilestones?: string[];

  // Terms & Conditions
  terms: ProposalTerms;

  // Dates
  proposalDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD

  // Ownership & Assignment
  preparedByUserId: string;
  preparedByName: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedDsaId?: string;
  assignedDsaName?: string;

  // Converted Sale
  saleId?: string;

  // Notes
  notes?: string;

  // Activity & Communication history
  activities: ProposalActivity[];
  communications?: ProposalCommunication[];

  // Legacy compat aliases
  leadOrCustomerId?: string;
  recipientName?: string;
  price?: number;
  validityDate?: string;

  createdBy: string;
  createdByName: string;
  createdByRole: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  paymentId: string; // e.g. PAY-2026-001
  customerId: string;
  customerName: string;
  businessName?: string;
  saleId: string;
  amount: number;
  date: string;
  paymentMethod: 'UPI' | 'Bank Transfer' | 'Cash' | 'Cheque' | 'Card' | 'Other';
  transactionNumber: string;
  receiptUrl?: string;
  verificationStatus: 'Pending' | 'Submitted' | 'Verified' | 'Rejected';
  verifiedBy?: string;
  verificationDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export type ProjectStatus =
  | 'Payment Received'
  | 'Requirements Pending'
  | 'Content Pending'
  | 'Design Started'
  | 'Development'
  | 'Customer Review'
  | 'Revision'
  | 'Final Approval'
  | 'Live'
  | 'Delivered';

export interface WebsiteProject {
  id: string;
  projectId: string; // e.g. PRJ-2026-001
  customerId: string;
  customerName?: string;
  clientName?: string;
  contactNumber?: string;
  email?: string;
  businessName: string;
  serviceId: string;
  serviceName: string;
  packageId?: string;
  packageName?: string;
  developer?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedDsaId?: string;
  dsaId?: string;
  websiteDomain?: string;
  websiteType?: string;
  startDate: string;
  deadline?: string;
  domain?: string;
  domainStatus?: string;
  domainProvider?: string;
  hosting?: string;
  hostingStatus?: string;
  hostingProvider?: string;
  requirements?: string;
  files?: string[];
  notes?: string;
  revisionCount?: number;
  revisions?: Array<{ revisionNumber: number; notes: string; status: string; submittedAt: string }>;
  liveUrl?: string;
  stagingUrl?: string;
  demoUrl?: string;
  totalAmount?: number;
  amountReceived?: number;
  amountPending?: number;
  contentStatus?: string;
  milestones?: Array<{ name: string; status: string; date?: string }>;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  status: ProjectStatus;
  saleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteService {
  id: string;
  name: string;
  category?: string;
  description: string;
  features: string[];
  price: number;
  basePrice?: number;
  discount: number;
  duration: string;
  timeline: string;
  deliveryDays?: number;
  status: 'active' | 'inactive';
  active?: boolean;
  createdAt: string;
}

export interface ServicePackage {
  id: string;
  packageId: string;
  name: string;
  subtitle?: string;
  badge?: string;
  serviceId: string;
  serviceName: string;
  suitableFor?: string[];
  features: string[];
  price: number;
  discount: number;
  finalPrice: number;
  paymentTerms: string;
  deliveryTime: string;
  renewalPrice: number;
  maintenanceTerms: string;
  pagesIncluded?: number;
  hostingIncluded?: string;
  supportDuration?: string;
  status: 'active' | 'inactive';
  active?: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  attendanceId: string; // ATT-YYYYMMDD-XXXX
  staffId: string;
  staffName: string;
  department: StaffDepartment;
  designation: StaffDesignation;
  date: string; // YYYY-MM-DD
  exactTime: string; // HH:mm:ss
  status: 'Present' | 'Late' | 'Half Day';
  capturedPhoto: string; // Base64 encoded or image URI
  overrideReason?: string;
  overriddenBy?: string;
  createdAt: string;
}

export interface StaffKyc {
  id: string;
  staffId: string;
  fullName: string;
  parentsName: string;
  dob: string;
  gender: string;
  mobile: string;
  whatsapp?: string;
  email: string;
  currentAddress: string;
  permanentAddress: string;
  city: string;
  state: string;
  pinCode: string;
  profilePhoto?: string;
  designation: StaffDesignation;
  department: StaffDepartment;
  joiningDate: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Probation';
  previousExperience?: string;
  previousCompany?: string;
  skills: string;
  highestQualification: string;
  passingYear: string;
  documents: {
    aadhaarFront?: string;
    aadhaarBack?: string;
    pan?: string;
    educationCert?: string;
    addressProof?: string;
    bankProof?: string;
  };
  status: 'submitted' | 'approved' | 'rejected' | 'correction_needed';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DsaKyc {
  id: string;
  dsaId: string;
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  profilePhoto?: string;
  businessName: string;
  businessType: string;
  experience: string;
  skills: string;
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    accountType: 'Savings' | 'Current';
  };
  documents: {
    aadhaarFront?: string;
    aadhaarBack?: string;
    pan?: string;
    bankPassbook?: string;
    cancelledCheque?: string;
    bankStatement?: string;
  };
  status: 'submitted' | 'approved' | 'rejected' | 'correction_needed';
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DsaAgreement {
  id: string;
  agreementId: string;
  dsaId: string;
  version: string;
  agreementDate: string;
  accepted: boolean;
  acceptedAt?: string;
  terms: {
    commissionRate: string;
    salesScope: string;
    paymentCycle: string;
    confidentiality: string;
    termination: string;
  };
}

export interface WithdrawalRequest {
  id: string;
  withdrawalId: string; // WD-YYYYMMDD-XXXX
  requestId?: string; // alias for withdrawalId
  dsaId: string;
  dsaName: string;
  requestedAmount: number;
  availableBalanceAtRequest: number;
  requestDate: string;
  status:
    | 'Request Submitted'
    | 'Admin Reviewing'
    | 'Bank Details Verified'
    | 'Approved'
    | 'Payment Processing'
    | 'Paid'
    | 'Rejected';
  rejectionReason?: string;
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    accountType: string;
  };
  bankDocuments?: {
    bankPassbook?: string;
    cancelledCheque?: string;
    bankStatement?: string;
  };
  processedAt?: string;
  processedBy?: string;
  transactionRef?: string;
  createdAt: string;
}

export interface StaffTarget {
  id: string;
  targetId?: string;
  staffId: string;
  staffName: string;
  department?: string;
  month?: string;
  monthYear?: string; // YYYY-MM
  monthlySalesTarget?: number;
  dailyProspectTarget?: number;
  dailyContactTarget?: number;
  monthlyFollowupTarget?: number;
  achievedSales?: number;
  leadsTarget?: number;
  leadsAchieved?: number;
  callsTarget?: number;
  callsAchieved?: number;
  followupsTarget?: number;
  followupsAchieved?: number;
  salesCountTarget?: number;
  salesCountAchieved?: number;
  revenueTarget?: number;
  revenueAchieved?: number;
  achievementPercentage?: number;
  status?: 'Active' | 'Achieved' | 'Missed' | 'In Progress';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteRenewal {
  id: string;
  renewalId: string;
  customerId: string;
  customerName: string;
  businessName: string;
  domain: string;
  hosting?: string;
  serviceType?: string;
  renewalDate: string;
  expiryDate?: string;
  renewalAmount: number;
  status: 'Upcoming' | 'Invoiced' | 'Paid' | 'Overdue' | 'Cancelled';
  assignedStaffId?: string;
  assignedStaffName?: string;
  notes?: string;
  createdAt: string;
}

export interface StaffReferral {
  id: string;
  referralId: string; // REF-YYYY-XXXX
  staffId: string;
  staffName: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  city: string;
  preferredRole: string;
  experience: string;
  resumeUrl?: string;
  status: 'pending' | 'interview' | 'approved' | 'rejected';
  bonusPaid: boolean;
  notes?: string;
  createdAt: string;
}

export interface StaffRequest {
  id: string;
  requestId: string; // REQ-YYYY-XXXX
  staffId: string;
  staffName: string;
  department: string;
  requestType:
    | 'Leave'
    | 'Profile Update'
    | 'Permission Request'
    | 'Service Access Request'
    | 'Salary/Payment Query'
    | 'Other';
  subject: string;
  message: string;
  attachmentUrl?: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  respondedAt?: string;
  respondedBy?: string;
  createdAt: string;
}

export interface StaffComplaint {
  id: string;
  complaintId: string; // CMP-YYYY-XXXX
  staffId: string;
  staffName: string;
  department: string;
  topic:
    | 'Work Related'
    | 'Customer Related'
    | 'Staff/Team Related'
    | 'Technical Issue'
    | 'Payment/Salary'
    | 'CRM Issue'
    | 'Other';
  message: string;
  attachmentUrl?: string;
  date: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  adminResponse?: string;
  respondedAt?: string;
  respondedBy?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  logId: string; // LOG-YYYYMMDD-XXXX
  userId: string;
  userName?: string;
  role: UserRole;
  action: string;
  module: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  date: string;
  exactTime: string;
  ip?: string;
  reason?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  role?: UserRole;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ProjectRevision {
  id: string;
  revisionNumber: number;
  requestedBy: string;
  notes: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  submittedAt: string;
  resolvedAt?: string;
}

export interface ProjectActivity {
  id: string;
  action: string;
  by: string;
  role: string;
  timestamp: string;
  details?: string;
}

export interface CommissionRecord {
  id: string;
  commissionId: string; // COM-YYYYMMDD-XXXX
  dsaId: string;
  dsaName: string;
  saleId: string;
  customerId: string;
  customerName: string;
  businessName: string;
  saleAmount: number;
  eligibleAmount: number;
  commissionRate: number; // e.g. 10 (%)
  commissionAmount: number;
  eligibilityStatus: 'Pending Delivery' | 'Eligible' | 'Released';
  availableDate?: string;
  status: 'Pending' | 'Eligible' | 'Available' | 'Withdrawn' | 'Adjusted' | 'Cancelled' | 'Paid';
  adjustmentReason?: string;
  adjustedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmSettings {
  companyProfile?: {
    companyName: string;
    brandTitle: string;
    tagline: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
    gstin?: string;
    websiteUrl: string;
  };
  crmConfig?: {
    defaultLeadPriority: 'Low' | 'Medium' | 'High' | 'Urgent';
    defaultValidityDays: number;
    dsaCommissionRate: number; // e.g. 10
    withdrawalAllowedDays: number[]; // [7, 14]
    allowDuplicateLeads: boolean;
    requireKycForWithdrawal: boolean;
    requireVerifiedBankForWithdrawal: boolean;
  };
  companyName?: string;
  companyTagline?: string;
  supportEmail?: string;
  supportPhone?: string;
  whatsappNumber?: string;
  websiteUrl?: string;
  registeredAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  gstin?: string;
  proposalValidityDays?: number;
  defaultFollowupDays?: number;
  dsaCommissionPercentage?: number;
  dsaWithdrawalDates?: number[];
  paymentTermsPresets?: string[];
  paymentTermsList?: string[];
  leadSources: string[];
  businessCategories: string[];
}

export type PaymentRecord = Payment;
export type RenewalRecord = WebsiteRenewal;
export type WebsitePackage = ServicePackage;

export interface DsaCommissionSummary {
  dsaId: string;
  totalSalesCount: number;
  totalSalesAmount: number;
  totalCommission: number;
  pendingCommission: number;
  grossAvailable: number;
  paidCommission: number;
  pendingWithdrawals: number;
  availableBalance: number;
  isWithdrawalDate: boolean;
  withdrawalDatesNotice: string;
  salesHistory?: Sale[];
}


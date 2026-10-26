/**
 * Vishal Enterprises CRM - Master API Router
 * Comprehensive endpoints for Admin, Staff, and DSA roles
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  getDb,
  saveDb,
  hashPassword,
  verifyPassword,
  hashPin,
  verifyPin,
  generateToken,
  generateEntityId,
  getInitialSettings,
  addAuditLog,
  addNotification,
  notifyAdmins,
  getDefaultStaffPermissions,
  getDefaultDsaPermissions,
} from './db.ts';
import {
  User,
  UserRole,
  StaffKyc,
  DsaKyc,
  CommissionRecord,
  CrmSettings,
  AttendanceRecord,
  Lead,
  Customer,
  FollowUp,
  Sale,
  Proposal,
  ProposalStatus,
  ProposalActivity,
  ProposalCommunication,
  Payment,
  WebsiteProject,
  WebsiteService,
  ServicePackage,
  WithdrawalRequest,
  StaffTarget,
  WebsiteRenewal,
  StaffReferral,
  StaffRequest,
  StaffComplaint,
  StaffPayrollRecord,
  CrmModule,
} from '../types/crm.ts';

const api = Router();

// Extend Request type to hold authenticated user
export interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

// Authentication Middleware
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No session token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const db = getDb();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const user = db.users.find((u) => u.userId === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Your account is currently inactive. Please contact Admin.' });
  }

  req.user = user;
  req.token = token;
  next();
}

// Require specific role
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access Denied. You do not have permission for this resource.' });
    }
    next();
  };
}

// Require module permission
export function requirePermission(module: CrmModule, action: 'view' | 'add' | 'edit' | 'delete') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    // Admin has full control
    if (req.user.role === 'ADMIN') {
      return next();
    }
    // Client has access to own customer modules
    if (req.user.role === 'CLIENT') {
      const clientAllowedModules: CrmModule[] = [
        'dashboard',
        'customers',
        'projects',
        'proposals',
        'sales',
        'payments',
        'renewals',
        'requests',
        'complaints',
        'notifications',
      ];
      if (clientAllowedModules.includes(module) && (action === 'view' || action === 'add')) {
        return next();
      }
      return res.status(403).json({ error: 'Access Denied for Client Portal.' });
    }

    const perms = req.user.permissions;
    if (!perms || !perms.modules[module] || !perms.modules[module]?.[action]) {
      return res.status(403).json({ error: `Access Denied. You do not have permission to ${action} ${module}.` });
    }
    next();
  };
}

// Helper to get client IP
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Login endpoint
api.post('/auth/login', (req: Request, res: Response) => {
  const { role, loginMode, userId, password, pin, department, designation } = req.body;

  if (!role || !userId) {
    return res.status(400).json({ error: 'Role and User ID are required.' });
  }

  const db = getDb();
  const normalizedUserId = userId.trim();
  const ip = getClientIp(req);

  // Check rate limiting / lockout
  const attemptKey = `${normalizedUserId}-${ip}`;
  const attempt = db.failedLoginAttempts[attemptKey];
  if (attempt && attempt.lockedUntil > Date.now()) {
    const remainingMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
    return res.status(429).json({
      error: `Account temporarily locked due to repeated failed logins. Please retry after ${remainingMinutes} minute(s).`,
    });
  }

  // Find user by userId, mobile, email, or clientLoginId
  const user = db.users.find(
    (u) =>
      u.userId.toLowerCase() === normalizedUserId.toLowerCase() ||
      u.mobile === normalizedUserId ||
      (u.email && u.email.toLowerCase() === normalizedUserId.toLowerCase()) ||
      (u.clientLoginId && u.clientLoginId.toLowerCase() === normalizedUserId.toLowerCase())
  );

  if (!user) {
    recordFailedAttempt(db, attemptKey);
    addAuditLog({
      userId: normalizedUserId,
      role: role as UserRole,
      action: 'LOGIN_FAILED',
      module: 'auth',
      reason: 'User not found',
      ip,
    });
    return res.status(401).json({ error: 'Invalid credentials. Access Denied.' });
  }

  // STRICT ROLE ISOLATION: User must belong strictly to the requested login portal
  if (user.role !== role) {
    recordFailedAttempt(db, attemptKey);
    addAuditLog({
      userId: user.userId,
      role: role as UserRole,
      action: 'CROSS_ROLE_LOGIN_ATTEMPT_BLOCKED',
      module: 'auth',
      reason: `User with role ${user.role} attempted login through ${role} portal`,
      ip,
    });
    return res.status(403).json({
      error: `Access Denied. This account is not registered under the ${role} portal.`,
    });
  }

  // Check account status
  if (user.status !== 'active') {
    return res.status(403).json({
      error: 'Your account is currently inactive. Please contact Admin.',
    });
  }

  // For Staff login, verify department and designation if provided
  if (role === 'STAFF') {
    if (department && user.department && user.department !== department) {
      return res.status(401).json({ error: 'Department does not match staff record.' });
    }
    if (designation && user.designation && user.designation !== designation) {
      return res.status(401).json({ error: 'Designation does not match staff record.' });
    }
  }

  // Authenticate using PIN or Password
  let isAuthenticated = false;

  if (loginMode === 'pin' && pin) {
    if (!user.pinHash || !user.pinSalt) {
      return res.status(400).json({ error: 'PIN is not configured for this account. Please use password.' });
    }
    isAuthenticated = verifyPin(pin, user.pinHash, user.pinSalt);
  } else if (password) {
    isAuthenticated = verifyPassword(password, user.passwordHash, user.passwordSalt);
  } else {
    return res.status(400).json({ error: 'Password or PIN is required to log in.' });
  }

  if (!isAuthenticated) {
    recordFailedAttempt(db, attemptKey);
    addAuditLog({
      userId: user.userId,
      userName: user.fullName,
      role: user.role,
      action: 'LOGIN_FAILED',
      module: 'auth',
      reason: loginMode === 'pin' ? 'Invalid PIN' : 'Invalid Password',
      ip,
    });
    return res.status(401).json({ error: 'Invalid credentials. Access Denied.' });
  }

  // Clear failed attempts on success
  delete db.failedLoginAttempts[attemptKey];

  // Create session token (valid for 7 days)
  const token = generateToken();
  const session = {
    token,
    userId: user.userId,
    role: user.role,
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  db.sessions.push(session);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'LOGIN_SUCCESS',
    module: 'auth',
    reason: `Authenticated via ${loginMode === 'pin' ? 'PIN' : 'Password'}`,
    ip,
  });

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

function recordFailedAttempt(db: ReturnType<typeof getDb>, key: string) {
  const current = db.failedLoginAttempts[key] || { count: 0, lockedUntil: 0 };
  current.count += 1;
  if (current.count >= 5) {
    current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
  }
  db.failedLoginAttempts[key] = current;
  saveDb(db);
}

function sanitizeUser(user: User) {
  const { passwordHash, passwordSalt, pinHash, pinSalt, ...safeUser } = user;
  return safeUser;
}

// First Login Setup: Force new password and PIN configuration
api.post('/auth/complete-first-login', authenticate, (req: AuthRequest, res: Response) => {
  const { newPassword, pin } = req.body;
  const user = req.user!;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (!pin || !(pin.length === 4 || pin.length === 6) || !/^\d+$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 or 6 digits.' });
  }

  const db = getDb();
  const dbUser = db.users.find((u) => u.userId === user.userId);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const newPass = hashPassword(newPassword);
  const newPinData = hashPin(pin);

  dbUser.passwordHash = newPass.hash;
  dbUser.passwordSalt = newPass.salt;
  dbUser.pinHash = newPinData.hash;
  dbUser.pinSalt = newPinData.salt;
  dbUser.firstLogin = false;
  dbUser.passwordChanged = true;
  dbUser.pinConfigured = true;
  dbUser.updatedAt = new Date().toISOString();

  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'FIRST_LOGIN_CONFIGURED',
    module: 'auth',
    reason: 'New password and security PIN successfully configured',
    ip: getClientIp(req),
  });

  return res.json({
    message: 'Security credentials configured successfully.',
    user: sanitizeUser(dbUser),
  });
});

// Change Password
api.post('/auth/change-password', authenticate, (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const db = getDb();
  const dbUser = db.users.find((u) => u.userId === user.userId);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (!verifyPassword(currentPassword, dbUser.passwordHash, dbUser.passwordSalt)) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  const updated = hashPassword(newPassword);
  dbUser.passwordHash = updated.hash;
  dbUser.passwordSalt = updated.salt;
  dbUser.passwordChanged = true;
  dbUser.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PASSWORD_CHANGED',
    module: 'auth',
    ip: getClientIp(req),
  });

  return res.json({ message: 'Password updated successfully.' });
});

// Change PIN
api.post('/auth/change-pin', authenticate, (req: AuthRequest, res: Response) => {
  const { currentPinOrPassword, newPin } = req.body;
  const user = req.user!;

  if (!newPin || !(newPin.length === 4 || newPin.length === 6) || !/^\d+$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be exactly 4 or 6 digits.' });
  }

  const db = getDb();
  const dbUser = db.users.find((u) => u.userId === user.userId);
  if (!dbUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Verify either current PIN or account password
  let verified = false;
  if (dbUser.pinHash && dbUser.pinSalt && verifyPin(currentPinOrPassword, dbUser.pinHash, dbUser.pinSalt)) {
    verified = true;
  } else if (verifyPassword(currentPinOrPassword, dbUser.passwordHash, dbUser.passwordSalt)) {
    verified = true;
  }

  if (!verified) {
    return res.status(400).json({ error: 'Current PIN or Password verification failed.' });
  }

  const updatedPin = hashPin(newPin);
  dbUser.pinHash = updatedPin.hash;
  dbUser.pinSalt = updatedPin.salt;
  dbUser.pinConfigured = true;
  dbUser.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PIN_CHANGED',
    module: 'auth',
    ip: getClientIp(req),
  });

  return res.json({ message: 'Security PIN updated successfully.' });
});

// Get current user profile & permissions
api.get('/auth/me', authenticate, (req: AuthRequest, res: Response) => {
  return res.json({ user: sanitizeUser(req.user!) });
});

// Logout endpoint: ends session, business data is safely preserved!
api.post('/auth/logout', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== req.token);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: 'LOGOUT',
    module: 'auth',
    ip: getClientIp(req),
  });

  return res.json({ message: 'Logged out successfully.' });
});

// Self-registration for DSA partners
api.post('/auth/register-dsa', (req: Request, res: Response) => {
  const { fullName, mobile, whatsapp, email, city, state, businessName, businessType, experience, password } = req.body;

  if (!fullName || !mobile || !email || !password) {
    return res.status(400).json({ error: 'Full Name, Mobile, Email, and initial password are required.' });
  }

  const db = getDb();
  // Check if mobile or email already exists
  if (db.users.some((u) => u.mobile === mobile || u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'An account with this mobile number or email already exists.' });
  }

  // Count existing DSA to generate ID
  const dsaCount = db.users.filter((u) => u.role === 'DSA').length + 1;
  const dsaId = `VE-DSA-${String(dsaCount).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const pass = hashPassword(password);

  const newDsa: User = {
    id: `user-dsa-${Date.now()}`,
    userId: dsaId,
    role: 'DSA',
    fullName,
    mobile,
    whatsapp: whatsapp || mobile,
    email,
    status: 'active',
    firstLogin: true,
    passwordChanged: false,
    pinConfigured: false,
    passwordHash: pass.hash,
    passwordSalt: pass.salt,
    pinHash: null,
    pinSalt: null,
    businessName: businessName || `${fullName} Web Services`,
    businessType: businessType || 'Individual Partner',
    joiningDate: now.split('T')[0],
    permissions: getDefaultDsaPermissions(),
    kycStatus: 'pending',
    agreementAccepted: false,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newDsa);
  saveDb(db);

  // Notify Admin
  notifyAdmins(
    'New DSA Partner Registered',
    `New DSA Partner ${fullName} (${dsaId}) registered and synced with admin panel.`,
    '/dsa'
  );

  addAuditLog({
    userId: dsaId,
    userName: fullName,
    role: 'DSA',
    action: 'DSA_SELF_REGISTRATION',
    module: 'dsa',
    recordId: dsaId,
    reason: 'DSA registered through portal',
    ip: getClientIp(req),
  });

  return res.json({
    message: 'DSA Partner registered successfully.',
    dsaId,
  });
});

// ==========================================
// ATTENDANCE WITH CAMERA
// ==========================================

// Today's attendance status for current staff
api.get('/attendance/today', authenticate, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const staffId = req.user!.userId;
  const today = new Date().toISOString().split('T')[0];
  const db = getDb();

  const record = db.attendance.find((a) => a.staffId === staffId && a.date === today);
  return res.json({
    marked: !!record,
    record: record || null,
    currentDate: today,
    currentTime: new Date().toTimeString().split(' ')[0],
  });
});

// Submit Attendance with live camera photo
api.post('/attendance/mark', authenticate, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const { capturedPhoto } = req.body;
  const user = req.user!;

  if (!capturedPhoto || !capturedPhoto.startsWith('data:image')) {
    return res.status(400).json({ error: 'Real device camera photo capture is required to mark attendance.' });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const db = getDb();

  // Strict check: Block duplicate same-day attendance for the same staff
  const existing = db.attendance.find((a) => a.staffId === user.userId && a.date === dateStr);
  if (existing) {
    return res.status(400).json({
      error: `Attendance already marked for today at ${existing.exactTime}. Duplicate attendance is blocked.`,
    });
  }

  const attendanceCount = db.attendance.length + 1;
  const attendanceId = `ATT-${dateStr.replace(/-/g, '')}-${String(attendanceCount).padStart(4, '0')}`;

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    attendanceId,
    staffId: user.userId,
    staffName: user.fullName,
    department: user.department || 'Sales',
    designation: user.designation || 'Sales Executive',
    date: dateStr,
    exactTime: timeStr,
    status: 'Present',
    capturedPhoto,
    createdAt: now.toISOString(),
  };

  db.attendance.unshift(newRecord);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'ATTENDANCE_MARKED',
    module: 'attendance',
    recordId: attendanceId,
    reason: `Present recorded at ${timeStr} with camera photo`,
    ip: getClientIp(req),
  });

  return res.json({
    message: 'Attendance marked successfully.',
    record: newRecord,
  });
});

// Staff own attendance history
api.get('/attendance/history', authenticate, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const history = db.attendance
    .filter((a) => a.staffId === req.user!.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json(history);
});

// Admin: View all staff attendance with filters
api.get('/admin/attendance', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { date, staffId, department, status, filterRange } = req.query;
  const db = getDb();
  let list = db.attendance;

  const today = new Date().toISOString().split('T')[0];

  if (filterRange === 'today') {
    list = list.filter((a) => a.date === today);
  } else if (filterRange === 'yesterday') {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    list = list.filter((a) => a.date === yesterday);
  } else if (filterRange === 'thisMonth') {
    const currentMonth = today.slice(0, 7);
    list = list.filter((a) => a.date.startsWith(currentMonth));
  } else if (date) {
    list = list.filter((a) => a.date === date);
  }

  if (staffId) {
    list = list.filter((a) => a.staffId === staffId);
  }
  if (department) {
    list = list.filter((a) => a.department === department);
  }
  if (status) {
    list = list.filter((a) => a.status === status);
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// Admin: Attendance correction/override
api.put('/admin/attendance/:id/override', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Authorization reason is required for attendance modification.' });
  }

  const db = getDb();
  const record = db.attendance.find((a) => a.id === id || a.attendanceId === id);
  if (!record) {
    return res.status(404).json({ error: 'Attendance record not found.' });
  }

  const oldStatus = record.status;
  record.status = status || record.status;
  record.overrideReason = reason;
  record.overriddenBy = req.user!.userId;
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'ATTENDANCE_OVERRIDE',
    module: 'attendance',
    recordId: record.attendanceId,
    oldValue: oldStatus,
    newValue: record.status,
    reason,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Attendance updated successfully.', record });
});

// ==========================================
// KYC MANAGEMENT (STAFF & DSA)
// ==========================================

// Submit Staff KYC
api.post('/kyc/staff/submit', authenticate, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const data = req.body;
  const db = getDb();

  let kyc = db.staffKyc.find((k) => k.staffId === user.userId);
  const now = new Date().toISOString();

  if (kyc) {
    Object.assign(kyc, {
      ...data,
      staffId: user.userId,
      status: 'submitted',
      submittedAt: now,
    });
  } else {
    kyc = {
      id: `kyc-staff-${Date.now()}`,
      staffId: user.userId,
      fullName: data.fullName || user.fullName,
      parentsName: data.parentsName || '',
      dob: data.dob || '',
      gender: data.gender || '',
      mobile: data.mobile || user.mobile,
      whatsapp: data.whatsapp || user.whatsapp,
      email: data.email || user.email,
      currentAddress: data.currentAddress || '',
      permanentAddress: data.permanentAddress || '',
      city: data.city || '',
      state: data.state || '',
      pinCode: data.pinCode || '',
      profilePhoto: data.profilePhoto,
      designation: user.designation || 'Sales Executive',
      department: user.department || 'Sales',
      joiningDate: user.joiningDate,
      employmentType: data.employmentType || 'Full-time',
      previousExperience: data.previousExperience,
      previousCompany: data.previousCompany,
      skills: data.skills || '',
      highestQualification: data.highestQualification || '',
      passingYear: data.passingYear || '',
      documents: data.documents || {},
      status: 'submitted',
      submittedAt: now,
    };
    db.staffKyc.push(kyc);
  }

  // Update user KYC status
  const dbUser = db.users.find((u) => u.userId === user.userId);
  if (dbUser) {
    dbUser.kycStatus = 'submitted';
  }

  saveDb(db);

  notifyAdmins(
    'Staff KYC Submitted',
    `Staff ${user.fullName} (${user.userId}) submitted KYC for verification.`,
    '/kyc'
  );

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'KYC_SUBMITTED',
    module: 'kyc',
    recordId: user.userId,
    reason: 'Staff KYC documents submitted',
    ip: getClientIp(req),
  });

  return res.json({
    message: 'KYC Submitted Successfully. Waiting for Admin Approval.',
    kyc,
  });
});

// Submit DSA KYC
api.post('/kyc/dsa/submit', authenticate, requireRole(['DSA']), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const data = req.body;
  const db = getDb();

  let kyc = db.dsaKyc.find((k) => k.dsaId === user.userId);
  const now = new Date().toISOString();

  if (kyc) {
    Object.assign(kyc, {
      ...data,
      dsaId: user.userId,
      status: 'submitted',
      submittedAt: now,
    });
  } else {
    kyc = {
      id: `kyc-dsa-${Date.now()}`,
      dsaId: user.userId,
      fullName: data.fullName || user.fullName,
      mobile: data.mobile || user.mobile,
      whatsapp: data.whatsapp || user.whatsapp,
      email: data.email || user.email,
      dob: data.dob || '',
      gender: data.gender || '',
      address: data.address || '',
      city: data.city || '',
      state: data.state || '',
      profilePhoto: data.profilePhoto,
      businessName: data.businessName || user.businessName || '',
      businessType: data.businessType || user.businessType || '',
      experience: data.experience || '',
      skills: data.skills || '',
      bankDetails: data.bankDetails || {
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifsc: '',
        branch: '',
        accountType: 'Savings',
      },
      documents: data.documents || {},
      status: 'submitted',
      submittedAt: now,
    };
    db.dsaKyc.push(kyc);
  }

  const dbUser = db.users.find((u) => u.userId === user.userId);
  if (dbUser) {
    dbUser.kycStatus = 'submitted';
  }

  saveDb(db);

  notifyAdmins(
    'DSA KYC Submitted',
    `DSA Partner ${user.fullName} (${user.userId}) submitted KYC for verification.`,
    '/kyc'
  );

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'KYC_SUBMITTED',
    module: 'kyc',
    recordId: user.userId,
    reason: 'DSA KYC documents submitted',
    ip: getClientIp(req),
  });

  return res.json({
    message: 'KYC Submitted Successfully. Waiting for Admin Approval.',
    kyc,
  });
});

// Own KYC status
api.get('/kyc/status', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  if (user.role === 'STAFF') {
    const kyc = db.staffKyc.find((k) => k.staffId === user.userId);
    return res.json({ kyc: kyc || null });
  } else if (user.role === 'DSA') {
    const kyc = db.dsaKyc.find((k) => k.dsaId === user.userId);
    return res.json({ kyc: kyc || null });
  }
  return res.json({ kyc: null });
});

// Admin: List all KYC
api.get('/admin/kyc', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    staffKyc: db.staffKyc,
    dsaKyc: db.dsaKyc,
  });
});

// Admin: Action on KYC (Approve, Reject, Correction)
api.put('/admin/kyc/:type/:id/action', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { type, id } = req.params; // type: 'staff' | 'dsa'
  const { action, reason } = req.body; // 'approved' | 'rejected' | 'correction_needed'

  if (!['approved', 'rejected', 'correction_needed'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be approved, rejected, or correction_needed.' });
  }

  const db = getDb();
  const now = new Date().toISOString();

  let targetUserId = '';
  let targetUserName = '';

  if (type === 'staff') {
    const record = db.staffKyc.find((k) => k.id === id || k.staffId === id);
    if (!record) return res.status(404).json({ error: 'Staff KYC not found.' });
    record.status = action;
    record.rejectionReason = reason;
    record.reviewedAt = now;
    record.reviewedBy = req.user!.userId;
    targetUserId = record.staffId;
    targetUserName = record.fullName;

    const user = db.users.find((u) => u.userId === record.staffId);
    if (user) user.kycStatus = action;
  } else {
    const record = db.dsaKyc.find((k) => k.id === id || k.dsaId === id);
    if (!record) return res.status(404).json({ error: 'DSA KYC not found.' });
    record.status = action;
    record.rejectionReason = reason;
    record.reviewedAt = now;
    record.reviewedBy = req.user!.userId;
    targetUserId = record.dsaId;
    targetUserName = record.fullName;

    const user = db.users.find((u) => u.userId === record.dsaId);
    if (user) user.kycStatus = action;
  }

  saveDb(db);

  // Notify the user
  addNotification({
    userId: targetUserId,
    title: `KYC Status Updated: ${action.toUpperCase()}`,
    message: reason ? `Admin note: ${reason}` : `Your KYC has been marked as ${action}.`,
    link: '/kyc',
  });

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: `KYC_${action.toUpperCase()}`,
    module: 'kyc',
    recordId: targetUserId,
    reason: reason || `KYC status marked as ${action}`,
    ip: getClientIp(req),
  });

  return res.json({ message: `KYC marked as ${action}.` });
});

// ==========================================
// WEBSITE SERVICES & PACKAGES
// ==========================================

api.get('/services', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  let services = db.services.filter((s) => s.status === 'active');

  // If DSA, filter by allowed services
  if (req.user!.role === 'DSA') {
    const allowed = req.user!.permissions?.permittedServices;
    if (allowed && allowed.length > 0) {
      services = services.filter((s) => allowed.includes(s.id));
    }
  }

  return res.json(services);
});

api.post('/services', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { name, description, features, price, discount, duration, timeline, category, basePrice, deliveryDays } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Service name and price are required.' });
  }

  const db = getDb();
  const newService: WebsiteService = {
    id: `srv-${Date.now()}`,
    name,
    category: category || 'CORE BUSINESS',
    description: description || '',
    features: Array.isArray(features) ? features : [],
    price: Number(price),
    basePrice: Number(basePrice || price),
    discount: Number(discount || 0),
    duration: duration || 'Annual',
    timeline: timeline || `${deliveryDays || 7} Days`,
    deliveryDays: Number(deliveryDays || 7),
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.services.push(newService);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'SERVICE_CREATED',
    module: 'services',
    recordId: newService.id,
    newValue: name,
    ip: getClientIp(req),
  });

  return res.json(newService);
});

api.put('/services/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const service = db.services.find((s) => s.id === id);
  if (!service) return res.status(404).json({ error: 'Service not found.' });

  Object.assign(service, req.body);
  if (req.body.price && !req.body.basePrice) {
    service.basePrice = Number(req.body.price);
  }
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'SERVICE_UPDATED',
    module: 'services',
    recordId: id,
    ip: getClientIp(req),
  });

  return res.json(service);
});

api.delete('/services/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.services = db.services.filter((s) => s.id !== id);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'SERVICE_DELETED',
    module: 'services',
    recordId: id,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Service removed.' });
});

api.get('/packages', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  return res.json(db.packages.filter((p) => p.status === 'active'));
});

api.post('/packages', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.name || !data.price) {
    return res.status(400).json({ error: 'Package Name and Price are required.' });
  }

  const db = getDb();
  const pkgCount = db.packages.length + 1;
  const newPkg: ServicePackage = {
    id: `pkg-${Date.now()}`,
    packageId: data.packageId || `PKG-VE-${String(pkgCount).padStart(2, '0')}`,
    name: data.name,
    subtitle: data.subtitle || '',
    badge: data.badge || '',
    serviceId: data.serviceId || 'srv-1',
    serviceName: data.serviceName || 'Business Website',
    suitableFor: Array.isArray(data.suitableFor) ? data.suitableFor : [],
    features: Array.isArray(data.features) ? data.features : [],
    price: Number(data.price),
    discount: Number(data.discount || 0),
    finalPrice: Number(data.finalPrice || (Number(data.price) - Number(data.discount || 0))),
    pagesIncluded: Number(data.pagesIncluded || 10),
    hostingIncluded: data.hostingIncluded || '1 Year High-Speed Cloud SSD Hosting',
    supportDuration: data.supportDuration || '1 Year Priority Support',
    paymentTerms: data.paymentTerms || '50% Advance, 50% on Delivery',
    deliveryTime: data.deliveryTime || '7 Days',
    renewalPrice: Number(data.renewalPrice || 3500),
    maintenanceTerms: data.maintenanceTerms || 'Annual Hosting & Maintenance',
    status: 'active',
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.packages.push(newPkg);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'PACKAGE_CREATED',
    module: 'packages',
    recordId: newPkg.packageId,
    ip: getClientIp(req),
  });

  return res.json(newPkg);
});

api.put('/packages/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const pkg = db.packages.find((p) => p.id === id || p.packageId === id);
  if (!pkg) return res.status(404).json({ error: 'Package not found.' });

  Object.assign(pkg, req.body);
  if (req.body.price && req.body.discount !== undefined) {
    pkg.finalPrice = Number(req.body.price) - Number(req.body.discount);
  }
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'PACKAGE_UPDATED',
    module: 'packages',
    recordId: id,
    ip: getClientIp(req),
  });

  return res.json(pkg);
});

api.delete('/packages/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.packages = db.packages.filter((p) => p.id !== id && p.packageId !== id);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'PACKAGE_DELETED',
    module: 'packages',
    recordId: id,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Package removed.' });
});

// ==========================================
// LEADS MANAGEMENT
// ==========================================

api.get('/leads', authenticate, requirePermission('leads', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.leads;

  // Enforce Data Scope
  if (user.role === 'DSA') {
    list = list.filter((l) => l.assignedDsaId === user.userId || l.createdBy === user.userId);
  } else if (user.role === 'STAFF') {
    const scope = user.permissions?.dataScope || 'own';
    if (scope === 'own') {
      list = list.filter((l) => l.createdBy === user.userId || l.assignedStaffId === user.userId);
    } else if (scope === 'assigned') {
      list = list.filter((l) => l.assignedStaffId === user.userId);
    }
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.post('/leads', authenticate, requirePermission('leads', 'add'), (req: AuthRequest, res: Response) => {
  const data = req.body;
  const { businessName, ownerName, mobile } = data;

  if (!businessName || !ownerName || !mobile) {
    return res.status(400).json({ error: 'Business Name, Owner Name, and Mobile are required.' });
  }

  const db = getDb();
  const now = new Date();
  const leadCount = db.leads.length + 1;
  const leadId = generateEntityId('LEAD', leadCount, now);

  const user = req.user!;
  const newLead: Lead = {
    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    leadId,
    leadTime: data.leadTime || now.toTimeString().slice(0, 5),
    businessName: data.businessName,
    ownerName: data.ownerName,
    designation: data.designation,
    mobile: data.mobile,
    alternateMobile: data.alternateMobile,
    whatsapp: data.whatsapp || data.mobile,
    email: data.email,
    city: data.city || '',
    state: data.state || '',
    address: data.address,
    pinCode: data.pinCode,
    businessCategory: data.businessCategory || 'General Business',
    existingWebsite: Boolean(data.existingWebsite),
    existingWebsiteUrl: data.existingWebsiteUrl,
    websiteRequired: data.websiteRequired !== undefined ? Boolean(data.websiteRequired) : true,
    websiteType: data.websiteType,
    interestedServiceId: data.interestedServiceId,
    packageId: data.packageId,
    numberOfPages: data.numberOfPages,
    requiredFeatures: data.requiredFeatures || [],
    onlineBookingRequired: Boolean(data.onlineBookingRequired),
    paymentGatewayRequired: Boolean(data.paymentGatewayRequired),
    whatsappIntegration: Boolean(data.whatsappIntegration),
    contactForm: Boolean(data.contactForm),
    adminDashboard: Boolean(data.adminDashboard),
    customerLogin: Boolean(data.customerLogin),
    ecommerce: Boolean(data.ecommerce),
    blog: Boolean(data.blog),
    gallery: Boolean(data.gallery),
    googleMaps: Boolean(data.googleMaps),
    socialMediaIntegration: Boolean(data.socialMediaIntegration),
    customRequirements: data.customRequirements,
    estimatedBudget: Number(data.estimatedBudget || 0),
    expectedDeliveryDate: data.expectedDeliveryDate,
    decisionMaker: data.decisionMaker,
    competitor: data.competitor,
    requirementNotes: data.requirementNotes,
    interestLevel: data.interestLevel || 'Hot',
    nextFollowupDate: data.nextFollowupDate,
    initialContactDate: data.initialContactDate || now.toISOString().split('T')[0],
    initialContactTime: data.initialContactTime || now.toTimeString().slice(0, 5),
    contactMethod: data.contactMethod || 'Call',
    discussionSummary: data.discussionSummary,
    customerResponse: data.customerResponse,
    nextAction: data.nextAction,
    leadSource: data.leadSource || 'Website',
    assignedStaffId: user.role === 'STAFF' ? user.userId : data.assignedStaffId,
    assignedStaffName: data.assignedStaffName || (user.role === 'STAFF' ? user.fullName : undefined),
    assignedDsaId: user.role === 'DSA' ? user.userId : data.assignedDsaId,
    assignedDsaName: data.assignedDsaName || (user.role === 'DSA' ? user.fullName : undefined),
    status: data.status || 'New',
    priority: data.priority || 'Medium',
    notes: data.notes,
    createdBy: user.userId,
    createdByRole: user.role,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.leads.unshift(newLead);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'LEAD_CREATED',
    module: 'leads',
    recordId: leadId,
    newValue: businessName,
    ip: getClientIp(req),
  });

  return res.json(newLead);
});

api.put('/leads/:id', authenticate, requirePermission('leads', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const lead = db.leads.find((l) => l.id === id || l.leadId === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const user = req.user!;
  // Check DSA isolation
  if (user.role === 'DSA' && lead.assignedDsaId !== user.userId && lead.createdBy !== user.userId) {
    return res.status(403).json({ error: 'Access Denied to this lead.' });
  }

  Object.assign(lead, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'LEAD_UPDATED',
    module: 'leads',
    recordId: lead.leadId,
    ip: getClientIp(req),
  });

  return res.json(lead);
});

// Admin assign lead
api.put('/leads/:id/assign', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { assignedStaffId, assignedStaffName, assignedDsaId, assignedDsaName } = req.body;
  const db = getDb();
  const lead = db.leads.find((l) => l.id === id || l.leadId === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  if (assignedStaffId) {
    lead.assignedStaffId = assignedStaffId;
    lead.assignedStaffName = assignedStaffName || db.users.find((u) => u.userId === assignedStaffId)?.fullName;
    addNotification({
      userId: assignedStaffId,
      title: 'New Lead Assigned',
      message: `Lead ${lead.businessName} (${lead.leadId}) has been assigned to you.`,
      link: '/leads',
    });
  }
  if (assignedDsaId) {
    lead.assignedDsaId = assignedDsaId;
    lead.assignedDsaName = assignedDsaName || db.users.find((u) => u.userId === assignedDsaId)?.fullName;
  }
  lead.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'LEAD_ASSIGNED',
    module: 'leads',
    recordId: lead.leadId,
    reason: `Assigned to Staff: ${assignedStaffId || 'N/A'}, DSA: ${assignedDsaId || 'N/A'}`,
    ip: getClientIp(req),
  });

  return res.json(lead);
});

// Convert Lead to Customer
api.post('/leads/:id/convert-to-customer', authenticate, requirePermission('customers', 'add'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const lead = db.leads.find((l) => l.id === id || l.leadId === id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  const user = req.user!;
  const now = new Date();
  const count = db.customers.length + 1;
  const customerId = generateEntityId('CUS', count, now);
  const clientLoginId = `CL-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newCustomer: Customer = {
    id: `cust-${Date.now()}`,
    customerId,
    clientLoginId,
    businessName: lead.businessName,
    ownerName: lead.ownerName,
    mobile: lead.mobile,
    whatsapp: lead.whatsapp || lead.mobile,
    email: lead.email,
    address: lead.address || '',
    city: lead.city || '',
    state: lead.state || '',
    pinCode: lead.pinCode,
    websiteDomain: lead.existingWebsiteUrl || '',
    websiteType: lead.websiteType || lead.businessCategory || 'Business Website',
    packageId: lead.packageId,
    totalAmount: lead.estimatedBudget || 0,
    amountReceived: 0,
    amountPending: lead.estimatedBudget || 0,
    websiteStatus: 'Planning',
    supportStatus: 'Pending',
    notes: `Converted from Lead ${lead.leadId}. ${lead.notes || ''}`,
    leadId: lead.leadId,
    createdBy: user.userId,
    assignedStaffId: lead.assignedStaffId || (user.role === 'STAFF' ? user.userId : undefined),
    assignedStaffName: lead.assignedStaffName,
    assignedDsaId: lead.assignedDsaId || (user.role === 'DSA' ? user.userId : undefined),
    assignedDsaName: lead.assignedDsaName,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Optional: create Client login if requested or by default
  const clientPassword = req.body.password || 'Client123@#';
  const hashed = hashPassword(clientPassword);
  const clientUser: User = {
    id: `user-client-${Date.now()}`,
    userId: clientLoginId,
    role: 'CLIENT',
    fullName: lead.ownerName,
    mobile: lead.mobile,
    whatsapp: lead.whatsapp || lead.mobile,
    email: lead.email || `${clientLoginId.toLowerCase()}@client.vishalenterprises.com`,
    status: 'active',
    firstLogin: false,
    passwordChanged: true,
    pinConfigured: false,
    passwordHash: hashed.hash,
    passwordSalt: hashed.salt,
    pinHash: null,
    pinSalt: null,
    businessName: lead.businessName,
    joiningDate: now.toISOString().split('T')[0],
    customerId: customerId,
    clientLoginId: clientLoginId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.users.push(clientUser);

  // Update lead status to Won
  lead.status = 'Won';
  lead.updatedAt = now.toISOString();

  db.customers.unshift(newCustomer);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'LEAD_CONVERTED_TO_CUSTOMER',
    module: 'leads',
    recordId: lead.leadId,
    newValue: `Customer ${customerId} created`,
    ip: getClientIp(req),
  });

  return res.json({ customer: newCustomer, clientUser: { userId: clientLoginId, role: 'CLIENT' } });
});

// Mark Lead Lost with Reason
api.post('/leads/:id/mark-lost', authenticate, requirePermission('leads', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { lostReason, notes } = req.body;
  const db = getDb();
  const lead = db.leads.find((l) => l.id === id || l.leadId === id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  lead.status = 'Not Interested';
  lead.lostReason = lostReason;
  lead.lostNotes = notes;
  if (notes) lead.notes = `${lead.notes || ''}\n[Lost Reason: ${lostReason || 'Not specified'}] ${notes}`;
  lead.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: req.user!.role,
    action: 'LEAD_MARKED_LOST',
    module: 'leads',
    recordId: lead.leadId,
    reason: lostReason,
    ip: getClientIp(req),
  });

  return res.json({ success: true, lead });
});

// List available assignees (Staff & DSA)
api.get('/admin/assignees', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const staff = db.users.filter((u) => u.role === 'STAFF').map(sanitizeUser);
  const dsa = db.users.filter((u) => u.role === 'DSA').map(sanitizeUser);
  return res.json({ staff, dsa });
});

// ==========================================
// CUSTOMERS MANAGEMENT
// ==========================================

api.get('/customers', authenticate, requirePermission('customers', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.customers;

  if (user.role === 'DSA') {
    list = list.filter((c) => c.assignedDsaId === user.userId || c.createdBy === user.userId);
  } else if (user.role === 'STAFF') {
    const scope = user.permissions?.dataScope || 'own';
    if (scope === 'own') {
      list = list.filter((c) => c.createdBy === user.userId || c.assignedStaffId === user.userId);
    } else if (scope === 'assigned') {
      list = list.filter((c) => c.assignedStaffId === user.userId);
    }
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.post('/customers', authenticate, requirePermission('customers', 'add'), (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.businessName || !data.ownerName || !data.mobile) {
    return res.status(400).json({ error: 'Business Name, Owner Name, and Mobile are required.' });
  }

  const db = getDb();
  const count = db.customers.length + 1;
  const now = new Date();
  const customerId = generateEntityId('CUS', count, now);
  const clientLoginId = data.clientLoginId || `CL-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const user = req.user!;
  const newCustomer: Customer = {
    id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    customerId,
    clientLoginId,
    accountStatus: data.accountStatus || 'Active',
    businessName: data.businessName,
    ownerName: data.ownerName,
    contactPerson: data.contactPerson || data.ownerName,
    designation: data.designation,
    mobile: data.mobile,
    alternateMobile: data.alternateMobile,
    whatsapp: data.whatsapp || data.mobile,
    email: data.email,
    address: data.address,
    city: data.city || '',
    state: data.state || '',
    pinCode: data.pinCode,
    businessCategory: data.businessCategory || 'General Business',
    businessDescription: data.businessDescription,
    googleBusinessUrl: data.googleBusinessUrl,
    existingWebsite: Boolean(data.existingWebsite),
    existingWebsiteUrl: data.existingWebsiteUrl,
    websiteDomain: data.websiteDomain || data.existingWebsiteUrl || '',
    websiteType: data.websiteType || 'Business Website',
    interestedServiceId: data.interestedServiceId,
    packageId: data.packageId,
    packageName: data.packageName,
    numberOfPages: data.numberOfPages,
    requiredFeatures: data.requiredFeatures || [],
    domainAvailable: Boolean(data.domainAvailable),
    hostingAvailable: Boolean(data.hostingAvailable),
    domainRequired: Boolean(data.domainRequired),
    hostingRequired: Boolean(data.hostingRequired),
    specialRequirements: data.specialRequirements,
    kycStatus: data.kycStatus || 'pending',
    kycProofType: data.kycProofType,
    kycProofUrl: data.kycProofUrl,
    kycNotes: data.kycNotes,
    totalAmount: Number(data.totalAmount || 0),
    amountReceived: Number(data.amountReceived || 0),
    amountPending: Number(data.totalAmount || 0) - Number(data.amountReceived || 0),
    developer: data.developer,
    websiteStatus: data.websiteStatus || 'Planning',
    deliveryDate: data.deliveryDate,
    renewalDate: data.renewalDate,
    supportStatus: data.supportStatus || 'Pending',
    notes: data.notes,
    leadId: data.leadId,
    createdBy: user.userId,
    assignedStaffId: user.role === 'STAFF' ? user.userId : data.assignedStaffId,
    assignedStaffName: data.assignedStaffName || (user.role === 'STAFF' ? user.fullName : undefined),
    assignedDsaId: user.role === 'DSA' ? user.userId : data.assignedDsaId,
    assignedDsaName: data.assignedDsaName || (user.role === 'DSA' ? user.fullName : undefined),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // Create Client login account
  const clientPassword = data.password || 'Client123@#';
  const hashed = hashPassword(clientPassword);
  const clientUser: User = {
    id: `user-client-${Date.now()}`,
    userId: clientLoginId,
    role: 'CLIENT',
    fullName: data.ownerName,
    mobile: data.mobile,
    whatsapp: data.whatsapp || data.mobile,
    email: data.email || `${clientLoginId.toLowerCase()}@client.vishalenterprises.com`,
    status: 'active',
    firstLogin: false,
    passwordChanged: true,
    pinConfigured: false,
    passwordHash: hashed.hash,
    passwordSalt: hashed.salt,
    pinHash: null,
    pinSalt: null,
    businessName: data.businessName,
    joiningDate: now.toISOString().split('T')[0],
    customerId: customerId,
    clientLoginId: clientLoginId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.users.push(clientUser);

  db.customers.unshift(newCustomer);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'CUSTOMER_CREATED',
    module: 'customers',
    recordId: customerId,
    newValue: data.businessName,
    ip: getClientIp(req),
  });

  return res.json({ customer: newCustomer, clientUser: { userId: clientLoginId, role: 'CLIENT' } });
});

api.put('/customers/:id', authenticate, requirePermission('customers', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const customer = db.customers.find((c) => c.id === id || c.customerId === id);
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  const user = req.user!;
  if (user.role === 'DSA' && customer.assignedDsaId !== user.userId && customer.createdBy !== user.userId) {
    return res.status(403).json({ error: 'Access Denied to this customer.' });
  }

  const updatedData = { ...req.body };
  if (updatedData.totalAmount !== undefined || updatedData.amountReceived !== undefined) {
    const total = Number(updatedData.totalAmount !== undefined ? updatedData.totalAmount : customer.totalAmount);
    const rec = Number(updatedData.amountReceived !== undefined ? updatedData.amountReceived : customer.amountReceived);
    updatedData.totalAmount = total;
    updatedData.amountReceived = rec;
    updatedData.amountPending = Math.max(0, total - rec);
  }

  Object.assign(customer, {
    ...updatedData,
    updatedAt: new Date().toISOString(),
  });
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'CUSTOMER_UPDATED',
    module: 'customers',
    recordId: customer.customerId,
    ip: getClientIp(req),
  });

  return res.json(customer);
});

// ==========================================
// FOLLOW-UPS
// ==========================================

api.get('/followups', authenticate, requirePermission('followups', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.followups;

  if (user.role !== 'ADMIN') {
    list = list.filter((f) => f.assignedUserId === user.userId);
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.post('/followups', authenticate, requirePermission('followups', 'add'), (req: AuthRequest, res: Response) => {
  const { targetType, targetId, targetName, date, time, type, notes } = req.body;
  if (!targetId || !date) {
    return res.status(400).json({ error: 'Target ID and Follow-up Date are required.' });
  }

  const db = getDb();
  const user = req.user!;
  const followCount = db.followups.length + 1;
  const followupId = `FOL-${Date.now().toString().slice(-4)}-${String(followCount).padStart(3, '0')}`;

  const newFollowup: FollowUp = {
    id: `fol-${Date.now()}`,
    followupId,
    targetType: targetType || 'Lead',
    targetId,
    targetName: targetName || '',
    date,
    time: time || '11:00',
    type: type || 'Call',
    assignedUserId: user.userId,
    assignedUserName: user.fullName,
    notes: notes || '',
    status: 'Scheduled',
    createdAt: new Date().toISOString(),
  };

  db.followups.unshift(newFollowup);
  saveDb(db);

  return res.json(newFollowup);
});

api.put('/followups/:id', authenticate, requirePermission('followups', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const f = db.followups.find((x) => x.id === id || x.followupId === id);
  if (!f) return res.status(404).json({ error: 'Follow-up not found.' });

  const oldStatus = f.status;
  Object.assign(f, req.body);
  saveDb(db);

  if (req.body.status && req.body.status !== oldStatus) {
    addAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      role: req.user!.role,
      action: 'FOLLOWUP_UPDATED',
      module: 'followups',
      recordId: f.followupId,
      oldValue: oldStatus,
      newValue: req.body.status,
      reason: req.body.result || 'Follow-up updated',
      ip: getClientIp(req),
    });
  }

  return res.json(f);
});

api.put('/followups/:id/complete', authenticate, requirePermission('followups', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { result } = req.body;
  const db = getDb();
  const f = db.followups.find((x) => x.id === id || x.followupId === id);
  if (!f) return res.status(404).json({ error: 'Follow-up not found.' });

  f.status = 'Completed';
  f.result = result || f.result || 'Completed';
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: 'FOLLOWUP_COMPLETED',
    module: 'followups',
    recordId: f.followupId,
    reason: result || 'Marked completed from Admin Console',
    ip: getClientIp(req),
  });

  return res.json({ success: true, followup: f });
});

api.put('/followups/:id/reschedule', authenticate, requirePermission('followups', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { date, time, notes } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'New follow-up date is required.' });
  }

  const db = getDb();
  const f = db.followups.find((x) => x.id === id || x.followupId === id);
  if (!f) return res.status(404).json({ error: 'Follow-up not found.' });

  const oldDate = `${f.date} ${f.time}`;
  f.date = date;
  if (time) f.time = time;
  if (notes) f.notes = notes;
  f.status = 'Scheduled';
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: req.user!.role,
    action: 'FOLLOWUP_RESCHEDULED',
    module: 'followups',
    recordId: f.followupId,
    oldValue: oldDate,
    newValue: `${date} ${time || f.time}`,
    reason: notes || 'Rescheduled from Admin Console',
    ip: getClientIp(req),
  });

  return res.json({ success: true, followup: f });
});

// ==========================================
// SALES & COMMISSIONS
// ==========================================

api.get('/sales', authenticate, requirePermission('sales', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.sales;
  const { agentId } = req.query;

  if (agentId) {
    list = list.filter((s) => s.staffOrDsaId === agentId);
  } else if (user.role === 'DSA') {
    list = list.filter((s) => s.staffOrDsaId === user.userId);
  } else if (user.role === 'STAFF') {
    const scope = user.permissions?.dataScope || 'own';
    if (scope === 'own' || scope === 'assigned') {
      list = list.filter((s) => s.staffOrDsaId === user.userId);
    }
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// Create Sale
api.post('/sales', authenticate, requirePermission('sales', 'add'), (req: AuthRequest, res: Response) => {
  const {
    leadId,
    customerId,
    customerName,
    businessName,
    serviceId,
    serviceName,
    packageId,
    packageName,
    saleAmount,
    discount,
    assignedStaffOrDsaId,
    assignedRole,
    notes,
  } = req.body;

  if (!customerName || !businessName || !saleAmount || !serviceName) {
    return res.status(400).json({ error: 'Customer Name, Business Name, Service, and Sale Amount are required.' });
  }

  const db = getDb();
  const user = req.user!;
  const now = new Date();
  const saleCount = db.sales.length + 1;
  const saleId = `SALE-${now.getFullYear()}-${String(saleCount).padStart(3, '0')}`;

  const finalAmount = Number(saleAmount) - Number(discount || 0);

  // Determine who gets credit
  let partnerId = user.userId;
  let partnerName = user.fullName;
  let partnerRole = user.role;

  if (user.role === 'ADMIN' && assignedStaffOrDsaId) {
    const partner = db.users.find((u) => u.userId === assignedStaffOrDsaId);
    if (partner) {
      partnerId = partner.userId;
      partnerName = partner.fullName;
      partnerRole = partner.role;
    }
  }

  // DSA Commission rule: rate from settings (default 10%)
  // Status starts as "Pending" and ONLY becomes "Available" after website delivery!
  const isDsa = partnerRole === 'DSA';
  const dsaRate = (db.settings?.dsaCommissionPercentage ?? db.settings?.crmConfig?.dsaCommissionRate ?? 10) / 100;
  const commissionAmount = isDsa ? Math.round(finalAmount * dsaRate) : 0;
  const commissionStatus = isDsa ? 'Pending' : 'Pending';

  const newSale: Sale = {
    id: `sale-${Date.now()}`,
    saleId,
    leadId,
    customerId: customerId || `CUST-${Date.now().toString().slice(-4)}`,
    customerName,
    businessName,
    staffOrDsaId: partnerId,
    staffOrDsaName: partnerName,
    staffOrDsaRole: partnerRole,
    serviceId: serviceId || 'srv-1',
    serviceName,
    packageId,
    packageName,
    saleAmount: Number(saleAmount),
    discount: Number(discount || 0),
    finalAmount,
    paymentStatus: 'Pending',
    developmentStatus: 'Pending',
    deliveryStatus: 'Pending',
    commissionAmount,
    commissionStatus,
    notes,
    createdBy: user.userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.sales.unshift(newSale);

  // Also automatically create website project in pipeline
  const projCount = db.projects.length + 1;
  const newProject: WebsiteProject = {
    id: `prj-${Date.now()}`,
    projectId: `PRJ-${now.getFullYear()}-${String(projCount).padStart(3, '0')}`,
    customerId: newSale.customerId,
    customerName,
    businessName,
    serviceId: newSale.serviceId,
    serviceName,
    packageId,
    packageName,
    startDate: now.toISOString().split('T')[0],
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'Payment Received',
    revisionCount: 0,
    saleId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.projects.unshift(newProject);

  saveDb(db);

  notifyAdmins(
    'New Website Sale Recorded',
    `Sale ${saleId} of ₹${Number(finalAmount || 0).toLocaleString()} recorded by ${partnerName} (${partnerRole}).`,
    '/sales'
  );

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'SALE_CREATED',
    module: 'sales',
    recordId: saleId,
    newValue: `Amount: ₹${finalAmount}`,
    ip: getClientIp(req),
  });

  return res.json(newSale);
});

// Update sale delivery status - CRITICAL RULE:
// Only Admin can mark delivery or authorize delivery completion.
// When deliveryStatus becomes "Delivered", DSA commission becomes "Available"!
api.put('/sales/:id/status', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { paymentStatus, developmentStatus, deliveryStatus, commissionStatus, reason } = req.body;
  const user = req.user!;

  const db = getDb();
  const sale = db.sales.find((s) => s.id === id || s.saleId === id);
  if (!sale) return res.status(404).json({ error: 'Sale record not found.' });

  // Security check: Staff and DSA CANNOT manipulate delivery or commission
  if (user.role !== 'ADMIN' && (deliveryStatus || commissionStatus)) {
    return res.status(403).json({
      error: 'Only Admin has permission to mark delivery completion and approve commission availability.',
    });
  }

  const oldDelivery = sale.deliveryStatus;
  const oldComm = sale.commissionStatus;

  if (paymentStatus) sale.paymentStatus = paymentStatus;
  if (developmentStatus) sale.developmentStatus = developmentStatus;

  if (deliveryStatus && user.role === 'ADMIN') {
    sale.deliveryStatus = deliveryStatus;
    if (deliveryStatus === 'Delivered') {
      sale.deliveryDate = new Date().toISOString().split('T')[0];
      // Commission becomes available upon delivery!
      if (sale.staffOrDsaRole === 'DSA') {
        sale.commissionStatus = 'Available';
        addNotification({
          userId: sale.staffOrDsaId,
          title: 'Website Delivered - Commission Available!',
          message: `Website project for ${sale.businessName} has been delivered. Your commission of ₹${Number(sale.commissionAmount || 0).toLocaleString()} is now Available.`,
          link: '/commission',
        });
      }
    }
  }

  // Admin manual commission adjustment
  if (commissionStatus && user.role === 'ADMIN') {
    sale.commissionStatus = commissionStatus;
  }

  sale.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'SALE_STATUS_UPDATED',
    module: 'sales',
    recordId: sale.saleId,
    oldValue: `Delivery: ${oldDelivery}, Commission: ${oldComm}`,
    newValue: `Delivery: ${sale.deliveryStatus}, Commission: ${sale.commissionStatus}`,
    reason: reason || 'Sale status update',
    ip: getClientIp(req),
  });

  return res.json(sale);
});

// ==========================================
// SERVICES & PACKAGES
// ==========================================

api.get('/services', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  return res.json(db.services || []);
});

api.post('/services', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, description, features, price, discount, duration, timeline, category, basePrice, deliveryDays, active } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Service name is required.' });
  }

  const featuresList = Array.isArray(features)
    ? features
    : typeof features === 'string'
    ? features.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  const newService: WebsiteService = {
    id: `srv-${Date.now()}`,
    name,
    description: description || category || 'Custom Website Development Solution',
    features: featuresList,
    price: Number(price || basePrice || 9999),
    discount: Number(discount || 0),
    duration: duration || 'Annual',
    timeline: timeline || (deliveryDays ? `${deliveryDays} Days` : '5-7 Days'),
    status: active !== false ? 'active' : 'inactive',
    createdAt: new Date().toISOString(),
  };

  db.services = db.services || [];
  db.services.push(newService);
  saveDb(db);

  return res.json(newService);
});

api.get('/packages', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  return res.json(db.packages || []);
});

api.post('/packages', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { name, serviceId, features, price, discount, paymentTerms, deliveryTime, renewalPrice, maintenanceTerms, active } = req.body;
  if (!name || !serviceId) {
    return res.status(400).json({ error: 'Package name and Service ID are required.' });
  }

  const service = (db.services || []).find((s) => s.id === serviceId);
  const pkgPrice = Number(price || 9999);
  const pkgDiscount = Number(discount || 0);

  const newPkg: ServicePackage = {
    id: `pkg-${Date.now()}`,
    packageId: `PKG-${Date.now().toString().slice(-4)}`,
    name,
    serviceId,
    serviceName: service?.name || 'Website Service',
    features: Array.isArray(features) ? features : typeof features === 'string' ? features.split(',').map((f) => f.trim()).filter(Boolean) : [],
    price: pkgPrice,
    discount: pkgDiscount,
    finalPrice: Math.max(0, pkgPrice - pkgDiscount),
    paymentTerms: paymentTerms || '50% Advance, 50% on Delivery',
    deliveryTime: deliveryTime || '7 Days',
    renewalPrice: Number(renewalPrice || 3500),
    maintenanceTerms: maintenanceTerms || 'Includes 1 Year Hosting, SSL, and technical bug fixes',
    status: active !== false ? 'active' : 'inactive',
    createdAt: new Date().toISOString(),
  };

  db.packages = db.packages || [];
  db.packages.push(newPkg);
  saveDb(db);

  return res.json(newPkg);
});

// ==========================================
// PROPOSALS / QUOTATIONS
// ==========================================

// Helper: Check proposal access according to user role and dataScope
function canUserAccessProposal(user: User, proposal: Proposal): boolean {
  if (user.role === 'ADMIN') return true;

  if (user.role === 'STAFF') {
    const scope = user.permissions?.dataScope || 'own';
    if (scope === 'all') return true;
    if (scope === 'team') {
      // In team scope, staff can view proposals within their team or department
      return true;
    }
    if (scope === 'assigned') {
      return proposal.assignedStaffId === user.userId;
    }
    // 'own': created by or assigned to staff
    return proposal.createdBy === user.userId || proposal.assignedStaffId === user.userId;
  }

  if (user.role === 'DSA') {
    // DSA can only see own created or assigned proposals
    return proposal.createdBy === user.userId || proposal.assignedDsaId === user.userId;
  }

  return false;
}

// Helper: Generate unique auto-incrementing Proposal ID format: PROP-YYYY-XXXX
function generateUniqueProposalId(db: ReturnType<typeof getDb>): string {
  const currentYear = new Date().getFullYear();
  const prefix = `PROP-${currentYear}-`;
  const existingNumbers = db.proposals
    .map((p) => {
      if (p.proposalId && p.proposalId.startsWith(prefix)) {
        const numPart = parseInt(p.proposalId.replace(prefix, ''), 10);
        return isNaN(numPart) ? 0 : numPart;
      }
      return 0;
    })
    .filter((n) => n > 0);

  const nextNum = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0) + 1;
  const proposalId = `${prefix}${String(nextNum).padStart(4, '0')}`;
  return proposalId;
}

// Helper: Automatic Proposal Expiration
function checkAndExpireProposals(db: ReturnType<typeof getDb>): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  let modified = false;

  for (const proposal of db.proposals) {
    if (
      proposal.validUntil &&
      proposal.validUntil < todayStr &&
      ['Draft', 'Sent', 'Viewed', 'Negotiation'].includes(proposal.status)
    ) {
      proposal.status = 'Expired';
      proposal.updatedAt = new Date().toISOString();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      proposal.activities = proposal.activities || [];
      proposal.activities.unshift({
        id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        proposalId: proposal.proposalId,
        userId: 'SYSTEM',
        userName: 'System Automation',
        userRole: 'ADMIN',
        action: 'Proposal Expired',
        date: dateStr,
        exactTime: timeStr,
        notes: `Proposal validity date (${proposal.validUntil}) passed. Automatically transitioned to Expired.`,
        createdAt: now.toISOString(),
      });
      modified = true;
    }
  }

  return modified;
}

// 1. Get Proposals List (Role & DataScope isolated + Auto-Expiration)
api.get('/proposals', authenticate, requirePermission('proposals', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;

  // Check and apply automatic expirations
  if (checkAndExpireProposals(db)) {
    saveDb(db);
  }

  // Filter list by user role and permission data scope
  let list = db.proposals.filter((p) => canUserAccessProposal(user, p));

  // If DSA, further filter by permitted services if defined
  if (user.role === 'DSA' && user.permissions?.permittedServices && user.permissions.permittedServices.length > 0) {
    const allowed = user.permissions.permittedServices;
    list = list.filter((p) => !p.serviceId || allowed.includes(p.serviceId));
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// 2. Summary statistics directly from real database records (no fake/hardcoded numbers)
api.get('/proposals/summary', authenticate, requirePermission('proposals', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;

  if (checkAndExpireProposals(db)) {
    saveDb(db);
  }

  const list = db.proposals.filter((p) => canUserAccessProposal(user, p));

  const totalProposals = list.length;
  const draft = list.filter((p) => p.status === 'Draft').length;
  const sent = list.filter((p) => p.status === 'Sent').length;
  const viewed = list.filter((p) => p.status === 'Viewed').length;
  const negotiation = list.filter((p) => p.status === 'Negotiation').length;
  const accepted = list.filter((p) => p.status === 'Accepted').length;
  const rejected = list.filter((p) => p.status === 'Rejected').length;
  const expired = list.filter((p) => p.status === 'Expired').length;
  const convertedToSale = list.filter((p) => p.status === 'Converted to Sale').length;
  const totalQuotedAmount = list.reduce((sum, p) => sum + (Number(p.finalAmount) || Number(p.quotedAmount) || 0), 0);

  return res.json({
    totalProposals,
    draft,
    sent,
    viewed,
    negotiation,
    accepted,
    rejected,
    expired,
    convertedToSale,
    totalQuotedAmount,
  });
});

// 3. Get Single Proposal by ID
api.get('/proposals/:id', authenticate, requirePermission('proposals', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;

  if (checkAndExpireProposals(db)) {
    saveDb(db);
  }

  const proposal = db.proposals.find((p) => p.id === id || p.proposalId === id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  if (!canUserAccessProposal(user, proposal)) {
    return res.status(403).json({ error: 'Access Denied. You are not authorized to view this quotation.' });
  }

  return res.json(proposal);
});

// 4. Create Proposal / Quotation
api.post('/proposals', authenticate, requirePermission('proposals', 'add'), (req: AuthRequest, res: Response) => {
  const {
    leadId,
    customerId,
    businessName,
    contactPerson,
    mobile,
    whatsapp,
    email,
    address,
    city,
    state,
    serviceId,
    serviceName,
    packageId,
    packageName,
    deliveryTimeline,
    features,
    renewalPrice,
    maintenanceTerms,
    basePrice,
    additionalCharges,
    discount,
    taxRate,
    advancePercentage,
    advanceAmount: customAdvanceAmount,
    paymentTerms,
    paymentMilestones,
    terms,
    validUntil,
    assignedStaffId,
    assignedStaffName,
    assignedDsaId,
    assignedDsaName,
    notes,
  } = req.body;

  if (!businessName || !contactPerson || !mobile || !serviceName || basePrice === undefined) {
    return res.status(400).json({
      error: 'Business Name, Contact Person, Mobile, Service Name, and Base Price are required.',
    });
  }

  if (!validUntil) {
    return res.status(400).json({ error: 'Valid Until date is required.' });
  }

  const db = getDb();
  const user = req.user!;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const proposalId = generateUniqueProposalId(db);

  // Financial calculations
  const parsedBasePrice = Math.max(0, Number(basePrice) || 0);
  const cleanAdditionalCharges = Array.isArray(additionalCharges)
    ? additionalCharges.map((item: any, idx: number) => ({
        id: item.id || `chg-${Date.now()}-${idx}`,
        title: String(item.title || 'Additional Feature / Charge').trim(),
        amount: Math.max(0, Number(item.amount) || 0),
      }))
    : [];

  const totalAdditionalCharges = cleanAdditionalCharges.reduce((acc, it) => acc + it.amount, 0);
  const quotedAmount = parsedBasePrice + totalAdditionalCharges;

  // Enforce discount permission: Staff/DSA discount is capped at 15% unless Admin
  let allowedDiscount = Math.max(0, Number(discount) || 0);
  if (user.role !== 'ADMIN') {
    const maxAllowedDiscount = Math.round(quotedAmount * 0.15);
    if (allowedDiscount > maxAllowedDiscount) {
      return res.status(400).json({
        error: `Discount exceeds your authorized limit (Maximum 15% = ₹${maxAllowedDiscount}). Please contact Admin for higher discount approval.`,
      });
    }
  }

  const parsedTaxRate = Math.max(0, Number(taxRate) || 0);
  const taxableAmount = Math.max(0, quotedAmount - allowedDiscount);
  const taxAmount = parsedTaxRate > 0 ? Math.round(taxableAmount * (parsedTaxRate / 100)) : 0;
  const finalAmount = taxableAmount + taxAmount;

  const parsedAdvancePct = Number(advancePercentage) > 0 ? Number(advancePercentage) : 50;
  const calculatedAdvance = customAdvanceAmount !== undefined && customAdvanceAmount !== null && customAdvanceAmount !== ''
    ? Math.min(finalAmount, Math.max(0, Number(customAdvanceAmount)))
    : Math.round(finalAmount * (parsedAdvancePct / 100));
  const remainingAmount = Math.max(0, finalAmount - calculatedAdvance);

  // Default terms fallback
  const proposalTerms = {
    validityDays: Number(terms?.validityDays) || 15,
    paymentTerms: terms?.paymentTerms || paymentTerms || '50% Advance on agreement, 50% upon project delivery and domain launch.',
    developmentTimeline: terms?.developmentTimeline || deliveryTimeline || '5-7 Days from complete content receipt',
    revisionLimit: terms?.revisionLimit || 'Up to 3 rounds of design revisions included',
    contentResponsibility: terms?.contentResponsibility || 'Client shall furnish all text, logos, graphics, and product catalog details in digital format.',
    domainHostingTerms: terms?.domainHostingTerms || 'Includes 1 Year Domain (.com/.in) and High-Speed SSD Cloud Server with SSL.',
    maintenanceTerms: terms?.maintenanceTerms || maintenanceTerms || '1 Year complimentary bug fixes and technical monitoring.',
    cancellationRefundTerms: terms?.cancellationRefundTerms || 'Advance payment is non-refundable once design drafting or server setup has commenced.',
    otherConditions: terms?.otherConditions || 'Full intellectual property and source files transfer to client upon 100% final balance clearance.',
  };

  // Determine ownership and assignment
  let assignedStaff = assignedStaffId;
  let assignedStaffLabel = assignedStaffName;
  let assignedDsa = assignedDsaId;
  let assignedDsaLabel = assignedDsaName;

  if (user.role === 'STAFF') {
    assignedStaff = user.userId;
    assignedStaffLabel = user.fullName;
  } else if (user.role === 'DSA') {
    assignedDsa = user.userId;
    assignedDsaLabel = user.fullName;
  }

  const initialActivity: ProposalActivity = {
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposalId,
    userId: user.userId,
    userName: user.fullName,
    userRole: user.role,
    action: 'Proposal Created',
    date: dateStr,
    exactTime: timeStr,
    notes: `Quotation created for ${businessName} (Service: ${serviceName}, Final Amount: ₹${finalAmount}).`,
    createdAt: now.toISOString(),
  };

  const newProposal: Proposal = {
    id: `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    proposalId,
    status: 'Draft',
    leadId: leadId || undefined,
    customerId: customerId || undefined,
    businessName: businessName.trim(),
    contactPerson: contactPerson.trim(),
    mobile: mobile.trim(),
    whatsapp: whatsapp?.trim() || mobile.trim(),
    email: email?.trim() || undefined,
    address: address?.trim() || undefined,
    city: city?.trim() || undefined,
    state: state?.trim() || undefined,

    serviceId: serviceId || 'srv-1',
    serviceName: serviceName.trim(),
    packageId: packageId || undefined,
    packageName: packageName?.trim() || undefined,
    deliveryTimeline: deliveryTimeline?.trim() || '5-7 Days',
    features: Array.isArray(features) ? features : [],
    renewalPrice: renewalPrice !== undefined ? Number(renewalPrice) : undefined,
    maintenanceTerms: maintenanceTerms?.trim() || undefined,

    basePrice: parsedBasePrice,
    additionalCharges: cleanAdditionalCharges,
    totalAdditionalCharges,
    quotedAmount,
    discount: allowedDiscount,
    taxRate: parsedTaxRate,
    taxAmount,
    finalAmount,
    advancePercentage: parsedAdvancePct,
    advanceAmount: calculatedAdvance,
    remainingAmount,

    paymentTerms: proposalTerms.paymentTerms,
    paymentMilestones: Array.isArray(paymentMilestones) ? paymentMilestones : undefined,
    terms: proposalTerms,

    proposalDate: dateStr,
    validUntil,

    preparedByUserId: user.userId,
    preparedByName: user.fullName,
    assignedStaffId: assignedStaff,
    assignedStaffName: assignedStaffLabel,
    assignedDsaId: assignedDsa,
    assignedDsaName: assignedDsaLabel,

    notes: notes?.trim() || undefined,
    activities: [initialActivity],
    communications: [],

    createdBy: user.userId,
    createdByName: user.fullName,
    createdByRole: user.role,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.proposals.unshift(newProposal);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_CREATED',
    module: 'proposals',
    recordId: proposalId,
    newValue: `Created proposal ${proposalId} for ${businessName} (₹${finalAmount})`,
    ip: getClientIp(req),
  });

  return res.json(newProposal);
});

// 5. Update / Edit Proposal
api.put('/proposals/:id', authenticate, requirePermission('proposals', 'edit'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;

  const proposalIndex = db.proposals.findIndex((p) => p.id === id || p.proposalId === id);
  if (proposalIndex === -1) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  const existing = db.proposals[proposalIndex];
  if (!canUserAccessProposal(user, existing)) {
    return res.status(403).json({ error: 'Access Denied. You are not authorized to edit this quotation.' });
  }

  if (existing.status === 'Converted to Sale' && user.role !== 'ADMIN') {
    return res.status(400).json({ error: 'Cannot edit proposal after it has been converted to a Sale.' });
  }

  const data = req.body;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const parsedBasePrice = data.basePrice !== undefined ? Math.max(0, Number(data.basePrice)) : existing.basePrice;
  const cleanAdditionalCharges = Array.isArray(data.additionalCharges)
    ? data.additionalCharges.map((item: any, idx: number) => ({
        id: item.id || `chg-${Date.now()}-${idx}`,
        title: String(item.title || 'Additional Feature').trim(),
        amount: Math.max(0, Number(item.amount) || 0),
      }))
    : existing.additionalCharges || [];

  const totalAdditionalCharges = cleanAdditionalCharges.reduce((acc, it) => acc + it.amount, 0);
  const quotedAmount = parsedBasePrice + totalAdditionalCharges;

  let allowedDiscount = data.discount !== undefined ? Math.max(0, Number(data.discount)) : existing.discount;
  if (user.role !== 'ADMIN') {
    const maxAllowedDiscount = Math.round(quotedAmount * 0.15);
    if (allowedDiscount > maxAllowedDiscount) {
      return res.status(400).json({
        error: `Discount exceeds your authorized limit (Maximum 15% = ₹${maxAllowedDiscount}).`,
      });
    }
  }

  const parsedTaxRate = data.taxRate !== undefined ? Math.max(0, Number(data.taxRate)) : (existing.taxRate || 0);
  const taxableAmount = Math.max(0, quotedAmount - allowedDiscount);
  const taxAmount = parsedTaxRate > 0 ? Math.round(taxableAmount * (parsedTaxRate / 100)) : 0;
  const finalAmount = taxableAmount + taxAmount;

  const parsedAdvancePct = data.advancePercentage !== undefined ? Number(data.advancePercentage) : existing.advancePercentage;
  const calculatedAdvance = data.advanceAmount !== undefined
    ? Math.min(finalAmount, Math.max(0, Number(data.advanceAmount)))
    : Math.round(finalAmount * (parsedAdvancePct / 100));
  const remainingAmount = Math.max(0, finalAmount - calculatedAdvance);

  const updatedActivities = existing.activities || [];
  updatedActivities.unshift({
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposalId: existing.proposalId,
    userId: user.userId,
    userName: user.fullName,
    userRole: user.role,
    action: 'Proposal Edited',
    date: dateStr,
    exactTime: timeStr,
    notes: data.editReason || `Quotation details updated (Final Amount: ₹${finalAmount}).`,
    createdAt: now.toISOString(),
  });

  const updatedProposal: Proposal = {
    ...existing,
    businessName: data.businessName ? data.businessName.trim() : existing.businessName,
    contactPerson: data.contactPerson ? data.contactPerson.trim() : existing.contactPerson,
    mobile: data.mobile ? data.mobile.trim() : existing.mobile,
    whatsapp: data.whatsapp !== undefined ? data.whatsapp.trim() : existing.whatsapp,
    email: data.email !== undefined ? data.email.trim() : existing.email,
    address: data.address !== undefined ? data.address.trim() : existing.address,
    city: data.city !== undefined ? data.city.trim() : existing.city,
    state: data.state !== undefined ? data.state.trim() : existing.state,

    serviceId: data.serviceId || existing.serviceId,
    serviceName: data.serviceName ? data.serviceName.trim() : existing.serviceName,
    packageId: data.packageId !== undefined ? data.packageId : existing.packageId,
    packageName: data.packageName !== undefined ? data.packageName : existing.packageName,
    deliveryTimeline: data.deliveryTimeline ? data.deliveryTimeline.trim() : existing.deliveryTimeline,
    features: Array.isArray(data.features) ? data.features : existing.features,
    renewalPrice: data.renewalPrice !== undefined ? Number(data.renewalPrice) : existing.renewalPrice,
    maintenanceTerms: data.maintenanceTerms !== undefined ? data.maintenanceTerms : existing.maintenanceTerms,

    basePrice: parsedBasePrice,
    additionalCharges: cleanAdditionalCharges,
    totalAdditionalCharges,
    quotedAmount,
    discount: allowedDiscount,
    taxRate: parsedTaxRate,
    taxAmount,
    finalAmount,
    advancePercentage: parsedAdvancePct,
    advanceAmount: calculatedAdvance,
    remainingAmount,

    paymentTerms: data.paymentTerms || existing.paymentTerms,
    paymentMilestones: Array.isArray(data.paymentMilestones) ? data.paymentMilestones : existing.paymentMilestones,
    terms: data.terms ? { ...existing.terms, ...data.terms } : existing.terms,
    validUntil: data.validUntil || existing.validUntil,

    assignedStaffId: user.role === 'ADMIN' && data.assignedStaffId !== undefined ? data.assignedStaffId : existing.assignedStaffId,
    assignedStaffName: user.role === 'ADMIN' && data.assignedStaffName !== undefined ? data.assignedStaffName : existing.assignedStaffName,
    assignedDsaId: user.role === 'ADMIN' && data.assignedDsaId !== undefined ? data.assignedDsaId : existing.assignedDsaId,
    assignedDsaName: user.role === 'ADMIN' && data.assignedDsaName !== undefined ? data.assignedDsaName : existing.assignedDsaName,

    notes: data.notes !== undefined ? data.notes : existing.notes,
    activities: updatedActivities,
    updatedAt: now.toISOString(),
  };

  db.proposals[proposalIndex] = updatedProposal;
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_EDITED',
    module: 'proposals',
    recordId: existing.proposalId,
    newValue: `Updated proposal ${existing.proposalId} (₹${finalAmount})`,
    ip: getClientIp(req),
  });

  return res.json(updatedProposal);
});

// 6. Update Proposal Status (Draft, Sent, Viewed, Negotiation, Accepted, Rejected, Expired)
api.put('/proposals/:id/status', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;
  const { status, notes } = req.body;

  const validStatuses: ProposalStatus[] = [
    'Draft',
    'Sent',
    'Viewed',
    'Negotiation',
    'Accepted',
    'Rejected',
    'Expired',
    'Converted to Sale',
  ];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const proposal = db.proposals.find((p) => p.id === id || p.proposalId === id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  if (!canUserAccessProposal(user, proposal)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  if (proposal.status === 'Converted to Sale' && status !== 'Converted to Sale' && user.role !== 'ADMIN') {
    return res.status(400).json({ error: 'This proposal has already been converted to a Sale.' });
  }

  const oldStatus = proposal.status;
  proposal.status = status;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  let actionTitle: ProposalActivity['action'] = 'Proposal Status Changed';
  if (status === 'Accepted') actionTitle = 'Proposal Accepted';
  else if (status === 'Rejected') actionTitle = 'Proposal Rejected';
  else if (status === 'Sent') actionTitle = 'Proposal Sent';
  else if (status === 'Viewed') actionTitle = 'Proposal Viewed';
  else if (status === 'Expired') actionTitle = 'Proposal Expired';

  proposal.activities = proposal.activities || [];
  proposal.activities.unshift({
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposalId: proposal.proposalId,
    userId: user.userId,
    userName: user.fullName,
    userRole: user.role,
    action: actionTitle,
    date: dateStr,
    exactTime: timeStr,
    notes: notes || `Status transitioned from "${oldStatus}" to "${status}".`,
    createdAt: now.toISOString(),
  });

  proposal.updatedAt = now.toISOString();

  // If lead is linked, keep lead pipeline stage aligned
  if (proposal.leadId) {
    const lead = db.leads.find((l) => l.leadId === proposal.leadId || l.id === proposal.leadId);
    if (lead) {
      if (status === 'Sent' && lead.status === 'Interested') {
        lead.status = 'Proposal Sent';
      } else if (status === 'Negotiation') {
        lead.status = 'Negotiation';
      }
      lead.updatedAt = now.toISOString();
    }
  }

  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_STATUS_CHANGED',
    module: 'proposals',
    recordId: proposal.proposalId,
    oldValue: oldStatus,
    newValue: status,
    reason: notes,
    ip: getClientIp(req),
  });

  return res.json(proposal);
});

// 7. Send Proposal Action (Logs exact time, user ID, role, method, recipient)
api.post('/proposals/:id/send', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;
  const { method, recipient, notes } = req.body;

  const proposal = db.proposals.find((p) => p.id === id || p.proposalId === id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  if (!canUserAccessProposal(user, proposal)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  // If currently Draft, transition to Sent
  if (proposal.status === 'Draft') {
    proposal.status = 'Sent';
  }

  proposal.activities = proposal.activities || [];
  proposal.activities.unshift({
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposalId: proposal.proposalId,
    userId: user.userId,
    userName: user.fullName,
    userRole: user.role,
    action: 'Proposal Sent',
    date: dateStr,
    exactTime: timeStr,
    method: method || 'WhatsApp',
    recipient: recipient || proposal.mobile,
    notes: notes || `Quotation sent via ${method || 'WhatsApp'} to ${recipient || proposal.mobile}.`,
    createdAt: now.toISOString(),
  });

  proposal.updatedAt = now.toISOString();

  // If lead linked, update to 'Proposal Sent'
  if (proposal.leadId) {
    const lead = db.leads.find((l) => l.leadId === proposal.leadId || l.id === proposal.leadId);
    if (lead && ['New', 'Contacted', 'Interested'].includes(lead.status)) {
      lead.status = 'Proposal Sent';
      lead.updatedAt = now.toISOString();
    }
  }

  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_SENT',
    module: 'proposals',
    recordId: proposal.proposalId,
    newValue: `Sent via ${method} to ${recipient || proposal.mobile}`,
    ip: getClientIp(req),
  });

  return res.json({ success: true, message: 'Proposal dispatch activity recorded.', proposal });
});

// 8. Add Communication Record to Proposal
api.post('/proposals/:id/communication', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;
  const { type, recipient, notes } = req.body;

  if (!notes || !type) {
    return res.status(400).json({ error: 'Communication Type and Notes are required.' });
  }

  const proposal = db.proposals.find((p) => p.id === id || p.proposalId === id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  if (!canUserAccessProposal(user, proposal)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const comm: ProposalCommunication = {
    id: `comm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: dateStr,
    time: timeStr,
    type: type || 'Phone Call',
    senderOrAgent: `${user.fullName} (${user.userId})`,
    recipient: recipient || proposal.contactPerson,
    notes,
    createdAt: now.toISOString(),
  };

  proposal.communications = proposal.communications || [];
  proposal.communications.unshift(comm);

  proposal.activities = proposal.activities || [];
  proposal.activities.unshift({
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposalId: proposal.proposalId,
    userId: user.userId,
    userName: user.fullName,
    userRole: user.role,
    action: 'Note Added',
    date: dateStr,
    exactTime: timeStr,
    notes: `[${type}] ${notes}`,
    createdAt: now.toISOString(),
  });

  proposal.updatedAt = now.toISOString();
  saveDb(db);

  return res.json({ success: true, communication: comm, proposal });
});

// 9. CONVERT PROPOSAL TO SALE (High-Priority Core CRM Flow)
api.post('/proposals/:id/convert-to-sale', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;

  const proposal = db.proposals.find((p) => p.id === id || p.proposalId === id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  if (!canUserAccessProposal(user, proposal)) {
    return res.status(403).json({ error: 'Access Denied. You cannot convert this quotation.' });
  }

  // Duplicate conversion prevention
  if (proposal.saleId || proposal.status === 'Converted to Sale') {
    return res.status(400).json({
      error: `This proposal has already been converted to Sale: ${proposal.saleId || 'SALE-EXISTING'}. Duplicate conversion is prohibited.`,
      saleId: proposal.saleId,
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  // 1. Ensure Customer ID exists in Customers directory
  let linkedCustomerId = proposal.customerId;
  if (!linkedCustomerId) {
    // Check if customer already exists with identical mobile or business
    const existingCust = db.customers.find(
      (c) => c.mobile === proposal.mobile || (c.businessName && c.businessName.toLowerCase() === proposal.businessName.toLowerCase())
    );

    if (existingCust) {
      linkedCustomerId = existingCust.customerId;
    } else {
      // Automatically create Customer record in the database
      const custCount = db.customers.length + 1;
      linkedCustomerId = `CUST-${now.getFullYear()}-${String(custCount).padStart(3, '0')}`;
      const newCustomer: Customer = {
        id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerId: linkedCustomerId,
        businessName: proposal.businessName,
        ownerName: proposal.contactPerson,
        mobile: proposal.mobile,
        whatsapp: proposal.whatsapp || proposal.mobile,
        email: proposal.email,
        address: proposal.address,
        city: proposal.city || '',
        state: proposal.state || '',
        websiteDomain: '',
        websiteType: proposal.serviceName || 'Business Website',
        packageId: proposal.packageId,
        packageName: proposal.packageName,
        totalAmount: proposal.finalAmount,
        amountReceived: 0,
        amountPending: proposal.finalAmount,
        websiteStatus: 'Planning',
        deliveryDate: undefined,
        renewalDate: undefined,
        supportStatus: 'Active',
        notes: `Auto-created from Proposal ${proposal.proposalId}`,
        createdBy: user.userId,
        assignedStaffId: proposal.assignedStaffId,
        assignedDsaId: proposal.assignedDsaId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      db.customers.unshift(newCustomer);
    }
    proposal.customerId = linkedCustomerId;
  }

  // 2. Generate unique SALE-YYYY-XXX ID
  const currentYear = now.getFullYear();
  const salePrefix = `SALE-${currentYear}-`;
  const existingSaleNumbers = db.sales
    .map((s) => {
      if (s.saleId && s.saleId.startsWith(salePrefix)) {
        const num = parseInt(s.saleId.replace(salePrefix, ''), 10);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    })
    .filter((n) => n > 0);

  const nextSaleNum = (existingSaleNumbers.length > 0 ? Math.max(...existingSaleNumbers) : 0) + 1;
  const newSaleId = `${salePrefix}${String(nextSaleNum).padStart(3, '0')}`;

  // 3. Resolve Partner / Closing Staff or DSA
  let partnerId = proposal.assignedDsaId || proposal.assignedStaffId || proposal.createdBy;
  let partnerName = proposal.assignedDsaName || proposal.assignedStaffName || proposal.createdByName;
  let partnerRole: UserRole = proposal.assignedDsaId ? 'DSA' : proposal.assignedStaffId ? 'STAFF' : proposal.createdByRole;

  const partnerUser = db.users.find((u) => u.userId === partnerId);
  if (partnerUser) {
    partnerName = partnerUser.fullName;
    partnerRole = partnerUser.role;
  }

  // Commission rule for DSA from system settings (default 10%)
  const isDsa = partnerRole === 'DSA';
  const dsaRate = (db.settings?.dsaCommissionPercentage ?? db.settings?.crmConfig?.dsaCommissionRate ?? 10) / 100;
  const commissionAmount = isDsa ? Math.round(proposal.finalAmount * dsaRate) : 0;

  // 4. Create Sale Record
  const newSale: Sale = {
    id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    saleId: newSaleId,
    proposalId: proposal.proposalId,
    leadId: proposal.leadId,
    customerId: linkedCustomerId,
    customerName: proposal.contactPerson,
    businessName: proposal.businessName,
    staffOrDsaId: partnerId,
    staffOrDsaName: partnerName,
    staffOrDsaRole: partnerRole,
    serviceId: proposal.serviceId,
    serviceName: proposal.serviceName,
    packageId: proposal.packageId,
    packageName: proposal.packageName,
    saleAmount: proposal.quotedAmount,
    discount: proposal.discount,
    finalAmount: proposal.finalAmount,
    advancePaid: 0,
    balanceAmount: proposal.finalAmount,
    paymentStatus: 'Pending',
    developmentStatus: 'Pending',
    deliveryStatus: 'Pending',
    commissionAmount,
    commissionStatus: 'Pending',
    deliveryDate: undefined,
    notes: `Converted from Proposal ${proposal.proposalId}. ${proposal.notes || ''}`.trim(),
    createdBy: user.userId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.sales.unshift(newSale);

  // Automatically create website project in pipeline
  const projCount = db.projects.length + 1;
  const newProject: WebsiteProject = {
    id: `prj-${Date.now()}`,
    projectId: `PRJ-${now.getFullYear()}-${String(projCount).padStart(3, '0')}`,
    customerId: newSale.customerId,
    customerName: newSale.customerName,
    businessName: newSale.businessName,
    serviceId: newSale.serviceId,
    serviceName: newSale.serviceName,
    packageId: newSale.packageId,
    packageName: newSale.packageName,
    startDate: now.toISOString().split('T')[0],
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'Payment Received',
    revisionCount: 0,
    saleId: newSaleId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  db.projects.unshift(newProject);

  // 5. Update Proposal status and bidirectional link
  proposal.saleId = newSaleId;
  proposal.status = 'Converted to Sale';
  proposal.updatedAt = now.toISOString();

  proposal.activities = proposal.activities || [];
  proposal.activities.unshift({
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
    proposalId: proposal.proposalId,
    userId: user.userId,
    userName: user.fullName,
    userRole: user.role,
    action: 'Proposal Converted to Sale',
    date: dateStr,
    exactTime: timeStr,
    notes: `Successfully converted into official Sale ${newSaleId} for ₹${proposal.finalAmount}.`,
    createdAt: now.toISOString(),
  });

  // 6. Connect to Lead lifecycle if lead was linked
  if (proposal.leadId) {
    const lead = db.leads.find((l) => l.leadId === proposal.leadId || l.id === proposal.leadId);
    if (lead) {
      lead.status = 'Won';
      lead.updatedAt = now.toISOString();
    }
  }

  // 7. Persist to database atomically
  saveDb(db);

  // 8. Audit log & Admin Notification
  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_CONVERTED_TO_SALE',
    module: 'proposals',
    recordId: proposal.proposalId,
    newValue: `Converted to Sale ${newSaleId} (₹${proposal.finalAmount})`,
    ip: getClientIp(req),
  });

  notifyAdmins(
    'Proposal Converted to Sale',
    `Proposal ${proposal.proposalId} for ${proposal.businessName} was converted to ${newSaleId} (₹${proposal.finalAmount}) by ${user.fullName}.`,
    '/sales'
  );

  return res.json({
    success: true,
    message: `Proposal successfully converted to Sale ${newSaleId}!`,
    sale: newSale,
    proposal,
  });
});

// 10. Duplicate Proposal
api.post('/proposals/:id/duplicate', authenticate, requirePermission('proposals', 'add'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;

  const original = db.proposals.find((p) => p.id === id || p.proposalId === id);
  if (!original) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  if (!canUserAccessProposal(user, original)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const newProposalId = generateUniqueProposalId(db);
  const newValidUntil = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  const duplicated: Proposal = {
    ...original,
    id: `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    proposalId: newProposalId,
    status: 'Draft',
    proposalDate: dateStr,
    validUntil: newValidUntil,
    saleId: undefined,
    preparedByUserId: user.userId,
    preparedByName: user.fullName,
    assignedStaffId: user.role === 'STAFF' ? user.userId : original.assignedStaffId,
    assignedStaffName: user.role === 'STAFF' ? user.fullName : original.assignedStaffName,
    assignedDsaId: user.role === 'DSA' ? user.userId : original.assignedDsaId,
    assignedDsaName: user.role === 'DSA' ? user.fullName : original.assignedDsaName,
    activities: [
      {
        id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        activityId: `ACT-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        proposalId: newProposalId,
        userId: user.userId,
        userName: user.fullName,
        userRole: user.role,
        action: 'Proposal Created',
        date: dateStr,
        exactTime: timeStr,
        notes: `Duplicated from quotation ${original.proposalId}.`,
        createdAt: now.toISOString(),
      },
    ],
    communications: [],
    createdBy: user.userId,
    createdByName: user.fullName,
    createdByRole: user.role,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.proposals.unshift(duplicated);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_CREATED',
    module: 'proposals',
    recordId: newProposalId,
    newValue: `Duplicated from ${original.proposalId}`,
    ip: getClientIp(req),
  });

  return res.json(duplicated);
});

// 11. Delete Proposal (Admin Only or Delete Permission)
api.delete('/proposals/:id', authenticate, requirePermission('proposals', 'delete'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const id = req.params.id;

  const index = db.proposals.findIndex((p) => p.id === id || p.proposalId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Proposal not found.' });
  }

  const proposal = db.proposals[index];
  if (!canUserAccessProposal(user, proposal)) {
    return res.status(403).json({ error: 'Access Denied.' });
  }

  if (proposal.status === 'Converted to Sale') {
    return res.status(400).json({ error: 'Cannot delete a proposal that has already been converted to a Sale.' });
  }

  db.proposals.splice(index, 1);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROPOSAL_DELETED',
    module: 'proposals',
    recordId: proposal.proposalId,
    oldValue: `${proposal.businessName} (₹${proposal.finalAmount})`,
    ip: getClientIp(req),
  });

  return res.json({ success: true, message: `Proposal ${proposal.proposalId} deleted successfully.` });
});

// ==========================================
// PAYMENTS
// ==========================================

api.get('/payments', authenticate, requirePermission('payments', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  return res.json(db.payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.post('/payments', authenticate, requirePermission('payments', 'add'), (req: AuthRequest, res: Response) => {
  const { customerId, customerName, saleId, amount, date, paymentMethod, transactionNumber, receiptUrl, notes } = req.body;

  if (!customerName || !amount || !transactionNumber) {
    return res.status(400).json({ error: 'Customer, Amount, and Transaction/Reference number are required.' });
  }

  const db = getDb();
  const user = req.user!;
  const count = db.payments.length + 1;
  const now = new Date();
  const paymentId = `PAY-${now.getFullYear()}-${String(count).padStart(3, '0')}`;

  const newPay: Payment = {
    id: `pay-${Date.now()}`,
    paymentId,
    customerId: customerId || '',
    customerName,
    saleId: saleId || '',
    amount: Number(amount),
    date: date || now.toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'UPI',
    transactionNumber,
    receiptUrl,
    verificationStatus: user.role === 'ADMIN' ? 'Verified' : 'Submitted',
    verifiedBy: user.role === 'ADMIN' ? user.userId : undefined,
    verificationDate: user.role === 'ADMIN' ? now.toISOString() : undefined,
    notes,
    createdBy: user.userId,
    createdAt: now.toISOString(),
  };

  db.payments.unshift(newPay);

  // If Verified, update Customer and Sale totals
  if (newPay.verificationStatus === 'Verified') {
    updateCustomerAndSalePayments(db, newPay);
  }

  saveDb(db);

  notifyAdmins(
    'Payment Submitted',
    `Payment of ₹${Number(amount || 0).toLocaleString()} submitted for ${customerName} (Ref: ${transactionNumber}).`,
    '/payments'
  );

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PAYMENT_SUBMITTED',
    module: 'payments',
    recordId: paymentId,
    newValue: `Amount: ₹${amount}`,
    ip: getClientIp(req),
  });

  return res.json(newPay);
});

api.put('/payments/:id/verify', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body; // 'Verified' | 'Rejected'

  const db = getDb();
  const pay = db.payments.find((p) => p.id === id || p.paymentId === id);
  if (!pay) return res.status(404).json({ error: 'Payment not found.' });

  pay.verificationStatus = status;
  pay.verifiedBy = req.user!.userId;
  pay.verificationDate = new Date().toISOString();
  if (notes) pay.notes = notes;

  if (status === 'Verified') {
    updateCustomerAndSalePayments(db, pay);
  }

  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: `PAYMENT_${status.toUpperCase()}`,
    module: 'payments',
    recordId: pay.paymentId,
    reason: notes || `Payment marked as ${status}`,
    ip: getClientIp(req),
  });

  return res.json(pay);
});

function updateCustomerAndSalePayments(db: ReturnType<typeof getDb>, payment: Payment) {
  if (payment.customerId) {
    const cust = db.customers.find((c) => c.customerId === payment.customerId || c.id === payment.customerId);
    if (cust) {
      cust.amountReceived += payment.amount;
      cust.amountPending = Math.max(0, cust.totalAmount - cust.amountReceived);
    }
  }

  if (payment.saleId) {
    const sale = db.sales.find((s) => s.saleId === payment.saleId || s.id === payment.saleId);
    if (sale) {
      sale.paymentStatus = 'Fully Paid';
    }
  }
}

// ==========================================
// WEBSITE PROJECTS
// ==========================================

api.get('/projects', authenticate, requirePermission('projects', 'view'), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.projects;

  if (user.role === 'CLIENT') {
    list = list.filter((p) => p.customerId === user.customerId || p.customerId === user.userId);
  } else if (user.role === 'DSA') {
    list = list.filter((p) => p.assignedDsaId === user.userId || p.dsaId === user.userId);
  } else if (user.role === 'STAFF') {
    const scope = user.permissions?.dataScope || 'own';
    if (scope === 'own') {
      list = list.filter((p) => p.assignedStaffId === user.userId || p.developer === user.fullName);
    }
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// Create new Website Project
api.post('/projects', authenticate, requirePermission('projects', 'add'), (req: AuthRequest, res: Response) => {
  const data = req.body;
  if (!data.businessName) {
    return res.status(400).json({ error: 'Business Name is required.' });
  }

  const db = getDb();
  const user = req.user!;
  const now = new Date();
  const count = db.projects.length + 1;
  const projectId = generateEntityId('PROJ', count, now);

  const newProject: WebsiteProject = {
    id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    projectId,
    saleId: data.saleId,
    customerId: data.customerId || `cust-${Date.now()}`,
    businessName: data.businessName,
    clientName: data.clientName || data.businessName,
    contactNumber: data.contactNumber || '',
    email: data.email || '',
    websiteDomain: data.websiteDomain || '',
    domainStatus: data.domainStatus || 'Pending',
    domainProvider: data.domainProvider,
    hostingStatus: data.hostingStatus || 'Pending',
    hostingProvider: data.hostingProvider,
    websiteType: data.websiteType || 'Business Website',
    packageId: data.packageId,
    packageName: data.packageName,
    serviceId: data.serviceId,
    serviceName: data.serviceName,
    developer: data.developer || 'Pending Assignment',
    assignedStaffId: user.role === 'STAFF' ? user.userId : data.assignedStaffId,
    assignedDsaId: user.role === 'DSA' ? user.userId : data.assignedDsaId,
    dsaId: data.dsaId || (user.role === 'DSA' ? user.userId : undefined),
    status: data.status || 'Planning',
    startDate: data.startDate || now.toISOString().split('T')[0],
    expectedDeliveryDate: data.expectedDeliveryDate || data.deliveryDate,
    deliveryDate: data.deliveryDate,
    totalAmount: Number(data.totalAmount || 0),
    amountReceived: Number(data.amountReceived || 0),
    amountPending: Number(data.totalAmount || 0) - Number(data.amountReceived || 0),
    contentStatus: data.contentStatus || 'Pending',
    demoUrl: data.demoUrl,
    stagingUrl: data.stagingUrl,
    liveUrl: data.liveUrl,
    revisions: [],
    milestones: [
      { name: 'Requirement Gathering', status: 'Completed', date: now.toISOString().split('T')[0] },
      { name: 'Wireframing & Design', status: 'In Progress' },
      { name: 'Development & Content Integration', status: 'Pending' },
      { name: 'Quality Testing & Client Review', status: 'Pending' },
      { name: 'Deployment & Go Live', status: 'Pending' },
    ],
    notes: data.notes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.projects.unshift(newProject);
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'PROJECT_CREATED',
    module: 'projects',
    recordId: projectId,
    newValue: data.businessName,
    ip: getClientIp(req),
  });

  return res.json(newProject);
});

// Update Website Project Details
api.put('/projects/:id', authenticate, requirePermission('projects', 'edit'), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const project = db.projects.find((p) => p.id === id || p.projectId === id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const user = req.user!;
  if (user.role === 'CLIENT') {
    return res.status(403).json({ error: 'Clients cannot modify project configuration directly.' });
  }

  Object.assign(project, {
    ...req.body,
    updatedAt: new Date().toISOString(),
  });
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'PROJECT_UPDATED',
    module: 'projects',
    recordId: project.projectId,
    ip: getClientIp(req),
  });

  return res.json(project);
});

// Add Revision to Project
api.post('/projects/:id/revisions', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const db = getDb();
  const project = db.projects.find((p) => p.id === id || p.projectId === id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const user = req.user!;
  const revList = (project.revisions as any[]) || [];
  const revisionNumber = revList.length + 1;
  const newRev = {
    id: `rev-${Date.now()}`,
    revisionNumber,
    requestedBy: user.fullName,
    notes: notes || 'Revision requested',
    status: 'Pending',
    submittedAt: new Date().toISOString(),
  };

  revList.push(newRev);
  (project as any).revisions = revList;
  project.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'PROJECT_REVISION_REQUESTED',
    module: 'projects',
    recordId: project.projectId,
    newValue: `Revision #${revisionNumber}`,
    ip: getClientIp(req),
  });

  return res.json(project);
});

api.put('/projects/:id/status', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, liveUrl, stagingUrl, demoUrl, notes } = req.body;
  const user = req.user!;

  const db = getDb();
  const project = db.projects.find((p) => p.id === id || p.projectId === id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  // Only Admin can mark project Delivered
  if (status === 'Delivered' && user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only Admin can mark a project as Delivered.' });
  }

  const oldStatus = project.status;
  project.status = status;
  if (liveUrl) project.liveUrl = liveUrl;
  if (stagingUrl) project.stagingUrl = stagingUrl;
  if (demoUrl) project.demoUrl = demoUrl;
  if (notes) project.notes = notes;
  project.updatedAt = new Date().toISOString();

  // If Delivered, also update associated sale and release DSA commission
  if (status === 'Delivered') {
    project.deliveryDate = new Date().toISOString().split('T')[0];
    if (project.saleId) {
      const sale = db.sales.find((s) => s.saleId === project.saleId);
      if (sale) {
        sale.deliveryStatus = 'Delivered';
        sale.deliveryDate = project.deliveryDate;
        if (sale.staffOrDsaRole === 'DSA') {
          sale.commissionStatus = 'Available';
          addNotification({
            userId: sale.staffOrDsaId,
            title: 'Project Delivered - Commission Available!',
            message: `Project ${project.businessName} delivered. Commission of ₹${Number(sale.commissionAmount || 0).toLocaleString()} is now Available.`,
            link: '/commission',
          });
        }
      }
    }
  }

  saveDb(db);

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'PROJECT_STATUS_UPDATED',
    module: 'projects',
    recordId: project.projectId,
    oldValue: oldStatus,
    newValue: status,
    ip: getClientIp(req),
  });

  return res.json(project);
});

// ==========================================
// DSA COMMISSION & WITHDRAWALS
// ==========================================

// DSA Commission summary
api.get('/dsa/commission-summary', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  const dsaId = user.role === 'DSA' ? user.userId : (req.query.dsaId as string);
  if (!dsaId) {
    return res.status(400).json({ error: 'DSA ID is required.' });
  }

  const sales = db.sales.filter((s) => s.staffOrDsaId === dsaId);
  const totalSalesCount = sales.length;
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.finalAmount, 0);

  const totalCommission = sales.reduce((sum, s) => sum + s.commissionAmount, 0);
  const pendingCommission = sales
    .filter((s) => s.commissionStatus === 'Pending')
    .reduce((sum, s) => sum + s.commissionAmount, 0);

  // Available commission: only for Delivered websites minus already withdrawn / processing amounts
  const grossAvailable = sales
    .filter((s) => s.commissionStatus === 'Available')
    .reduce((sum, s) => sum + s.commissionAmount, 0);

  const withdrawals = db.withdrawals.filter((w) => w.dsaId === dsaId);
  const paidWithdrawals = withdrawals
    .filter((w) => w.status === 'Paid')
    .reduce((sum, w) => sum + w.requestedAmount, 0);

  const pendingWithdrawals = withdrawals
    .filter((w) => ['Request Submitted', 'Admin Reviewing', 'Bank Details Verified', 'Approved', 'Payment Processing'].includes(w.status))
    .reduce((sum, w) => sum + w.requestedAmount, 0);

  const netAvailableBalance = Math.max(0, grossAvailable - paidWithdrawals - pendingWithdrawals);

  // Check today's date for withdrawal eligibility using configured settings
  const todayDay = new Date().getDate();
  const allowedWithdrawalDays = (db.settings?.dsaWithdrawalDates && db.settings.dsaWithdrawalDates.length > 0)
    ? db.settings.dsaWithdrawalDates
    : (db.settings?.crmConfig?.withdrawalAllowedDays || [7, 14]);
  const isWithdrawalDate = allowedWithdrawalDays.includes(todayDay);
  const formattedDatesNotice = `Withdrawals are processed on the ${allowedWithdrawalDays.join('th & ')}th of every month.`;

  const result = {
    dsaId,
    totalSalesCount,
    totalSalesAmount,
    totalCommission,
    pendingCommission,
    grossAvailable,
    paidCommission: paidWithdrawals,
    pendingWithdrawals,
    availableBalance: netAvailableBalance,
    isWithdrawalDate,
    withdrawalDatesNotice: formattedDatesNotice,
    salesHistory: sales,
  };

  return res.json(result);
});

// Alias for /dsa/commission with full structure
api.get('/dsa/commission', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const dsaId = user.role === 'DSA' ? user.userId : (req.query.dsaId as string) || user.userId;

  const sales = db.sales.filter((s) => s.staffOrDsaId === dsaId);
  const totalSalesCount = sales.length;
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.finalAmount, 0);

  const totalCommission = sales.reduce((sum, s) => sum + s.commissionAmount, 0);
  const pendingCommission = sales
    .filter((s) => s.commissionStatus === 'Pending')
    .reduce((sum, s) => sum + s.commissionAmount, 0);

  const grossAvailable = sales
    .filter((s) => s.commissionStatus === 'Available')
    .reduce((sum, s) => sum + s.commissionAmount, 0);

  const withdrawals = db.withdrawals.filter((w) => w.dsaId === dsaId);
  const paidWithdrawals = withdrawals
    .filter((w) => w.status === 'Paid')
    .reduce((sum, w) => sum + w.requestedAmount, 0);

  const pendingWithdrawals = withdrawals
    .filter((w) => ['Request Submitted', 'Admin Reviewing', 'Bank Details Verified', 'Approved', 'Payment Processing'].includes(w.status))
    .reduce((sum, w) => sum + w.requestedAmount, 0);

  const netAvailableBalance = Math.max(0, grossAvailable - paidWithdrawals - pendingWithdrawals);
  const todayDay = new Date().getDate();
  const allowedWithdrawalDays = (db.settings?.dsaWithdrawalDates && db.settings.dsaWithdrawalDates.length > 0)
    ? db.settings.dsaWithdrawalDates
    : (db.settings?.crmConfig?.withdrawalAllowedDays || [7, 14]);
  const isWithdrawalDate = allowedWithdrawalDays.includes(todayDay);
  const formattedDatesNotice = `Withdrawals are processed on the ${allowedWithdrawalDays.join('th & ')}th of every month.`;

  const summary = {
    dsaId,
    totalSalesCount,
    totalSalesAmount,
    totalCommission,
    pendingCommission,
    grossAvailable,
    paidCommission: paidWithdrawals,
    pendingWithdrawals,
    availableBalance: netAvailableBalance,
    isWithdrawalDate,
    withdrawalDatesNotice: formattedDatesNotice,
    salesHistory: sales,
  };

  return res.json({
    summary,
    sales,
    withdrawals,
    ...summary,
  });
});

// DSA Sales Endpoint
api.get('/dsa/sales', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const dsaId = user.role === 'DSA' ? user.userId : (req.query.dsaId as string) || user.userId;
  const sales = db.sales.filter((s) => s.staffOrDsaId === dsaId);
  return res.json(sales);
});

// DSA Submit Withdrawal Request
const handleDsaWithdrawalRequest = (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { requestedAmount, amount: altAmount, bankDetails, bankDocuments, bankProof, forceSubmit } = req.body;
  const finalAmount = Number(requestedAmount ?? altAmount);

  const now = new Date();
  const dayOfMonth = now.getDate();

  const db = getDb();
  const allowedWithdrawalDays = (db.settings?.dsaWithdrawalDates && db.settings.dsaWithdrawalDates.length > 0)
    ? db.settings.dsaWithdrawalDates
    : (db.settings?.crmConfig?.withdrawalAllowedDays || [7, 14]);

  // RULE: Withdrawal is scheduled on configured withdrawal dates of every month
  // (forceSubmit allowed for off-cycle special approvals)
  if (!allowedWithdrawalDays.includes(dayOfMonth) && !forceSubmit) {
    return res.status(400).json({
      error: `Standard withdrawal window is on the ${allowedWithdrawalDays.join('th and ')}th of each month. Check "Submit Off-Cycle Request" if authorized.`,
    });
  }

  // Check KYC status
  const dsaKyc = db.dsaKyc.find((k) => k.dsaId === user.userId);
  if (!dsaKyc || dsaKyc.status !== 'approved') {
    return res.status(400).json({
      error: 'KYC must be Approved by Admin before submitting a withdrawal request.',
    });
  }

  // Check Bank verification status
  const isBankVerified = user.bankDetails?.verificationStatus === 'Verified' || (dsaKyc.bankDetails && user.bankDetails?.verificationStatus !== 'Rejected');
  if (user.bankDetails && user.bankDetails.verificationStatus !== 'Verified') {
    return res.status(400).json({
      error: 'Your Bank Details must be Verified by Admin before submitting a withdrawal request.',
    });
  }

  // Check existing pending withdrawal
  const existingPending = db.withdrawals.find(
    (w) =>
      w.dsaId === user.userId &&
      ['Request Submitted', 'Admin Reviewing', 'Bank Details Verified', 'Approved', 'Payment Processing'].includes(w.status)
  );
  if (existingPending) {
    return res.status(400).json({
      error: `You already have an active withdrawal request (${existingPending.withdrawalId}) in process.`,
    });
  }

  // Calculate available balance
  const sales = db.sales.filter((s) => s.staffOrDsaId === user.userId);
  const grossAvailable = sales
    .filter((s) => s.commissionStatus === 'Available')
    .reduce((sum, s) => sum + s.commissionAmount, 0);

  const withdrawals = db.withdrawals.filter((w) => w.dsaId === user.userId);
  const alreadyClaimed = withdrawals
    .filter((w) => w.status !== 'Rejected')
    .reduce((sum, w) => sum + w.requestedAmount, 0);

  const availableBalance = Math.max(0, grossAvailable - alreadyClaimed);

  if (!finalAmount || finalAmount <= 0) {
    return res.status(400).json({ error: 'Valid withdrawal amount is required.' });
  }

  if (finalAmount > availableBalance) {
    return res.status(400).json({
      error: `Requested amount (₹${finalAmount}) exceeds your available commission balance (₹${availableBalance}).`,
    });
  }

  const dateStr = now.toISOString().split('T')[0];
  const count = db.withdrawals.length + 1;
  const withdrawalId = `WD-${dateStr.replace(/-/g, '')}-${String(count).padStart(4, '0')}`;

  const newRequest: WithdrawalRequest = {
    id: `wd-${Date.now()}`,
    withdrawalId,
    dsaId: user.userId,
    dsaName: user.fullName,
    requestedAmount: finalAmount,
    availableBalanceAtRequest: availableBalance,
    requestDate: dateStr,
    status: 'Request Submitted',
    bankDetails: bankDetails || dsaKyc.bankDetails,
    bankDocuments: bankDocuments || (bankProof ? [bankProof] : []),
    createdAt: now.toISOString(),
  };

  db.withdrawals.unshift(newRequest);
  saveDb(db);

  notifyAdmins(
    'New DSA Withdrawal Request',
    `DSA ${user.fullName} (${user.userId}) submitted withdrawal request ${withdrawalId} for ₹${Number(finalAmount || 0).toLocaleString()}.`,
    '/withdrawals'
  );

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: 'DSA',
    action: 'WITHDRAWAL_REQUESTED',
    module: 'withdrawals',
    recordId: withdrawalId,
    newValue: `Amount: ₹${finalAmount}`,
    ip: getClientIp(req),
  });

  return res.json({
    message: 'Withdrawal request submitted successfully. Waiting for Admin Confirmation.',
    request: newRequest,
    withdrawal: newRequest,
  });
};

api.post('/dsa/withdraw', authenticate, requireRole(['DSA']), handleDsaWithdrawalRequest);
api.post('/dsa/withdrawals/request', authenticate, requireRole(['DSA']), handleDsaWithdrawalRequest);

// DSA Withdrawal History
api.get('/dsa/withdrawals', authenticate, requireRole(['DSA']), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const list = db.withdrawals
    .filter((w) => w.dsaId === req.user!.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.json(list);
});

// Admin: View all withdrawals
api.get('/admin/withdrawals', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  return res.json(db.withdrawals.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

// Admin: Action on withdrawal (Approve, Process, Mark Paid, Reject)
api.put('/admin/withdrawals/:id/action', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason, transactionRef } = req.body;

  const validStatuses = [
    'Admin Reviewing',
    'Bank Details Verified',
    'Approved',
    'Payment Processing',
    'Paid',
    'Rejected',
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid withdrawal status.' });
  }

  const db = getDb();
  const reqItem = db.withdrawals.find((w) => w.id === id || w.withdrawalId === id);
  if (!reqItem) return res.status(404).json({ error: 'Withdrawal request not found.' });

  const oldStatus = reqItem.status;
  reqItem.status = status;
  reqItem.processedAt = new Date().toISOString();
  reqItem.processedBy = req.user!.userId;
  if (rejectionReason) reqItem.rejectionReason = rejectionReason;
  if (transactionRef) reqItem.transactionRef = transactionRef;

  // If marked Paid, mark commission sales as Paid
  if (status === 'Paid') {
    let remainingToMark = reqItem.requestedAmount;
    const dsaSales = db.sales.filter((s) => s.staffOrDsaId === reqItem.dsaId && s.commissionStatus === 'Available');
    for (const s of dsaSales) {
      if (remainingToMark <= 0) break;
      s.commissionStatus = 'Paid';
      remainingToMark -= s.commissionAmount;
    }
  }

  saveDb(db);

  addNotification({
    userId: reqItem.dsaId,
    title: `Withdrawal ${status}`,
    message: rejectionReason ? `Reason: ${rejectionReason}` : `Your withdrawal request ${reqItem.withdrawalId} is now ${status}.`,
    link: '/withdrawals',
  });

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: `WITHDRAWAL_${status.toUpperCase().replace(/\s+/g, '_')}`,
    module: 'withdrawals',
    recordId: reqItem.withdrawalId,
    oldValue: oldStatus,
    newValue: status,
    reason: rejectionReason || transactionRef,
    ip: getClientIp(req),
  });

  return res.json(reqItem);
});

// ==========================================
// DSA AGREEMENT
// ==========================================

api.get('/dsa/agreement', authenticate, requireRole(['DSA', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  const dsaId = user.role === 'DSA' ? user.userId : (req.query.dsaId as string);
  const agreement = db.dsaAgreements.find((a) => a.dsaId === dsaId);

  const defaultAgreement = {
    agreementId: `AGR-2026-${dsaId || 'DSA'}`,
    dsaId: dsaId || user.userId,
    version: '1.0',
    agreementDate: '2026-09-13',
    accepted: agreement ? agreement.accepted : !!user.agreementAccepted,
    acceptedAt: agreement?.acceptedAt || user.agreementAcceptedAt,
    terms: {
      commissionRate: '10% flat commission on successful website sales final invoice value.',
      salesScope: 'Authorized exclusively for Website Development, E-Commerce, Landing Pages, and Web Maintenance services.',
      paymentCycle: 'Commission payouts processed on the 7th and 14th of every calendar month upon website delivery.',
      confidentiality: 'Strict non-disclosure of client information, proprietary frameworks, and trade secrets.',
      termination: 'Standard 30-day notice or immediate termination on compliance breach.',
    },
  };

  return res.json(defaultAgreement);
});

api.post('/dsa/agreement/accept', authenticate, requireRole(['DSA']), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const now = new Date().toISOString();

  let agreement = db.dsaAgreements.find((a) => a.dsaId === user.userId);
  if (agreement) {
    agreement.accepted = true;
    agreement.acceptedAt = now;
  } else {
    agreement = {
      id: `agr-${Date.now()}`,
      agreementId: `AGR-2026-${user.userId}`,
      dsaId: user.userId,
      version: '1.0',
      agreementDate: now.split('T')[0],
      accepted: true,
      acceptedAt: now,
      terms: {
        commissionRate: '10% on successful website sales.',
        salesScope: 'Vishal Enterprises Website Sales & Web Services.',
        paymentCycle: '7th and 14th of every month upon delivery.',
        confidentiality: 'Complete client confidentiality.',
        termination: '30-day notice period.',
      },
    };
    db.dsaAgreements.push(agreement);
  }

  const dbUser = db.users.find((u) => u.userId === user.userId);
  if (dbUser) {
    dbUser.agreementAccepted = true;
    dbUser.agreementAcceptedAt = now;
    dbUser.agreementVersion = '1.0';
  }

  saveDb(db);

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: 'DSA',
    action: 'AGREEMENT_ACCEPTED',
    module: 'dsa',
    recordId: agreement.agreementId,
    reason: 'Partner terms accepted digitally',
    ip: getClientIp(req),
  });

  return res.json({ message: 'Agreement accepted successfully.', agreement });
});

// ==========================================
// STAFF REFERRALS
// ==========================================

api.post('/staff/referrals', authenticate, requirePermission('referrals', 'add'), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { name, mobile, whatsapp, email, city, preferredRole, experience, resumeUrl } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Candidate Name and Mobile are required.' });
  }

  const db = getDb();
  const count = db.staffReferrals.length + 1;
  const now = new Date();
  const referralId = `REF-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newRef: StaffReferral = {
    id: `ref-${Date.now()}`,
    referralId,
    staffId: user.userId,
    staffName: user.fullName,
    name,
    mobile,
    whatsapp: whatsapp || mobile,
    email,
    city: city || '',
    preferredRole: preferredRole || 'Sales Executive',
    experience: experience || '',
    resumeUrl,
    status: 'pending',
    bonusPaid: false,
    createdAt: now.toISOString(),
  };

  db.staffReferrals.unshift(newRef);
  saveDb(db);

  notifyAdmins(
    'New Staff Candidate Referral',
    `Staff ${user.fullName} referred candidate ${name} (${referralId}).`,
    '/referrals'
  );

  addAuditLog({
    userId: user.userId,
    userName: user.fullName,
    role: user.role,
    action: 'STAFF_REFERRAL_SUBMITTED',
    module: 'referrals',
    recordId: referralId,
    newValue: name,
    ip: getClientIp(req),
  });

  return res.json(newRef);
});

api.get('/staff/referrals', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.staffReferrals;
  if (user.role === 'STAFF') {
    list = list.filter((r) => r.staffId === user.userId);
  }
  return res.json(list);
});

api.put('/admin/referrals/:id/status', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, bonusPaid } = req.body; // 'pending' | 'interview' | 'approved' | 'rejected'

  const db = getDb();
  const ref = db.staffReferrals.find((r) => r.id === id || r.referralId === id);
  if (!ref) return res.status(404).json({ error: 'Referral not found.' });

  if (status) ref.status = status;
  if (bonusPaid !== undefined) ref.bonusPaid = Boolean(bonusPaid);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'REFERRAL_STATUS_UPDATED',
    module: 'referrals',
    recordId: ref.referralId,
    newValue: `Status: ${ref.status}, BonusPaid: ${ref.bonusPaid}`,
    ip: getClientIp(req),
  });

  return res.json(ref);
});

// General referrals aliases
api.get('/referrals', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.staffReferrals;
  if (user.role === 'STAFF') {
    list = list.filter((r) => r.staffId === user.userId);
  }
  return res.json(list);
});

api.post('/referrals', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { clientName, name, clientMobile, mobile, clientEmail, email, serviceNeeded, preferredRole, notes } = req.body;
  const db = getDb();
  const count = db.staffReferrals.length + 1;
  const now = new Date();
  const referralId = `REF-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newRef: any = {
    id: `ref-${Date.now()}`,
    referralId,
    staffId: user.userId,
    staffName: user.fullName,
    referredById: user.userId,
    referredByName: user.fullName,
    clientName: clientName || name,
    name: clientName || name,
    clientMobile: clientMobile || mobile,
    mobile: clientMobile || mobile,
    clientEmail: clientEmail || email,
    email: clientEmail || email,
    serviceNeeded: serviceNeeded || preferredRole || 'Website Development',
    notes: notes || '',
    status: 'Submitted',
    rewardStatus: 'Pending',
    createdAt: now.toISOString(),
  };

  db.staffReferrals.unshift(newRef);
  saveDb(db);
  return res.json(newRef);
});

api.put('/referrals/:id/status', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, rewardStatus } = req.body;
  const db = getDb();
  const ref = db.staffReferrals.find((r) => r.id === id || r.referralId === id);
  if (!ref) return res.status(404).json({ error: 'Referral not found.' });
  if (status) ref.status = status;
  if (rewardStatus) (ref as any).rewardStatus = rewardStatus;
  saveDb(db);
  return res.json(ref);
});

// ==========================================
// STAFF REQUESTS & COMPLAINTS
// ==========================================

api.post('/staff/requests', authenticate, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { requestType, subject, message, attachmentUrl } = req.body;

  if (!requestType || !subject || !message) {
    return res.status(400).json({ error: 'Request Type, Subject, and Message are required.' });
  }

  const db = getDb();
  const count = db.requests.length + 1;
  const now = new Date();
  const requestId = `REQ-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newReq: StaffRequest = {
    id: `req-${Date.now()}`,
    requestId,
    staffId: user.userId,
    staffName: user.fullName,
    department: user.department || 'Sales',
    requestType,
    subject,
    message,
    attachmentUrl,
    date: now.toISOString().split('T')[0],
    status: 'pending',
    createdAt: now.toISOString(),
  };

  db.requests.unshift(newReq);
  saveDb(db);

  notifyAdmins(
    'New Staff Request',
    `Staff ${user.fullName} submitted a ${requestType} request: ${subject}`,
    '/requests'
  );

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'REQUEST_SUBMITTED',
    module: 'requests',
    recordId: requestId,
    ip: getClientIp(req),
  });

  return res.json(newReq);
});

api.get('/staff/requests', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.requests;
  if (user.role === 'STAFF') {
    list = list.filter((r) => r.staffId === user.userId);
  }
  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.put('/admin/requests/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminResponse } = req.body; // 'approved' | 'rejected'

  const db = getDb();
  const r = db.requests.find((x) => x.id === id || x.requestId === id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });

  r.status = status;
  r.adminResponse = adminResponse;
  r.respondedAt = new Date().toISOString();
  r.respondedBy = req.user!.userId;
  saveDb(db);

  addNotification({
    userId: r.staffId,
    title: `Request ${status.toUpperCase()}`,
    message: `Your request (${r.subject}) has been ${status}. Response: ${adminResponse || 'None'}`,
    link: '/requests',
  });

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: `REQUEST_${status.toUpperCase()}`,
    module: 'requests',
    recordId: r.requestId,
    reason: adminResponse,
    ip: getClientIp(req),
  });

  return res.json(r);
});

api.post('/staff/complaints', authenticate, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { topic, message, attachmentUrl } = req.body;

  if (!topic || !message) {
    return res.status(400).json({ error: 'Complaint Topic and Message are required.' });
  }

  const db = getDb();
  const count = db.complaints.length + 1;
  const now = new Date();
  const complaintId = `CMP-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newCmp: StaffComplaint = {
    id: `cmp-${Date.now()}`,
    complaintId,
    staffId: user.userId,
    staffName: user.fullName,
    department: user.department || 'Sales',
    topic,
    message,
    attachmentUrl,
    date: now.toISOString().split('T')[0],
    status: 'open',
    createdAt: now.toISOString(),
  };

  db.complaints.unshift(newCmp);
  saveDb(db);

  notifyAdmins(
    'New Staff Complaint Registered',
    `Staff ${user.fullName} lodged complaint ${complaintId}: ${topic}`,
    '/complaints'
  );

  addAuditLog({
    userId: user.userId,
    role: user.role,
    action: 'COMPLAINT_REGISTERED',
    module: 'complaints',
    recordId: complaintId,
    ip: getClientIp(req),
  });

  return res.json(newCmp);
});

api.get('/staff/complaints', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.complaints;
  if (user.role === 'STAFF') {
    list = list.filter((c) => c.staffId === user.userId);
  }
  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.put('/admin/complaints/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminResponse } = req.body; // 'in_review' | 'resolved' | 'rejected'

  const db = getDb();
  const c = db.complaints.find((x) => x.id === id || x.complaintId === id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });

  c.status = status;
  c.adminResponse = adminResponse;
  c.respondedAt = new Date().toISOString();
  c.respondedBy = req.user!.userId;
  saveDb(db);

  addNotification({
    userId: c.staffId,
    title: `Complaint Updated: ${status.toUpperCase()}`,
    message: adminResponse || `Complaint status changed to ${status}`,
    link: '/complaints',
  });

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: `COMPLAINT_${status.toUpperCase()}`,
    module: 'complaints',
    recordId: c.complaintId,
    reason: adminResponse,
    ip: getClientIp(req),
  });

  return res.json(c);
});

// General aliases for requests and complaints
api.get('/requests', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.requests;
  if (user.role === 'STAFF') {
    list = list.filter((r) => r.staffId === user.userId);
  }
  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.post('/requests', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { requestType, subject, message, attachmentUrl } = req.body;
  if (!requestType || !subject || !message) {
    return res.status(400).json({ error: 'Request Type, Subject, and Message are required.' });
  }

  const db = getDb();
  const count = db.requests.length + 1;
  const now = new Date();
  const requestId = `REQ-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newReq: StaffRequest = {
    id: `req-${Date.now()}`,
    requestId,
    staffId: user.userId,
    staffName: user.fullName,
    department: user.department || 'Sales',
    requestType,
    subject,
    message,
    attachmentUrl,
    date: now.toISOString().split('T')[0],
    status: 'pending',
    createdAt: now.toISOString(),
  };

  db.requests.unshift(newReq);
  saveDb(db);
  return res.json(newReq);
});

api.put('/requests/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminResponse } = req.body;
  const db = getDb();
  const r = db.requests.find((x) => x.id === id || x.requestId === id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });

  r.status = status;
  r.adminResponse = adminResponse;
  r.respondedAt = new Date().toISOString();
  r.respondedBy = req.user!.userId;
  saveDb(db);
  return res.json(r);
});

api.get('/complaints', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.complaints;
  if (user.role === 'STAFF') {
    list = list.filter((c) => c.staffId === user.userId);
  }
  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.post('/complaints', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { topic, message, attachmentUrl } = req.body;
  if (!topic || !message) {
    return res.status(400).json({ error: 'Complaint Topic and Message are required.' });
  }

  const db = getDb();
  const count = db.complaints.length + 1;
  const now = new Date();
  const complaintId = `CMP-${now.getFullYear()}-${String(count).padStart(4, '0')}`;

  const newCmp: StaffComplaint = {
    id: `cmp-${Date.now()}`,
    complaintId,
    staffId: user.userId,
    staffName: user.fullName,
    department: user.department || 'Sales',
    topic,
    message,
    attachmentUrl,
    date: now.toISOString().split('T')[0],
    status: 'open',
    createdAt: now.toISOString(),
  };

  db.complaints.unshift(newCmp);
  saveDb(db);
  return res.json(newCmp);
});

api.put('/complaints/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminResponse } = req.body;
  const db = getDb();
  const c = db.complaints.find((x) => x.id === id || x.complaintId === id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });

  c.status = status;
  c.adminResponse = adminResponse;
  c.respondedAt = new Date().toISOString();
  c.respondedBy = req.user!.userId;
  saveDb(db);
  return res.json(c);
});

// ==========================================
// STAFF TARGETS & RENEWALS
// ==========================================

api.get('/targets', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.targets;
  if (user.role === 'STAFF') {
    list = list.filter((t) => t.staffId === user.userId);
  }
  return res.json(list);
});

api.post('/admin/targets', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { staffId, monthYear, monthlySalesTarget, dailyProspectTarget, dailyContactTarget, monthlyFollowupTarget, notes } = req.body;

  if (!staffId || !monthYear) {
    return res.status(400).json({ error: 'Staff ID and Month-Year are required.' });
  }

  const db = getDb();
  const staff = db.users.find((u) => u.userId === staffId);
  const staffName = staff?.fullName || staffId;

  let target = db.targets.find((t) => t.staffId === staffId && t.monthYear === monthYear);
  const now = new Date().toISOString();

  if (target) {
    Object.assign(target, {
      monthlySalesTarget: Number(monthlySalesTarget || 0),
      dailyProspectTarget: Number(dailyProspectTarget || 0),
      dailyContactTarget: Number(dailyContactTarget || 0),
      monthlyFollowupTarget: Number(monthlyFollowupTarget || 0),
      notes,
      updatedAt: now,
    });
  } else {
    target = {
      id: `tgt-${Date.now()}`,
      targetId: `TGT-${monthYear.replace('-', '')}-${staffId}`,
      staffId,
      staffName,
      monthYear,
      monthlySalesTarget: Number(monthlySalesTarget || 0),
      dailyProspectTarget: Number(dailyProspectTarget || 0),
      dailyContactTarget: Number(dailyContactTarget || 0),
      monthlyFollowupTarget: Number(monthlyFollowupTarget || 0),
      notes,
      createdAt: now,
      updatedAt: now,
    };
    db.targets.push(target);
  }

  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'TARGET_CONFIGURED',
    module: 'targets',
    recordId: target.targetId,
    ip: getClientIp(req),
  });

  return res.json(target);
});

api.get('/renewals', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { range } = req.query; // '7', '15', '30'
  let list = db.renewals;

  if (range) {
    const days = Number(range);
    const maxDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    list = list.filter((r) => r.renewalDate <= maxDate);
  }

  return res.json(list.sort((a, b) => a.renewalDate.localeCompare(b.renewalDate)));
});

api.post('/renewals', authenticate, (req: AuthRequest, res: Response) => {
  const { customerId, customerName, businessName, domain, hosting, renewalDate, renewalAmount, assignedStaffId, notes, serviceType, expiryDate } = req.body;

  const targetDomain = domain || '';
  const targetName = customerName || businessName || '';
  const targetDate = renewalDate || expiryDate || '';

  if (!targetDomain || !targetDate) {
    return res.status(400).json({ error: 'Domain and Renewal / Expiration Date are required.' });
  }

  const db = getDb();
  const count = db.renewals.length + 1;
  const renewalId = `RNW-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

  const newR: WebsiteRenewal = {
    id: `rnw-${Date.now()}`,
    renewalId,
    customerId: customerId || '',
    customerName: targetName || targetDomain,
    businessName: businessName || targetName || targetDomain,
    domain: targetDomain,
    hosting: hosting || serviceType || 'Cloud Hosting & SSL',
    serviceType: serviceType || 'Cloud Hosting & SSL',
    expiryDate: targetDate,
    renewalDate: targetDate,
    renewalAmount: Number(renewalAmount || 3500),
    status: 'Upcoming',
    assignedStaffId,
    notes,
    createdAt: new Date().toISOString(),
  };

  db.renewals.unshift(newR);
  saveDb(db);

  return res.json(newR);
});

api.put('/renewals/:id/renew', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const r = db.renewals.find((x) => x.id === id || x.renewalId === id);
  if (!r) return res.status(404).json({ error: 'Renewal record not found.' });

  // Add 1 full year to expiryDate
  const currentExpiry = new Date(r.expiryDate || r.renewalDate);
  currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
  const nextDate = currentExpiry.toISOString().split('T')[0];

  r.expiryDate = nextDate;
  r.renewalDate = nextDate;
  r.status = 'Paid';
  saveDb(db);

  return res.json({ message: 'Service renewed for 1 year.', renewal: r });
});

// ==========================================
// ADMIN USER MANAGEMENT & PERMISSIONS
// ==========================================

api.get('/admin/users', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(sanitizeUser);
  return res.json(safeUsers);
});

// Admin list staff with real calculated performance & attendance metrics
api.get('/admin/staff', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dayOfMonth = now.getDate();

  const staff = db.users
    .filter((u) => u.role === 'STAFF')
    .map((s) => {
      const safe = sanitizeUser(s);
      const kyc = db.staffKyc.find((k) => k.staffId === s.userId);
      const numSalary = typeof s.salary === 'object' ? (s.salary as any)?.amount : (s.salary ?? 0);
      const staffSales = db.sales.filter((sl) => sl.staffOrDsaId === s.userId);
      const staffLeads = db.leads.filter((l) => l.assignedStaffId === s.userId || l.createdBy === s.userId);
      const staffAttendance = db.attendance.filter((a) => a.staffId === s.userId);

      const attendanceToday = staffAttendance.some((a) => a.date === today);
      const thisMonthAttendance = staffAttendance.filter((a) => a.date.startsWith(currentMonth)).length;
      const attendancePercentage = dayOfMonth > 0 ? Math.min(100, Math.round((thisMonthAttendance / dayOfMonth) * 100)) : 100;

      const monthlyTarget = s.monthlySalesTarget || (typeof s.salary === 'object' ? s.salary?.target : 10) || 10;
      const thisMonthSales = staffSales.filter((sl) => sl.createdAt && sl.createdAt.startsWith(currentMonth)).length;
      const achievementPercentage = monthlyTarget > 0 ? Math.min(100, Math.round((thisMonthSales / monthlyTarget) * 100)) : 0;

      return {
        ...safe,
        salary: numSalary,
        salaryDetails: s.salary,
        kycStatus: kyc?.status || s.kycStatus || 'pending',
        bankVerificationStatus: s.bankDetails?.verificationStatus || ((kyc as any)?.bankDetails ? 'Pending Verification' : 'Not Submitted'),
        leadsCount: staffLeads.length,
        salesCount: staffSales.length,
        revenueGenerated: staffSales.reduce((sum, sl) => sum + (sl.finalAmount || 0), 0),
        attendanceToday,
        attendanceDays: thisMonthAttendance,
        attendancePercentage,
        monthlyTarget,
        achievementPercentage,
      };
    });
  return res.json(staff);
});

// Admin create / onboard new staff employee
api.post('/admin/staff', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const {
    fullName,
    fathersName,
    dob,
    gender,
    profilePhoto,
    mobile,
    whatsapp,
    alternateMobile,
    email,
    personalEmail,
    address,
    city,
    state,
    pinCode,
    department,
    designation,
    joiningDate,
    employeeType,
    reportingManager,
    employmentStatus,
    workLocation,
    experienceYears,
    previousExperience,
    notes,
    salaryAmount,
    salary,
    salaryType,
    salaryEffectiveDate,
    paymentCycle,
    salaryNotes,
    bankDetails,
    monthlyLeadTarget,
    monthlyContactTarget,
    monthlyFollowupTarget,
    monthlyDemoTarget,
    monthlyProposalTarget,
    monthlySalesTarget,
    monthlySalesAmountTarget,
    monthlyDeliveryTarget,
    temporaryPassword,
    password,
  } = req.body;

  if (!fullName || !mobile || !email || !department || !designation) {
    return res.status(400).json({ error: 'Full Name, Mobile, Email, Department, and Designation are required.' });
  }

  const db = getDb();
  if (db.users.some((u) => u.mobile === mobile || u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'A staff member with this mobile or email already exists.' });
  }

  const staffCount = db.users.filter((u) => u.role === 'STAFF').length + 1;
  const staffId = `VE-STAFF-${String(staffCount).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const pass = hashPassword(password || temporaryPassword || 'Staff1@$');

  const resolvedSalaryAmount = salaryAmount ?? (typeof salary === 'number' ? salary : salary?.amount);
  const resolvedSalaryType = salaryType || (typeof salary === 'object' && salary?.type ? salary.type : 'Fixed');

  const newStaff: User = {
    id: `user-staff-${Date.now()}`,
    userId: staffId,
    role: 'STAFF',
    fullName,
    fathersName: fathersName || '',
    dob: dob || '',
    gender: gender || 'Male',
    profilePhoto: profilePhoto || '',
    mobile,
    whatsapp: whatsapp || mobile,
    alternateMobile: alternateMobile || '',
    email,
    personalEmail: personalEmail || '',
    address: address || '',
    city: city || '',
    state: state || '',
    pinCode: pinCode || '',
    department,
    designation,
    joiningDate: joiningDate || now.split('T')[0],
    employeeType: employeeType || 'Full-time',
    reportingManager: reportingManager || '',
    status: (employmentStatus?.toLowerCase() as any) || 'active',
    workLocation: workLocation || 'Office',
    experienceYears: experienceYears || '',
    previousExperience: previousExperience || '',
    notes: notes || '',
    firstLogin: true,
    passwordChanged: false,
    pinConfigured: false,
    passwordHash: pass.hash,
    passwordSalt: pass.salt,
    pinHash: null,
    pinSalt: null,
    permissions: getDefaultStaffPermissions(),
    salary: resolvedSalaryAmount
      ? {
          amount: Number(resolvedSalaryAmount),
          type: resolvedSalaryType,
          target: monthlySalesTarget ? Number(monthlySalesTarget) : undefined,
        }
      : undefined,
    salaryEffectiveDate: salaryEffectiveDate || now.split('T')[0],
    paymentCycle: paymentCycle || 'Monthly',
    salaryNotes: salaryNotes || '',
    bankDetails: bankDetails
      ? {
          ...bankDetails,
          verificationStatus: bankDetails.verificationStatus || 'Pending Verification',
        }
      : undefined,
    monthlyLeadTarget: monthlyLeadTarget ? Number(monthlyLeadTarget) : 30,
    monthlyContactTarget: monthlyContactTarget ? Number(monthlyContactTarget) : 25,
    monthlyFollowupTarget: monthlyFollowupTarget ? Number(monthlyFollowupTarget) : 20,
    monthlyDemoTarget: monthlyDemoTarget ? Number(monthlyDemoTarget) : 15,
    monthlyProposalTarget: monthlyProposalTarget ? Number(monthlyProposalTarget) : 10,
    monthlySalesTarget: monthlySalesTarget ? Number(monthlySalesTarget) : 5,
    monthlySalesAmountTarget: monthlySalesAmountTarget ? Number(monthlySalesAmountTarget) : 50000,
    monthlyDeliveryTarget: monthlyDeliveryTarget ? Number(monthlyDeliveryTarget) : 5,
    kycStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newStaff);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'STAFF_CREATED',
    module: 'staff',
    recordId: staffId,
    newValue: `${fullName} (${department} - ${designation})`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Staff member onboarded successfully.', user: sanitizeUser(newStaff) });
});

// Admin update staff profile
api.put('/admin/staff/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const staff = db.users.find((u) => (u.id === id || u.userId === id) && u.role === 'STAFF');
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  const fields = req.body;
  const allowedUpdates = [
    'fullName', 'fathersName', 'dob', 'gender', 'profilePhoto',
    'mobile', 'whatsapp', 'alternateMobile', 'email', 'personalEmail',
    'address', 'city', 'state', 'pinCode', 'department', 'designation',
    'employeeType', 'reportingManager', 'workLocation', 'experienceYears',
    'previousExperience', 'notes', 'salaryEffectiveDate', 'paymentCycle',
    'salaryNotes', 'monthlyLeadTarget', 'monthlyContactTarget', 'monthlyFollowupTarget',
    'monthlyDemoTarget', 'monthlyProposalTarget', 'monthlySalesTarget',
    'monthlySalesAmountTarget', 'monthlyDeliveryTarget',
  ];

  for (const field of allowedUpdates) {
    if (fields[field] !== undefined) {
      (staff as any)[field] = fields[field];
    }
  }

  if (fields.salaryAmount !== undefined || fields.salary !== undefined) {
    const amt = fields.salaryAmount ?? (typeof fields.salary === 'number' ? fields.salary : fields.salary?.amount);
    const typ = fields.salaryType || (typeof fields.salary === 'object' && fields.salary?.type ? fields.salary.type : staff.salary?.type || 'Fixed');
    staff.salary = {
      amount: Number(amt),
      type: typ,
      target: fields.monthlySalesTarget ? Number(fields.monthlySalesTarget) : staff.salary?.target,
    };
  }

  if (fields.bankDetails) {
    staff.bankDetails = {
      ...(staff.bankDetails || { accountHolderName: '', bankName: '', accountNumber: '', ifsc: '' }),
      ...fields.bankDetails,
    };
  }

  staff.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'STAFF_UPDATED',
    module: 'staff',
    recordId: staff.userId,
    newValue: `Updated details for ${staff.fullName}`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Staff profile updated successfully.', user: sanitizeUser(staff) });
});

// Admin update staff permissions
api.put('/admin/staff/:id/permissions', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { modules, permissions, dataScope } = req.body;

  const db = getDb();
  const user = db.users.find((u) => (u.id === id || u.userId === id) && u.role === 'STAFF');
  if (!user) return res.status(404).json({ error: 'Staff member not found.' });

  if (modules) {
    user.permissions = {
      ...(user.permissions || getDefaultStaffPermissions()),
      dataScope: dataScope || user.permissions?.dataScope || 'own',
      modules: {
        ...(user.permissions?.modules || {}),
        ...modules,
      },
    };
  } else if (permissions) {
    user.permissions = permissions;
  }
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'STAFF_PERMISSIONS_UPDATED',
    module: 'staff',
    recordId: user.userId,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Permissions updated successfully.', permissions: user.permissions });
});

// Admin Staff Detailed Profile (Complete with 21 Tabs Data)
api.get('/admin/staff/:id/profile', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const staff = db.users.find((u) => u.userId === id || u.id === id);
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  const kyc = db.staffKyc.find((k) => k.staffId === staff.userId);
  const attendance = db.attendance.filter((a) => a.staffId === staff.userId);
  const sales = db.sales.filter((s) => s.staffOrDsaId === staff.userId);
  const leads = db.leads.filter((l) => l.assignedStaffId === staff.userId || l.createdBy === staff.userId);
  const followups = db.followups.filter((f) => f.assignedUserId === staff.userId);
  const customers = db.customers.filter((c) => c.assignedStaffId === staff.userId);
  const proposals = db.proposals.filter((p) => p.assignedStaffId === staff.userId);
  const projects = db.projects.filter((p) => p.assignedStaffId === staff.userId);
  const targets = db.targets.filter((t) => t.staffId === staff.userId);
  const referrals = db.staffReferrals.filter((r) => r.staffId === staff.userId);
  const requests = db.requests.filter((r) => r.staffId === staff.userId);
  const complaints = db.complaints.filter((c) => c.staffId === staff.userId);
  const notifications = db.notifications.filter((n) => n.userId === staff.userId);
  const audit = db.auditLogs.filter((l) => l.userId === staff.userId);
  const payroll = db.payroll.filter((p) => p.staffId === staff.userId);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const absentCount = attendance.filter((a) => (a.status as string) === 'Absent').length;

  const monthSales = sales.filter((s) => s.createdAt && s.createdAt.startsWith(currentMonth));
  const monthRevenue = monthSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
  const targetSales = staff.monthlySalesTarget || 10;
  const targetRevenue = staff.monthlySalesAmountTarget || 50000;

  return res.json({
    staff: sanitizeUser(staff),
    kyc: kyc || null,
    bankDetails: staff.bankDetails || ((kyc as any)?.bankDetails ? (kyc as any).bankDetails : null),
    payroll,
    attendance,
    sales,
    leads,
    followups,
    customers,
    proposals,
    projects,
    targets,
    referrals,
    requests,
    complaints,
    notifications,
    recentActivity: audit.slice(0, 30),
    metrics: {
      totalLeads: leads.length,
      contacted: leads.filter((l) => ['Contacted', 'Interested', 'Follow-up', 'Won'].includes(l.status)).length,
      interested: leads.filter((l) => l.status === 'Interested').length,
      demos: leads.filter((l) => l.status === 'Demo Shared').length,
      proposals: proposals.length,
      totalSales: sales.length,
      monthSales: monthSales.length,
      revenueGenerated: sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0),
      monthRevenue,
      targetSales,
      targetRevenue,
      salesAchievementPct: targetSales > 0 ? Math.min(100, Math.round((monthSales.length / targetSales) * 100)) : 0,
      revenueAchievementPct: targetRevenue > 0 ? Math.min(100, Math.round((monthRevenue / targetRevenue) * 100)) : 0,
      totalAttendanceDays: attendance.length,
      presentCount,
      lateCount,
      absentCount,
      pendingRequests: requests.filter((r) => r.status === 'pending').length,
      resolvedComplaints: complaints.filter((c) => c.status === 'resolved').length,
      activeProjects: projects.filter((p) => (p.status as string) !== 'Live' && (p.status as string) !== 'Delivered').length,
      deliveredProjects: projects.filter((p) => (p.status as string) === 'Live' || (p.status as string) === 'Delivered').length,
    },
  });
});

// Staff Payroll Management
api.get('/admin/staff/:id/payroll', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const staff = db.users.find((u) => u.userId === id || u.id === id);
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  const records = db.payroll.filter((p) => p.staffId === staff.userId);
  return res.json(records);
});

api.post('/admin/staff/:id/payroll', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const staff = db.users.find((u) => u.userId === id || u.id === id);
  if (!staff) return res.status(404).json({ error: 'Staff member not found.' });

  const {
    salaryMonth,
    baseSalary,
    approvedAdjustments,
    deduction,
    bonus,
    paymentStatus,
    paymentDate,
    paymentReference,
    notes,
  } = req.body;

  if (!salaryMonth) {
    return res.status(400).json({ error: 'Salary Month (YYYY-MM) is required.' });
  }

  const base = Number(baseSalary ?? (typeof staff.salary === 'object' ? staff.salary.amount : staff.salary) ?? 0);
  const adj = Number(approvedAdjustments ?? 0);
  const ded = Number(deduction ?? 0);
  const bon = Number(bonus ?? 0);
  const net = Math.max(0, base + adj + bon - ded);

  const count = db.payroll.length + 1;
  const payrollId = `PAY-${salaryMonth.replace('-', '')}-${String(count).padStart(4, '0')}`;
  const now = new Date().toISOString();

  const record: StaffPayrollRecord = {
    id: `pay-${Date.now()}`,
    payrollId,
    staffId: staff.userId,
    staffName: staff.fullName,
    salaryMonth,
    baseSalary: base,
    approvedAdjustments: adj,
    deduction: ded,
    bonus: bon,
    netPay: net,
    paymentStatus: paymentStatus || 'Pending',
    paymentDate: paymentDate || (paymentStatus === 'Paid' ? now.split('T')[0] : undefined),
    paymentReference: paymentReference || '',
    notes: notes || '',
    createdAt: now,
    updatedAt: now,
  };

  db.payroll.unshift(record);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'PAYROLL_GENERATED',
    module: 'staff',
    recordId: payrollId,
    newValue: `Generated for ${staff.fullName} - ₹${net} (${salaryMonth})`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Payroll record created successfully.', record });
});

api.put('/admin/payroll/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const record = db.payroll.find((p) => p.id === id || p.payrollId === id);
  if (!record) return res.status(404).json({ error: 'Payroll record not found.' });

  const { paymentStatus, paymentDate, paymentReference, notes, approvedAdjustments, deduction, bonus } = req.body;
  if (paymentStatus) record.paymentStatus = paymentStatus;
  if (paymentDate !== undefined) record.paymentDate = paymentDate;
  if (paymentReference !== undefined) record.paymentReference = paymentReference;
  if (notes !== undefined) record.notes = notes;
  if (approvedAdjustments !== undefined) record.approvedAdjustments = Number(approvedAdjustments);
  if (deduction !== undefined) record.deduction = Number(deduction);
  if (bonus !== undefined) record.bonus = Number(bonus);

  record.netPay = Math.max(0, record.baseSalary + (record.approvedAdjustments || 0) + (record.bonus || 0) - (record.deduction || 0));
  record.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'PAYROLL_UPDATED',
    module: 'staff',
    recordId: record.payrollId,
    newValue: `Status: ${record.paymentStatus}, Net: ₹${record.netPay}`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Payroll record updated successfully.', record });
});

// Admin Attendance Report Generator
api.get('/admin/attendance/report', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { startDate, endDate, staffId, department, designation, status } = req.query;
  const db = getDb();

  let list = db.attendance;
  if (startDate) list = list.filter((a) => a.date >= (startDate as string));
  if (endDate) list = list.filter((a) => a.date <= (endDate as string));
  if (staffId) list = list.filter((a) => a.staffId === staffId);
  if (status) list = list.filter((a) => a.status.toLowerCase() === (status as string).toLowerCase());

  // Join with staff details for department and designation filtering
  const enriched = list.map((a) => {
    const s = db.users.find((u) => u.userId === a.staffId);
    return {
      ...a,
      department: s?.department || 'Operations',
      designation: s?.designation || 'Staff',
      staffMobile: s?.mobile || '',
    };
  });

  let filtered = enriched;
  if (department) filtered = filtered.filter((a) => a.department === department);
  if (designation) filtered = filtered.filter((a) => a.designation === designation);

  const summary = {
    totalRecords: filtered.length,
    present: filtered.filter((a) => a.status === 'Present').length,
    late: filtered.filter((a) => a.status === 'Late').length,
    absent: filtered.filter((a) => (a.status as string) === 'Absent').length,
    halfDay: filtered.filter((a) => a.status === 'Half Day').length,
  };

  return res.json({ summary, records: filtered });
});

// Admin list DSA partners with rich metrics
api.get('/admin/dsa', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  const dsas = db.users
    .filter((u) => u.role === 'DSA')
    .map((d) => {
      const safe = sanitizeUser(d);
      const kyc = db.dsaKyc.find((k) => k.dsaId === d.userId);
      const dsaLeads = db.leads.filter((l) => l.assignedDsaId === d.userId || l.createdBy === d.userId);
      const dsaSales = db.sales.filter((s) => s.staffOrDsaId === d.userId);
      const dsaProjects = db.projects.filter((p) => p.assignedDsaId === d.userId);
      const dsaWithdrawals = db.withdrawals.filter((w) => w.dsaId === d.userId);

      const totalSalesAmount = dsaSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      const grossCommission = dsaSales.reduce((sum, s) => sum + (s.commissionAmount || 0), 0);
      const claimedCommission = dsaWithdrawals
        .filter((w) => w.status !== 'Rejected')
        .reduce((sum, w) => sum + (w.requestedAmount || 0), 0);
      const availableCommission = Math.max(0, grossCommission - claimedCommission);
      const pendingWithdrawal = dsaWithdrawals
        .filter((w) => ['Request Submitted', 'Admin Reviewing', 'Bank Details Verified', 'Approved', 'Payment Processing'].includes(w.status))
        .reduce((sum, w) => sum + (w.requestedAmount || 0), 0);

      const permittedServices = d.permissions?.permittedServices || [];

      return {
        ...safe,
        kycStatus: kyc?.status || d.kycStatus || 'Not Submitted',
        bankVerificationStatus: d.bankDetails?.verificationStatus || (kyc?.bankDetails ? 'Pending Verification' : 'Not Submitted'),
        agreementAccepted: d.agreementAccepted || false,
        leadsCount: dsaLeads.length,
        salesCount: dsaSales.length,
        salesAmount: totalSalesAmount,
        deliveredWebsites: dsaProjects.filter((p) => (p.status as string) === 'Live' || (p.status as string) === 'Delivered').length,
        totalCommission: grossCommission,
        availableCommission,
        pendingWithdrawal,
        servicesCount: permittedServices.length > 0 ? permittedServices.length : db.services.length,
      };
    });
  return res.json(dsas);
});

// Admin create / onboard new DSA partner
api.post('/admin/dsa', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const {
    fullName,
    fathersName,
    dob,
    gender,
    profilePhoto,
    mobile,
    whatsapp,
    alternateMobile,
    email,
    personalEmail,
    address,
    city,
    state,
    pinCode,
    businessName,
    businessType,
    businessRegType,
    businessAddress,
    businessCity,
    businessState,
    businessPin,
    businessEmail,
    businessMobile,
    website,
    googleBusinessProfile,
    yearsExperience,
    businessActivity,
    employeeCount,
    serviceArea,
    partnerType,
    joiningDate,
    reportingManager,
    referralSource,
    notes,
    permittedServices,
    commissionRate,
    password,
    temporaryPassword,
    bankDetails,
  } = req.body;

  if (!fullName || !mobile || !email) {
    return res.status(400).json({ error: 'Partner Full Name, Mobile Number, and Email are required.' });
  }

  const db = getDb();
  if (db.users.some((u) => u.mobile === mobile || u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'A partner or user with this mobile or email already exists.' });
  }

  const dsaCount = db.users.filter((u) => u.role === 'DSA').length + 1;
  const dsaId = `VE-DSA-${String(dsaCount).padStart(3, '0')}`;
  const now = new Date().toISOString();
  const pass = hashPassword(password || temporaryPassword || 'Dsa1@$');

  const defaultPerms = getDefaultDsaPermissions();
  if (Array.isArray(permittedServices)) {
    defaultPerms.permittedServices = permittedServices;
  }

  const newDsa: User = {
    id: `user-dsa-${Date.now()}`,
    userId: dsaId,
    role: 'DSA',
    fullName,
    fathersName: fathersName || '',
    dob: dob || '',
    gender: gender || 'Male',
    profilePhoto: profilePhoto || '',
    mobile,
    whatsapp: whatsapp || mobile,
    alternateMobile: alternateMobile || '',
    email,
    personalEmail: personalEmail || '',
    address: address || '',
    city: city || '',
    state: state || '',
    pinCode: pinCode || '',
    businessName: businessName || '',
    businessType: businessType || 'Digital Agency',
    businessRegType: businessRegType || 'Proprietorship',
    businessAddress: businessAddress || '',
    businessCity: businessCity || '',
    businessState: businessState || '',
    businessPin: businessPin || '',
    businessEmail: businessEmail || '',
    businessMobile: businessMobile || '',
    website: website || '',
    googleBusinessProfile: googleBusinessProfile || '',
    yearsExperience: yearsExperience || '',
    businessActivity: businessActivity || '',
    employeeCount: employeeCount || '',
    serviceArea: serviceArea || '',
    partnerType: partnerType || 'Individual',
    joiningDate: joiningDate || now.split('T')[0],
    reportingManager: reportingManager || '',
    referralSource: referralSource || 'Direct',
    notes: notes || '',
    status: 'active',
    firstLogin: true,
    passwordChanged: false,
    pinConfigured: false,
    passwordHash: pass.hash,
    passwordSalt: pass.salt,
    pinHash: null,
    pinSalt: null,
    permissions: defaultPerms,
    commissionRate: commissionRate !== undefined ? Number(commissionRate) : 10,
    bankDetails: bankDetails
      ? {
          ...bankDetails,
          verificationStatus: bankDetails.verificationStatus || 'Pending Verification',
        }
      : undefined,
    kycStatus: 'pending',
    agreementAccepted: false,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newDsa);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'DSA_CREATED',
    module: 'dsa',
    recordId: dsaId,
    newValue: `${fullName} (${businessName || 'DSA Partner'})`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'DSA Partner onboarded successfully.', user: sanitizeUser(newDsa) });
});

// Admin update DSA partner details
api.put('/admin/dsa/:id', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const dsa = db.users.find((u) => (u.id === id || u.userId === id) && u.role === 'DSA');
  if (!dsa) return res.status(404).json({ error: 'DSA partner not found.' });

  const fields = req.body;
  const allowedUpdates = [
    'fullName', 'fathersName', 'dob', 'gender', 'profilePhoto',
    'mobile', 'whatsapp', 'alternateMobile', 'email', 'personalEmail',
    'address', 'city', 'state', 'pinCode', 'businessName', 'businessType',
    'businessRegType', 'businessAddress', 'businessCity', 'businessState',
    'businessPin', 'businessEmail', 'businessMobile', 'website',
    'googleBusinessProfile', 'yearsExperience', 'businessActivity',
    'employeeCount', 'serviceArea', 'partnerType', 'reportingManager',
    'referralSource', 'notes', 'commissionRate',
  ];

  for (const field of allowedUpdates) {
    if (fields[field] !== undefined) {
      (dsa as any)[field] = fields[field];
    }
  }

  if (fields.bankDetails) {
    dsa.bankDetails = {
      ...(dsa.bankDetails || { accountHolderName: '', bankName: '', accountNumber: '', ifsc: '' }),
      ...fields.bankDetails,
    };
  }

  if (fields.permittedServices && Array.isArray(fields.permittedServices)) {
    dsa.permissions = {
      ...(dsa.permissions || getDefaultDsaPermissions()),
      permittedServices: fields.permittedServices,
    };
  }

  dsa.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'DSA_UPDATED',
    module: 'dsa',
    recordId: dsa.userId,
    newValue: `Updated details for ${dsa.fullName}`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'DSA partner updated successfully.', user: sanitizeUser(dsa) });
});

// Admin DSA Detailed Profile (Complete with 20 Tabs Data)
api.get('/admin/dsa/:id/profile', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const dsa = db.users.find((u) => (u.userId === id || u.id === id) && u.role === 'DSA');
  if (!dsa) return res.status(404).json({ error: 'DSA Partner not found.' });

  const kyc = db.dsaKyc.find((k) => k.dsaId === dsa.userId);
  const agreement = db.dsaAgreements.find((a) => a.dsaId === dsa.userId);
  const leads = db.leads.filter((l) => l.assignedDsaId === dsa.userId || l.createdBy === dsa.userId);
  const proposals = db.proposals.filter((p) => p.assignedDsaId === dsa.userId);
  const sales = db.sales.filter((s) => s.staffOrDsaId === dsa.userId);
  const customers = db.customers.filter((c) => c.assignedDsaId === dsa.userId);
  const projects = db.projects.filter((p) => p.assignedDsaId === dsa.userId);
  const commissions = db.commissions.filter((c) => c.dsaId === dsa.userId);
  const withdrawals = db.withdrawals.filter((w) => w.dsaId === dsa.userId);
  const requests = db.requests.filter((r) => r.staffId === dsa.userId);
  const complaints = db.complaints.filter((c) => c.staffId === dsa.userId);
  const notifications = db.notifications.filter((n) => n.userId === dsa.userId);
  const audit = db.auditLogs.filter((l) => l.userId === dsa.userId);

  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
  const grossCommission = sales.reduce((sum, s) => sum + (s.commissionAmount || 0), 0);
  const withdrawalsPaid = withdrawals
    .filter((w) => w.status === 'Paid')
    .reduce((sum, w) => sum + (w.requestedAmount || 0), 0);
  const activeWithdrawalAmount = withdrawals
    .filter((w) => w.status !== 'Rejected')
    .reduce((sum, w) => sum + (w.requestedAmount || 0), 0);
  const availableCommission = Math.max(0, grossCommission - activeWithdrawalAmount);
  const pendingWithdrawalAmount = withdrawals
    .filter((w) => ['Request Submitted', 'Admin Reviewing', 'Bank Details Verified', 'Approved', 'Payment Processing'].includes(w.status))
    .reduce((sum, w) => sum + (w.requestedAmount || 0), 0);

  return res.json({
    dsa: sanitizeUser(dsa),
    kyc: kyc || null,
    bankDetails: dsa.bankDetails || (kyc ? kyc.bankDetails : null),
    agreement: agreement || {
      agreementId: `AGR-2026-${dsa.userId}`,
      accepted: !!dsa.agreementAccepted,
      acceptedAt: dsa.agreementAcceptedAt,
      version: dsa.agreementVersion || '1.0',
    },
    permittedServices: dsa.permissions?.permittedServices || db.services.map((s) => s.id),
    leads,
    proposals,
    sales,
    customers,
    projects,
    commissions,
    withdrawals,
    requests,
    complaints,
    notifications,
    recentActivity: audit.slice(0, 30),
    metrics: {
      totalLeads: leads.length,
      contacted: leads.filter((l) => ['Contacted', 'Interested', 'Follow-up', 'Won'].includes(l.status)).length,
      interested: leads.filter((l) => l.status === 'Interested').length,
      demos: leads.filter((l) => l.status === 'Demo Shared').length,
      proposals: proposals.length,
      totalSales: sales.length,
      salesAmount: totalSalesAmount,
      deliveredWebsites: projects.filter((p) => (p.status as string) === 'Live' || (p.status as string) === 'Delivered').length,
      pendingProjects: projects.filter((p) => (p.status as string) !== 'Live' && (p.status as string) !== 'Delivered').length,
      totalCommission: grossCommission,
      availableCommission,
      withdrawalsPaid,
      pendingWithdrawalAmount,
      renewals: db.renewals.filter((r) => (r as any).dsaId === dsa.userId || (r as any).assignedStaffOrDsaId === dsa.userId).length,
    },
  });
});

// Admin configure DSA permitted website services
api.put('/admin/users/:id/services', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { permittedServices } = req.body;

  if (!Array.isArray(permittedServices)) {
    return res.status(400).json({ error: 'permittedServices must be an array of service IDs.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.permissions = {
    ...(user.permissions || getDefaultDsaPermissions()),
    permittedServices,
  };
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'SERVICE_PERMISSIONS_UPDATED',
    module: 'dsa',
    recordId: user.userId,
    newValue: `${permittedServices.length} website services authorized`,
    ip: getClientIp(req),
  });

  return res.json({
    message: 'Website service permissions updated successfully.',
    permittedServices: user.permissions.permittedServices,
  });
});

// Admin manual commission adjustment
api.post('/admin/commissions/adjust', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { dsaId, adjustmentAmount, reason, saleId } = req.body;
  if (!dsaId || adjustmentAmount === undefined || !reason) {
    return res.status(400).json({ error: 'DSA ID, Adjustment Amount, and Reason are required.' });
  }

  const db = getDb();
  const dsa = db.users.find((u) => (u.userId === dsaId || u.id === dsaId) && u.role === 'DSA');
  if (!dsa) return res.status(404).json({ error: 'DSA partner not found.' });

  const now = new Date();
  const count = db.commissions.length + 1;
  const commissionId = `COMM-ADJ-${now.toISOString().split('T')[0].replace(/-/g, '')}-${String(count).padStart(3, '0')}`;

  const commRecord: CommissionRecord = {
    id: `comm-adj-${Date.now()}`,
    commissionId,
    dsaId: dsa.userId,
    dsaName: dsa.fullName,
    saleId: saleId || 'MANUAL-ADJUSTMENT',
    customerId: 'SYSTEM',
    customerName: 'Admin Adjustment',
    businessName: dsa.businessName || 'DSA Account',
    saleAmount: 0,
    eligibleAmount: Number(adjustmentAmount),
    commissionRate: dsa.commissionRate || 10,
    commissionAmount: Number(adjustmentAmount),
    eligibilityStatus: 'Released',
    status: 'Adjusted',
    adjustedBy: req.user!.userId,
    adjustmentReason: reason,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.commissions.unshift(commRecord);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'COMMISSION_MANUAL_ADJUSTMENT',
    module: 'commissions',
    recordId: commissionId,
    newValue: `Adjustment: ₹${adjustmentAmount} to ${dsa.fullName} (${dsa.userId}). Reason: ${reason}`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Commission adjusted successfully.', commission: commRecord });
});

// Admin update user bank details
api.put('/admin/users/:id/bank-details', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { accountHolderName, bankName, accountNumber, ifsc, branch, upiId, accountType, bankProof } = req.body;

  if (!accountHolderName || !bankName || !accountNumber || !ifsc) {
    return res.status(400).json({ error: 'Account Holder Name, Bank Name, Account Number, and IFSC are required.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.bankDetails = {
    accountHolderName,
    bankName,
    accountNumber,
    ifsc,
    branch: branch || '',
    upiId: upiId || '',
    accountType: accountType || 'Savings',
    bankProof: bankProof || user.bankDetails?.bankProof,
    verificationStatus: 'Pending Verification',
  };
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'BANK_DETAILS_UPDATED',
    module: 'users',
    recordId: user.userId,
    newValue: `Bank: ${bankName}, Acc: ${accountNumber.slice(-4)}`,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Bank details saved successfully.', bankDetails: user.bankDetails });
});

// Admin verify or reject user bank details
api.post('/admin/users/:id/verify-bank', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!['Verified', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Verified or Rejected.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (!user.bankDetails) {
    return res.status(400).json({ error: 'No bank details on file to verify.' });
  }

  const now = new Date().toISOString();
  user.bankDetails.verificationStatus = status;
  user.bankDetails.verifiedBy = req.user!.userId;
  user.bankDetails.verifiedDate = now;
  user.bankDetails.rejectionReason = rejectionReason || '';
  user.updatedAt = now;

  saveDb(db);

  addNotification({
    userId: user.userId,
    title: `Bank Details ${status}`,
    message: status === 'Verified' ? 'Your bank details have been verified by Admin.' : `Your bank details were rejected: ${rejectionReason}`,
    link: user.role === 'DSA' ? '/dsa' : '/staff',
  });

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: `BANK_${status.toUpperCase()}`,
    module: 'users',
    recordId: user.userId,
    newValue: `Bank details ${status}`,
    reason: rejectionReason,
    ip: getClientIp(req),
  });

  return res.json({ message: `Bank details marked as ${status}.`, bankDetails: user.bankDetails });
});

// Admin Security Action: Reset User Password
api.post('/admin/users/:id/reset-password', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { temporaryPassword } = req.body;

  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const tempPass = temporaryPassword || `${user.role === 'STAFF' ? 'Staff' : 'Dsa'}1@$`;
  const pass = hashPassword(tempPass);

  user.passwordHash = pass.hash;
  user.passwordSalt = pass.salt;
  user.firstLogin = true;
  user.passwordChanged = false;
  user.updatedAt = new Date().toISOString();

  // Invalidate all active sessions for this user
  db.sessions = db.sessions.filter((s) => s.userId !== user.userId);
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'PASSWORD_RESET',
    module: 'security',
    recordId: user.userId,
    newValue: 'Password reset by admin; forced first-login reset',
    ip: getClientIp(req),
  });

  return res.json({
    message: `Password has been reset for ${user.fullName} (${user.userId}). Next login will require changing credentials.`,
  });
});

// Admin Security Action: Reset User PIN
api.post('/admin/users/:id/reset-pin', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.pinConfigured = false;
  user.pinHash = null;
  user.pinSalt = null;
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'PIN_RESET',
    module: 'security',
    recordId: user.userId,
    newValue: 'Security PIN cleared by admin',
    ip: getClientIp(req),
  });

  return res.json({ message: `Security PIN reset for ${user.fullName}. User will be prompted to create a new PIN.` });
});

// Admin Security Action: Force Password Change
api.post('/admin/users/:id/force-password-change', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.firstLogin = true;
  user.passwordChanged = false;
  user.forcePasswordChange = true;
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'FORCE_PASSWORD_CHANGE',
    module: 'security',
    recordId: user.userId,
    ip: getClientIp(req),
  });

  return res.json({ message: `Password change forced on next login for ${user.fullName}.` });
});

// Admin Security Action: Force PIN Change
api.post('/admin/users/:id/force-pin-change', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.pinConfigured = false;
  user.forcePinChange = true;
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'FORCE_PIN_CHANGE',
    module: 'security',
    recordId: user.userId,
    ip: getClientIp(req),
  });

  return res.json({ message: `PIN change forced on next login for ${user.fullName}.` });
});

// Admin Security Action: Logout All Sessions
api.post('/admin/users/:id/logout-sessions', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const initialCount = db.sessions.length;
  db.sessions = db.sessions.filter((s) => s.userId !== user.userId);
  const revoked = initialCount - db.sessions.length;
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    userName: req.user!.fullName,
    role: 'ADMIN',
    action: 'SESSIONS_TERMINATED',
    module: 'security',
    recordId: user.userId,
    newValue: `${revoked} session(s) terminated`,
    ip: getClientIp(req),
  });

  return res.json({ message: `Terminated ${revoked} active session(s) for ${user.fullName}.` });
});

// Consolidated KYC Approval Center Metrics
api.get('/admin/kyc/approval-center', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  const staffKyc = db.staffKyc || [];
  const dsaKyc = db.dsaKyc || [];

  const summary = {
    staffPending: staffKyc.filter((k) => k.status === 'submitted' || (k.status as string) === 'pending').length,
    staffCorrection: staffKyc.filter((k) => k.status === 'correction_needed').length,
    staffApproved: staffKyc.filter((k) => k.status === 'approved').length,
    staffRejected: staffKyc.filter((k) => k.status === 'rejected').length,
    dsaPending: dsaKyc.filter((k) => k.status === 'submitted' || (k.status as string) === 'pending').length,
    dsaCorrection: dsaKyc.filter((k) => k.status === 'correction_needed').length,
    dsaApproved: dsaKyc.filter((k) => k.status === 'approved').length,
    dsaRejected: dsaKyc.filter((k) => k.status === 'rejected').length,
  };

  return res.json({ summary, staffKyc, dsaKyc });
});

// Admin toggle or update DSA partner status
api.put('/admin/dsa/:id/status', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatus = status?.toLowerCase();
  if (!['active', 'inactive', 'suspended'].includes(validStatus)) {
    return res.status(400).json({ error: 'Status must be active, inactive, or suspended.' });
  }

  const db = getDb();
  const user = db.users.find((u) => (u.id === id || u.userId === id) && u.role === 'DSA');
  if (!user) return res.status(404).json({ error: 'DSA partner not found.' });

  const oldStatus = user.status;
  user.status = validStatus as any;
  user.updatedAt = new Date().toISOString();

  if (validStatus !== 'active') {
    db.sessions = db.sessions.filter((s) => s.userId !== user.userId);
  }

  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: `DSA_${validStatus.toUpperCase()}`,
    module: 'users',
    recordId: user.userId,
    oldValue: oldStatus,
    newValue: validStatus,
    reason,
    ip: getClientIp(req),
  });

  return res.json({ message: `DSA partner status updated to ${validStatus}.`, user: sanitizeUser(user) });
});

// Admin update user status (activate, deactivate, suspend)
api.put('/admin/users/:id/status', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!['active', 'inactive', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active, inactive, or suspended.' });
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.role === 'ADMIN' && user.userId === 'Admin') {
    return res.status(400).json({ error: 'Cannot deactivate Super Admin.' });
  }

  const oldStatus = user.status;
  user.status = status;
  user.updatedAt = new Date().toISOString();

  // Invalidate user sessions if deactivated
  if (status !== 'active') {
    db.sessions = db.sessions.filter((s) => s.userId !== user.userId);
  }

  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: `USER_${status.toUpperCase()}`,
    module: 'users',
    recordId: user.userId,
    oldValue: oldStatus,
    newValue: status,
    reason,
    ip: getClientIp(req),
  });

  return res.json({ message: `User status changed to ${status}.`, user: sanitizeUser(user) });
});

// Admin update permissions
api.put('/admin/users/:id/permissions', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const db = getDb();
  const user = db.users.find((u) => u.id === id || u.userId === id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.permissions = permissions;
  user.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'PERMISSIONS_UPDATED',
    module: 'permissions',
    recordId: user.userId,
    ip: getClientIp(req),
  });

  return res.json({ message: 'Permissions saved successfully.', permissions: user.permissions });
});

// ==========================================
// AUDIT LOGS & REPORTS
// ==========================================

api.get('/admin/audit-logs', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const { userId, module, action, date } = req.query;
  const db = getDb();
  let logs = db.auditLogs;

  if (userId) logs = logs.filter((l) => l.userId === userId);
  if (module) logs = logs.filter((l) => l.module === module);
  if (action) logs = logs.filter((l) => l.action === action);
  if (date) logs = logs.filter((l) => l.date === date);

  return res.json(logs.slice(0, 200));
});

// Admin Dashboard Summary Metrics (100% Real Database Data)
api.get('/admin/dashboard-stats', authenticate, requireRole(['ADMIN']), (req: Request, res: Response) => {
  const db = getDb();
  const range = (req.query.range as string) || 'all';
  const customStart = req.query.startDate as string;
  const customEnd = req.query.endDate as string;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nowTimeStr = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

  // Determine date bounds
  let startBound: Date | null = null;
  let endBound: Date | null = null;

  if (range === 'today') {
    startBound = new Date(todayStr + 'T00:00:00.000Z');
    endBound = new Date(todayStr + 'T23:59:59.999Z');
  } else if (range === 'yesterday') {
    const y = new Date(now.getTime() - 86400000);
    const yStr = y.toISOString().split('T')[0];
    startBound = new Date(yStr + 'T00:00:00.000Z');
    endBound = new Date(yStr + 'T23:59:59.999Z');
  } else if (range === 'week') {
    startBound = new Date(now.getTime() - 7 * 86400000);
    endBound = now;
  } else if (range === 'month') {
    startBound = new Date(now.getFullYear(), now.getMonth(), 1);
    endBound = now;
  } else if (range === 'year') {
    startBound = new Date(now.getFullYear(), 0, 1);
    endBound = now;
  } else if (range === 'custom' && customStart && customEnd) {
    startBound = new Date(customStart + 'T00:00:00.000Z');
    endBound = new Date(customEnd + 'T23:59:59.999Z');
  }

  const isDateInRange = (dateStr?: string): boolean => {
    if (!startBound || !endBound) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= startBound && d <= endBound;
  };

  // 1. Leads
  const filteredLeads = db.leads.filter((l) => isDateInRange(l.createdAt));
  const totalLeads = filteredLeads.length;
  const newLeads = filteredLeads.filter((l) => l.status === 'New').length;

  // 2. Follow-ups
  const allFollowups = db.followups || [];
  const todayFollowupsRaw = allFollowups.filter((f) => f.date === todayStr);
  const todayFollowupsCount = todayFollowupsRaw.filter((f) => f.status === 'Scheduled').length;

  const overdueFollowupsRaw = allFollowups.filter((f) => {
    if (f.status !== 'Scheduled') return false;
    if (f.date < todayStr) return true;
    if (f.date === todayStr && f.time && f.time < nowTimeStr) return true;
    return false;
  });
  const overdueFollowupsCount = overdueFollowupsRaw.length;

  // Helper to enrich follow-up with contact info
  const enrichFollowup = (f: FollowUp) => {
    let businessName = f.targetName;
    let contactPerson = f.targetName;
    let mobile = '';
    let whatsapp = '';
    let priority = 'Medium';

    if (f.targetType === 'Lead') {
      const lead = db.leads.find((l) => l.id === f.targetId || l.leadId === f.targetId);
      if (lead) {
        businessName = lead.businessName;
        contactPerson = lead.ownerName;
        mobile = lead.mobile;
        whatsapp = lead.whatsapp || lead.mobile;
        priority = lead.priority || 'Medium';
      }
    } else {
      const cust = db.customers.find((c) => c.id === f.targetId || c.customerId === f.targetId);
      if (cust) {
        businessName = cust.businessName;
        contactPerson = cust.ownerName;
        mobile = cust.mobile;
        whatsapp = cust.whatsapp || cust.mobile;
      }
    }

    return {
      id: f.id,
      followupId: f.followupId,
      time: f.time,
      date: f.date,
      targetType: f.targetType,
      targetId: f.targetId,
      businessName,
      contactPerson,
      mobile,
      whatsapp,
      type: f.type,
      purpose: f.notes,
      assignedPerson: f.assignedUserName,
      priority,
      status: f.status,
      lastResult: f.result,
      notes: f.notes,
    };
  };

  const todayFollowupsList = todayFollowupsRaw.map(enrichFollowup);
  const overdueFollowupsList = overdueFollowupsRaw.map(enrichFollowup);

  // 3. Proposals
  const filteredProposals = db.proposals.filter((p) => isDateInRange(p.createdAt));
  const totalProposals = filteredProposals.length;
  const acceptedProposals = filteredProposals.filter((p) => p.status === 'Accepted' || p.status === 'Converted to Sale').length;

  // 4. Sales & Revenue
  const filteredSales = db.sales.filter((s) => isDateInRange(s.createdAt));
  const totalSales = filteredSales.length;
  const totalSalesAmount = filteredSales.reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);
  const advanceCollected = filteredSales.reduce((sum, s) => sum + (Number(s.advancePaid) || 0), 0);

  // Verified Payments
  const verifiedPaymentsInRange = db.payments.filter((p) => p.verificationStatus === 'Verified' && isDateInRange(p.date || p.createdAt));
  const amountReceived = verifiedPaymentsInRange.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPendingAmount = Math.max(0, totalSalesAmount - amountReceived);
  const cancelledSales = 0; // In this system sales are not hard cancelled, or proposals rejected

  // 5. Current-status Metrics
  const activeProjects = db.projects.filter((p) => p.status !== 'Delivered').length;
  const websitesDelivered = db.projects.filter((p) => p.status === 'Delivered').length;

  const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const renewalsDue = db.renewals.filter(
    (r) => r.status === 'Upcoming' || (r.renewalDate && r.renewalDate <= thirtyDaysLater && r.status !== 'Paid')
  ).length;

  const pendingWithdrawalsRaw = db.withdrawals.filter((w) =>
    ['Request Submitted', 'Admin Reviewing', 'Bank Details Verified', 'Approved', 'Payment Processing'].includes(w.status)
  );
  const pendingWithdrawalsCount = pendingWithdrawalsRaw.length;

  // 6. Website Sales Pipeline (11 Stages)
  const allLeads = db.leads;
  const pipelineStages = [
    {
      stage: 'New Lead',
      count: allLeads.filter((l) => l.status === 'New').length,
      amount: 0,
    },
    {
      stage: 'Contacted',
      count: allLeads.filter((l) => l.status === 'Contacted').length,
      amount: 0,
    },
    {
      stage: 'Interested',
      count: allLeads.filter((l) => l.status === 'Interested').length,
      amount: 0,
    },
    {
      stage: 'Demo Shared',
      count: allLeads.filter((l) => l.status === 'Demo Shared').length,
      amount: 0,
    },
    {
      stage: 'Follow-up',
      count: allLeads.filter((l) => l.status === 'Follow-up').length,
      amount: 0,
    },
    {
      stage: 'Proposal Sent',
      count: db.proposals.filter((p) => p.status === 'Sent' || p.status === 'Viewed').length,
      amount: db.proposals
        .filter((p) => p.status === 'Sent' || p.status === 'Viewed')
        .reduce((sum, p) => sum + (p.finalAmount || 0), 0),
    },
    {
      stage: 'Negotiation',
      count: db.proposals.filter((p) => p.status === 'Negotiation').length,
      amount: db.proposals
        .filter((p) => p.status === 'Negotiation')
        .reduce((sum, p) => sum + (p.finalAmount || 0), 0),
    },
    {
      stage: 'Payment Pending',
      count: db.sales.filter((s) => s.paymentStatus === 'Pending' || s.paymentStatus === 'Advance Paid').length,
      amount: db.sales
        .filter((s) => s.paymentStatus === 'Pending' || s.paymentStatus === 'Advance Paid')
        .reduce((sum, s) => sum + (s.balanceAmount || s.finalAmount || 0), 0),
    },
    {
      stage: 'Won',
      count: db.sales.length,
      amount: db.sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0),
    },
    {
      stage: 'Development',
      count: db.projects.filter((p) => ['Development', 'Design Started', 'Requirements Pending', 'Content Pending', 'Customer Review', 'Revision', 'Final Approval'].includes(p.status)).length,
      amount: 0,
    },
    {
      stage: 'Delivered',
      count: db.projects.filter((p) => p.status === 'Delivered').length,
      amount: 0,
    },
  ];

  // 7. Sales & Revenue Trend (past 7 to 14 days)
  const trendDays = 7;
  const trend: Array<{ date: string; label: string; salesCount: number; saleAmount: number; receivedAmount: number }> = [];
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const daySales = db.sales.filter((s) => (s.createdAt || '').startsWith(dStr));
    const dayPayments = db.payments.filter((p) => p.verificationStatus === 'Verified' && (p.date || p.createdAt || '').startsWith(dStr));

    trend.push({
      date: dStr,
      label: dayLabel,
      salesCount: daySales.length,
      saleAmount: daySales.reduce((sum, s) => sum + (s.finalAmount || 0), 0),
      receivedAmount: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
    });
  }

  // 8. Recent Website Sales Orders (Latest 10)
  const recentSales = (db.sales || [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((s) => {
      // Find linked customer
      const cust = db.customers.find((c) => c.customerId === s.customerId || c.id === s.customerId);
      const proj = db.projects.find((p) => p.saleId === s.saleId || p.customerId === s.customerId);

      // Verified payments for this sale
      const salePayments = db.payments.filter((p) => p.saleId === s.saleId && p.verificationStatus === 'Verified');
      const received = salePayments.reduce((sum, p) => sum + (p.amount || 0), 0) || (s.advancePaid || 0);
      const pending = Math.max(0, s.finalAmount - received);

      return {
        id: s.id,
        saleId: s.saleId,
        customerId: s.customerId,
        customerName: s.customerName,
        businessName: s.businessName || cust?.businessName || s.customerName,
        contactPerson: cust?.ownerName || s.customerName,
        mobile: cust?.mobile || '',
        serviceName: s.serviceName,
        packageName: s.packageName || '',
        saleAmount: s.finalAmount,
        receivedAmount: received,
        pendingAmount: pending,
        staffOrDsaName: s.staffOrDsaName,
        staffOrDsaRole: s.staffOrDsaRole,
        deliveryStatus: s.deliveryStatus,
        projectStatus: proj?.status || s.deliveryStatus || 'In Progress',
        projectId: proj?.projectId,
        saleDate: (s.createdAt || todayStr).split('T')[0],
      };
    });

  // 9. Staff Performance
  const staffUsers = db.users.filter((u) => u.role === 'STAFF' && u.status === 'active');
  const staffPerformance = staffUsers.map((staff) => {
    const staffLeads = db.leads.filter((l) => l.assignedStaffId === staff.userId);
    const staffContacts = staffLeads.filter((l) => l.status !== 'New').length;
    const staffFollowups = db.followups.filter((f) => f.assignedUserId === staff.userId).length;
    const staffDemos = staffLeads.filter((l) => l.status === 'Demo Shared').length;
    const staffProposals = db.proposals.filter((p) => p.assignedStaffId === staff.userId || p.createdBy === staff.userId).length;
    const staffSales = db.sales.filter((s) => s.staffOrDsaId === staff.userId);
    const staffSalesAmount = staffSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);

    const targetRecord = db.targets.find((t) => t.staffId === staff.userId);
    const target = targetRecord ? targetRecord.monthlySalesTarget : 100000;
    const achievementPct = target > 0 ? Math.round((staffSalesAmount / target) * 100) : 0;

    return {
      staffId: staff.userId,
      staffName: staff.fullName,
      department: staff.department || 'Sales',
      designation: staff.designation || 'Sales Executive',
      leads: staffLeads.length,
      contacts: staffContacts,
      followups: staffFollowups,
      demos: staffDemos,
      proposals: staffProposals,
      sales: staffSales.length,
      salesAmount: staffSalesAmount,
      target,
      achievementPct,
    };
  });

  // 10. DSA Partner Performance (10% Commission Model)
  const dsaUsers = db.users.filter((u) => u.role === 'DSA' && u.status === 'active');
  const dsaPerformance = dsaUsers.map((dsa) => {
    const dsaLeads = db.leads.filter((l) => l.assignedDsaId === dsa.userId || l.createdBy === dsa.userId).length;
    const dsaSales = db.sales.filter((s) => s.staffOrDsaId === dsa.userId && s.staffOrDsaRole === 'DSA');
    const dsaSalesAmount = dsaSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
    const deliveredCount = dsaSales.filter((s) => s.deliveryStatus === 'Delivered').length;
    const pendingSalesCount = dsaSales.filter((s) => s.deliveryStatus !== 'Delivered').length;

    // Commission = 10% of sales amount
    const totalCommission = dsaSales.reduce((sum, s) => sum + (s.commissionAmount || Math.round(s.finalAmount * 0.1)), 0);
    const availableCommission = dsaSales
      .filter((s) => s.commissionStatus === 'Available')
      .reduce((sum, s) => sum + (s.commissionAmount || Math.round(s.finalAmount * 0.1)), 0);

    const dsaPendingWithdrawals = db.withdrawals
      .filter((w) => w.dsaId === dsa.userId && ['Request Submitted', 'Admin Reviewing', 'Approved'].includes(w.status))
      .reduce((sum, w) => sum + (w.requestedAmount || 0), 0);

    return {
      dsaId: dsa.userId,
      name: dsa.fullName,
      leads: dsaLeads,
      websiteSales: dsaSales.length,
      salesAmount: dsaSalesAmount,
      deliveredWebsites: deliveredCount,
      pendingSales: pendingSalesCount,
      commission: totalCommission,
      availableCommission,
      pendingWithdrawal: dsaPendingWithdrawals,
    };
  });

  // 11. Website Project Statuses
  const allProjects = db.projects || [];
  const projectStatusList = [
    'Payment Received',
    'Requirements Pending',
    'Content Pending',
    'Design Started',
    'Development',
    'Customer Review',
    'Revision',
    'Final Approval',
    'Live',
    'Delivered',
  ];
  const projectCounts: Record<string, number> = {};
  for (const st of projectStatusList) {
    projectCounts[st] = allProjects.filter((p) => p.status === st).length;
  }

  // 12. Payment Overview
  const allSalesTotal = db.sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
  const allVerifiedPaymentsTotal = db.payments
    .filter((p) => p.verificationStatus === 'Verified')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPendingPayments = Math.max(0, allSalesTotal - allVerifiedPaymentsTotal);

  const pendingVerificationList = db.payments.filter((p) => p.verificationStatus === 'Submitted' || p.verificationStatus === 'Pending');
  const rejectedPaymentsCount = db.payments.filter((p) => p.verificationStatus === 'Rejected').length;
  const recentlyReceivedPayments = db.payments
    .filter((p) => p.verificationStatus === 'Verified')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      paymentId: p.paymentId,
      customerName: p.customerName,
      amount: p.amount,
      date: p.date,
      paymentMethod: p.paymentMethod,
      transactionNumber: p.transactionNumber,
    }));

  // 13. Staff Attendance Today
  const totalActiveStaff = staffUsers.length;
  const todayAttendanceRecords = db.attendance.filter((a) => a.date === todayStr);
  const presentCount = new Set(todayAttendanceRecords.map((a) => a.staffId)).size;
  const absentCount = Math.max(0, totalActiveStaff - presentCount);
  const lateCount = todayAttendanceRecords.filter((a) => a.exactTime && a.exactTime > '10:00:00').length;

  // 14. KYC Verification Alerts
  const newStaffKyc = db.staffKyc.filter((k) => k.status === 'submitted').length;
  const staffCorrection = db.staffKyc.filter((k) => k.status === 'correction_needed').length;
  const newDsaKyc = db.dsaKyc.filter((k) => k.status === 'submitted').length;
  const dsaCorrection = db.dsaKyc.filter((k) => k.status === 'correction_needed').length;

  // 15. DSA Withdrawals
  const pendingWithdrawalsTotalAmount = pendingWithdrawalsRaw.reduce((sum, w) => sum + (w.requestedAmount || 0), 0);
  const bankVerificationPending = pendingWithdrawalsRaw.filter((w) => w.status === 'Admin Reviewing').length;
  const approvedWithdrawalsCount = db.withdrawals.filter((w) => w.status === 'Approved').length;
  const processingWithdrawalsCount = db.withdrawals.filter((w) => w.status === 'Payment Processing').length;
  const recentWithdrawals = db.withdrawals
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
    .map((w) => ({
      id: w.id,
      withdrawalId: w.withdrawalId,
      dsaId: w.dsaId,
      dsaName: w.dsaName,
      requestedAmount: w.requestedAmount,
      status: w.status,
      createdAt: w.createdAt,
    }));

  // 16. Pending Work (17 Categories)
  const pendingWork = [
    { key: 'new-leads', label: 'New Leads', count: newLeads, module: 'leads', filter: 'New', urgent: newLeads > 0 },
    { key: 'followups-due', label: 'Follow-ups Due Today', count: todayFollowupsCount, module: 'followups', filter: 'Today', urgent: todayFollowupsCount > 0 },
    { key: 'overdue-followups', label: 'Overdue Follow-ups', count: overdueFollowupsCount, module: 'followups', filter: 'Overdue', urgent: overdueFollowupsCount > 0 },
    { key: 'proposals-pending', label: 'Proposals Pending (Sent/Negotiation)', count: db.proposals.filter((p) => ['Sent', 'Negotiation'].includes(p.status)).length, module: 'proposals', filter: 'Sent' },
    { key: 'payment-pending', label: 'Sales Payment Pending', count: db.sales.filter((s) => s.paymentStatus === 'Pending').length, module: 'sales', filter: 'Pending' },
    { key: 'payment-verification', label: 'Payment Verification Pending', count: pendingVerificationList.length, module: 'payments', filter: 'Submitted', urgent: pendingVerificationList.length > 0 },
    { key: 'req-pending', label: 'Requirements Pending', count: projectCounts['Requirements Pending'] || 0, module: 'projects', filter: 'Requirements Pending' },
    { key: 'content-pending', label: 'Content Pending', count: projectCounts['Content Pending'] || 0, module: 'projects', filter: 'Content Pending' },
    { key: 'customer-review', label: 'Customer Review Pending', count: projectCounts['Customer Review'] || 0, module: 'projects', filter: 'Customer Review' },
    { key: 'revision-pending', label: 'Revision Pending', count: projectCounts['Revision'] || 0, module: 'projects', filter: 'Revision' },
    { key: 'final-approval', label: 'Final Approval Needed', count: projectCounts['Final Approval'] || 0, module: 'projects', filter: 'Final Approval', urgent: (projectCounts['Final Approval'] || 0) > 0 },
    { key: 'delivery-pending', label: 'Delivery Pending', count: allProjects.filter((p) => p.status === 'Live' || p.status === 'Final Approval').length, module: 'projects', filter: 'Live' },
    { key: 'renewals-due', label: 'Renewals Due (30 Days)', count: renewalsDue, module: 'renewals', filter: 'Upcoming' },
    { key: 'kyc-pending', label: 'KYC Verifications Pending', count: newStaffKyc + newDsaKyc, module: 'kyc', filter: 'submitted', urgent: (newStaffKyc + newDsaKyc) > 0 },
    { key: 'staff-requests', label: 'Staff Requests Pending', count: db.requests.filter((r) => r.status === 'pending').length, module: 'requests', filter: 'pending' },
    { key: 'staff-complaints', label: 'Open Complaints', count: db.complaints.filter((c) => c.status === 'open').length, module: 'complaints', filter: 'open', urgent: db.complaints.filter((c) => c.status === 'open').length > 0 },
    { key: 'dsa-withdrawals', label: 'Pending DSA Withdrawals', count: pendingWithdrawalsCount, module: 'withdrawals', filter: 'Pending', urgent: pendingWithdrawalsCount > 0 },
  ];

  // 17. Upcoming Renewals List
  const upcomingRenewals = (db.renewals || [])
    .filter((r) => r.status !== 'Paid')
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
    .slice(0, 10)
    .map((r) => {
      const cust = db.customers.find((c) => c.customerId === r.customerId || c.id === r.customerId);
      const renDate = new Date(r.renewalDate);
      const diffDays = Math.ceil((renDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return {
        id: r.id,
        renewalId: r.renewalId,
        customerName: r.customerName || cust?.ownerName || 'Client',
        businessName: cust?.businessName || r.customerName,
        websiteDomain: r.domain || cust?.websiteDomain || 'domain.com',
        renewalDate: r.renewalDate,
        renewalAmount: r.renewalAmount || 4999,
        assignedStaff: r.assignedStaffName || 'Support Team',
        status: r.status,
        daysRemaining: diffDays,
      };
    });

  // 18. Conversion Analytics Funnel
  const totalLeadsCount = db.leads.length;
  const contactedLeads = db.leads.filter((l) => l.status !== 'New').length;
  const interestedLeads = db.leads.filter((l) => ['Interested', 'Demo Shared', 'Follow-up', 'Proposal Sent', 'Negotiation', 'Payment Pending', 'Won', 'Development', 'Delivered'].includes(l.status)).length;
  const demoLeads = db.leads.filter((l) => ['Demo Shared', 'Follow-up', 'Proposal Sent', 'Negotiation', 'Payment Pending', 'Won', 'Development', 'Delivered'].includes(l.status)).length;
  const proposalLeads = db.leads.filter((l) => ['Proposal Sent', 'Negotiation', 'Payment Pending', 'Won', 'Development', 'Delivered'].includes(l.status)).length;
  const negotiationLeads = db.leads.filter((l) => ['Negotiation', 'Payment Pending', 'Won', 'Development', 'Delivered'].includes(l.status)).length;
  const wonLeads = db.sales.length;

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const conversionAnalytics = {
    totalLeads: totalLeadsCount,
    contactedCount: contactedLeads,
    contactedPct: pct(contactedLeads, totalLeadsCount),
    interestedCount: interestedLeads,
    interestedPct: pct(interestedLeads, totalLeadsCount),
    demoCount: demoLeads,
    demoPct: pct(demoLeads, totalLeadsCount),
    proposalCount: proposalLeads,
    proposalPct: pct(proposalLeads, totalLeadsCount),
    negotiationCount: negotiationLeads,
    negotiationPct: pct(negotiationLeads, totalLeadsCount),
    wonCount: wonLeads,
    wonPct: pct(wonLeads, totalLeadsCount),
  };

  // 19. Lost Leads Analysis
  const lostReasons = ['Not Interested', 'Price Issue', 'No Response', 'Already Has Website', 'Competitor', 'Other'];
  const lostLeadsAnalysis: Record<string, number> = {};
  for (const reason of lostReasons) {
    lostLeadsAnalysis[reason] = db.leads.filter((l) => l.status === reason).length;
  }

  // 20. Recent Activity / Audit
  const recentActivity = (db.auditLogs || [])
    .slice()
    .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
    .slice(0, 10)
    .map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName,
      role: log.role,
      action: log.action,
      module: log.module,
      recordId: log.recordId,
      exactDate: log.date || (log.createdAt ? log.createdAt.split('T')[0] : todayStr),
      exactTime: log.exactTime || (log.createdAt ? log.createdAt.split('T')[1]?.slice(0, 8) : '00:00:00'),
      details: log.reason || log.newValue || '',
    }));

  // 21. Notifications
  const adminNotifs = (db.notifications || []).filter((n) => !n.userId || n.userId === 'ADMIN' || n.role === 'ADMIN');
  const unreadNotifsCount = adminNotifs.filter((n) => !n.read).length;

  return res.json({
    dateRange: {
      range,
      startDate: startBound ? startBound.toISOString().split('T')[0] : '',
      endDate: endBound ? endBound.toISOString().split('T')[0] : '',
    },
    summaryCards: {
      totalLeads,
      newLeads,
      todayFollowups: todayFollowupsCount,
      overdueFollowups: overdueFollowupsCount,
      totalProposals,
      acceptedProposals,
      totalWebsiteSales: totalSales,
      totalSalesAmount,
      amountReceived,
      amountPending: totalPendingAmount,
      activeProjects,
      websitesDelivered,
      renewalsDue,
      pendingWithdrawals: pendingWithdrawalsCount,
    },
    pipeline: pipelineStages,
    salesAndRevenue: {
      salesCount: totalSales,
      totalSaleAmount: totalSalesAmount,
      advanceCollected,
      totalReceived: amountReceived,
      pendingAmount: totalPendingAmount,
      cancelledSales,
      trend,
    },
    recentSales,
    todayFollowups: todayFollowupsList,
    overdueFollowups: overdueFollowupsList,
    staffPerformance,
    dsaPerformance,
    projectStatuses: {
      counts: projectCounts,
      total: allProjects.length,
    },
    paymentOverview: {
      totalReceivable: allSalesTotal,
      totalReceived: allVerifiedPaymentsTotal,
      totalPending: totalPendingPayments,
      verificationPendingCount: pendingVerificationList.length,
      verificationPendingAmount: pendingVerificationList.reduce((sum, p) => sum + (p.amount || 0), 0),
      recentlyReceived: recentlyReceivedPayments,
      rejectedCount: rejectedPaymentsCount,
    },
    attendanceToday: {
      totalStaff: totalActiveStaff,
      presentCount,
      absentCount,
      notMarkedCount: absentCount,
      lateCount,
      records: todayAttendanceRecords.map((a) => ({
        id: a.id,
        attendanceId: a.attendanceId,
        staffId: a.staffId,
        staffName: a.staffName,
        department: a.department,
        designation: a.designation,
        date: a.date,
        exactTime: a.exactTime,
        status: a.status,
        capturedPhoto: a.capturedPhoto,
        createdAt: a.createdAt,
      })),
    },
    kycAlerts: {
      newStaffKyc,
      staffCorrection,
      newDsaKyc,
      dsaCorrection,
      totalPending: newStaffKyc + staffCorrection + newDsaKyc + dsaCorrection,
    },
    dsaWithdrawals: {
      pendingRequestsCount: pendingWithdrawalsCount,
      totalRequestedAmount: pendingWithdrawalsTotalAmount,
      bankVerificationPending,
      approvedCount: approvedWithdrawalsCount,
      processingCount: processingWithdrawalsCount,
      recent: recentWithdrawals,
    },
    pendingWork,
    upcomingRenewals,
    conversionAnalytics,
    lostLeadsAnalysis,
    recentActivity,
    notifications: {
      unreadCount: unreadNotifsCount,
      list: adminNotifs.slice(0, 15),
    },
  });
});

// Notifications
api.get('/notifications', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  const userNotifs = db.notifications.filter((n) => n.userId === user.userId || (n.role && n.role === user.role));
  return res.json(userNotifs.slice(0, 50));
});

api.put('/notifications/:id/read', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const n = db.notifications.find((x) => x.id === id);
  if (n) {
    n.read = true;
    saveDb(db);
  }
  return res.json({ message: 'Marked as read.' });
});

// ==========================================
// GLOBAL UNIFIED SEARCH (Section 24)
// ==========================================
api.get('/search', authenticate, (req: AuthRequest, res: Response) => {
  const query = ((req.query.q as string) || '').trim().toLowerCase();
  if (!query) {
    return res.json({ results: [] });
  }

  const db = getDb();
  const user = req.user!;
  const results: Array<{
    id: string;
    type: 'Lead' | 'Customer' | 'Sale' | 'Proposal' | 'Project' | 'Payment' | 'Staff' | 'DSA' | 'Renewal';
    title: string;
    subtitle: string;
    badge?: string;
    link: string;
  }> = [];

  // Search Leads
  if (user.role !== 'CLIENT') {
    let leads = db.leads;
    if (user.role === 'DSA') {
      leads = leads.filter((l) => l.assignedDsaId === user.userId || l.createdBy === user.userId);
    } else if (user.role === 'STAFF' && user.permissions?.dataScope === 'own') {
      leads = leads.filter((l) => l.assignedStaffId === user.userId || l.createdBy === user.userId);
    }
    for (const l of leads) {
      if (
        l.leadId.toLowerCase().includes(query) ||
        l.businessName.toLowerCase().includes(query) ||
        l.ownerName.toLowerCase().includes(query) ||
        l.mobile.includes(query) ||
        (l.email && l.email.toLowerCase().includes(query))
      ) {
        results.push({
          id: l.id,
          type: 'Lead',
          title: `${l.businessName} (${l.leadId})`,
          subtitle: `${l.ownerName} • ${l.mobile} • ${l.city || 'N/A'}`,
          badge: l.status,
          link: '/leads',
        });
      }
    }
  }

  // Search Customers
  let customers = db.customers;
  if (user.role === 'CLIENT') {
    customers = customers.filter((c) => c.customerId === user.customerId || c.clientLoginId === user.userId);
  } else if (user.role === 'DSA') {
    customers = customers.filter((c) => c.assignedDsaId === user.userId || c.createdBy === user.userId);
  }
  for (const c of customers) {
    if (
      c.customerId.toLowerCase().includes(query) ||
      (c.clientLoginId && c.clientLoginId.toLowerCase().includes(query)) ||
      c.businessName.toLowerCase().includes(query) ||
      c.ownerName.toLowerCase().includes(query) ||
      c.mobile.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.websiteDomain && c.websiteDomain.toLowerCase().includes(query))
    ) {
      results.push({
        id: c.id,
        type: 'Customer',
        title: `${c.businessName} (${c.customerId})`,
        subtitle: `${c.ownerName} • ${c.mobile} • Domain: ${c.websiteDomain || 'None'}`,
        badge: c.websiteStatus || 'Active',
        link: '/customers',
      });
    }
  }

  // Search Proposals
  if (user.role !== 'CLIENT') {
    let proposals = db.proposals;
    for (const p of proposals) {
      if (
        p.proposalId.toLowerCase().includes(query) ||
        p.businessName.toLowerCase().includes(query) ||
        p.contactPerson.toLowerCase().includes(query) ||
        p.mobile.includes(query)
      ) {
        results.push({
          id: p.id,
          type: 'Proposal',
          title: `${p.proposalId} - ${p.businessName}`,
          subtitle: `₹${p.finalAmount.toLocaleString()} • Valid: ${p.validUntil}`,
          badge: p.status,
          link: '/proposals',
        });
      }
    }
  }

  // Search Sales
  let sales = db.sales;
  if (user.role === 'CLIENT') {
    sales = sales.filter((s) => s.customerId === user.customerId);
  } else if (user.role === 'DSA') {
    sales = sales.filter((s) => s.staffOrDsaId === user.userId);
  }
  for (const s of sales) {
    if (
      s.saleId.toLowerCase().includes(query) ||
      s.businessName.toLowerCase().includes(query) ||
      s.clientName.toLowerCase().includes(query) ||
      s.contactNumber.includes(query)
    ) {
      results.push({
        id: s.id,
        type: 'Sale',
        title: `${s.saleId} - ${s.businessName}`,
        subtitle: `₹${s.finalAmount.toLocaleString()} • ${s.packageName || s.websiteType}`,
        badge: s.deliveryStatus || 'In Progress',
        link: '/sales',
      });
    }
  }

  // Search Projects
  let projects = db.projects;
  if (user.role === 'CLIENT') {
    projects = projects.filter((p) => p.customerId === user.customerId);
  } else if (user.role === 'DSA') {
    projects = projects.filter((p) => p.assignedDsaId === user.userId || p.dsaId === user.userId);
  }
  for (const pr of projects) {
    if (
      pr.projectId.toLowerCase().includes(query) ||
      pr.businessName.toLowerCase().includes(query) ||
      (pr.websiteDomain && pr.websiteDomain.toLowerCase().includes(query)) ||
      (pr.liveUrl && pr.liveUrl.toLowerCase().includes(query))
    ) {
      results.push({
        id: pr.id,
        type: 'Project',
        title: `${pr.projectId} - ${pr.businessName}`,
        subtitle: `Domain: ${pr.websiteDomain || 'None'} • Developer: ${pr.developer}`,
        badge: pr.status,
        link: '/projects',
      });
    }
  }

  return res.json({ results: results.slice(0, 25) });
});

// ==========================================
// CLIENT PORTAL DATA (Section 27)
// ==========================================
api.get('/client/portal-data', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const customer = db.customers.find(
    (c) =>
      c.customerId === user.customerId ||
      c.clientLoginId === user.userId ||
      c.mobile === user.mobile ||
      (user.email && c.email === user.email)
  );
  const cId = customer?.customerId || user.customerId || '';

  const projects = db.projects.filter((p) => p.customerId === cId || (customer && p.businessName === customer.businessName));
  const sales = db.sales.filter((s) => s.customerId === cId || (customer && s.businessName === customer.businessName));
  const payments = db.payments.filter((p) => p.customerId === cId || (customer && p.businessName === customer.businessName));
  const proposals = db.proposals.filter(
    (pr) => (customer && pr.businessName === customer.businessName) || (customer && pr.mobile === customer.mobile)
  );
  const renewals = db.renewals.filter((r) => r.customerId === cId || (customer && r.businessName === customer.businessName));

  return res.json({
    customer,
    projects,
    sales,
    payments,
    proposals,
    renewals,
  });
});

// ==========================================
// SETTINGS MANAGEMENT (Section 22)
// ==========================================
api.get('/settings', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const initial = getInitialSettings();
  const current = db.settings || initial;

  const normalized: CrmSettings = {
    ...initial,
    ...current,
    companyName: current.companyName || current.companyProfile?.companyName || initial.companyName,
    companyTagline: current.companyTagline || current.companyProfile?.tagline || initial.companyTagline,
    supportEmail: current.supportEmail || current.companyProfile?.email || initial.supportEmail,
    supportPhone: current.supportPhone || current.companyProfile?.phone || initial.supportPhone,
    whatsappNumber: current.whatsappNumber || current.supportPhone || initial.whatsappNumber,
    websiteUrl: current.websiteUrl || current.companyProfile?.websiteUrl || initial.websiteUrl,
    registeredAddress: current.registeredAddress || current.companyProfile?.address || initial.registeredAddress,
    city: current.city || current.companyProfile?.city || initial.city,
    state: current.state || current.companyProfile?.state || initial.state,
    pinCode: current.pinCode || current.companyProfile?.pinCode || initial.pinCode,
    gstin: current.gstin || current.companyProfile?.gstin || initial.gstin,
    proposalValidityDays: current.proposalValidityDays ?? current.crmConfig?.defaultValidityDays ?? initial.proposalValidityDays,
    defaultFollowupDays: current.defaultFollowupDays ?? initial.defaultFollowupDays,
    dsaCommissionPercentage: current.dsaCommissionPercentage ?? current.crmConfig?.dsaCommissionRate ?? initial.dsaCommissionPercentage,
    dsaWithdrawalDates: (current.dsaWithdrawalDates && current.dsaWithdrawalDates.length > 0)
      ? current.dsaWithdrawalDates
      : (current.crmConfig?.withdrawalAllowedDays || initial.dsaWithdrawalDates),
    paymentTermsPresets: (current.paymentTermsPresets && current.paymentTermsPresets.length > 0)
      ? current.paymentTermsPresets
      : ((current.paymentTermsList && current.paymentTermsList.length > 0)
          ? current.paymentTermsList
          : initial.paymentTermsPresets),
    paymentTermsList: (current.paymentTermsList && current.paymentTermsList.length > 0)
      ? current.paymentTermsList
      : ((current.paymentTermsPresets && current.paymentTermsPresets.length > 0)
          ? current.paymentTermsPresets
          : initial.paymentTermsList),
    leadSources: (current.leadSources && current.leadSources.length > 0)
      ? current.leadSources
      : initial.leadSources,
    businessCategories: (current.businessCategories && current.businessCategories.length > 0)
      ? current.businessCategories
      : initial.businessCategories,
  };

  return res.json(normalized);
});

api.put('/settings', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const db = getDb();
  const initial = getInitialSettings();
  const body = req.body || {};

  const presets = (body.paymentTermsPresets && Array.isArray(body.paymentTermsPresets) && body.paymentTermsPresets.length > 0)
    ? body.paymentTermsPresets
    : ((body.paymentTermsList && Array.isArray(body.paymentTermsList) && body.paymentTermsList.length > 0)
        ? body.paymentTermsList
        : db.settings?.paymentTermsPresets || initial.paymentTermsPresets);

  const withdrawalDates = (body.dsaWithdrawalDates && Array.isArray(body.dsaWithdrawalDates) && body.dsaWithdrawalDates.length > 0)
    ? body.dsaWithdrawalDates
    : (db.settings?.dsaWithdrawalDates || initial.dsaWithdrawalDates);

  const commissionPct = Number(body.dsaCommissionPercentage ?? db.settings?.dsaCommissionPercentage ?? 10);
  const validityDays = Number(body.proposalValidityDays ?? db.settings?.proposalValidityDays ?? 15);
  const followupDays = Number(body.defaultFollowupDays ?? db.settings?.defaultFollowupDays ?? 3);

  const companyName = body.companyName || body.companyProfile?.companyName || db.settings?.companyName || initial.companyName;
  const companyTagline = body.companyTagline || body.companyProfile?.tagline || db.settings?.companyTagline || initial.companyTagline;
  const supportEmail = body.supportEmail || body.companyProfile?.email || db.settings?.supportEmail || initial.supportEmail;
  const supportPhone = body.supportPhone || body.companyProfile?.phone || db.settings?.supportPhone || initial.supportPhone;
  const whatsappNumber = body.whatsappNumber || db.settings?.whatsappNumber || supportPhone;
  const websiteUrl = body.websiteUrl || body.companyProfile?.websiteUrl || db.settings?.websiteUrl || initial.websiteUrl;
  const registeredAddress = body.registeredAddress || body.companyProfile?.address || db.settings?.registeredAddress || initial.registeredAddress;
  const city = body.city || body.companyProfile?.city || db.settings?.city || initial.city;
  const state = body.state || body.companyProfile?.state || db.settings?.state || initial.state;
  const pinCode = body.pinCode || body.companyProfile?.pinCode || db.settings?.pinCode || initial.pinCode;
  const gstin = body.gstin !== undefined ? body.gstin : (db.settings?.gstin || initial.gstin);

  const categories = (body.businessCategories && Array.isArray(body.businessCategories) && body.businessCategories.length > 0)
    ? body.businessCategories
    : (db.settings?.businessCategories || initial.businessCategories);

  const sources = (body.leadSources && Array.isArray(body.leadSources) && body.leadSources.length > 0)
    ? body.leadSources
    : (db.settings?.leadSources || initial.leadSources);

  const updatedSettings: CrmSettings = {
    ...initial,
    ...db.settings,
    ...body,
    companyName,
    companyTagline,
    supportEmail,
    supportPhone,
    whatsappNumber,
    websiteUrl,
    registeredAddress,
    city,
    state,
    pinCode,
    gstin,
    proposalValidityDays: validityDays,
    defaultFollowupDays: followupDays,
    dsaCommissionPercentage: commissionPct,
    dsaWithdrawalDates: withdrawalDates,
    paymentTermsPresets: presets,
    paymentTermsList: presets,
    businessCategories: categories,
    leadSources: sources,
    companyProfile: {
      companyName,
      brandTitle: `${companyName} CRM`,
      tagline: companyTagline,
      email: supportEmail,
      phone: supportPhone,
      alternatePhone: whatsappNumber,
      address: registeredAddress,
      city,
      state,
      pinCode,
      gstin,
      websiteUrl,
    },
    crmConfig: {
      defaultLeadPriority: 'Medium',
      defaultValidityDays: validityDays,
      dsaCommissionRate: commissionPct,
      withdrawalAllowedDays: withdrawalDates,
      allowDuplicateLeads: false,
      requireKycForWithdrawal: true,
      requireVerifiedBankForWithdrawal: true,
    },
  };

  db.settings = updatedSettings;
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'SETTINGS_UPDATED',
    module: 'settings',
    ip: getClientIp(req),
  });

  return res.json(db.settings);
});

// ==========================================
// COMMISSION MANAGEMENT (Section 20)
// ==========================================
api.get('/commissions', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDb();
  const user = req.user!;
  let list = db.commissions || [];

  // Generate or sync commission records from sales if empty
  if (list.length === 0 && db.sales.length > 0) {
    const generated: CommissionRecord[] = [];
    for (const s of db.sales) {
      if (s.staffOrDsaRole === 'DSA' && s.staffOrDsaId) {
        const commId = `COM-${s.saleId.replace(/^[A-Za-z]+-/, '')}`;
        generated.push({
          id: `comm-${s.id}`,
          commissionId: commId,
          dsaId: s.staffOrDsaId,
          dsaName: s.staffOrDsaName || s.staffOrDsaId,
          saleId: s.saleId,
          customerId: s.customerId || '',
          customerName: s.clientName || s.businessName,
          businessName: s.businessName,
          saleAmount: s.finalAmount,
          eligibleAmount: s.finalAmount,
          commissionRate: 10,
          commissionAmount: s.commissionAmount || Math.round(s.finalAmount * 0.1),
          eligibilityStatus: s.deliveryStatus === 'Delivered' ? 'Eligible' : 'Pending Delivery',
          status: s.commissionStatus || (s.deliveryStatus === 'Delivered' ? 'Available' : 'Pending'),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        });
      }
    }
    if (generated.length > 0) {
      db.commissions = generated;
      saveDb(db);
      list = generated;
    }
  }

  if (user.role === 'DSA') {
    list = list.filter((c) => c.dsaId === user.userId);
  }

  return res.json(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

api.put('/commissions/:id/adjust', authenticate, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newAmount, reason, status } = req.body;
  const db = getDb();
  const comm = db.commissions.find((c) => c.id === id || c.commissionId === id);
  if (!comm) return res.status(404).json({ error: 'Commission record not found.' });

  const oldAmount = comm.commissionAmount;
  if (newAmount !== undefined) comm.commissionAmount = Number(newAmount);
  if (status) comm.status = status;
  comm.adjustmentReason = reason;
  comm.adjustedBy = req.user!.userId;
  comm.updatedAt = new Date().toISOString();
  saveDb(db);

  addAuditLog({
    userId: req.user!.userId,
    role: 'ADMIN',
    action: 'COMMISSION_ADJUSTED',
    module: 'commission',
    recordId: comm.commissionId,
    oldValue: String(oldAmount),
    newValue: String(comm.commissionAmount),
    reason,
    ip: getClientIp(req),
  });

  return res.json(comm);
});

export default api;

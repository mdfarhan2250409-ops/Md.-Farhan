import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  auth,
  db,
  googleAuthProvider,
  githubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  reload,
  EmailAuthProvider,
  reauthenticateWithCredential,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  type FirebaseUser
} from '../lib/firebase';
import {
  UserProfile,
  UserActivity,
  AdminActivityLog,
  UserStatus,
  UserRole,
  EmailTemplate,
  EmailLog,
  EmailSettings
} from '../types';
import { initialEmailTemplates, initialEmailSettings } from '../data/emailTemplatesData';
import { emailService } from '../services/emailService';
import { validateRealEmail } from '../lib/emailValidator';
import { guestService } from '../services/guestService';

export const ADMIN_EMAILS = [
  'onlinetasklab@gmail.com',
  'md.farhan2250409@gmail.com'
];

export const ADMIN_USERNAMES = [
  'onlinetasklab',
  'farhan',
  'mmi_farhan'
];

export function checkIsAdminRole(email?: string | null, username?: string | null): UserRole {
  if (!email && !username) return 'user';
  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanUsername = username ? username.trim().toLowerCase().replace(/^@/, '') : '';
  if (
    ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === cleanEmail) ||
    ADMIN_USERNAMES.some(adminUser => adminUser.toLowerCase() === cleanUsername)
  ) {
    return 'admin';
  }
  return 'user';
}

// Helper to get next sequential OTL ID (e.g. OTL_1, OTL_2, OTL_3)
export async function getNextUserOtlId(): Promise<{ customId: string; accountNumber: number }> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let maxNum = 0;
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (typeof data.accountNumber === 'number' && data.accountNumber > maxNum) {
        maxNum = data.accountNumber;
      }
      if (data.customId && typeof data.customId === 'string' && data.customId.startsWith('OTL_')) {
        const parsed = parseInt(data.customId.replace('OTL_', ''), 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    });

    if (maxNum === 0 && !usersSnap.empty) {
      maxNum = usersSnap.size;
    }

    const nextNum = maxNum + 1;
    return { customId: `OTL_${nextNum}`, accountNumber: nextNum };
  } catch (err) {
    console.warn('Error calculating next OTL ID:', err);
    const fallbackNum = Math.floor(1 + Math.random() * 9999);
    return { customId: `OTL_${fallbackNum}`, accountNumber: fallbackNum };
  }
}

// Helper to recursively strip undefined keys from any object before passing to Firestore
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return data;
}

// Helper to hash passwords using standard Web Crypto SHA-256
async function hashPassword(str: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(str + '_otl_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Basic fallback for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

import { safeApiFetch, resolveApiUrl } from '../lib/apiClient';

// Dispatches a security notification email to user's Gmail/email upon login
function dispatchLoginEmailAlert(params: {
  email?: string | null;
  username?: string | null;
  name?: string | null;
  provider: 'email' | 'google' | 'github';
}) {
  if (!params.email || !params.email.includes('@')) return;

  const userAgent = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  let browser = 'Web Browser';
  if (/Edg/i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/Chrome/i.test(userAgent)) browser = 'Google Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/Safari/i.test(userAgent)) browser = 'Apple Safari';

  const deviceLabel = `${isMobile ? 'Mobile' : 'Desktop'} (${browser})`;

  safeApiFetch('/api/auth/login-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: params.email,
      username: params.username || params.email.split('@')[0],
      name: params.name || params.username || '',
      provider: params.provider,
      device: deviceLabel
    })
  }).catch(err => {
    console.warn('[Login Notification Note]:', err);
  });
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean, mode?: 'login' | 'register' | 'forgot-password' | 'verify-email' | 'verify-reset-otp' | 'reset-password') => void;
  authModalMode: 'login' | 'register' | 'forgot-password' | 'verify-email' | 'verify-reset-otp' | 'reset-password';
  setAuthModalMode: (mode: 'login' | 'register' | 'forgot-password' | 'verify-email' | 'verify-reset-otp' | 'reset-password') => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  unauthenticatedAlertMessage: string | null;
  setUnauthenticatedAlertMessage: (msg: string | null) => void;
  
  // Pending verification & reset states
  pendingVerificationEmail: string;
  pendingRegistrationId: string | null;
  pendingResetRequestId: string | null;
  resetSessionId: string | null;
  resetCode: string | null;
  setResetCode: (code: string | null) => void;
  
  // Auth Operations
  loginWithEmailOrUsername: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  verifyRegistrationOtp: (otp: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resendRegistrationOtp: () => Promise<{ success: boolean; error?: string; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGithub: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  // Password Reset & Verification Operations
  resendFirebaseVerificationEmail: (overrideEmail?: string) => Promise<{ success: boolean; error?: string }>;
  checkAndRefreshEmailVerification: () => Promise<{ success: boolean; verified: boolean; error?: string }>;
  verifyEmailWithCode: (code: string, targetEmailOrUser?: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (emailOrUsername: string) => Promise<{ success: boolean; resetCode?: string; email?: string; error?: string; message?: string }>;
  verifyPasswordResetOtp: (otp: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resendPasswordResetOtp: () => Promise<{ success: boolean; error?: string; message?: string }>;
  completePasswordReset: (newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  confirmUserPasswordReset: (newPassword: string, code?: string, identifier?: string) => Promise<{ success: boolean; error?: string }>;
  changeCurrentUserPassword: (newPassword: string, oldPassword?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Guard & Helper
  requireAuth: (actionCallback?: () => void, promptMessage?: string) => boolean;
  updateUserProfileData: (updates: Partial<UserProfile>) => Promise<boolean>;
  recordUserDownload: (resourceId: string) => Promise<void>;
  
  // Admin Data & Operations
  allUsers: UserProfile[];
  userActivities: UserActivity[];
  adminActivityLogs: AdminActivityLog[];
  emailTemplates: EmailTemplate[];
  emailLogs: EmailLog[];
  emailSettings: EmailSettings;
  updateUserStatus: (userId: string, status: UserStatus, notes?: string) => Promise<boolean>;
  adminUpdateUserProfile: (
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      photoURL?: string;
      role?: UserRole;
      status?: UserStatus;
      customId?: string;
      notes?: string;
      password?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (userId: string) => Promise<boolean>;
  adminChangeUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  saveEmailTemplate: (template: EmailTemplate) => Promise<boolean>;
  saveEmailSettings: (settings: EmailSettings) => Promise<boolean>;
  logAdminAction: (action: AdminActivityLog['action'], details?: string, targetId?: string, targetEmail?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI Modals State
  const [isAuthModalOpen, setIsAuthModalOpenState] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot-password' | 'verify-email' | 'verify-reset-otp' | 'reset-password'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [unauthenticatedAlertMessage, setUnauthenticatedAlertMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Verification & reset states
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [pendingRegistrationId, setPendingRegistrationId] = useState<string | null>(null);
  const [pendingResetRequestId, setPendingResetRequestId] = useState<string | null>(null);
  const [resetSessionId, setResetSessionId] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const tempRegisterPasswordRef = useRef<string>('');

  // Detect Firebase action URLs (e.g. password reset links)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const mode = urlParams.get('mode');
      const oobCode = urlParams.get('oobCode');
      if (mode === 'resetPassword' && oobCode) {
        setResetCode(oobCode);
        setIsAuthModalOpenState(true);
        setAuthModalMode('reset-password');
      }
    } catch (e) {
      console.warn('Action URL parse note:', e);
    }
  }, []);

  // Collections state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [adminActivityLogs, setAdminActivityLogs] = useState<AdminActivityLog[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(initialEmailTemplates);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(initialEmailSettings);

  const setIsAuthModalOpen = (open: boolean, mode: 'login' | 'register' | 'forgot-password' | 'verify-email' | 'verify-reset-otp' | 'reset-password' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpenState(open);
    if (!open) {
      setUnauthenticatedAlertMessage(null);
    }
  };

  // Helper to log user activity to Firestore
  const logUserActivity = async (
    userId: string,
    userEmail: string,
    action: UserActivity['action'],
    details?: string,
    username?: string
  ) => {
    try {
      const activityData = {
        userId,
        userEmail,
        username: username || '',
        action,
        timestamp: new Date().toISOString(),
        details: details || ''
      };
      await setDoc(doc(collection(db, 'user_activities')), activityData);
    } catch (err) {
      console.warn('Could not log user activity:', err);
    }
  };

  // Helper to log admin activity
  const logAdminAction = async (
    action: AdminActivityLog['action'],
    details?: string,
    targetId?: string,
    targetEmail?: string
  ) => {
    try {
      const adminEmail = currentUser?.email || 'onlinetasklab@gmail.com';
      await setDoc(doc(collection(db, 'admin_activity_logs')), {
        adminEmail,
        action,
        targetId: targetId || '',
        targetEmail: targetEmail || '',
        details: details || '',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not log admin activity:', err);
    }
  };

  // Sync Firebase Auth state and Local Storage user profile
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            const now = new Date().toISOString();
            const isEmailNowVerified = !!(fbUser.emailVerified || data.emailVerified || fbUser.providerData?.some(p => p.providerId === 'google.com'));
            
            // Sync emailVerified if it changed
            if (isEmailNowVerified && !data.emailVerified) {
              updateDoc(userDocRef, { emailVerified: true, lastActiveAt: now }).catch(() => {});
            } else {
              updateDoc(userDocRef, { lastActiveAt: now }).catch(() => {});
            }

            const resolvedRole: UserRole = (checkIsAdminRole(fbUser.email || data.email, data.username) === 'admin' || data.role === 'admin')
              ? 'admin'
              : 'user';

            if (resolvedRole === 'admin' && data.role !== 'admin') {
              updateDoc(userDocRef, { role: 'admin' }).catch(() => {});
            }

            if (isMounted) {
              const activeProfile: UserProfile = {
                ...data,
                id: fbUser.uid,
                userId: fbUser.uid,
                role: resolvedRole,
                emailVerified: isEmailNowVerified,
                lastActiveAt: now
              };
              setCurrentUser(activeProfile);
              localStorage.setItem('otl_active_user_id', fbUser.uid);
            }
          } else {
            // New user via Google or direct Firebase Auth
            const names = (fbUser.displayName || 'OTL User').split(' ');
            const firstName = names[0] || 'User';
            const lastName = names.slice(1).join(' ') || '';
            const rawUsername = (fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_.]/g, '');
            const username = rawUsername.length >= 3 ? rawUsername : `user_${Math.floor(1000 + Math.random() * 9000)}`;
            const { customId: authOtlId, accountNumber: authAccNum } = await getNextUserOtlId();

            const newUserProfile: UserProfile = {
              id: fbUser.uid,
              userId: fbUser.uid,
              customId: authOtlId,
              accountNumber: authAccNum,
              firstName,
              lastName,
              username,
              email: fbUser.email || '',
              photoURL: fbUser.photoURL || '',
              provider: fbUser.providerData?.[0]?.providerId?.includes('google') ? 'google' : 'email',
              role: checkIsAdminRole(fbUser.email),
              status: 'active',
              emailVerified: fbUser.emailVerified || fbUser.providerData?.[0]?.providerId === 'google.com',
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
              downloadedResourceIds: [],
              downloadCount: 0
            };

            await setDoc(userDocRef, cleanForFirestore(newUserProfile));
            if (isMounted) {
              setCurrentUser(newUserProfile);
              localStorage.setItem('otl_active_user_id', fbUser.uid);
            }
            logUserActivity(fbUser.uid, fbUser.email || '', 'Account Created', 'Account created via Auth Provider', username);
          }

          // Link anonymous visitor guest profile and support history to authenticated user
          guestService.linkGuestToUser(
            fbUser.uid,
            fbUser.email,
            fbUser.displayName || currentUser?.username
          ).catch(linkErr => console.warn('[AuthContext] Guest account linking notice:', linkErr));
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        // If not authenticated via Firebase Auth, check local saved session
        const savedUserId = localStorage.getItem('otl_active_user_id');
        if (savedUserId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', savedUserId));
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              if (data.status !== 'banned' && data.status !== 'suspended') {
                const now = new Date().toISOString();
                updateDoc(doc(db, 'users', savedUserId), { lastActiveAt: now }).catch(() => {});
                if (isMounted) {
                  setCurrentUser({ ...data, id: savedUserId, userId: savedUserId, lastActiveAt: now });
                }
              } else {
                localStorage.removeItem('otl_active_user_id');
                if (isMounted) setCurrentUser(null);
              }
            } else {
              localStorage.removeItem('otl_active_user_id');
              if (isMounted) setCurrentUser(null);
            }
          } catch (err) {
            console.warn('Could not restore local user session:', err);
          }
        } else {
          if (isMounted) setCurrentUser(null);
        }
      }
      if (isMounted) setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Listen to Firestore Users in real-time
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() } as UserProfile);
      });

      // Sort users chronologically by createdAt (oldest first)
      const sortedUsers = [...usersList].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      // Track existing custom IDs / account numbers
      const usedNumbers = new Set<number>();
      sortedUsers.forEach(u => {
        if (typeof u.accountNumber === 'number') {
          usedNumbers.add(u.accountNumber);
        }
        if (u.customId && u.customId.startsWith('OTL_')) {
          const parsed = parseInt(u.customId.replace('OTL_', ''), 10);
          if (!isNaN(parsed)) usedNumbers.add(parsed);
        }
      });

      // Assign customId for any user lacking one (only execute write if current user is admin)
      const isCallerAdmin = currentUser?.role === 'admin' || (typeof window !== 'undefined' && localStorage.getItem('otl_admin_authenticated') === 'true');
      if (isCallerAdmin) {
        let nextAvailable = 1;
        sortedUsers.forEach(u => {
          if (!u.customId) {
            while (usedNumbers.has(nextAvailable)) {
              nextAvailable++;
            }
            const assignedId = `OTL_${nextAvailable}`;
            const assignedNum = nextAvailable;
            usedNumbers.add(nextAvailable);
            u.customId = assignedId;
            u.accountNumber = assignedNum;
            updateDoc(doc(db, 'users', u.id), { customId: assignedId, accountNumber: assignedNum }).catch(() => {});
            nextAvailable++;
          }
        });
      }

      setAllUsers(usersList);

      // Sync currentUser's customId if needed
      if (currentUser) {
        const match = usersList.find(u => u.id === currentUser.id);
        if (match && match.customId && currentUser.customId !== match.customId) {
          setCurrentUser(prev => prev ? { ...prev, customId: match.customId, accountNumber: match.accountNumber } : null);
        }
      }
    }, (err) => {
      console.warn('Could not listen to users collection:', err);
    });

    // Listen to Email Templates (public read)
    const unsubTemplates = onSnapshot(collection(db, 'email_templates'), (snapshot) => {
      if (!snapshot.empty) {
        const list: EmailTemplate[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as EmailTemplate);
        });
        setEmailTemplates(list);
      } else {
        // Seed default templates to Firestore if empty and user is admin
        if (typeof window !== 'undefined' && localStorage.getItem('otl_admin_authenticated') === 'true') {
          initialEmailTemplates.forEach(tpl => {
            setDoc(doc(db, 'email_templates', tpl.id), tpl).catch(() => {});
          });
        }
      }
    }, () => {
      // Fallback to initial templates
    });

    return () => {
      unsubUsers();
      unsubTemplates();
    };
  }, []);

  // Listen to User Activities, Admin Logs, and Email Logs only when authenticated and authorized
  useEffect(() => {
    if (!currentUser) {
      setUserActivities([]);
      setAdminActivityLogs([]);
      setEmailLogs([]);
      return;
    }

    const isCallerAdmin = currentUser?.role === 'admin' || (typeof window !== 'undefined' && localStorage.getItem('otl_admin_authenticated') === 'true');

    // 1. User Activities subscription (admin gets all, user gets own)
    let unsubActivities = () => {};
    try {
      const q = isCallerAdmin
        ? collection(db, 'user_activities')
        : query(collection(db, 'user_activities'), where('userId', '==', currentUser.id));

      unsubActivities = onSnapshot(q, (snapshot) => {
        const list: UserActivity[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as UserActivity);
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setUserActivities(list);
      }, () => {});
    } catch {}

    // 2. Admin Logs & Email Logs (Admin only)
    let unsubAdminLogs = () => {};
    let unsubEmailLogs = () => {};
    let unsubEmailSettings = () => {};

    if (isCallerAdmin) {
      try {
        unsubAdminLogs = onSnapshot(collection(db, 'admin_activity_logs'), (snapshot) => {
          const list: AdminActivityLog[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as AdminActivityLog);
          });
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAdminActivityLogs(list);
        }, () => {});
      } catch {}

      try {
        unsubEmailLogs = onSnapshot(collection(db, 'email_logs'), (snapshot) => {
          const list: EmailLog[] = [];
          snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() } as EmailLog);
          });
          list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
          setEmailLogs(list);
        }, () => {});
      } catch {}

      try {
        unsubEmailSettings = onSnapshot(doc(db, 'settings', 'email'), (snapshot) => {
          if (snapshot.exists()) {
            setEmailSettings(snapshot.data() as EmailSettings);
          }
        }, () => {});
      } catch {}
    }

    return () => {
      unsubActivities();
      unsubAdminLogs();
      unsubEmailLogs();
      unsubEmailSettings();
    };
  }, [currentUser?.id, currentUser?.role]);

  // Login with Email or Username
  const loginWithEmailOrUsername = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      let emailToUse = identifier.trim().toLowerCase();
      let matchedUserData: UserProfile | null = null;
      let matchedDocId = '';

      // Find user in Firestore users collection
      const usersRef = collection(db, 'users');
      if (!identifier.includes('@')) {
        const cleanUsername = identifier.trim().toLowerCase();
        const q = query(usersRef, where('username', '==', cleanUsername), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          matchedDocId = userDoc.id;
          matchedUserData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
          emailToUse = matchedUserData.email.toLowerCase();
        } else {
          return { success: false, error: `No account found with username "@${cleanUsername}".` };
        }
      } else {
        const qEmail = query(usersRef, where('email', '==', emailToUse), limit(1));
        const querySnap = await getDocs(qEmail);
        if (!querySnap.empty) {
          const userDoc = querySnap.docs[0];
          matchedDocId = userDoc.id;
          matchedUserData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
        }
      }

      // Check user account status
      if (matchedUserData) {
        if (matchedUserData.status === 'banned') {
          return { success: false, error: 'Your account has been permanently banned. Please contact support.' };
        }
        if (matchedUserData.status === 'suspended') {
          return { success: false, error: 'Your account has been temporarily suspended. Please contact support.' };
        }
        if (matchedUserData.status === 'disabled') {
          return { success: false, error: 'Your account is currently disabled. Please contact support.' };
        }
      }

      const inputPasswordHash = await hashPassword(password);
      let authSucceeded = false;
      let targetUid = matchedDocId || '';
      let isEmailVerified = false;

      // Check against Firestore user record first (supports registration password and Admin-edited password)
      if (matchedUserData) {
        const storedRaw = matchedUserData.rawPassword;
        const storedAuthHash = (matchedUserData as any)._authHash;
        const storedPassHash = (matchedUserData as any).passwordHash;

        if (
          (storedRaw && storedRaw === password) ||
          (storedAuthHash && storedAuthHash === inputPasswordHash) ||
          (storedPassHash && storedPassHash === inputPasswordHash)
        ) {
          authSucceeded = true;
          targetUid = matchedUserData.id || matchedUserData.userId || matchedDocId;
          isEmailVerified = !!matchedUserData.emailVerified;
        }
      }

      // If not yet verified by Firestore doc, try Firebase Auth
      if (!authSucceeded) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
          const fbUser = userCredential.user;
          targetUid = fbUser.uid;
          authSucceeded = true;
          isEmailVerified = !!fbUser.emailVerified;
        } catch (fbErr: any) {
          console.warn('Firebase signInWithEmailAndPassword note:', fbErr.code || fbErr.message);

          if (matchedUserData) {
            const storedAuthHash = (matchedUserData as any)._authHash;
            const storedPassHash = (matchedUserData as any).passwordHash;
            const storedRaw = matchedUserData.rawPassword;

            if (
              (storedRaw && storedRaw === password) ||
              (storedAuthHash && storedAuthHash === inputPasswordHash) ||
              (storedPassHash && storedPassHash === inputPasswordHash)
            ) {
              authSucceeded = true;
              targetUid = matchedUserData.id || matchedUserData.userId || matchedDocId;
              isEmailVerified = !!matchedUserData.emailVerified;
            } else if (
              fbErr.code === 'auth/wrong-password' ||
              fbErr.code === 'auth/invalid-credential'
            ) {
              return { success: false, error: 'Incorrect password. Please try again or use Forgot Password.' };
            } else if (fbErr.code === 'auth/too-many-requests') {
              return { success: false, error: 'Too many failed login attempts. Please wait a few minutes before trying again.' };
            }
          } else {
            if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
              return { success: false, error: 'No account found with this email or username.' };
            } else if (fbErr.code === 'auth/wrong-password') {
              return { success: false, error: 'Incorrect password. Please try again.' };
            } else if (fbErr.code === 'auth/too-many-requests') {
              return { success: false, error: 'Too many failed login attempts. Please wait a few minutes.' };
            }
          }
        }
      }

      if (!authSucceeded) {
        return { success: false, error: 'Incorrect password. Please try again or use Forgot Password.' };
      }

      // Update login timestamps
      const now = new Date().toISOString();
      const finalDocRef = doc(db, 'users', targetUid);
      const userSnap = await getDoc(finalDocRef);

      let finalProfile: UserProfile;
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        const verifiedStatus = isEmailVerified || uData.emailVerified || false;
        finalProfile = {
          ...uData,
          id: targetUid,
          userId: targetUid,
          rawPassword: password,
          emailVerified: verifiedStatus,
          lastLoginAt: now,
          lastActiveAt: now
        };
        await updateDoc(finalDocRef, {
          rawPassword: password,
          emailVerified: verifiedStatus,
          lastLoginAt: now,
          lastActiveAt: now
        }).catch(() => {});
      } else if (matchedUserData) {
        finalProfile = {
          ...matchedUserData,
          id: targetUid,
          userId: targetUid,
          emailVerified: isEmailVerified || matchedUserData.emailVerified || false,
          lastLoginAt: now,
          lastActiveAt: now
        };
        await setDoc(finalDocRef, finalProfile).catch(() => {});
      } else {
        finalProfile = {
          id: targetUid,
          userId: targetUid,
          firstName: emailToUse.split('@')[0],
          lastName: '',
          username: emailToUse.split('@')[0],
          email: emailToUse,
          provider: 'email',
          role: checkIsAdminRole(emailToUse),
          status: 'active',
          emailVerified: isEmailVerified,
          createdAt: now,
          lastLoginAt: now,
          lastActiveAt: now,
          downloadedResourceIds: [],
          downloadCount: 0
        };
        await setDoc(finalDocRef, finalProfile).catch(() => {});
      }

      setCurrentUser(finalProfile);
      localStorage.setItem('otl_active_user_id', targetUid);
      setPendingVerificationEmail(emailToUse);

      logUserActivity(targetUid, finalProfile.email, 'Login', 'Successful login with credentials', finalProfile.username);
      dispatchLoginEmailAlert({
        email: finalProfile.email,
        username: finalProfile.username,
        name: `${finalProfile.firstName} ${finalProfile.lastName}`.trim(),
        provider: 'email'
      });

      setIsAuthModalOpenState(false);
      setUnauthenticatedAlertMessage(null);

      // Execute pending action if any
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err?.message || 'Failed to sign in. Please check your credentials.' };
    }
  };

  // Register with Email & Password (initiates 6-digit OTP verification delivered via Brevo SMTP)
  const registerWithEmail = async (data: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const cleanUsername = data.username.trim().toLowerCase();
      const cleanEmail = data.email.trim().toLowerCase();

      // 1. Strict Real Email & Gmail Account Verification
      const emailValidation = validateRealEmail(cleanEmail);
      if (!emailValidation.isValid) {
        return { success: false, error: emailValidation.error || 'Please enter a valid, real email or Gmail address.' };
      }

      // Check username uniqueness in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', cleanUsername), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { success: false, error: `The username "@${cleanUsername}" is already taken. Please choose another.` };
      }

      // 2. Store temp password in memory for seamless client authentication after OTP confirmation
      tempRegisterPasswordRef.current = data.password;

      // 3. Call backend /api/auth/register-request
      const { ok, data: resData } = await safeApiFetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          username: cleanUsername,
          email: cleanEmail,
          password: data.password
        })
      });

      if (!ok || !resData?.success) {
        tempRegisterPasswordRef.current = '';
        return { success: false, error: resData?.error || 'Failed to start registration.' };
      }

      // Save registration session state & switch modal to verify-email
      setPendingRegistrationId(resData.registrationId);
      setPendingVerificationEmail(cleanEmail);
      setAuthModalMode('verify-email');

      return {
        success: true,
        message: resData.message || `A 6-digit verification code has been dispatched to ${cleanEmail}.`
      };
    } catch (err: any) {
      tempRegisterPasswordRef.current = '';
      console.error('Registration request error:', err);
      return { success: false, error: err?.message || 'Failed to process registration. Please try again.' };
    }
  };

  // Verify registration 6-digit OTP code entered from email inbox
  const verifyRegistrationOtp = async (otp: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      if (!pendingRegistrationId) {
        return { success: false, error: 'Registration session expired. Please register again.' };
      }

      const cleanOtp = otp.trim();
      if (!cleanOtp || cleanOtp.length !== 6) {
        return { success: false, error: 'Please enter the valid 6-digit verification code.' };
      }

      const { ok, data: resData } = await safeApiFetch('/api/auth/verify-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: pendingRegistrationId,
          otp: cleanOtp
        })
      });

      if (!ok || !resData?.success) {
        return { success: false, error: resData?.error || 'Verification failed.' };
      }

      // Sign in using the Firebase customToken received securely from backend or direct credentials
      let user: any = null;
      if (resData.customToken) {
        try {
          const userCredential = await signInWithCustomToken(auth, resData.customToken);
          user = userCredential.user;
        } catch (tokenErr: any) {
          console.warn('Custom token sign-in note, attempting credential sign-in:', tokenErr?.message);
        }
      }

      if (!user && tempRegisterPasswordRef.current && resData.user?.email) {
        try {
          const cred = await signInWithEmailAndPassword(auth, resData.user.email, tempRegisterPasswordRef.current);
          user = cred.user;
        } catch (credErr: any) {
          console.warn('Direct credential sign-in note:', credErr?.message);
        }
      }

      const activeUid = user?.uid || resData.user?.uid || pendingRegistrationId;
      tempRegisterPasswordRef.current = '';

      const now = new Date().toISOString();
      const { customId: nextOtlId, accountNumber: nextAccNum } = await getNextUserOtlId();

      const newUserProfile: UserProfile = {
        id: activeUid,
        userId: activeUid,
        customId: nextOtlId,
        accountNumber: nextAccNum,
        firstName: resData.user.firstName || '',
        lastName: resData.user.lastName || '',
        username: resData.user.username,
        email: resData.user.email,
        provider: 'email',
        role: checkIsAdminRole(resData.user.email),
        status: 'active',
        emailVerified: true,
        createdAt: now,
        lastLoginAt: now,
        lastActiveAt: now,
        downloadedResourceIds: [],
        downloadCount: 0
      };

      // Set user document in Firestore without storing raw password or raw OTP
      await setDoc(doc(db, 'users', activeUid), cleanForFirestore(newUserProfile)).catch(err => {
        console.warn('Firestore user profile write note:', err);
      });

      setCurrentUser(newUserProfile);
      localStorage.setItem('otl_active_user_id', activeUid);
      setPendingRegistrationId(null);

      logUserActivity(activeUid, resData.user.email, 'Account Created', `Registered new account as @${resData.user.username} with Brevo OTP verification`, resData.user.username);
      logUserActivity(activeUid, resData.user.email, 'Email Verified', `Email verified with 6-digit OTP code`, resData.user.username);

      setIsAuthModalOpenState(false);
      setUnauthenticatedAlertMessage(null);

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      return { success: true, message: 'Account verified and signed in successfully!' };
    } catch (err: any) {
      console.error('Verify registration OTP error:', err);
      return { success: false, error: err?.message || 'Failed to verify code. Please try again.' };
    }
  };

  // Resend registration 6-digit OTP with 60s cooldown
  const resendRegistrationOtp = async (): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      if (!pendingRegistrationId) {
        return { success: false, error: 'Registration session expired. Please start over.' };
      }

      const { ok, data: resData } = await safeApiFetch('/api/auth/resend-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: pendingRegistrationId
        })
      });

      if (!ok || !resData?.success) {
        return { success: false, error: resData?.error || 'Failed to resend code.' };
      }

      return { success: true, message: resData.message || 'A fresh verification code has been dispatched to your email.' };
    } catch (err: any) {
      console.error('Resend registration OTP error:', err);
      return { success: false, error: err?.message || 'Failed to resend code.' };
    }
  };

  // Google Sign-In
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      const now = new Date().toISOString();

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.status === 'banned') {
          await signOut(auth);
          localStorage.removeItem('otl_active_user_id');
          return { success: false, error: 'Your account has been permanently banned. Please contact support.' };
        }
        if (userData.status === 'suspended') {
          await signOut(auth);
          localStorage.removeItem('otl_active_user_id');
          return { success: false, error: 'Your account has been temporarily suspended. Please contact support.' };
        }

        await updateDoc(userDocRef, {
          lastLoginAt: now,
          lastActiveAt: now
        }).catch(() => {});

        const updatedProfile = { ...userData, id: user.uid, userId: user.uid, lastLoginAt: now, lastActiveAt: now };
        setCurrentUser(updatedProfile);
        localStorage.setItem('otl_active_user_id', user.uid);
        logUserActivity(user.uid, user.email || '', 'Google Login', 'Logged in via Google Authentication', userData.username);
        dispatchLoginEmailAlert({
          email: user.email || userData.email,
          username: userData.username,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          provider: 'google'
        });
      } else {
        // Create profile for first-time Google user
        const names = (user.displayName || 'OTL User').split(' ');
        const firstName = names[0] || 'User';
        const lastName = names.slice(1).join(' ') || '';
        const baseUsername = (user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_.]/g, '');
        const username = baseUsername.length >= 3 ? baseUsername : `user_${Math.floor(1000 + Math.random() * 9000)}`;
        const { customId: googleOtlId, accountNumber: googleAccNum } = await getNextUserOtlId();

        const newUserProfile: UserProfile = {
          id: user.uid,
          userId: user.uid,
          customId: googleOtlId,
          accountNumber: googleAccNum,
          firstName,
          lastName,
          username,
          email: user.email || '',
          photoURL: user.photoURL || '',
          provider: 'google',
          role: checkIsAdminRole(user.email),
          status: 'active',
          emailVerified: true,
          createdAt: now,
          lastLoginAt: now,
          lastActiveAt: now,
          downloadedResourceIds: [],
          downloadCount: 0
        };

        await setDoc(userDocRef, cleanForFirestore(newUserProfile));
        setCurrentUser(newUserProfile);
        localStorage.setItem('otl_active_user_id', user.uid);

        logUserActivity(user.uid, user.email || '', 'Account Created', 'Created via Google Sign-In', username);
        logUserActivity(user.uid, user.email || '', 'Google Login', 'Initial Google login', username);
        dispatchLoginEmailAlert({
          email: user.email || newUserProfile.email,
          username: newUserProfile.username,
          name: `${newUserProfile.firstName} ${newUserProfile.lastName}`.trim(),
          provider: 'google'
        });
      }

      setIsAuthModalOpenState(false);
      setUnauthenticatedAlertMessage(null);

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Google Sign-in handler note:', err?.code || err?.message);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Sign in popup was closed. Please click "Continue with Google" again or use Email registration.' };
      }
      if (err.code === 'auth/popup-blocked') {
        return { success: false, error: 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.' };
      }
      if (err.code === 'auth/operation-not-allowed') {
        return { success: false, error: 'Google Sign-In is not enabled on this Firebase project. Please sign in or register with Email & Password.' };
      }
      if (err.code === 'auth/account-exists-with-different-credential') {
        return { success: false, error: 'An account already exists with this email using another login method (e.g. Email/Password or GitHub). Please sign in with your existing method.' };
      }
      return { success: false, error: err.message || 'Failed to sign in with Google' };
    }
  };

  // GitHub Sign-In
  const loginWithGithub = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, githubAuthProvider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);

      const now = new Date().toISOString();

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        if (userData.status === 'banned') {
          await signOut(auth);
          localStorage.removeItem('otl_active_user_id');
          return { success: false, error: 'Your account has been permanently banned. Please contact support.' };
        }
        if (userData.status === 'suspended') {
          await signOut(auth);
          localStorage.removeItem('otl_active_user_id');
          return { success: false, error: 'Your account has been temporarily suspended. Please contact support.' };
        }

        await updateDoc(userDocRef, {
          lastLoginAt: now,
          lastActiveAt: now
        }).catch(() => {});

        const updatedProfile = { ...userData, id: user.uid, userId: user.uid, lastLoginAt: now, lastActiveAt: now };
        setCurrentUser(updatedProfile);
        localStorage.setItem('otl_active_user_id', user.uid);
        logUserActivity(user.uid, user.email || '', 'GitHub Login', 'Logged in via GitHub Authentication', userData.username);
        dispatchLoginEmailAlert({
          email: user.email || userData.email,
          username: userData.username,
          name: `${userData.firstName} ${userData.lastName}`.trim(),
          provider: 'github'
        });
      } else {
        // Create profile for first-time GitHub user
        const names = (user.displayName || 'OTL User').split(' ');
        const firstName = names[0] || 'User';
        const lastName = names.slice(1).join(' ') || '';
        const baseUsername = (user.email?.split('@')[0] || `gh_${user.uid.substring(0, 5)}`).toLowerCase().replace(/[^a-z0-9_.]/g, '');
        const username = baseUsername.length >= 3 ? baseUsername : `user_${Math.floor(1000 + Math.random() * 9000)}`;
        const { customId: ghOtlId, accountNumber: ghAccNum } = await getNextUserOtlId();

        const newUserProfile: UserProfile = {
          id: user.uid,
          userId: user.uid,
          customId: ghOtlId,
          accountNumber: ghAccNum,
          firstName,
          lastName,
          username,
          email: user.email || `${username}@github.user`,
          photoURL: user.photoURL || '',
          provider: 'github',
          role: checkIsAdminRole(user.email),
          status: 'active',
          emailVerified: !!user.emailVerified || true,
          createdAt: now,
          lastLoginAt: now,
          lastActiveAt: now,
          downloadedResourceIds: [],
          downloadCount: 0
        };

        await setDoc(userDocRef, cleanForFirestore(newUserProfile));
        setCurrentUser(newUserProfile);
        localStorage.setItem('otl_active_user_id', user.uid);

        logUserActivity(user.uid, newUserProfile.email, 'Account Created', 'Created via GitHub Sign-In', username);
        logUserActivity(user.uid, newUserProfile.email, 'GitHub Login', 'Initial GitHub login', username);
        dispatchLoginEmailAlert({
          email: newUserProfile.email,
          username: newUserProfile.username,
          name: `${newUserProfile.firstName} ${newUserProfile.lastName}`.trim(),
          provider: 'github'
        });
      }

      setIsAuthModalOpenState(false);
      setUnauthenticatedAlertMessage(null);

      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('GitHub Sign-in handler note:', err?.code || err?.message);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Sign in popup was closed. Please click "Continue with GitHub" again or use Email registration.' };
      }
      if (err.code === 'auth/popup-blocked') {
        return { success: false, error: 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.' };
      }
      if (err.code === 'auth/operation-not-allowed') {
        return { success: false, error: 'GitHub Sign-In is not enabled on this Firebase project. Please sign in or register with Email & Password.' };
      }
      if (err.code === 'auth/account-exists-with-different-credential') {
        return { success: false, error: 'An account already exists with the same email address but different sign-in credentials. Please sign in using your existing method.' };
      }
      return { success: false, error: err.message || 'Failed to sign in with GitHub' };
    }
  };

  // Sign out
  const logout = async () => {
    try {
      if (currentUser) {
        const now = new Date().toISOString();
        updateDoc(doc(db, 'users', currentUser.id), {
          lastLogoutAt: now
        }).catch(() => {});
        logUserActivity(currentUser.id, currentUser.email, 'Logout', 'User signed out', currentUser.username);
      }
      localStorage.removeItem('otl_active_user_id');
      await signOut(auth).catch(() => {});
      setCurrentUser(null);
      setFirebaseUser(null);
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Resend official verification email with fresh 6-digit OTP via Brevo SMTP
  const resendFirebaseVerificationEmail = async (overrideEmail?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const targetEmail = (overrideEmail || pendingVerificationEmail || currentUser?.email || '').trim().toLowerCase();
      
      if (!targetEmail) {
        return {
          success: false,
          error: 'Please enter a valid email address.'
        };
      }

      // Generate a fresh 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setPendingVerificationEmail(targetEmail);

      // Find user doc to save the new OTP
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', targetEmail), limit(1));
      const snap = await getDocs(q);
      let userDisplayName = currentUser?.firstName || 'User';

      if (!snap.empty) {
        const docId = snap.docs[0].id;
        const data = snap.docs[0].data();
        userDisplayName = data.firstName || userDisplayName;
        await updateDoc(doc(db, 'users', docId), {
          verificationOtp: newOtp,
          otpCreatedAt: new Date().toISOString()
        }).catch(() => {});
      } else if (currentUser?.id) {
        await updateDoc(doc(db, 'users', currentUser.id), {
          verificationOtp: newOtp,
          otpCreatedAt: new Date().toISOString()
        }).catch(() => {});
      }

      // Dispatch Brevo SMTP transactional email
      emailService.sendTemplateEmail({
        type: 'email-verification',
        recipient: targetEmail,
        vars: {
          first_name: userDisplayName,
          username: currentUser?.username || targetEmail.split('@')[0],
          email: targetEmail,
          otp: newOtp,
          brand_name: 'Online Task Lab'
        },
        customTemplates: emailTemplates,
        settings: emailSettings
      }).catch(err => console.warn('[Brevo SMTP Resend OTP Warning]:', err));

      const user = auth.currentUser;
      if (user) {
        sendEmailVerification(user).catch(() => {});
      }

      return { success: true };
    } catch (err: any) {
      console.error('Resend verification email error:', err);
      if (err?.code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many requests. Please wait a minute before requesting another verification email.' };
      }
      return { success: false, error: 'Verification email could not be delivered. Please check Spam/Junk or try again later.' };
    }
  };

  // Check and refresh email verification status strictly via Firebase Auth emailVerified
  const checkAndRefreshEmailVerification = async (): Promise<{ success: boolean; verified: boolean; error?: string }> => {
    try {
      let verified = false;
      let targetUid = '';
      let targetEmail = '';

      if (auth.currentUser) {
        await reload(auth.currentUser);
        verified = !!auth.currentUser.emailVerified;
        targetUid = auth.currentUser.uid;
        targetEmail = auth.currentUser.email || '';
      }

      if (verified && targetUid) {
        await updateDoc(doc(db, 'users', targetUid), {
          emailVerified: true,
          lastActiveAt: new Date().toISOString()
        }).catch(() => {});

        setCurrentUser(prev => prev ? { ...prev, emailVerified: true } : null);
        logUserActivity(targetUid, targetEmail, 'Email Verified', 'Email verified via official Firebase confirmation link');

        setUnauthenticatedAlertMessage(null);
        setIsAuthModalOpenState(false);

        if (pendingAction) {
          pendingAction();
          setPendingAction(null);
        }

        return { success: true, verified: true };
      }

      return { success: true, verified: false };
    } catch (err: any) {
      console.error('Check email verification error:', err);
      return { success: false, verified: false, error: err?.message || 'Failed to check verification status.' };
    }
  };

  // Verify email with 6-digit OTP verification code received in Gmail/Email inbox
  const verifyEmailWithCode = async (code: string, targetEmailOrUser?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanCode = (code || '').trim();
      if (!cleanCode) {
        return { success: false, error: 'Please enter the 6-digit verification code.' };
      }

      const emailToSearch = (targetEmailOrUser || pendingVerificationEmail || currentUser?.email || '').trim().toLowerCase();
      let targetDocId = currentUser?.id || '';
      let targetUser: any = currentUser;

      if ((!targetDocId || !targetUser?.verificationOtp) && emailToSearch) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', emailToSearch), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetDocId = snap.docs[0].id;
          targetUser = snap.docs[0].data();
        }
      }

      if (targetUser) {
        const storedOtp = targetUser.verificationOtp || targetUser.resetOtp;
        if (storedOtp && String(storedOtp).trim() === cleanCode) {
          if (targetDocId) {
            await updateDoc(doc(db, 'users', targetDocId), {
              emailVerified: true,
              lastActiveAt: new Date().toISOString()
            }).catch(() => {});
          }

          setCurrentUser(prev => prev ? { ...prev, emailVerified: true } : null);
          logUserActivity(targetDocId || 'user', emailToSearch, 'Email Verified', `Email verified with real OTP code: ${cleanCode}`);

          setUnauthenticatedAlertMessage(null);
          setIsAuthModalOpenState(false);

          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }

          return { success: true };
        }
      }

      return { success: false, error: 'Incorrect verification code. Please check your Gmail or email inbox.' };
    } catch (err: any) {
      console.error('Verify email with code error:', err);
      return { success: false, error: err.message || 'Failed to verify code.' };
    }
  };

  // Request Password Reset - dispatches 6-digit OTP code to registered email via Brevo SMTP
  const requestPasswordReset = async (emailOrUsername: string): Promise<{ success: boolean; resetCode?: string; email?: string; error?: string; message?: string }> => {
    try {
      const cleanIdent = emailOrUsername.trim();
      if (!cleanIdent) {
        return { success: false, error: 'Please provide your registered email or username.' };
      }

      let emailOrIdent = cleanIdent;
      // If user typed a username without @, resolve their email from Firestore users collection
      if (!cleanIdent.includes('@')) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', cleanIdent.toLowerCase()), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty && snap.docs[0].data()?.email) {
            emailOrIdent = snap.docs[0].data().email;
          }
        } catch (lookupErr) {
          console.warn('Username lookup note in requestPasswordReset:', lookupErr);
        }
      }

      const { ok, data: resData } = await safeApiFetch('/api/auth/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: emailOrIdent })
      });

      if (!ok || !resData?.success) {
        return { success: false, error: resData?.error || 'Failed to process password reset request.' };
      }

      // Save requestId in state & switch modal to verify-reset-otp
      setPendingResetRequestId(resData.requestId);
      setPendingVerificationEmail(emailOrIdent.includes('@') ? emailOrIdent : '');
      setAuthModalMode('verify-reset-otp');

      return {
        success: true,
        email: emailOrIdent.includes('@') ? emailOrIdent : undefined,
        message: resData.message || 'A 6-digit password reset code has been dispatched to your email.'
      };
    } catch (err: any) {
      console.error('Password reset request error:', err);
      return { success: false, error: err?.message || 'Failed to process request. Please try again.' };
    }
  };

  // Verify 6-digit password reset OTP code
  const verifyPasswordResetOtp = async (otp: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      if (!pendingResetRequestId) {
        return { success: false, error: 'Password reset session expired. Please request a new code.' };
      }

      const cleanOtp = otp.trim();
      if (!cleanOtp || cleanOtp.length !== 6) {
        return { success: false, error: 'Please enter the 6-digit reset code.' };
      }

      const { ok, data: resData } = await safeApiFetch('/api/auth/verify-password-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: pendingResetRequestId,
          otp: cleanOtp
        })
      });

      if (!ok || !resData?.success) {
        return { success: false, error: resData?.error || 'Invalid or expired reset code.' };
      }

      setResetSessionId(resData.resetSessionId);
      setPendingResetRequestId(null);
      setAuthModalMode('reset-password');

      return { success: true, message: 'Code verified successfully! You can now set your new password.' };
    } catch (err: any) {
      console.error('Verify password reset OTP error:', err);
      return { success: false, error: err?.message || 'Failed to verify code.' };
    }
  };

  // Resend password reset OTP with 60s cooldown
  const resendPasswordResetOtp = async (): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      if (!pendingResetRequestId) {
        return { success: false, error: 'Reset session expired. Please start over.' };
      }

      const { ok, data: resData } = await safeApiFetch('/api/auth/resend-password-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: pendingResetRequestId
        })
      });

      if (!ok || !resData?.success) {
        return { success: false, error: resData?.error || 'Failed to resend code.' };
      }

      return { success: true, message: resData?.message || 'A fresh reset code has been dispatched to your email.' };
    } catch (err: any) {
      console.error('Resend password reset OTP error:', err);
      return { success: false, error: err?.message || 'Failed to resend code.' };
    }
  };

  // Complete password reset with new password
  const completePasswordReset = async (
    newPassword: string,
    confirmPassword: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      if (!resetSessionId) {
        return { success: false, error: 'Password reset session expired. Please request a new code.' };
      }

      if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      if (newPassword !== confirmPassword) {
        return { success: false, error: 'Passwords do not match.' };
      }

      const { ok, data: resData } = await safeApiFetch('/api/auth/complete-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetSessionId,
          newPassword,
          confirmPassword
        })
      });

      if (!ok || !resData?.success) {
        return { success: false, error: resData?.error || 'Failed to update password.' };
      }

      setResetSessionId(null);
      setResetCode(null);

      return { success: true, message: 'Password reset successfully! Please sign in with your new password.' };
    } catch (err: any) {
      console.error('Complete password reset error:', err);
      return { success: false, error: err?.message || 'Failed to reset password. Please try again.' };
    }
  };

  // Legacy/Fallback confirm password reset method
  const confirmUserPasswordReset = async (
    newPassword: string,
    code?: string,
    identifier?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (resetSessionId) {
      const res = await completePasswordReset(newPassword, newPassword);
      return res;
    }
    return { success: false, error: 'Please enter your reset code first.' };
  };

  // Change password for currently authenticated user with old password verification
  const changeCurrentUserPassword = async (
    newPassword: string,
    oldPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!auth.currentUser && !currentUser) {
        return { success: false, error: 'You must be signed in to change your password.' };
      }
      if (!oldPassword || !oldPassword.trim()) {
        return { success: false, error: 'Please enter your current (old) password.' };
      }
      if (newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters long.' };
      }
      if (oldPassword === newPassword) {
        return { success: false, error: 'New password cannot be the same as your old password.' };
      }

      const targetUid = currentUser?.id || auth.currentUser?.uid;
      const targetEmail = currentUser?.email || auth.currentUser?.email || '';

      // 1. Verify old password against Firestore hash if present
      const oldPasswordHash = await hashPassword(oldPassword);
      let firestoreOldMatched = false;
      let hasStoredHash = false;

      if (targetUid) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', targetUid));
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const storedHash = data._authHash || data.passwordHash;
            if (storedHash) {
              hasStoredHash = true;
              if (storedHash === oldPasswordHash) {
                firestoreOldMatched = true;
              }
            }
          }
        } catch (e) {
          console.warn('Firestore password check note:', e);
        }
      }

      // 2. Also verify / re-authenticate with Firebase Auth if available
      let firebaseReauthSuccess = false;
      let firebaseReauthFailed = false;
      if (auth.currentUser && targetEmail) {
        try {
          const credential = EmailAuthProvider.credential(targetEmail, oldPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
          firebaseReauthSuccess = true;
        } catch (reauthErr: any) {
          console.warn('Firebase reauthenticate error:', reauthErr?.code || reauthErr?.message);
          if (
            reauthErr.code === 'auth/wrong-password' ||
            reauthErr.code === 'auth/invalid-credential' ||
            reauthErr.code === 'auth/invalid-password'
          ) {
            firebaseReauthFailed = true;
          }
        }
      }

      // If stored hash was found and did NOT match, and Firebase reauth also failed or wasn't possible
      if (hasStoredHash && !firestoreOldMatched && (!firebaseReauthSuccess || firebaseReauthFailed)) {
        return { success: false, error: 'Incorrect current (old) password. Please try again.' };
      }
      if (firebaseReauthFailed && !firestoreOldMatched) {
        return { success: false, error: 'Incorrect current (old) password. Please try again.' };
      }

      // 3. Update password in Firebase Auth
      if (auth.currentUser) {
        try {
          await updatePassword(auth.currentUser, newPassword);
        } catch (upErr: any) {
          console.warn('Firebase updatePassword error:', upErr);
        }
      }

      // 4. Update password hash in Firestore
      const hashedPassword = await hashPassword(newPassword);
      if (targetUid) {
        await updateDoc(doc(db, 'users', targetUid), {
          rawPassword: newPassword,
          _authHash: hashedPassword,
          passwordHash: hashedPassword,
          lastActiveAt: new Date().toISOString()
        }).catch(() => {});
      }

      logUserActivity(
        targetUid || 'guest',
        targetEmail,
        'Password Changed',
        'User successfully updated password using old password verification'
      );
      return { success: true };
    } catch (err: any) {
      console.error('Change password error:', err);
      return { success: false, error: err?.message || 'Failed to update password.' };
    }
  };

  // Gating & Authentication Requirement Hook
  const requireAuth = (actionCallback?: () => void, promptMessage?: string): boolean => {
    // If not authenticated at all
    if (!currentUser) {
      if (actionCallback) {
        setPendingAction(() => actionCallback);
      }
      setUnauthenticatedAlertMessage(
        promptMessage || '🔒 Account Required: Please log in or create an account to unlock downloads & features!'
      );
      setIsAuthModalOpen(true, 'login');
      return false;
    }

    // If banned or suspended
    if (currentUser.status === 'banned' || currentUser.status === 'suspended') {
      alert(`Your account is currently ${currentUser.status}. Please contact support.`);
      return false;
    }

    // Fully authenticated and active - permit immediate access
    if (actionCallback) {
      actionCallback();
    }
    return true;
  };

  // Record user download
  const recordUserDownload = async (resourceId: string) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.id);
      const existing = currentUser.downloadedResourceIds || [];
      const updated = Array.from(new Set([...existing, resourceId]));
      const count = (currentUser.downloadCount || 0) + 1;

      await updateDoc(userRef, {
        downloadedResourceIds: updated,
        downloadCount: count,
        lastActiveAt: new Date().toISOString()
      });

      setCurrentUser(prev => prev ? { ...prev, downloadedResourceIds: updated, downloadCount: count } : null);
      logUserActivity(currentUser.id, currentUser.email, 'Download', `Downloaded resource #${resourceId}`);
    } catch (err) {
      console.warn('Could not record user download:', err);
    }
  };

  // Update profile data
  const updateUserProfileData = async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, cleanForFirestore({
        ...updates,
        lastActiveAt: new Date().toISOString()
      }));
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Failed to update profile:', err);
      return false;
    }
  };

  // Admin: Update User Status
  const updateUserStatus = async (userId: string, status: UserStatus, notes?: string): Promise<boolean> => {
    try {
      const userRef = doc(db, 'users', userId);
      const targetUser = allUsers.find(u => u.id === userId || u.userId === userId);

      await updateDoc(userRef, {
        status,
        notes: notes !== undefined ? notes : (targetUser?.notes || ''),
        lastActiveAt: new Date().toISOString()
      });

      let actionName: AdminActivityLog['action'] = 'User Status Changed';
      if (status === 'banned') actionName = 'User Banned';
      if (status === 'suspended') actionName = 'User Suspended';
      if (status === 'active' && targetUser?.status === 'banned') actionName = 'User Unbanned';

      await logAdminAction(actionName, `Changed status to ${status}. Notes: ${notes || 'None'}`, userId, targetUser?.email);

      return true;
    } catch (err) {
      console.error('Error updating user status:', err);
      return false;
    }
  };

  // Admin: Delete User Account
  const deleteUserAccount = async (userId: string): Promise<boolean> => {
    try {
      const targetUser = allUsers.find(u => u.id === userId || u.userId === userId);
      await deleteDoc(doc(db, 'users', userId));
      await logAdminAction('User Deleted', `Permanently deleted account of @${targetUser?.username || userId}`, userId, targetUser?.email);
      return true;
    } catch (err) {
      console.error('Error deleting user account:', err);
      return false;
    }
  };

  // Admin: Directly Change / Reset User Password without user confirmation
  const adminChangeUserPassword = async (
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanPassword = newPassword.trim();
      if (!cleanPassword || cleanPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      const targetUser = allUsers.find(u => u.id === userId || u.userId === userId);
      const hashedPassword = await hashPassword(cleanPassword);
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        rawPassword: cleanPassword,
        _authHash: hashedPassword,
        passwordHash: hashedPassword,
        lastActiveAt: new Date().toISOString()
      });

      // Update currentUser state if admin edited own account
      if (currentUser && (currentUser.id === userId || currentUser.userId === userId)) {
        setCurrentUser(prev => prev ? { ...prev, rawPassword: cleanPassword } : null);
      }

      // Log in Admin Activity Logs
      await logAdminAction(
        'User Profile Updated',
        `Admin directly changed password for @${targetUser?.username || userId} (${targetUser?.email || ''})`,
        userId,
        targetUser?.email
      );

      // Log in User Activities
      logUserActivity(
        userId,
        targetUser?.email || '',
        'Password Changed',
        'Password was changed by Administrator',
        targetUser?.username
      );

      return { success: true };
    } catch (err: any) {
      console.error('Error in adminChangeUserPassword:', err);
      return { success: false, error: err?.message || 'Failed to update user password.' };
    }
  };

  // Admin: Update User Profile (First Name, Last Name, Username, Email, Role, Status, Custom ID, Notes, Password, Avatar)
  const adminUpdateUserProfile = async (
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      photoURL?: string;
      role?: UserRole;
      status?: UserStatus;
      customId?: string;
      notes?: string;
      password?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanUsername = (data.username || '').trim().toLowerCase().replace(/^@/, '');
      const cleanEmail = (data.email || '').trim().toLowerCase();
      const cleanFirstName = (data.firstName || '').trim();
      const cleanLastName = (data.lastName || '').trim();
      const cleanCustomId = (data.customId || '').trim();
      const cleanPhotoURL = (data.photoURL || '').trim();

      if (!cleanFirstName) {
        return { success: false, error: 'First Name is required.' };
      }
      if (!cleanUsername) {
        return { success: false, error: 'Username is required.' };
      }
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, error: 'A valid Email address is required.' };
      }

      const usersRef = collection(db, 'users');

      // 1. Check if username is taken by another user
      const qUser = query(usersRef, where('username', '==', cleanUsername), limit(2));
      const userSnap = await getDocs(qUser);
      const userConflict = userSnap.docs.find(d => d.id !== userId);
      if (userConflict) {
        return { success: false, error: `The username "@${cleanUsername}" is already taken by another account.` };
      }

      // 2. Check if email is taken by another user
      const qEmail = query(usersRef, where('email', '==', cleanEmail), limit(2));
      const emailSnap = await getDocs(qEmail);
      const emailConflict = emailSnap.docs.find(d => d.id !== userId);
      if (emailConflict) {
        return { success: false, error: `The email "${cleanEmail}" is already registered to another account.` };
      }

      // 3. Prepare updates
      const updates: Partial<UserProfile> & { [key: string]: any } = {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        username: cleanUsername,
        email: cleanEmail,
        lastActiveAt: new Date().toISOString()
      };

      if (cleanPhotoURL !== undefined) updates.photoURL = cleanPhotoURL;
      if (data.role) updates.role = data.role;
      if (data.status) updates.status = data.status;
      if (cleanCustomId) updates.customId = cleanCustomId;
      if (data.notes !== undefined) updates.notes = data.notes;
      if (data.password && data.password.trim().length >= 6) {
        const hPassword = await hashPassword(data.password.trim());
        updates.rawPassword = data.password.trim();
        updates._authHash = hPassword;
        updates.passwordHash = hPassword;
      }

      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, cleanForFirestore(updates));

      // If current logged-in user is this user, update state
      if (currentUser && (currentUser.id === userId || currentUser.userId === userId)) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }

      await logAdminAction(
        'User Profile Updated',
        `Admin updated profile for @${cleanUsername} (${cleanEmail}) [ID: ${cleanCustomId || userId}]`,
        userId,
        cleanEmail
      );

      return { success: true };
    } catch (err: any) {
      console.error('Error updating user profile by admin:', err);
      return { success: false, error: err?.message || 'Failed to update user profile.' };
    }
  };

  // Admin: Save Email Template
  const saveEmailTemplate = async (template: EmailTemplate): Promise<boolean> => {
    try {
      const updated = {
        ...template,
        version: (template.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'email_templates', template.id), updated);
      await logAdminAction('Template Updated', `Updated email template: ${template.name} (${template.type})`, template.id);
      return true;
    } catch (err) {
      console.error('Error saving email template:', err);
      return false;
    }
  };

  // Admin: Save Email Settings
  const saveEmailSettings = async (settings: EmailSettings): Promise<boolean> => {
    try {
      await setDoc(doc(db, 'settings', 'email'), settings);
      setEmailSettings(settings);
      await logAdminAction('Email Settings Updated', `Updated sender config: ${settings.senderEmail}`);
      return true;
    } catch (err) {
      console.error('Error saving email settings:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated: !!currentUser,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        isProfileModalOpen,
        setIsProfileModalOpen,
        unauthenticatedAlertMessage,
        setUnauthenticatedAlertMessage,
        pendingVerificationEmail,
        pendingRegistrationId,
        pendingResetRequestId,
        resetSessionId,
        resetCode,
        setResetCode,
        loginWithEmailOrUsername,
        registerWithEmail,
        verifyRegistrationOtp,
        resendRegistrationOtp,
        loginWithGoogle,
        loginWithGithub,
        logout,
        resendFirebaseVerificationEmail,
        checkAndRefreshEmailVerification,
        verifyEmailWithCode,
        requestPasswordReset,
        verifyPasswordResetOtp,
        resendPasswordResetOtp,
        completePasswordReset,
        confirmUserPasswordReset,
        changeCurrentUserPassword,
        requireAuth,
        updateUserProfileData,
        recordUserDownload,
        allUsers,
        userActivities,
        adminActivityLogs,
        emailTemplates,
        emailLogs,
        emailSettings,
        updateUserStatus,
        adminUpdateUserProfile,
        adminChangeUserPassword,
        deleteUserAccount,
        saveEmailTemplate,
        saveEmailSettings,
        logAdminAction
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

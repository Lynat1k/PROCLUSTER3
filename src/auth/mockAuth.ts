/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { storage } from "../lib/storage";

export interface AuthUser {
  name: string;
  email: string;
  avatar: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

/**
 * Gets the currently authorized user from localStorage.
 */
export function getCurrentUser(): AuthUser | null {
  return storage.getJson<AuthUser | null>("procluster_user", null);
}

/**
 * Seeds the default administrator account on startup if it doesn't already exist.
 */
export function seedAdminAccount(): void {
  const accountsKey = "procluster_accounts";
  let accounts = storage.getJson<any[]>(accountsKey, []);
  
  const adminExists = accounts.some((acc: any) => acc.login === "admin");
  if (!adminExists) {
    accounts.push({
      login: "admin",
      email: "admin@procluster.io",
      password: "lynat1k286450",
      name: "Admin"
    });
    storage.setJson(accountsKey, accounts);
  }
}

/**
 * Helper to ensure admin exists in accounts, returns the accounts array.
 */
function getAccountsAndEnsureAdmin(): any[] {
  const accountsKey = "procluster_accounts";
  let accounts = storage.getJson<any[]>(accountsKey, []);

  const adminExists = accounts.some((acc: any) => acc.login === "admin");
  if (!adminExists) {
    accounts.push({
      login: "admin",
      email: "admin@procluster.io",
      password: "lynat1k286450",
      name: "Admin"
    });
    storage.setJson(accountsKey, accounts);
  }
  return accounts;
}

/**
 * Authenticates the user with loginName (or email) and password.
 */
export function loginUser(
  loginName: string,
  loginPassword: string,
  langTexts: any
): AuthResult {
  const accounts = getAccountsAndEnsureAdmin();

  // Find account by login or email
  const matched = accounts.find((acc: any) => 
    (acc.login.toLowerCase() === loginName.trim().toLowerCase() || acc.email.toLowerCase() === loginName.trim().toLowerCase()) &&
    acc.password === loginPassword
  );
  
  if (matched) {
    const loggedUser: AuthUser = {
      name: matched.login === "admin" ? "Admin" : matched.login,
      email: matched.email,
      avatar: matched.login === "admin" 
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
        : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    };

    storage.setJson("procluster_user", loggedUser);
    window.dispatchEvent(new Event("procluster_user_updated"));
    return { success: true, user: loggedUser };
  } else {
    return { success: false, error: langTexts.errorUserNotFound };
  }
}

/**
 * Registers a new user account and automatically logs them in.
 */
export function registerUser(
  loginName: string,
  loginEmail: string,
  loginPassword: string,
  confirmPassword: string,
  langTexts: any
): AuthResult {
  const accounts = getAccountsAndEnsureAdmin();

  if (!loginName.trim() || !loginEmail.trim() || !loginPassword || !confirmPassword) {
    return { success: false, error: langTexts.errorEmptyFields };
  }
  if (loginPassword !== confirmPassword) {
    return { success: false, error: langTexts.errorPasswordMismatch };
  }
  
  const usernameExists = accounts.some((acc: any) => acc.login.toLowerCase() === loginName.trim().toLowerCase());
  if (usernameExists) {
    return { success: false, error: langTexts.errorUsernameExists };
  }
  
  const newAcc = {
    login: loginName.trim(),
    email: loginEmail.trim(),
    password: loginPassword,
    name: loginName.trim()
  };
  accounts.push(newAcc);
  storage.setJson("procluster_accounts", accounts);
  
  const loggedUser: AuthUser = {
    name: newAcc.login,
    email: newAcc.email,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80"
  };

  storage.setJson("procluster_user", loggedUser);
  window.dispatchEvent(new Event("procluster_user_updated"));

  return { success: true, user: loggedUser };
}

/**
 * Logs in with the hardcoded simulated Google credentials.
 */
export function authenticateWithGoogle(): AuthUser {
  const gAccount: AuthUser = {
    name: "Lynat1k",
    email: "xxLynat1kxx@gmail.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
  };
  storage.setJson("procluster_user", gAccount);
  window.dispatchEvent(new Event("procluster_user_updated"));
  return gAccount;
}

/**
 * Logs in with the quick-session admin override user.
 */
export function authenticateWithAdmin(): AuthUser {
  const adminAccount: AuthUser = {
    name: "Admin",
    email: "admin@procluster.io",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
  };
  storage.setJson("procluster_user", adminAccount);
  window.dispatchEvent(new Event("procluster_user_updated"));
  return adminAccount;
}

/**
 * Log out user from localStorage and notify other sessions/listeners.
 */
export function logoutUser(): void {
  storage.remove("procluster_user");
  window.dispatchEvent(new Event("procluster_user_updated"));
}

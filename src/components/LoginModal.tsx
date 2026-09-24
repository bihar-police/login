import React, { useState } from 'react';
import { UserAccount } from '../types';
import {
  Shield,
  Lock,
  User,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Settings,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { authenticateOfficerWithSupabase } from '../services/supabaseService';
import { INITIAL_USER_ACCOUNTS } from '../data/mockData';

interface LoginModalProps {
  isOpen: boolean;
  accounts: UserAccount[];
  onLoginSuccess: (userAccount: UserAccount) => void;
  onResetAccounts?: () => void;
  onOpenSupabaseConfig?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  accounts,
  onLoginSuccess,
  onResetAccounts,
  onOpenSupabaseConfig,
}) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const supabaseConnected = isSupabaseConfigured();

  // Combine provided accounts with fallback defaults so users are never locked out
  const effectiveAccounts = accounts && accounts.length > 0 ? accounts : INITIAL_USER_ACCOUNTS;

  const handleLogin = async (e?: React.FormEvent, overrideUser?: string, overridePass?: string) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const targetUser = (overrideUser !== undefined ? overrideUser : userId).trim().toLowerCase();
    const targetPass = (overridePass !== undefined ? overridePass : password).trim();

    if (!targetUser || !targetPass) {
      setErrorMessage('Please enter both Officer User ID and Password.');
      return;
    }

    setIsAuthenticating(true);

    // 1. Check in-memory / local accounts first
    const localMatch = effectiveAccounts.find(
      (acc) =>
        acc.userId.toLowerCase() === targetUser &&
        acc.password === targetPass &&
        acc.isActive !== false
    );

    if (localMatch) {
      setIsAuthenticating(false);
      onLoginSuccess(localMatch);
      return;
    }

    // 2. Check default list in case local storage was customized or altered
    const defaultMatch = INITIAL_USER_ACCOUNTS.find(
      (acc) =>
        acc.userId.toLowerCase() === targetUser &&
        acc.password === targetPass
    );

    if (defaultMatch) {
      setIsAuthenticating(false);
      onLoginSuccess(defaultMatch);
      return;
    }

    // 3. If Supabase is configured, attempt real-time cloud authentication query
    if (supabaseConnected) {
      try {
        const cloudResult = await authenticateOfficerWithSupabase(targetUser, targetPass);
        if (cloudResult.success && cloudResult.account) {
          setIsAuthenticating(false);
          onLoginSuccess(cloudResult.account);
          return;
        } else if (cloudResult.error && !cloudResult.error.includes('not found')) {
          setErrorMessage(`Supabase Auth Notice: ${cloudResult.error}`);
          setIsAuthenticating(false);
          return;
        }
      } catch (err: any) {
        console.warn('Cloud login check exception:', err);
      }
    }

    setIsAuthenticating(false);
    setErrorMessage(
      'Invalid User ID or Password. Please check your credentials or contact District / Subdivision Police Command.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col my-auto">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 text-center relative border-b border-slate-800">
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
              BIHAR POLICE • STATE & DISTRICT COMMAND
            </span>
            {onOpenSupabaseConfig && (
              <button
                type="button"
                onClick={onOpenSupabaseConfig}
                className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition"
                title="Configure Supabase Cloud Database"
              >
                <Settings className="w-3 h-3 text-emerald-400" />
                <span>Cloud DB</span>
              </button>
            )}
          </div>

          <div className="mx-auto w-12 h-12 bg-amber-500/10 border border-amber-400/30 rounded-full flex items-center justify-center text-amber-400 mb-2 shadow-inner">
            <Shield className="w-7 h-7 stroke-[2.5]" />
          </div>

          <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
            Crime Supervision Portal
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Official Crime & Investigation Monitoring System — Secure Officer Login
          </p>

          {/* Supabase Connection Status Badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border backdrop-blur-xs">
            <Database className="w-3.5 h-3.5" />
            {supabaseConnected ? (
              <span className="text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Supabase Cloud Database Connected
              </span>
            ) : (
              <span className="text-amber-300">
                Local Storage Mode (Cloud Sync ready)
              </span>
            )}
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-bold flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-3.5">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Official User ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter Officer User ID"
                  required
                  autoFocus
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Officer Password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isAuthenticating ? 'Authenticating...' : 'Authenticate & Access Portal'}</span>
            </button>
          </form>

          {/* Reset Defaults Option */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Official Bihar Police Portal
            </span>
            {onResetAccounts && (
              <button
                type="button"
                onClick={onResetAccounts}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                title="Restore default login credentials in local storage"
              >
                <RotateCcw className="w-3 h-3" />
                Restore Default Accounts
              </button>
            )}
          </div>

        </div>

        <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Bihar Police Crime Supervision & Investigation Command Portal
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { api } from '../services/api';

export default function ResetPassword({ onResetSuccess }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await api.updatePassword(password);
      setSuccessMessage('Password updated successfully! Redirecting to sign in...');
      setTimeout(() => {
        // Clear recovery hashes from URL to prevent infinite redirect loops
        window.location.hash = '';
        onResetSuccess();
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to reset password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#f1f4f7] dark:bg-[#0a1317] flex justify-center items-center p-6 antialiased font-sans text-[#0a1317] dark:text-[#f1f4f7]">
      <div className="w-full max-w-md bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-2xl p-8 shadow-lg md:p-10">
        {/* Brand/Logo Header */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-full bg-[#0a1317] dark:bg-white flex items-center justify-center text-white dark:text-black">
            <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#0a1317] dark:text-white">specCraft.ai</span>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[#0a1317] dark:text-white mb-2 tracking-tight">Create New Password</h2>
          <p className="text-slate-500 text-xs dark:text-slate-400">Choose a secure password of at least 6 characters.</p>
        </div>

        {error && (
          <div className="bg-red-50/50 dark:bg-red-950/20 text-[#e41e3f] dark:text-red-400 p-3 rounded-lg text-xs mb-4 flex items-center gap-2 border border-[#e41e3f]/20">
            <span className="material-symbols-outlined text-[#e41e3f] text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 text-[#31a24c] dark:text-emerald-400 p-3 rounded-lg text-xs mb-4 flex items-center gap-2 border border-[#31a24c]/20">
            <span className="material-symbols-outlined text-[#31a24c] text-[18px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider" htmlFor="password">New Password</label>
            <input
              className="w-full bg-white dark:bg-[#1c1e21] text-[#0a1317] dark:text-[#f1f4f7] text-sm px-3 py-2.5 rounded-lg border border-[#ced0d4] dark:border-[#ced0d4]/15 focus:outline-none focus:border-[#1876f2] focus:ring-2 focus:ring-[#1876f2]/15 transition-all duration-200 placeholder-slate-400"
              id="password"
              placeholder="Min 6 characters…"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || successMessage}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider" htmlFor="confirm-password">Confirm Password</label>
            <input
              className="w-full bg-white dark:bg-[#1c1e21] text-[#0a1317] dark:text-[#f1f4f7] text-sm px-3 py-2.5 rounded-lg border border-[#ced0d4] dark:border-[#ced0d4]/15 focus:outline-none focus:border-[#1876f2] focus:ring-2 focus:ring-[#1876f2]/15 transition-all duration-200 placeholder-slate-400"
              id="confirm-password"
              placeholder="Confirm password…"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || successMessage}
            />
          </div>

          <div className="pt-4">
            <button
              className="w-full bg-[#000000] dark:bg-white text-white dark:text-[#0a1317] hover:bg-[#444950] dark:hover:bg-[#f1f4f7] transition-all duration-200 py-3 px-4 rounded-full font-bold text-xs uppercase tracking-wider flex justify-center items-center gap-2 disabled:opacity-50"
              type="submit"
              disabled={loading || successMessage}
            >
              {loading ? 'Updating…' : 'Update Password'}
              <span className="material-symbols-outlined text-[18px]">lock_reset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { api } from '../services/api';

export default function Auth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (isSignUp) {
        const data = await api.signUp(email, password);
        if (data.session) {
          onLoginSuccess(data.user);
        } else {
          setSuccessMessage('Registration successful! Please check your email for confirmation or sign in.');
          setIsSignUp(false);
        }
      } else {
        const data = await api.login(email, password);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0a1317] font-sans text-[#0a1317] dark:text-[#f1f4f7] h-screen w-screen overflow-hidden flex flex-col md:flex-row antialiased">
      {/* Left Side: Brand & Value Prop */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#0a1317] p-12 text-white border-r border-[#dee3e9]/10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 text-[#0a1317] shadow-sm">
            <span className="material-symbols-outlined text-[20px] font-bold">integration_instructions</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">specCraft.ai</span>
        </div>
        
        {/* Value Prop */}
        <div className="max-w-md my-auto">
          <h1 className="text-4xl font-bold text-white mb-6 leading-tight tracking-tight">
            Transform Ideas into Software Specifications
          </h1>
          <p className="text-sm text-slate-350 mb-8 leading-relaxed">
            The AI systems analyst for modern engineering teams. Design structured schemas, render architectural diagrams, and generate complete SRS documents.
          </p>
          <ul className="space-y-6">
            <li className="flex items-start gap-3">
              <span className="text-[#0064e0] font-mono mt-0.5">→</span>
              <div>
                <span className="block font-bold text-white text-sm">Interactive Model Editing</span>
                <span className="block text-slate-400 text-xs mt-1 leading-relaxed">Refine and edit database attributes, relationships, and metadata directly in the workspace.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#0064e0] font-mono mt-0.5">→</span>
              <div>
                <span className="block font-bold text-white text-sm">PlantUML Diagram Generation</span>
                <span className="block text-slate-400 text-xs mt-1 leading-relaxed">Automatically render Entity-Relationship (ER), Class, and Use Case diagrams.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#0064e0] font-mono mt-0.5">→</span>
              <div>
                <span className="block font-bold text-white text-sm">SRS Document Export</span>
                <span className="block text-slate-400 text-xs mt-1 leading-relaxed">Compile comprehensive Software Requirements Specifications to Markdown or print-ready PDF.</span>
              </div>
            </li>
          </ul>
        </div>
        
        {/* Footer */}
        <div className="text-xs text-slate-500 font-mono">
          © 2026 SpecCraft AI Systems. All rights reserved.
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full md:w-1/2 bg-white dark:bg-[#0a1317] flex flex-col justify-center items-center p-6 md:p-12 h-full overflow-y-auto">
        {/* Mobile Logo */}
        <div className="flex md:hidden items-center gap-2 mb-8 self-start">
          <div className="w-9 h-9 rounded-full bg-[#0a1317] dark:bg-white flex items-center justify-center text-white dark:text-black">
            <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#0a1317] dark:text-white">specCraft.ai</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0a1317] dark:text-white mb-2 tracking-tight">Welcome to specCraft.ai</h2>
            <p className="text-slate-500 text-xs">Sign in or create your account to continue.</p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex border-b border-[#dee3e9] dark:border-[#ced0d4]/10 mb-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); setSuccessMessage(''); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all duration-200 ${!isSignUp ? 'border-[#0a1317] dark:border-white text-[#0a1317] dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); setSuccessMessage(''); }}
              className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all duration-200 ${isSignUp ? 'border-[#0a1317] dark:border-white text-[#0a1317] dark:text-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Create Account
            </button>
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
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider" htmlFor="email">Email Address</label>
              <input
                className="w-full bg-white dark:bg-[#1c1e21] text-[#0a1317] dark:text-[#f1f4f7] text-sm px-3 py-2.5 rounded-lg border border-[#ced0d4] dark:border-[#ced0d4]/15 focus:outline-none focus:border-[#1876f2] focus:ring-2 focus:ring-[#1876f2]/15 transition-all duration-200 placeholder-slate-400"
                id="email"
                placeholder="user@domain.com…"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider" htmlFor="password">Password</label>
              </div>
              <input
                className="w-full bg-white dark:bg-[#1c1e21] text-[#0a1317] dark:text-[#f1f4f7] text-sm px-3 py-2.5 rounded-lg border border-[#ced0d4] dark:border-[#ced0d4]/15 focus:outline-none focus:border-[#1876f2] focus:ring-2 focus:ring-[#1876f2]/15 transition-all duration-200 placeholder-slate-400"
                id="password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <button
                className="w-full bg-[#000000] dark:bg-white text-white dark:text-[#0a1317] hover:bg-[#444950] dark:hover:bg-[#f1f4f7] transition-all duration-200 py-3 px-4 rounded-full font-bold text-xs uppercase tracking-wider flex justify-center items-center gap-2 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Processing…' : isSignUp ? 'Create Account' : 'Sign In to Console'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>

          {/* Secure indicator */}
          <div className="mt-8 pt-6 border-t border-[#dee3e9] dark:border-[#ced0d4]/10 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#0a1317] px-3 text-slate-400 text-[10px] font-mono tracking-widest uppercase">
              Powered by Supabase
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    
    // Quick frontend email validation
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
    <div className="bg-surface font-sans text-on-surface h-screen w-screen overflow-hidden flex flex-col md:flex-row">
      {/* Left Side: Brand & Value Prop */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-black p-margin-desktop text-white">
        {/* Logo */}
        <div className="flex items-center gap-stack-sm">
          <div className="w-10 h-10 rounded bg-white flex items-center justify-center p-1 text-black">
            <span className="material-symbols-outlined text-[24px] font-bold">integration_instructions</span>
          </div>
          <span className="font-semibold text-2xl tracking-tight text-white">SpecCraft AI</span>
        </div>
        
        {/* Value Prop */}
        <div className="max-w-md my-auto">
          <h1 className="text-4xl font-bold text-white mb-stack-md leading-tight">
            Transform ideas into software specifications.
          </h1>
          <p className="text-lg text-slate-300 mb-stack-lg">
            The AI systems analyst for modern engineering teams. Generate structured data models, architecture diagrams, and SRS documents.
          </p>
          <ul className="space-y-stack-md mt-stack-lg">
            <li className="flex items-start gap-stack-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim mt-0.5">check_circle</span>
              <div>
                <span className="block font-semibold text-white">Interactive Model Editing</span>
                <span className="block text-slate-400 text-sm mt-1">Refine and edit database attributes, relationships, and metadata directly in the workspace.</span>
              </div>
            </li>
            <li className="flex items-start gap-stack-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim mt-0.5">account_tree</span>
              <div>
                <span className="block font-semibold text-white">PlantUML Diagram Generation</span>
                <span className="block text-slate-400 text-sm mt-1">Automatically render Entity-Relationship (ER), Class, and Use Case diagrams.</span>
              </div>
            </li>
            <li className="flex items-start gap-stack-sm">
              <span className="material-symbols-outlined text-primary-fixed-dim mt-0.5">description</span>
              <div>
                <span className="block font-semibold text-white">SRS Document Export</span>
                <span className="block text-slate-400 text-sm mt-1">Compile comprehensive Software Requirements Specifications to Markdown or print-ready PDF.</span>
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
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-margin-mobile md:p-margin-desktop h-full overflow-y-auto">
        {/* Mobile Logo */}
        <div className="flex md:hidden items-center gap-stack-sm mb-stack-lg self-start">
          <div className="w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
          </div>
          <span className="font-semibold text-xl tracking-tight text-on-surface">SpecCraft AI</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-stack-lg">
            <h2 className="text-2xl font-semibold text-on-surface mb-2">Welcome to SpecCraft AI</h2>
            <p className="text-on-surface-variant text-sm">Sign in or create your account to continue.</p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex border-b border-outline-variant mb-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); setSuccessMessage(''); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${!isSignUp ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); setSuccessMessage(''); }}
              className={`flex-1 pb-3 text-sm font-semibold text-center border-b-2 transition-colors ${isSignUp ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-stack-md text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-stack-md text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-stack-md">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-stack-sm" htmlFor="email">Email Address</label>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                id="email"
                placeholder="dev_user@speccraft.ai"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-stack-sm">
                <label className="block text-xs font-semibold text-on-surface" htmlFor="password">Password</label>
              </div>
              <input
                className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                id="password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="pt-stack-sm">
              <button
                className="w-full bg-[#2563eb] text-white hover:bg-[#004ac6] transition-colors py-2.5 px-4 rounded font-medium text-sm shadow-sm active:shadow-inner flex justify-center items-center gap-2 disabled:opacity-50"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </form>

          {/* Secure indicator */}
          <div className="mt-stack-lg pt-stack-lg border-t border-outline-variant relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-2 text-on-surface-variant text-[11px] font-mono tracking-wider uppercase">
              Powered by Supabase
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

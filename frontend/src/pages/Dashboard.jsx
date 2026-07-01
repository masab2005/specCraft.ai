import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const getDomainIcon = (domain) => {
  const d = (domain || '').toLowerCase();
  if (d.includes('health') || d.includes('medical') || d.includes('biotech') || d.includes('hospital')) return 'medical_services';
  if (d.includes('finance') || d.includes('bank') || d.includes('payment') || d.includes('invest') || d.includes('money')) return 'payments';
  if (d.includes('commerce') || d.includes('shop') || d.includes('retail') || d.includes('market') || d.includes('sale')) return 'shopping_bag';
  if (d.includes('educat') || d.includes('learn') || d.includes('school') || d.includes('course') || d.includes('class')) return 'school';
  if (d.includes('social') || d.includes('chat') || d.includes('meet') || d.includes('connect') || d.includes('forum')) return 'forum';
  if (d.includes('analytics') || d.includes('data') || d.includes('science') || d.includes('chart') || d.includes('metric')) return 'monitoring';
  return 'folder';
};

export default function Dashboard({ onCreateProjectClick, onProjectSelect, onLogout, theme, toggleTheme }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const user = api.getCurrentUser();

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects();
      setProjects(data.projects || []);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      setError(null);
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error(err);
      setError(err);
    }
  };

  const getErrorMessage = () => {
    if (!error) return '';
    return typeof error === 'string' ? error : error.message;
  };

  const isRateLimit = error && typeof error === 'object' && error.isRateLimit;

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a1317] flex flex-col font-sans antialiased text-[#0a1317] dark:text-[#f1f4f7]">
      {/* Header bar */}
      <header className="bg-white dark:bg-[#0a1317] border-b border-[#dee3e9] dark:border-[#ced0d4]/10 h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-sm">
            <span className="material-symbols-outlined text-[18px] font-bold">integration_instructions</span>
          </div>
          <span className="font-bold text-base text-[#0a1317] dark:text-white tracking-tight">specCraft.ai</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right mr-2">
            <span className="text-xs font-bold text-[#0a1317] dark:text-white">{user?.email}</span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-[#5d6c7b] dark:text-slate-400">Developer</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center p-2 rounded-full border border-[#ced0d4] dark:border-[#ced0d4]/15 bg-white dark:bg-[#1c1e21]"
            title="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[16px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 border border-[#ced0d4] dark:border-[#ced0d4]/15 px-3.5 py-2.5 rounded-full bg-white dark:bg-[#1c1e21]"
          >
            <span className="material-symbols-outlined text-[14px]">logout</span>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0a1317] dark:text-white tracking-tight">Projects Dashboard</h1>
            <p className="text-slate-500 text-xs mt-1">Select an existing project workspace or design a new one.</p>
          </div>

          <button
            onClick={onCreateProjectClick}
            className="bg-black dark:bg-white text-white dark:text-[#0a1317] hover:bg-[#444950] dark:hover:bg-[#f1f4f7] text-[10px] font-bold py-3 px-5 rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-colors uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create New Project
          </button>
        </div>

        {error && isRateLimit && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-xl mb-8 text-xs flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500 text-[20px] animate-pulse">hourglass_empty</span>
              <div>
                <strong className="block font-bold uppercase tracking-wider text-[10px]">Rate Limit Exceeded</strong>
                <span className="block mt-0.5">{getErrorMessage()}</span>
              </div>
            </div>
            <button onClick={fetchProjects} className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 hover:underline border border-amber-500/20 px-3 py-1.5 rounded-full bg-white dark:bg-[#1c1e21]">
              Retry
            </button>
          </div>
        )}

        {error && !isRateLimit && (
          <div className="bg-red-50/50 dark:bg-red-950/20 text-[#e41e3f] dark:text-red-400 px-4 py-3 rounded-lg mb-8 text-xs flex items-center justify-between border border-[#e41e3f]/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e41e3f] text-[18px]">error</span>
              <span>{getErrorMessage()}</span>
            </div>
            <button onClick={fetchProjects} className="text-xs font-bold underline hover:text-red-950">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#0064e0] dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Loading your projects…</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state - card-product-feature style */
          <div className="bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xxxl p-12 text-center max-w-xl mx-auto mt-10">
            <div className="w-14 h-14 bg-slate-50 dark:bg-[#0a1317] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
              <span className="material-symbols-outlined text-[28px]">folder_open</span>
            </div>
            <h3 className="text-base font-bold text-[#0a1317] dark:text-white mb-2 tracking-tight">No Projects Yet</h3>
            <p className="text-slate-500 text-xs mb-6 max-w-md mx-auto leading-relaxed">
              Get started by launching our step-by-step wizard. We'll help you configure entities, actors, and features.
            </p>
            <button
              onClick={onCreateProjectClick}
              className="bg-black dark:bg-white text-white dark:text-[#0a1317] hover:bg-[#444950] dark:hover:bg-[#f1f4f7] text-[10px] font-bold py-3 px-6 rounded-full inline-flex items-center gap-1.5 transition-colors uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[16px]">magic_button</span>
              Launch Creation Wizard
            </button>
          </div>
        ) : (
          /* Projects grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className="w-full bg-white/95 dark:bg-neutral-900/95 border border-slate-200/80 dark:border-neutral-800 rounded-3xl p-5 shadow-xl dark:shadow-2xl backdrop-blur space-y-4 hover:border-slate-300 dark:hover:border-neutral-700 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4 border-b border-slate-100 dark:border-neutral-800/70 pb-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700/50 text-slate-600 dark:text-neutral-300 shrink-0">
                      <span className="material-symbols-outlined text-[22px]">
                        {getDomainIcon(project.domain)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-neutral-50 truncate">
                        {project.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                          {project.domain}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          project.complexity?.toLowerCase() === 'simple'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-700 dark:text-[#31a24c]'
                            : project.complexity?.toLowerCase() === 'standard'
                            ? 'bg-[#0064e0]/10 border-[#0064e0]/20 text-[#0064e0] dark:bg-[#0064e0]/20 dark:border-[#0064e0]/30 dark:text-[#3b82f6]'
                            : 'bg-[#f2a918]/10 border-[#f2a918]/20 text-[#e09100] dark:bg-[#f2a918]/20 dark:border-[#f2a918]/30 dark:text-[#fbbf24]'
                        }`}>
                          {project.complexity}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="text-slate-400 hover:text-[#e41e3f] transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-800/50 flex items-center justify-center shrink-0"
                      title="Delete Project"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-5 leading-relaxed min-h-[6rem] overflow-hidden">
                    {project.description}
                  </p>

                  <div className="flex items-center justify-between text-center text-xs text-slate-600 dark:text-neutral-300 border-y border-slate-100 dark:border-neutral-800/70 py-3">
                    <div className="flex-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-500 font-semibold">
                        Actors
                      </p>
                      <p className="mt-1 text-slate-900 dark:text-neutral-50 font-medium">
                        {project.actors?.length || 0}
                      </p>
                    </div>
                    <div className="flex-1 border-x border-slate-100 dark:border-neutral-800/70">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-500 font-semibold">
                        Entities
                      </p>
                      <p className="mt-1 text-slate-900 dark:text-neutral-50 font-medium">
                        {project.entities?.length || 0}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-neutral-500 font-semibold">
                        Features
                      </p>
                      <p className="mt-1 text-slate-900 dark:text-neutral-50 font-medium">
                        {project.features?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onProjectSelect(project);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-[#0a1317] text-xs font-semibold tracking-wide uppercase transition-colors outline-none"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] font-semibold">arrow_right_alt</span>
                    <span>Enter Workspace</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center gap-2.5 text-[#e41e3f] mb-3">
              <span className="material-symbols-outlined text-[24px] font-bold">warning</span>
              <h3 className="text-base font-bold text-[#0a1317] dark:text-white tracking-tight">Delete Project?</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-[#0a1317] dark:text-white font-semibold">“{projectToDelete.name}”</strong>?
              This will permanently delete the project and all its specifications and diagram caches. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors py-2.5 px-4 border border-[#ced0d4] dark:border-[#ced0d4]/15 rounded-full bg-white dark:bg-[#1c1e21]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="bg-[#e41e3f] hover:bg-[#f0284a] text-white text-[10px] font-bold py-2.5 px-4 rounded-full transition-colors shadow-sm uppercase tracking-wider"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

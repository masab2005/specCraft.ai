import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Dashboard({ onCreateProjectClick, onProjectSelect, onLogout, theme, toggleTheme }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);
  const user = api.getCurrentUser();

  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listProjects();
      setProjects(data.projects || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load projects. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete project. Please try again.');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col font-sans antialiased text-[#171717] dark:text-white">
      {/* Header bar */}
      <header className="bg-white dark:bg-[#0a0a0a] shadow-vercel-border h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#171717] dark:bg-white flex items-center justify-center text-white dark:text-black">
            <span className="material-symbols-outlined text-[16px] font-bold">integration_instructions</span>
          </div>
          <span className="font-bold text-base text-[#171717] dark:text-white tracking-tight">SpecCraft AI Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right mr-2">
            <span className="text-xs font-semibold text-[#171717] dark:text-white">{user?.email}</span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">Developer</span>
          </div>

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center p-2 rounded-lg shadow-vercel-border bg-white dark:bg-[#171717]"
            title="Toggle Theme"
          >
            <span className="material-symbols-outlined text-[16px]">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          
          <button 
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 shadow-vercel-border px-2.5 py-2 rounded-lg bg-white dark:bg-[#171717]"
          >
            <span className="material-symbols-outlined text-[15px]">logout</span>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#171717] dark:text-white tracking-tighter">Projects Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Select an existing project workspace or design a new one.</p>
          </div>
          
          <button
            onClick={onCreateProjectClick}
            className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create New Project
          </button>
        </div>

        {error && (
          <div className="bg-red-50/50 text-red-700 px-4 py-3 rounded-lg mb-8 text-sm flex items-center justify-between shadow-vercel-border">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="text-xs underline hover:text-red-950">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#171717] dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-mono">Loading your projects…</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-12 text-center max-w-xl mx-auto mt-10">
            <div className="w-14 h-14 bg-slate-50 dark:bg-zinc-800 shadow-vercel-border rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
              <span className="material-symbols-outlined text-[28px]">folder_open</span>
            </div>
            <h3 className="text-base font-bold text-[#171717] dark:text-white mb-2 tracking-tight">No Projects Yet</h3>
            <p className="text-slate-500 text-xs mb-6 max-w-md mx-auto leading-relaxed">
              Get started by launching our step-by-step wizard. We'll help you configure entities, actors, and features.
            </p>
            <button
              onClick={onCreateProjectClick}
              className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-xs font-semibold py-2.5 px-5 rounded-lg inline-flex items-center gap-2 transition-colors uppercase tracking-wider"
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
                className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6 hover:shadow-vercel-card-hover cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4 w-full">
                    <div className="flex gap-1.5">
                      <span className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        {project.domain}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        project.complexity === 'Standard' 
                          ? 'bg-blue-50 dark:bg-blue-950/30 text-[#0a72ef] dark:text-blue-400' 
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {project.complexity}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="text-slate-400 hover:text-[#ff5b4f] transition-colors p-1 rounded hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-center"
                      title="Delete Project"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-[#171717] dark:text-white mb-2 line-clamp-1 tracking-tight">{project.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-3 mb-6 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-850 pt-4 flex justify-between items-center text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">groups</span>
                    {project.actors?.length || 0} Actors
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">account_tree</span>
                    {project.entities?.length || 0} Entities
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/35 dark:bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center gap-2.5 text-[#ff5b4f] mb-3">
              <span className="material-symbols-outlined text-[24px] font-bold">warning</span>
              <h3 className="text-base font-bold text-[#171717] dark:text-white tracking-tight">Delete Project?</h3>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-[#171717] dark:text-white font-semibold">“{projectToDelete.name}”</strong>? 
              This will permanently delete the project and all its specifications and diagram caches. This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-xs font-semibold text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors py-2 px-3 border border-transparent shadow-vercel-border rounded-lg bg-white dark:bg-[#171717]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="bg-[#ff5b4f] hover:bg-[#e04337] text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors shadow-sm"
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

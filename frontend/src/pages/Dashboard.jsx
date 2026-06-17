import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Dashboard({ onCreateProjectClick, onProjectSelect, onLogout }) {
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
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header bar */}
      <header className="bg-white border-b border-outline-variant h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">integration_instructions</span>
          </div>
          <span className="font-semibold text-lg text-on-surface tracking-tight">SpecCraft AI Workspace</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-semibold text-on-surface">{user?.email}</span>
            <span className="text-xs text-on-surface-variant">Developer Role</span>
          </div>
          
          <button 
            onClick={onLogout}
            className="text-xs text-secondary hover:text-primary transition-colors flex items-center gap-1 border border-outline-variant px-2.5 py-1.5 rounded"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface">Projects Dashboard</h1>
            <p className="text-on-surface-variant text-sm mt-1">Select an existing project workspace or design a new one.</p>
          </div>
          
          <button
            onClick={onCreateProjectClick}
            className="bg-[#2563eb] hover:bg-[#004ac6] text-white font-medium text-sm py-2.5 px-5 rounded flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create New Project
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              <span>{error}</span>
            </div>
            <button onClick={fetchProjects} className="text-xs underline hover:text-red-900">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-on-surface-variant">Loading your projects...</p>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="bg-white border border-outline-variant rounded-xl p-12 text-center max-w-xl mx-auto mt-10">
            <div className="w-16 h-16 bg-slate-50 border border-outline-variant rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
              <span className="material-symbols-outlined text-[36px]">folder_open</span>
            </div>
            <h3 className="text-lg font-semibold text-on-surface mb-2">No projects yet</h3>
            <p className="text-on-surface-variant text-sm mb-6 max-w-md mx-auto">
              Get started by launching our step-by-step wizard. We'll help you configure entities, actors, and features.
            </p>
            <button
              onClick={onCreateProjectClick}
              className="bg-[#2563eb] hover:bg-[#004ac6] text-white font-medium text-sm py-2.5 px-6 rounded inline-flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">magic_button</span>
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
                className="bg-white border border-outline-variant rounded-xl p-6 hover:shadow-md cursor-pointer transition-all hover:border-slate-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4 w-full">
                    <div className="flex gap-2">
                      <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded">
                        {project.domain}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        project.complexity === 'Standard' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {project.complexity}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-slate-50 flex items-center justify-center"
                      title="Delete Project"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-on-surface mb-2 line-clamp-1">{project.name}</h3>
                  <p className="text-on-surface-variant text-sm line-clamp-3 mb-6 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <div className="border-t border-outline-variant pt-4 flex justify-between items-center text-xs text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">groups</span>
                    {project.actors?.length || 0} Actors
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">account_tree</span>
                    {project.entities?.length || 0} Entities
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Custom Professional Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-2xl max-w-md w-full p-6 shadow-xl animate-fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <h3 className="text-lg font-bold text-on-surface">Delete Project?</h3>
            </div>
            
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-on-surface font-semibold">"{projectToDelete.name}"</strong>? 
              This will permanently delete the project and all its specifications and diagram caches. This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-xs font-semibold text-secondary hover:text-slate-800 transition-colors py-2.5 px-4 border border-outline-variant rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm"
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

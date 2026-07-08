import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Wizard from './pages/Wizard';
import Workspace from './pages/Workspace';
import Artifacts from './pages/Artifacts';
import ResetPassword from './pages/ResetPassword';

function App() {
  const [view, setView] = useState('auth'); // auth, dashboard, wizard, workspace, artifacts
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSpecification, setSelectedSpecification] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Synchronize theme class with documentElement
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Check user session on boot and register unauthorized listener
  useEffect(() => {
    // Check if redirecting from a password recovery link
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
      setView('reset-password');
      return;
    }

    const currentUser = api.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setView('dashboard');
    } else {
      setView('auth');
    }

    const handleUnauthorized = () => {
      setUser(null);
      setSelectedProject(null);
      setSelectedSpecification(null);
      setView('auth');
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setSelectedProject(null);
    setSelectedSpecification(null);
    setView('auth');
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setView('workspace');
  };

  const handleProjectCreated = (newProject) => {
    setSelectedProject(newProject);
    setView('workspace');
  };

  const handleGoToArtifacts = (spec) => {
    setSelectedSpecification(spec);
    setView('artifacts');
  };

  return (
    <div className="min-h-screen bg-background">
      {view === 'auth' && (
        <Auth onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'reset-password' && (
        <ResetPassword onResetSuccess={() => setView('auth')} />
      )}
      
      {view === 'dashboard' && (
        <Dashboard 
          onCreateProjectClick={() => setView('wizard')}
          onProjectSelect={handleProjectSelect}
          onLogout={handleLogout}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
      
      {view === 'wizard' && (
        <Wizard 
          onCancel={() => setView('dashboard')}
          onProjectCreated={handleProjectCreated}
        />
      )}
      
      {view === 'workspace' && (
        <Workspace 
          project={selectedProject}
          onBack={() => {
            setSelectedProject(null);
            setView('dashboard');
          }}
          onGoToArtifacts={handleGoToArtifacts}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {view === 'artifacts' && (
        <Artifacts 
          specification={selectedSpecification}
          project={selectedProject}
          onBack={() => {
            setSelectedSpecification(null);
            setView('workspace');
          }}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;

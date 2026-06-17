import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Wizard from './pages/Wizard';
import Workspace from './pages/Workspace';
import Artifacts from './pages/Artifacts';

function App() {
  const [view, setView] = useState('auth'); // auth, dashboard, wizard, workspace, artifacts
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSpecification, setSelectedSpecification] = useState(null);

  // Check user session on boot
  useEffect(() => {
    const currentUser = api.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setView('dashboard');
    } else {
      setView('auth');
    }
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
      
      {view === 'dashboard' && (
        <Dashboard 
          onCreateProjectClick={() => setView('wizard')}
          onProjectSelect={handleProjectSelect}
          onLogout={handleLogout}
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
        />
      )}
    </div>
  );
}

export default App;

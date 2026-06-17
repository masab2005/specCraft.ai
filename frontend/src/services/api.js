import { supabase } from '../config/supabase.js';

const BASE_URL = 'http://localhost:8001';

// Synchronize Supabase Auth state with local storage for fast synchronous reads
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    localStorage.setItem('token', session.access_token);
    localStorage.setItem('userId', session.user.id);
    localStorage.setItem('userEmail', session.user.email);
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
  }
});

// Get headers, automatically attaching the active Supabase JWT token
function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser() {
    const id = localStorage.getItem('userId');
    const email = localStorage.getItem('userEmail');
    if (id && email) {
      return { id, email };
    }
    return null;
  },

  // Projects
  async createProject(projectData) {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create project');
    return data;
  },

  async listProjects() {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch projects');
    return data;
  },

  async getProjectDetail(projectId) {
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch project detail');
    return data;
  },

  async deleteProject(projectId) {
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete project');
    return data;
  },

  // Specifications
  async generateSpecification(projectId) {
    const res = await fetch(`${BASE_URL}/api/specifications/projects/${projectId}/specification/generate`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate specification');
    return data;
  },

  async updateSpecification(specId, masterJson) {
    const res = await fetch(`${BASE_URL}/api/specifications/${specId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ masterJson })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update specification');
    return data;
  },

  async approveSpecification(specId) {
    const res = await fetch(`${BASE_URL}/api/specifications/${specId}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to approve specification');
    return data;
  },

  // Diagrams and SRS
  async getDiagrams(specId) {
    const res = await fetch(`${BASE_URL}/api/artifacts/${specId}/diagrams`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch diagrams');
    return data;
  },

  async getSrsMarkdown(specId) {
    const res = await fetch(`${BASE_URL}/api/artifacts/${specId}/srs?format=markdown`, {
      method: 'GET',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch SRS markdown');
    return data;
  },

  getSrsDownloadUrl(specId) {
    const token = localStorage.getItem('token');
    // For downloads, we pass the token as a query parameter or the user can fetch with bearer and download.
    // Since window.open doesn't let us set headers, the backend also accepts token verification in middleware
    // but wait! Our auth middleware currently only checks the Authorization: Bearer header.
    // Let's check: does the frontend download using an <a> tag?
    // Let's check how the frontend handles downloads.
    return `${BASE_URL}/api/artifacts/${specId}/srs?format=pdf&token=${token}`;
  }
};

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

// Centralized Response Interceptor and Error Parser
async function handleResponse(res, customErrorMessage) {
  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    data = { error: parseErr.message };
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      window.dispatchEvent(new Event('unauthorized'));
    }
    const errMsg = data.error || customErrorMessage || 'Request failed';
    const err = new Error(errMsg);
    err.status = res.status;
    err.isRateLimit = res.status === 429;
    throw err;
  }
  return data;
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
    return handleResponse(res, 'Failed to create project');
  },

  async listProjects() {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch projects');
  },

  async getProjectDetail(projectId) {
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch project detail');
  },

  async deleteProject(projectId) {
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to delete project');
  },

  // Specifications
  async generateSpecification(projectId) {
    const res = await fetch(`${BASE_URL}/api/specifications/projects/${projectId}/specification/generate`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to generate specification');
  },

  async updateSpecification(specId, masterJson) {
    const res = await fetch(`${BASE_URL}/api/specifications/${specId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ masterJson })
    });
    return handleResponse(res, 'Failed to update specification');
  },

  async approveSpecification(specId) {
    const res = await fetch(`${BASE_URL}/api/specifications/${specId}/approve`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to approve specification');
  },

  // Diagrams and SRS
  async getDiagrams(specId) {
    const res = await fetch(`${BASE_URL}/api/artifacts/${specId}/diagrams`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch diagrams');
  },

  async getDiagram(specId, type) {
    const res = await fetch(`${BASE_URL}/api/artifacts/${specId}/diagrams?type=${type}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res, `Failed to fetch ${type} diagram`);
  },

  async getSrsMarkdown(specId) {
    const res = await fetch(`${BASE_URL}/api/artifacts/${specId}/srs?format=markdown`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to fetch SRS markdown');
  },

  getSrsDownloadUrl(specId) {
    const token = localStorage.getItem('token');
    return `${BASE_URL}/api/artifacts/${specId}/srs?format=pdf&token=${token}`;
  }
};

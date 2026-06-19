import React, { useState } from 'react';
import { api } from '../services/api';

// Helper to sanitize weird names and special characters
const sanitizeInput = (input, typeName) => {
  if (!input) return '';
  let sanitized = input.trim();
  if (typeName === 'entities' || typeName === 'actors') {
    // Keep only alphanumeric characters, spaces, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s-_]/g, '');
  } else if (typeName === 'features' || typeName === 'attributes') {
    // Keep alphanumeric, spaces, hyphens, underscores, dots, and commas
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s-_.,]/g, '');
  }
  return sanitized.replace(/\s+/g, ' ').trim();
};

export default function Wizard({ onCancel, onProjectCreated }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('Healthcare');
  const [complexity, setComplexity] = useState('Standard');
  
  // Lists
  const [actors, setActors] = useState(['Patient', 'Doctor', 'Admin']);
  const [features, setFeatures] = useState(['Appointment Booking', 'Prescription Writing']);
  const [entities, setEntities] = useState(['Patient', 'Doctor', 'Appointment']);
  
  // Individual input field text states
  const [actorInput, setActorInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [entityInput, setEntityInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to add tag with safety limits, duplicate checks, and sanitization
  const addTag = (input, list, setList, setInput, limit, typeName) => {
    const sanitized = sanitizeInput(input, typeName);
    if (!sanitized) {
      setError(`Input for ${typeName} must contain valid alphanumeric characters.`);
      return;
    }
    
    const isDuplicate = list.some(item => item.trim().toLowerCase() === sanitized.toLowerCase());
    if (isDuplicate) {
      setError(`"${sanitized}" is already in the list.`);
      return;
    }
    
    if (list.length >= limit) {
      setError(`Maximum of ${limit} ${typeName} allowed to ensure AI model accuracy.`);
      return;
    }
    setError('');
    setList([...list, sanitized]);
    setInput('');
  };

  // Helper to remove tag
  const removeTag = (tagToRemove, list, setList) => {
    setList(list.filter(item => item !== tagToRemove));
  };

  const handleNext = () => {
    if (step === 1 && (!name.trim() || !description.trim())) {
      setError('Please provide a project name and description.');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const projectData = {
        name,
        description,
        domain,
        complexity,
        actors,
        features,
        entities
      };
      const data = await api.createProject(projectData);
      onProjectCreated(data.project);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-outline-variant h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">magic_button</span>
          </div>
          <span className="font-semibold text-lg text-on-surface">New Project Wizard</span>
        </div>
        <button onClick={onCancel} className="text-sm text-secondary hover:text-on-surface transition-colors">
          Cancel & Exit
        </button>
      </header>

      {/* Wizard Card Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        {/* Stepper Header */}
        <div className="flex items-center justify-between mb-10 px-4">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s 
                    ? 'bg-[#2563eb] text-white ring-4 ring-blue-100' 
                    : step > s 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {step > s ? (
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  ) : s}
                </div>
                <span className={`text-[11px] font-semibold mt-2 tracking-wide uppercase ${
                  step === s ? 'text-[#2563eb]' : 'text-on-surface-variant'
                }`}>
                  {s === 1 ? 'Project Info' : s === 2 ? 'Actors' : s === 3 ? 'Features' : 'Entities'}
                </span>
              </div>
              {s < 4 && <div className={`flex-1 h-0.5 mx-2 -mt-6 ${step > s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Project Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-on-surface mb-1">Project Metadata</h2>
                <p className="text-on-surface-variant text-sm">Define your project name and core description.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-2" htmlFor="name">Project Name</label>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    id="name"
                    placeholder="e.g. HealthTrack Clinic System"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-2" htmlFor="description">Description</label>
                  <textarea
                    rows={4}
                    className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all leading-relaxed"
                    id="description"
                    placeholder="Explain what the software system does, its goal, and workflows..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-2" htmlFor="domain">Domain / Industry</label>
                    <select
                      id="domain"
                      className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    >
                      <option>Healthcare</option>
                      <option>E-commerce</option>
                      <option>Fintech</option>
                      <option>Logistics</option>
                      <option>SaaS Developer Tool</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-2" htmlFor="complexity">System Complexity</label>
                    <select
                      id="complexity"
                      className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value)}
                    >
                      <option>Standard</option>
                      <option>High Complexity</option>
                      <option>Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Actors */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-on-surface mb-1">Define User Roles (Actors)</h2>
                <p className="text-on-surface-variant text-sm">Specify the actors/users who interact with this system.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type actor name (e.g. Doctor) and press Add"
                    type="text"
                    value={actorInput}
                    onChange={(e) => setActorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(actorInput, actors, setActors, setActorInput, 8, 'actors')}
                  />
                  <button
                    onClick={() => addTag(actorInput, actors, setActors, setActorInput, 8, 'actors')}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 rounded"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {actors.map(actor => (
                    <span key={actor} className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      {actor}
                      <button onClick={() => removeTag(actor, actors, setActors)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                      </button>
                    </span>
                  ))}
                  {actors.length === 0 && (
                    <p className="text-xs text-on-surface-variant italic">No actors defined yet. Add at least one.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Features */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-on-surface mb-1">Define System Features</h2>
                <p className="text-on-surface-variant text-sm">List the main functional modules or features the AI should analyze.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type feature name (e.g. Invoice Billing) and press Add"
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(featureInput, features, setFeatures, setFeatureInput, 12, 'features')}
                  />
                  <button
                    onClick={() => addTag(featureInput, features, setFeatures, setFeatureInput, 12, 'features')}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 rounded"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {features.map(feat => (
                    <span key={feat} className="bg-[#eeefff] border border-blue-100 text-[#004ac6] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      {feat}
                      <button onClick={() => removeTag(feat, features, setFeatures)} className="text-blue-400 hover:text-blue-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                      </button>
                    </span>
                  ))}
                  {features.length === 0 && (
                    <p className="text-xs text-on-surface-variant italic">No features defined yet. Add at least one.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Entities */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-on-surface mb-1">Core Database Entities</h2>
                <p className="text-on-surface-variant text-sm">Identify the primary tables or entities of your database.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Type entity name (e.g. Invoice) and press Add"
                    type="text"
                    value={entityInput}
                    onChange={(e) => setEntityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(entityInput, entities, setEntities, setEntityInput, 15, 'entities')}
                  />
                  <button
                    onClick={() => addTag(entityInput, entities, setEntities, setEntityInput, 15, 'entities')}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 rounded"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {entities.map(ent => (
                    <span key={ent} className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      {ent}
                      <button onClick={() => removeTag(ent, entities, setEntities)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                      </button>
                    </span>
                  ))}
                  {entities.length === 0 && (
                    <p className="text-xs text-on-surface-variant italic">No entities defined yet. Add at least one.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons Controls */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={step === 1 ? onCancel : handleBack}
            className="text-sm font-semibold text-secondary hover:text-on-surface transition-colors py-2 px-4 border border-outline-variant rounded"
            disabled={loading}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2 px-5 rounded flex items-center gap-1.5 shadow-sm transition-colors"
            >
              Next Step
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-[#2563eb] hover:bg-[#004ac6] text-white text-sm font-semibold py-2.5 px-6 rounded flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              disabled={loading || actors.length === 0 || features.length === 0 || entities.length === 0}
            >
              {loading ? 'Creating Project...' : 'Finish & Submit'}
              <span className="material-symbols-outlined text-[18px]">magic_button</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

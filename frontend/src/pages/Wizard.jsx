import React, { useState } from 'react';
import { api } from '../services/api';

const sanitizeInput = (input, typeName) => {
  if (!input) return '';
  let sanitized = input.trim();
  if (typeName === 'entities' || typeName === 'actors') {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s-_]/g, '');
  } else if (typeName === 'features' || typeName === 'attributes') {
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
  
  const [actors, setActors] = useState(['Patient', 'Doctor', 'Admin']);
  const [features, setFeatures] = useState(['Appointment Booking', 'Prescription Writing']);
  const [entities, setEntities] = useState(['Patient', 'Doctor', 'Appointment']);
  
  const [actorInput, setActorInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [entityInput, setEntityInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addTag = (input, list, setList, setInput, limit, typeName) => {
    const sanitized = sanitizeInput(input, typeName);
    if (!sanitized) {
      setError(`Input for ${typeName} must contain valid alphanumeric characters.`);
      return;
    }
    
    const isDuplicate = list.some(item => item.trim().toLowerCase() === sanitized.toLowerCase());
    if (isDuplicate) {
      setError(`“${sanitized}” is already in the list.`);
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
    <div className="min-h-screen bg-white font-sans flex flex-col justify-between antialiased text-[#171717]">
      {/* Header */}
      <header className="bg-white shadow-vercel-border h-16 flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#171717] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[16px] font-bold">magic_button</span>
          </div>
          <span className="font-bold text-base text-[#171717] tracking-tight">New Project Wizard</span>
        </div>
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-black transition-colors font-semibold">
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
                    ? 'bg-[#171717] text-white ring-4 ring-slate-100' 
                    : step > s 
                      ? 'bg-slate-800 text-white' 
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {step > s ? (
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  ) : s}
                </div>
                <span className={`text-[10px] font-bold mt-2 tracking-wider uppercase ${
                  step === s ? 'text-[#171717]' : 'text-slate-400'
                }`}>
                  {s === 1 ? 'Project Info' : s === 2 ? 'Actors' : s === 3 ? 'Features' : 'Entities'}
                </span>
              </div>
              {s < 4 && <div className={`flex-1 h-[1px] mx-2 -mt-6 ${step > s ? 'bg-slate-800' : 'bg-slate-100'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white shadow-vercel-card rounded-xl p-8">
          {error && (
            <div className="bg-red-50/50 text-red-700 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 shadow-vercel-border border border-transparent">
              <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Project Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#171717] mb-1 tracking-tight">Project Metadata</h2>
                <p className="text-slate-500 text-xs">Define your project name and core description.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider" htmlFor="name">Project Name</label>
                  <input
                    className="w-full bg-white text-[#171717] text-[16px] px-3 py-2.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400"
                    id="name"
                    placeholder="e.g. HealthTrack Clinic System…"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2" htmlFor="description">Description</label>
                  <textarea
                    rows={4}
                    className="w-full bg-white text-[#171717] text-[16px] px-3 py-2.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400 leading-relaxed"
                    id="description"
                    placeholder="Explain what the software system does, its goal, and workflows…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider" htmlFor="domain">Domain / Industry</label>
                    <select
                      id="domain"
                      className="w-full bg-white text-[#171717] text-[16px] px-3 py-2.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200"
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
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider" htmlFor="complexity">System Complexity</label>
                    <select
                      id="complexity"
                      className="w-full bg-white text-[#171717] text-[16px] px-3 py-2.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200"
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
                <h2 className="text-lg font-bold text-[#171717] mb-1 tracking-tight">Define User Roles (Actors)</h2>
                <p className="text-slate-500 text-xs">Specify the actors/users who interact with this system.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white text-[#171717] text-[16px] px-3 py-2 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400"
                    placeholder="Type actor name (e.g. Doctor) and press Enter…"
                    type="text"
                    value={actorInput}
                    onChange={(e) => setActorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(actorInput, actors, setActors, setActorInput, 8, 'actors')}
                  />
                  <button
                    onClick={() => addTag(actorInput, actors, setActors, setActorInput, 8, 'actors')}
                    className="bg-[#171717] hover:bg-[#333333] text-white text-xs font-semibold px-4 rounded-lg shadow-sm transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {actors.map(actor => (
                    <span key={actor} className="bg-slate-50 text-[#171717] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-vercel-border">
                      {actor}
                      <button onClick={() => removeTag(actor, actors, setActors)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[13px] font-bold">close</span>
                      </button>
                    </span>
                  ))}
                  {actors.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No actors defined yet. Add at least one.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Features */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#171717] mb-1 tracking-tight">Define System Features</h2>
                <p className="text-slate-500 text-xs">List the main functional modules or features the AI should analyze.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white text-[#171717] text-[16px] px-3 py-2 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400"
                    placeholder="Type feature name (e.g. Invoice Billing) and press Enter…"
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(featureInput, features, setFeatures, setFeatureInput, 12, 'features')}
                  />
                  <button
                    onClick={() => addTag(featureInput, features, setFeatures, setFeatureInput, 12, 'features')}
                    className="bg-[#171717] hover:bg-[#333333] text-white text-xs font-semibold px-4 rounded-lg shadow-sm transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {features.map(feat => (
                    <span key={feat} className="bg-slate-50 text-[#0a72ef] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-vercel-border">
                      {feat}
                      <button onClick={() => removeTag(feat, features, setFeatures)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[13px] font-bold">close</span>
                      </button>
                    </span>
                  ))}
                  {features.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No features defined yet. Add at least one.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Entities */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#171717] mb-1 tracking-tight">Core Database Entities</h2>
                <p className="text-slate-500 text-xs">Identify the primary tables or entities of your database.</p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white text-[#171717] text-[16px] px-3 py-2 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400"
                    placeholder="Type entity name (e.g. Invoice) and press Enter…"
                    type="text"
                    value={entityInput}
                    onChange={(e) => setEntityInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(entityInput, entities, setEntities, setEntityInput, 15, 'entities')}
                  />
                  <button
                    onClick={() => addTag(entityInput, entities, setEntities, setEntityInput, 15, 'entities')}
                    className="bg-[#171717] hover:bg-[#333333] text-white text-xs font-semibold px-4 rounded-lg shadow-sm transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {entities.map(ent => (
                    <span key={ent} className="bg-slate-50 text-[#171717] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-vercel-border">
                      {ent}
                      <button onClick={() => removeTag(ent, entities, setEntities)} className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        <span className="material-symbols-outlined text-[13px] font-bold">close</span>
                      </button>
                    </span>
                  ))}
                  {entities.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No entities defined yet. Add at least one.</p>
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
            className="text-xs font-semibold text-slate-500 hover:text-black transition-colors py-2 px-3 border border-transparent shadow-vercel-border rounded-lg bg-white"
            disabled={loading}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="bg-[#171717] hover:bg-[#333333] text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors uppercase tracking-wider"
            >
              Next Step
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="bg-[#171717] hover:bg-[#333333] text-white text-xs font-semibold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 uppercase tracking-wider"
              disabled={loading || actors.length === 0 || features.length === 0 || entities.length === 0}
            >
              {loading ? 'Creating Project…' : 'Finish & Submit'}
              <span className="material-symbols-outlined text-[16px]">magic_button</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

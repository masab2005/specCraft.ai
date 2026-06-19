import React, { useEffect, useState } from 'react';
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

export default function Workspace({ project, onBack, onGoToArtifacts, theme, toggleTheme }) {
  const [specification, setSpecification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [editedAttributes, setEditedAttributes] = useState({});
  const [editedRelationships, setEditedRelationships] = useState([]);
  
  const [newAttrInputs, setNewAttrInputs] = useState({});
  
  const [newRelSource, setNewRelSource] = useState('');
  const [newRelTarget, setNewRelTarget] = useState('');
  const [newRelType, setNewRelType] = useState('one-to-many');
  const [newRelLabel, setNewRelLabel] = useState('');

  const [hasChanges, setHasChanges] = useState(false);

  const fetchSpec = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProjectDetail(project.id);
      if (data.specification) {
        setSpecification(data.specification);
        setEditedAttributes(data.specification.masterJson.attributes || {});
        setEditedRelationships(data.specification.masterJson.relationships || []);
        
        if (project.entities?.length > 0) {
          setNewRelSource(project.entities[0]);
          setNewRelTarget(project.entities[0]);
        }
        setLoading(false);
      } else {
        setGenLoading(true);
        try {
          const genData = await api.generateSpecification(project.id);
          setSpecification(genData.specification);
          setEditedAttributes(genData.specification.masterJson.attributes || {});
          setEditedRelationships(genData.specification.masterJson.relationships || []);
          if (project.entities?.length > 0) {
            setNewRelSource(project.entities[0]);
            setNewRelTarget(project.entities[0]);
          }
        } catch (genErr) {
          console.error(genErr);
          setError(genErr.message || 'Auto-generation of specification model failed.');
        } finally {
          setGenLoading(false);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load project details.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpec();
  }, [project.id]);

  const handleGenerate = async () => {
    setGenLoading(true);
    setError('');
    try {
      const data = await api.generateSpecification(project.id);
      setSpecification(data.specification);
      setEditedAttributes(data.specification.masterJson.attributes || {});
      setEditedRelationships(data.specification.masterJson.relationships || []);
      if (project.entities?.length > 0) {
        setNewRelSource(project.entities[0]);
        setNewRelTarget(project.entities[0]);
      }
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenLoading(false);
    }
  };

  const handleAddAttribute = (entity) => {
    const input = newAttrInputs[entity];
    const sanitized = sanitizeInput(input, 'attributes');
    if (!sanitized) {
      setError(`Attribute field must contain valid alphanumeric characters.`);
      return;
    }
    
    const currentAttrs = editedAttributes[entity] || [];
    
    const isDuplicate = currentAttrs.some(a => a.trim().toLowerCase() === sanitized.toLowerCase());
    if (isDuplicate) {
      setError(`“${sanitized}” is already added to the attributes of ${entity}.`);
      return;
    }

    if (currentAttrs.length >= 15) {
      setError(`Maximum of 15 attributes allowed per entity to ensure AI model stability.`);
      return;
    }

    setError('');
    const updated = {
      ...editedAttributes,
      [entity]: [...currentAttrs, sanitized]
    };
    
    setEditedAttributes(updated);
    setNewAttrInputs({ ...newAttrInputs, [entity]: '' });
    setHasChanges(true);
  };

  const handleRemoveAttribute = (entity, attrToRemove) => {
    const currentAttrs = editedAttributes[entity] || [];
    const updated = {
      ...editedAttributes,
      [entity]: currentAttrs.filter(a => a !== attrToRemove)
    };
    setEditedAttributes(updated);
    setHasChanges(true);
  };

  const handleAddRelationship = () => {
    if (!newRelSource || !newRelTarget || !newRelLabel.trim()) return;

    const newRel = {
      source: newRelSource,
      target: newRelTarget,
      type: newRelType,
      label: newRelLabel.trim()
    };

    setEditedRelationships([...editedRelationships, newRel]);
    setNewRelLabel('');
    setHasChanges(true);
  };

  const handleRemoveRelationship = (index) => {
    setEditedRelationships(editedRelationships.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError('');
    try {
      const updatedMasterJson = {
        ...specification.masterJson,
        attributes: editedAttributes,
        relationships: editedRelationships
      };

      const data = await api.updateSpecification(specification.id, updatedMasterJson);
      setSpecification(data.specification);
      setEditedAttributes(data.specification.masterJson.attributes || {});
      setEditedRelationships(data.specification.masterJson.relationships || []);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save edits.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproveLoading(true);
    setError('');
    try {
      const data = await api.approveSpecification(specification.id);
      setSpecification(data.specification);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Approval failed.');
    } finally {
      setApproveLoading(false);
    }
  };

  if (loading || genLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col font-sans antialiased text-[#171717] dark:text-white">
        {/* Header bar */}
        <header className="bg-white dark:bg-[#0a0a0a] shadow-vercel-border h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Dashboard
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />
            <span className="font-bold text-sm text-[#171717] dark:text-white tracking-tight">{project.name}</span>
          </div>
        </header>
        
        <main className="flex-1 flex flex-col justify-center items-center py-20 gap-6">
          <div className="w-12 h-12 border-2 border-[#171717] dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
          <div className="text-center max-w-sm px-4">
            <h3 className="font-bold text-[#171717] dark:text-white text-base tracking-tight">
              {genLoading ? "Generating Base Data Model…" : "Loading Workspace Details…"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Our AI models are designing database schemas, identifying attributes, and analyzing relationships based on your wizard input. This might take 5-10 seconds.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col font-sans antialiased text-[#171717] dark:text-white">
      {/* Header bar */}
      <header className="bg-white dark:bg-[#0a0a0a] shadow-vercel-border h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </button>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />
          <span className="font-bold text-sm text-[#171717] dark:text-white tracking-tight">{project.name}</span>
        </div>

        {specification && (
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              specification.approvalStatus === 'approved' 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 shadow-vercel-border' 
                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-vercel-border'
            }`}>
              {specification.approvalStatus}
            </span>

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

            {specification.approvalStatus === 'approved' ? (
              <button
                onClick={() => onGoToArtifacts(specification)}
                className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1 transition-colors uppercase tracking-wider"
              >
                Go to Artifacts
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleApprove}
                disabled={approveLoading || hasChanges}
                className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 uppercase tracking-wider"
              >
                {approveLoading ? 'Approving…' : 'Approve Specification'}
                <span className="material-symbols-outlined text-[15px]">verified</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10 flex flex-col justify-start">
        {error && (
          <div className="bg-red-50/50 text-red-700 p-3 rounded-lg mb-8 text-sm flex items-center gap-2 shadow-vercel-border">
            <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {hasChanges && (
          <div className="bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-slate-200 p-4 rounded-xl mb-8 text-xs flex justify-between items-center shadow-vercel-card">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0a72ef] text-[18px]">info</span>
              <span>You have unsaved manual edits. Click Save to apply validation and cache resets.</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors uppercase tracking-wider"
            >
              {saveLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {!specification ? (
          /* Failed to generate state - show retry options */
          <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-12 text-center max-w-xl mx-auto mt-10 animate-fade-in">
            <div className="w-14 h-14 bg-red-50 dark:bg-zinc-800 shadow-vercel-border rounded-full flex items-center justify-center mx-auto mb-6 text-[#ff5b4f]">
              <span className="material-symbols-outlined text-[28px]">error</span>
            </div>
            <h3 className="text-base font-bold text-[#171717] dark:text-white mb-2 tracking-tight">Generation Failed</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 max-w-md mx-auto leading-relaxed">
              Something went wrong while communicating with our AI models. Ready to retry generating your schemas, attributes, and relationships?
            </p>
            <button
              onClick={handleGenerate}
              className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 font-semibold text-xs py-2.5 px-5 rounded-lg inline-flex items-center gap-2 transition-colors uppercase tracking-wider shadow-sm"
            >
              Retry Generation
              <span className="material-symbols-outlined text-[15px]">refresh</span>
            </button>
          </div>
        ) : (
          /* Workspace layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Project Info Summary (Read only) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6">
                <h3 className="font-bold text-[#171717] dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800 text-xs uppercase tracking-wider">
                  Project Info
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Description</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">{project.description}</p>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Domain & Complexity</span>
                    <p className="text-xs text-[#171717] dark:text-white mt-1">{project.domain} — {project.complexity}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6">
                <h3 className="font-bold text-[#171717] dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800 text-xs uppercase tracking-wider">
                  Wizard Parameters
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Actors</span>
                    <div className="flex flex-wrap gap-1">
                      {project.actors?.map(a => (
                        <span key={a} className="bg-slate-50 dark:bg-zinc-800 text-[#171717] dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-vercel-border">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Target Features</span>
                    <div className="flex flex-wrap gap-1">
                      {project.features?.map(f => (
                        <span key={f} className="bg-slate-50 dark:bg-zinc-850 text-[#0a72ef] dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded shadow-vercel-border">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Manual Editor (Interactive attributes and relationships) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Attributes Editor */}
              <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <h3 className="font-bold text-[#171717] dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">table_rows</span>
                    Attributes Editor
                  </h3>
                  <span className="text-[10px] text-slate-400 italic">Add/remove fields on entities</span>
                </div>

                <div className="space-y-6">
                  {project.entities?.map(entity => (
                    <div key={entity} className="shadow-vercel-border rounded-lg p-4 bg-slate-50/20 dark:bg-zinc-900/20">
                      <h4 className="font-bold text-xs text-[#171717] dark:text-white mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">grid_on</span>
                        {entity}
                      </h4>
                      
                      {/* Attributes tags list */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(editedAttributes[entity] || []).map(attr => (
                          <span key={attr} className="bg-white dark:bg-zinc-900 text-[#171717] dark:text-slate-200 text-xs px-2.5 py-1 rounded shadow-vercel-border flex items-center gap-1">
                            {attr}
                            <button 
                              onClick={() => handleRemoveAttribute(entity, attr)}
                              className="text-slate-400 hover:text-[#ff5b4f] font-bold ml-1 text-sm focus:outline-none"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(editedAttributes[entity] || []).length === 0 && (
                          <span className="text-xs text-slate-400 italic">No fields. Type below to add.</span>
                        )}
                      </div>

                      {/* Add attribute input */}
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-white dark:bg-black text-[#171717] dark:text-white text-[16px] px-2.5 py-1.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400"
                          placeholder={`Add field to ${entity}…`}
                          type="text"
                          value={newAttrInputs[entity] || ''}
                          onChange={(e) => setNewAttrInputs({ ...newAttrInputs, [entity]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAttribute(entity)}
                        />
                        <button
                          onClick={() => handleAddAttribute(entity)}
                          className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-[10px] font-bold px-3 rounded-lg uppercase tracking-wider shadow-sm transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relationships Editor */}
              <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <h3 className="font-bold text-[#171717] dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">family_history</span>
                    Relationships Editor
                  </h3>
                  <span className="text-[10px] text-slate-400 italic">Connect entities together</span>
                </div>

                {/* Relationships list */}
                <div className="space-y-3 mb-6">
                  {editedRelationships.map((rel, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50 shadow-vercel-border rounded-lg px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#171717] dark:text-white">{rel.source}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({rel.type})</span>
                        <span className="text-[10px] text-[#0a72ef] dark:text-blue-400 font-semibold border-b border-dashed border-blue-200 dark:border-blue-900">
                          {rel.label}
                        </span>
                        <span className="material-symbols-outlined text-[12px] text-slate-400">arrow_forward</span>
                        <span className="font-bold text-[#171717] dark:text-white">{rel.target}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleRemoveRelationship(index)}
                        className="text-slate-400 hover:text-[#ff5b4f] flex items-center p-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}

                  {editedRelationships.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      No relationships defined yet. Create one below.
                    </p>
                  )}
                </div>

                {/* Add relationship form */}
                <div className="shadow-vercel-border rounded-lg p-4 bg-slate-50/10 dark:bg-zinc-900/10 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Add New Relationship Link</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source Entity</label>
                      <select
                        className="w-full bg-white dark:bg-black text-[#171717] dark:text-white text-[16px] px-2.5 py-1.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200"
                        value={newRelSource}
                        onChange={(e) => setNewRelSource(e.target.value)}
                      >
                        {project.entities?.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Relationship Type</label>
                      <select
                        className="w-full bg-white dark:bg-black text-[#171717] dark:text-white text-[16px] px-2.5 py-1.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200"
                        value={newRelType}
                        onChange={(e) => setNewRelType(e.target.value)}
                      >
                        <option value="one-to-many">one-to-many (1:N)</option>
                        <option value="many-to-many">many-to-many (N:M)</option>
                        <option value="one-to-one">one-to-one (1:1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Entity</label>
                      <select
                        className="w-full bg-white dark:bg-black text-[#171717] dark:text-white text-[16px] px-2.5 py-1.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200"
                        value={newRelTarget}
                        onChange={(e) => setNewRelTarget(e.target.value)}
                      >
                        {project.entities?.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Connection Label</label>
                      <input
                        className="w-full bg-white dark:bg-black text-[#171717] dark:text-white text-[16px] px-3 py-1.5 rounded shadow-vercel-input focus:outline-none focus:shadow-vercel-input-focus transition-all duration-200 placeholder-slate-400"
                        placeholder="e.g. schedules, creates, contains…"
                        type="text"
                        value={newRelLabel}
                        onChange={(e) => setNewRelLabel(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleAddRelationship}
                      className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors uppercase tracking-wider"
                    >
                      Link Entities
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

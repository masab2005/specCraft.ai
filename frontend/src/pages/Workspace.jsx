import React, { useEffect, useState } from 'react';
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

export default function Workspace({ project, onBack, onGoToArtifacts }) {
  const [specification, setSpecification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Edited values state
  const [editedAttributes, setEditedAttributes] = useState({});
  const [editedRelationships, setEditedRelationships] = useState([]);
  
  // Local inputs for adding new attributes
  const [newAttrInputs, setNewAttrInputs] = useState({});
  
  // Local inputs for adding a new relationship
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
        
        // Initialize default selects
        if (project.entities?.length > 0) {
          setNewRelSource(project.entities[0]);
          setNewRelTarget(project.entities[0]);
        }
        setLoading(false);
      } else {
        // Automatically trigger specification generation!
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

  // Add attribute manually with safety limits, duplicate validation, and sanitization
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
      setError(`"${sanitized}" is already added to the attributes of ${entity}.`);
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

  // Remove attribute manually
  const handleRemoveAttribute = (entity, attrToRemove) => {
    const currentAttrs = editedAttributes[entity] || [];
    const updated = {
      ...editedAttributes,
      [entity]: currentAttrs.filter(a => a !== attrToRemove)
    };
    setEditedAttributes(updated);
    setHasChanges(true);
  };

  // Add relationship manually
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

  // Remove relationship manually
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
      <div className="min-h-screen bg-background flex flex-col font-sans">
        {/* Header bar */}
        <header className="bg-white border-b border-outline-variant h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-secondary hover:text-on-surface transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Back to Dashboard
            </button>
            <div className="h-6 w-px bg-outline-variant" />
            <span className="font-semibold text-lg text-on-surface tracking-tight">{project.name}</span>
          </div>
        </header>
        
        <main className="flex-1 flex flex-col justify-center items-center py-20 gap-6">
          <div className="w-16 h-16 bg-slate-50 border border-outline-variant rounded-full flex items-center justify-center text-[#7C3AED] relative">
            <div className="absolute inset-0 rounded-full border-4 border-t-[#7C3AED] border-slate-100 animate-spin"></div>
            <span className="material-symbols-outlined text-[28px] animate-pulse">psychology</span>
          </div>
          <div className="text-center max-w-sm px-4">
            <h3 className="font-bold text-on-surface text-base">
              {genLoading ? "Generating Base Data Model..." : "Loading Workspace Details..."}
            </h3>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
              Our AI models are designing database schemas, identifying attributes, and analyzing relationships based on your wizard input. This might take 5-10 seconds.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header bar */}
      <header className="bg-white border-b border-outline-variant h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-secondary hover:text-on-surface transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Dashboard
          </button>
          <div className="h-6 w-px bg-outline-variant" />
          <span className="font-semibold text-lg text-on-surface tracking-tight">{project.name}</span>
        </div>

        {specification && (
          <div className="flex items-center gap-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
              specification.approvalStatus === 'approved' 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-orange-100 text-orange-800'
            }`}>
              {specification.approvalStatus}
            </span>

            {specification.approvalStatus === 'approved' ? (
              <button
                onClick={() => onGoToArtifacts(specification)}
                className="bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-1.5 transition-colors"
              >
                Go to Artifacts
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleApprove}
                disabled={approveLoading || hasChanges}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-4 rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {approveLoading ? 'Approving...' : 'Approve Specification'}
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-12 py-10 flex flex-col justify-start">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">error</span>
            <span>{error}</span>
          </div>
        )}

        {hasChanges && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-8 text-sm flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">info</span>
              <span>You have unsaved manual edits. Click Save to apply validation and cache resets.</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="bg-[#2563eb] hover:bg-[#004ac6] text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1 transition-colors"
            >
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {!specification ? (
          /* Failed to generate state - show retry options */
          <div className="bg-white border border-outline-variant rounded-xl p-12 text-center max-w-xl mx-auto mt-10 shadow-sm animate-fade-in">
            <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <span className="material-symbols-outlined text-[36px]">error</span>
            </div>
            <h3 className="text-lg font-semibold text-on-surface mb-2">Generation Failed</h3>
            <p className="text-on-surface-variant text-sm mb-6 max-w-md mx-auto">
              Something went wrong while communicating with our AI models. Ready to retry generating your schemas, attributes, and relationships?
            </p>
            <button
              onClick={handleGenerate}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold text-sm py-2.5 px-6 rounded inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              Retry Generation
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        ) : (
          /* Workspace layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Project Info Summary (Read only) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-outline-variant rounded-xl p-6">
                <h3 className="font-bold text-on-surface mb-4 pb-2 border-b border-outline-variant text-sm uppercase tracking-wide">
                  Project Info
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-on-surface-variant font-semibold">Description</span>
                    <p className="text-sm text-on-surface leading-relaxed mt-1">{project.description}</p>
                  </div>
                  
                  <div>
                    <span className="text-xs text-on-surface-variant font-semibold">Domain & Complexity</span>
                    <p className="text-sm text-on-surface mt-1">{project.domain} — {project.complexity}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-outline-variant rounded-xl p-6">
                <h3 className="font-bold text-on-surface mb-4 pb-2 border-b border-outline-variant text-sm uppercase tracking-wide">
                  Wizard Parameters
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-on-surface-variant font-semibold block mb-2">Actors</span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.actors?.map(a => (
                        <span key={a} className="bg-slate-100 text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-on-surface-variant font-semibold block mb-2">Target Features</span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.features?.map(f => (
                        <span key={f} className="bg-blue-50 text-[#004ac6] text-[11px] font-semibold px-2.5 py-1 rounded">
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
              <div className="bg-white border border-outline-variant rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
                  <h3 className="font-bold text-on-surface text-sm uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">table_rows</span>
                    Attributes Editor
                  </h3>
                  <span className="text-xs text-on-surface-variant italic">Add/remove fields on entities</span>
                </div>

                <div className="space-y-6">
                  {project.entities?.map(entity => (
                    <div key={entity} className="border border-outline-variant rounded-lg p-4 bg-slate-50/50">
                      <h4 className="font-bold text-sm text-on-surface mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-slate-500">grid_on</span>
                        {entity}
                      </h4>
                      
                      {/* Attributes tags list */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(editedAttributes[entity] || []).map(attr => (
                          <span key={attr} className="bg-white border border-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                            {attr}
                            <button 
                              onClick={() => handleRemoveAttribute(entity, attr)}
                              className="text-slate-400 hover:text-red-500 font-bold ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(editedAttributes[entity] || []).length === 0 && (
                          <span className="text-xs text-on-surface-variant italic">No fields. Type below to add.</span>
                        )}
                      </div>

                      {/* Add attribute input */}
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-white border border-outline-variant rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder={`Add field to ${entity}...`}
                          type="text"
                          value={newAttrInputs[entity] || ''}
                          onChange={(e) => setNewAttrInputs({ ...newAttrInputs, [entity]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAttribute(entity)}
                        />
                        <button
                          onClick={() => handleAddAttribute(entity)}
                          className="bg-slate-700 hover:bg-slate-800 text-white text-[11px] font-semibold px-3 rounded"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Relationships Editor */}
              <div className="bg-white border border-outline-variant rounded-xl p-6">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-variant">
                  <h3 className="font-bold text-on-surface text-sm uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">family_history</span>
                    Relationships Editor
                  </h3>
                  <span className="text-xs text-on-surface-variant italic">Connect entities together</span>
                </div>

                {/* Relationships list */}
                <div className="space-y-3 mb-6">
                  {editedRelationships.map((rel, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 border border-outline-variant rounded-lg px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-on-surface">{rel.source}</span>
                        <span className="text-xs text-slate-400">({rel.type})</span>
                        <span className="text-xs text-primary font-semibold border-b border-dashed border-blue-200">
                          {rel.label}
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                        <span className="font-bold text-on-surface">{rel.target}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleRemoveRelationship(index)}
                        className="text-slate-400 hover:text-red-500 flex items-center p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}

                  {editedRelationships.length === 0 && (
                    <p className="text-xs text-on-surface-variant italic text-center py-4">
                      No relationships defined yet. Create one below.
                    </p>
                  )}
                </div>

                {/* Add relationship form */}
                <div className="border border-outline-variant rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-700">Add New Relationship Link</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Source Entity</label>
                      <select
                        className="w-full bg-white border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
                        value={newRelSource}
                        onChange={(e) => setNewRelSource(e.target.value)}
                      >
                        {project.entities?.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Relationship Type</label>
                      <select
                        className="w-full bg-white border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
                        value={newRelType}
                        onChange={(e) => setNewRelType(e.target.value)}
                      >
                        <option value="one-to-many">one-to-many (1:N)</option>
                        <option value="many-to-many">many-to-many (N:M)</option>
                        <option value="one-to-one">one-to-one (1:1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Target Entity</label>
                      <select
                        className="w-full bg-white border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
                        value={newRelTarget}
                        onChange={(e) => setNewRelTarget(e.target.value)}
                      >
                        {project.entities?.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Connection Label</label>
                      <input
                        className="w-full bg-white border border-outline-variant rounded px-3 py-1.5 text-xs focus:outline-none"
                        placeholder="e.g. schedules, creates, contains"
                        type="text"
                        value={newRelLabel}
                        onChange={(e) => setNewRelLabel(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleAddRelationship}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm"
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

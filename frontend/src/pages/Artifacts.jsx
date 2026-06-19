import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Artifacts({ specification, project, onBack }) {
  const [diagrams, setDiagrams] = useState(null);
  const [activeTab, setActiveTab] = useState('er'); // er, class, usecase, srs
  const [srsMarkdown, setSrsMarkdown] = useState('');
  const [error, setError] = useState('');

  // Sequential loading states
  const [genActive, setGenActive] = useState(true);
  const [genSteps, setGenSteps] = useState([
    { id: 'er', label: 'Entity Relationship Diagram', desc: 'Mapping database tables, key attributes, and associations.', status: 'pending' },
    { id: 'class', label: 'Class Diagram', desc: 'Defining system classes, properties, and structural boundaries.', status: 'pending' },
    { id: 'usecase', label: 'Use Case Diagram', desc: 'Structuring system actors, use cases, and functional scope.', status: 'pending' },
    { id: 'srs', label: 'SRS Document Compilation', desc: 'Compiling overview, features list, and non-functional requirements.', status: 'pending' }
  ]);

  const startGenerationFlow = async () => {
    setGenActive(true);
    setError('');
    
    // Reset steps status to pending
    setGenSteps([
      { id: 'er', label: 'Entity Relationship Diagram', desc: 'Mapping database tables, key attributes, and associations.', status: 'pending' },
      { id: 'class', label: 'Class Diagram', desc: 'Defining system classes, properties, and structural boundaries.', status: 'pending' },
      { id: 'usecase', label: 'Use Case Diagram', desc: 'Structuring system actors, use cases, and functional scope.', status: 'pending' },
      { id: 'srs', label: 'SRS Document Compilation', desc: 'Compiling overview, features list, and non-functional requirements.', status: 'pending' }
    ]);

    const stepsList = ['er', 'class', 'usecase', 'srs'];

    for (let i = 0; i < stepsList.length; i++) {
      const currentId = stepsList[i];
      
      // Set current step to running
      setGenSteps(prev => prev.map(s => s.id === currentId ? { ...s, status: 'running' } : s));

      try {
        const startTime = Date.now();
        if (currentId === 'srs') {
          const srsData = await api.getSrsMarkdown(specification.id);
          setSrsMarkdown(srsData.markdown || '');
        } else {
          await api.getDiagram(specification.id, currentId);
        }

        // Add a small delay for smooth visual transition if API is instant (cached)
        const elapsed = Date.now() - startTime;
        if (elapsed < 600) {
          await new Promise(resolve => setTimeout(resolve, 600 - elapsed));
        }

        // Mark current step as completed
        setGenSteps(prev => prev.map(s => s.id === currentId ? { ...s, status: 'completed' } : s));
      } catch (err) {
        console.error(`Failed at step ${currentId}:`, err);
        setGenSteps(prev => prev.map(s => s.id === currentId ? { ...s, status: 'failed' } : s));
        setError(err.message || `Failed to generate ${currentId}. Please try again.`);
        return; // stop execution
      }
    }

    // Small delay before deactivating loader
    await new Promise(resolve => setTimeout(resolve, 500));

    // Finally, load all diagrams in memory for tab rendering
    try {
      const data = await api.getDiagrams(specification.id);
      setDiagrams(data.diagrams || null);
    } catch (err) {
      console.error(err);
      setError('Failed to load completed diagram models.');
      return;
    }

    setGenActive(false);
  };

  useEffect(() => {
    startGenerationFlow();
  }, [specification.id]);

  const downloadUrl = api.getSrsDownloadUrl(specification.id);

  // Helper to format inline bold text
  const renderLineWithFormatting = (line) => {
    const parts = line.split('**');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} className="font-bold text-slate-900">{part}</strong>;
      }
      return part;
    });
  };

  // Basic markdown renderer for previewing
  const renderSimpleMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-2xl font-bold text-slate-950 mt-6 mb-4 pb-2 border-b border-slate-200">
            {renderLineWithFormatting(trimmed.substring(2))}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-xl font-bold text-slate-900 mt-5 mb-3">
            {renderLineWithFormatting(trimmed.substring(3))}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-bold text-slate-800 mt-4 mb-2">
            {renderLineWithFormatting(trimmed.substring(4))}
          </h3>
        );
      }
      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-6 list-disc text-sm text-slate-700 my-1.5">
            {renderLineWithFormatting(trimmed.substring(2))}
          </li>
        );
      }
      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-6 list-decimal text-sm text-slate-700 my-1.5">
            {renderLineWithFormatting(numMatch[2])}
          </li>
        );
      }
      // Empty line
      if (!trimmed) {
        return <div key={idx} className="h-3" />;
      }
      // Normal paragraph
      return (
        <p key={idx} className="text-sm text-slate-700 leading-relaxed my-2">
          {renderLineWithFormatting(line)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header bar */}
      <header className="bg-white border-b border-outline-variant h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-secondary hover:text-on-surface transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            Back to Workspace
          </button>
          <div className="h-6 w-px bg-outline-variant" />
          <span className="font-semibold text-lg text-on-surface tracking-tight">Artifacts Center</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-12 py-10">
        {genActive ? (
          /* Redesigned Loader Screen with step-by-step progress checklist */
          <div className="max-w-2xl mx-auto bg-white border border-outline-variant rounded-xl p-8 md:p-12 shadow-sm animate-fade-in mt-6">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary relative">
                <span className="material-symbols-outlined text-[28px] animate-pulse">insights</span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface">Generating System Artifacts</h2>
              <p className="text-on-surface-variant text-sm mt-2 max-w-md mx-auto">
                Our AI models are translating your approved system specification into interactive diagrams and requirement documentation.
              </p>
            </div>

            {/* Checklist of steps */}
            <div className="space-y-4 mb-8">
              {genSteps.map((step, idx) => {
                const isPending = step.status === 'pending';
                const isRunning = step.status === 'running';
                const isCompleted = step.status === 'completed';
                const isFailed = step.status === 'failed';

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 p-4 border rounded-xl transition-all duration-300 ${
                      isRunning 
                        ? 'border-primary bg-blue-50/20 shadow-sm' 
                        : isCompleted
                        ? 'border-emerald-200 bg-emerald-50/10'
                        : isFailed
                        ? 'border-red-200 bg-red-50/10'
                        : 'border-slate-100 bg-white/50'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isPending && (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 text-xs font-semibold">
                          {idx + 1}
                        </div>
                      )}
                      {isRunning && (
                        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      )}
                      {isCompleted && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                        </div>
                      )}
                    </div>

                    {/* Step details */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-semibold transition-colors ${
                        isRunning ? 'text-primary' : isFailed ? 'text-red-700' : 'text-on-surface'
                      }`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wider">
                      {isPending && <span className="text-slate-400">Waiting</span>}
                      {isRunning && <span className="text-primary animate-pulse">Generating...</span>}
                      {isCompleted && <span className="text-emerald-600">Completed</span>}
                      {isFailed && <span className="text-red-600">Failed</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error Message & Retry */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 flex-shrink-0">error</span>
                  <span>{error}</span>
                </div>
                <button
                  onClick={startGenerationFlow}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1 transition-colors flex-shrink-0 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  Retry Generation
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{
                  width: `${(genSteps.filter(s => s.status === 'completed').length / genSteps.length) * 100}%`
                }}
              />
            </div>
          </div>
        ) : (
          /* Existing output screen */
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-on-surface">System Architecture & Diagrams</h1>
              <p className="text-on-surface-variant text-sm mt-1">
                View generated diagram models based on your finalized entities and actors, or preview/download the complete SRS document.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Column: Selector Tabs */}
              <div className="lg:col-span-1 space-y-2">
                <button
                  onClick={() => setActiveTab('er')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'er' 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white border border-outline-variant text-secondary hover:bg-slate-50'
                  }`}
                >
                  <span>Entity Relationship (ER)</span>
                  <span className="material-symbols-outlined text-[16px]">database</span>
                </button>

                <button
                  onClick={() => setActiveTab('class')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'class' 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white border border-outline-variant text-secondary hover:bg-slate-50'
                  }`}
                >
                  <span>Class Diagram</span>
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>

                <button
                  onClick={() => setActiveTab('usecase')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'usecase' 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white border border-outline-variant text-secondary hover:bg-slate-50'
                  }`}
                >
                  <span>Use Case Diagram</span>
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                </button>

                <button
                  onClick={() => setActiveTab('srs')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'srs' 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'bg-white border border-outline-variant text-secondary hover:bg-slate-50'
                  }`}
                >
                  <span>SRS Document</span>
                  <span className="material-symbols-outlined text-[16px]">description</span>
                </button>

                <div className="bg-slate-50 border border-outline-variant rounded-xl p-4 mt-6">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Caching Info</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    These artifacts are stored securely in Supabase. Editing the specification via the workspace will invalidate this cache and auto-regenerate fresh diagrams.
                  </p>
                </div>
              </div>

              {/* Right Column: Preview & Source Code */}
              <div className="lg:col-span-3 space-y-6">
                {activeTab === 'srs' ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-outline-variant">
                        <div>
                          <h3 className="font-bold text-on-surface text-base uppercase tracking-wide">
                            Software Requirements Specification (SRS)
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">
                            Preview the complete requirement specifications for {project.name}.
                          </p>
                        </div>
                        <a
                          href={downloadUrl}
                          download={`srs_${specification.id}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-semibold py-2.5 px-4 rounded flex items-center gap-1.5 transition-colors shadow-sm self-stretch md:self-auto justify-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                          Download SRS PDF
                        </a>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-6 border border-outline-variant max-h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                        {renderSimpleMarkdown(srsMarkdown)}
                      </div>
                    </div>
                  </div>
                ) : diagrams ? (
                  <>
                    {/* Diagram Preview Card */}
                    <div className="bg-white border border-outline-variant rounded-xl p-6 flex flex-col justify-center items-center shadow-sm">
                      <h3 className="font-bold text-on-surface text-sm uppercase tracking-wide mb-6 self-start pb-2 border-b border-outline-variant w-full">
                        {activeTab === 'er' ? 'ER Diagram Model' : activeTab === 'class' ? 'Class Model' : 'Use Case Model'}
                      </h3>
                      
                      <div className="bg-slate-50 rounded-lg p-6 border border-outline-variant max-w-full overflow-auto flex items-center justify-center min-h-[300px] w-full">
                        <img
                          src={diagrams[activeTab]?.url}
                          alt={`${activeTab} diagram`}
                          className="max-h-[500px] object-contain shadow-sm bg-white p-4"
                        />
                      </div>
                    </div>

                    {/* Raw PlantUML Source Code */}
                    <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
                        <h4 className="text-slate-200 text-xs font-semibold uppercase tracking-wider">
                          PlantUML Source Code
                        </h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(diagrams[activeTab]?.plantuml);
                            alert('Copied to clipboard!');
                          }}
                          className="text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          Copy Code
                        </button>
                      </div>

                      <pre className="font-mono text-slate-300 text-xs overflow-auto bg-slate-900/50 p-4 rounded-lg leading-relaxed max-h-[200px]">
                        {diagrams[activeTab]?.plantuml}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-on-surface-variant italic bg-white border border-outline-variant rounded-xl">
                    No diagrams generated yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Artifacts({ specification, project, onBack, theme, toggleTheme }) {
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
        return <strong key={idx} className="font-bold text-[#171717] dark:text-white">{part}</strong>;
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
          <h1 key={idx} className="text-xl font-bold text-[#171717] dark:text-white mt-6 mb-4 pb-2 border-b border-slate-100 dark:border-zinc-800 tracking-tight">
            {renderLineWithFormatting(trimmed.substring(2))}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-bold text-[#171717] dark:text-white mt-5 mb-3 tracking-tight">
            {renderLineWithFormatting(trimmed.substring(3))}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2 tracking-tight">
            {renderLineWithFormatting(trimmed.substring(4))}
          </h3>
        );
      }
      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-6 list-disc text-xs text-slate-600 dark:text-slate-400 my-1.5 leading-relaxed">
            {renderLineWithFormatting(trimmed.substring(2))}
          </li>
        );
      }
      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-6 list-decimal text-xs text-slate-600 dark:text-slate-400 my-1.5 leading-relaxed">
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
        <p key={idx} className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed my-2">
          {renderLineWithFormatting(line)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col font-sans antialiased text-[#171717] dark:text-white">
      {/* Header bar */}
      <header className="bg-white dark:bg-[#0a0a0a] shadow-vercel-border h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Workspace
          </button>
          <div className="h-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />
          <span className="font-bold text-sm text-[#171717] dark:text-white tracking-tight">Artifacts Center</span>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 md:px-12 py-10">
        {genActive ? (
          /* Redesigned Loader Screen with step-by-step progress checklist */
          <div className="max-w-2xl mx-auto bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-8 md:p-12 mt-6">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-800 shadow-vercel-border rounded-full flex items-center justify-center mx-auto mb-4 text-[#171717] dark:text-white relative">
                <span className="material-symbols-outlined text-[24px] animate-pulse">insights</span>
              </div>
              <h2 className="text-xl font-bold text-[#171717] dark:text-white tracking-tight">Generating System Artifacts</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-md mx-auto leading-relaxed">
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
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 ${
                      isRunning 
                        ? 'bg-slate-50/50 dark:bg-zinc-900/50 shadow-vercel-border shadow-vercel-input-focus' 
                        : isCompleted
                        ? 'bg-slate-50/20 dark:bg-zinc-900/20 shadow-vercel-border'
                        : isFailed
                        ? 'bg-red-50/10 shadow-vercel-border'
                        : 'bg-white dark:bg-[#171717] shadow-vercel-border'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isPending && (
                        <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-300 dark:text-zinc-600 text-xs font-bold font-mono">
                          {idx + 1}
                        </div>
                      )}
                      {isRunning && (
                        <div className="w-6 h-6 rounded-full border-2 border-[#171717] dark:border-white border-t-transparent dark:border-t-transparent animate-spin" />
                      )}
                      {isCompleted && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/20 text-[#ff5b4f] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                        </div>
                      )}
                    </div>

                    {/* Step details */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold transition-colors uppercase tracking-wider ${
                        isRunning ? 'text-[#0a72ef] dark:text-blue-400' : isFailed ? 'text-red-700' : 'text-[#171717] dark:text-white'
                      }`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider">
                      {isPending && <span className="text-slate-400">Waiting</span>}
                      {isRunning && <span className="text-[#0a72ef] dark:text-blue-400 animate-pulse">Generating…</span>}
                      {isCompleted && <span className="text-emerald-700 dark:text-emerald-400">Completed</span>}
                      {isFailed && <span className="text-[#ff5b4f]">Failed</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error Message & Retry */}
            {error && (
              <div className="bg-red-50/50 text-red-700 p-4 rounded-xl text-xs mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-vercel-border">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 flex-shrink-0 text-[18px]">error</span>
                  <span>{error}</span>
                </div>
                <button
                  onClick={startGenerationFlow}
                  className="bg-[#171717] dark:bg-white text-white dark:text-black font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1 transition-colors flex-shrink-0 shadow-sm uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  Retry Generation
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div className="h-1 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#171717] dark:bg-white transition-all duration-500 ease-out"
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
              <h1 className="text-3xl font-extrabold text-[#171717] dark:text-white tracking-tighter">System Architecture & Diagrams</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                View generated diagram models based on your finalized entities and actors, or preview/download the complete SRS document.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Column: Selector Tabs */}
              <div className="lg:col-span-1 space-y-2">
                <button
                  onClick={() => setActiveTab('er')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'er' 
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' 
                      : 'bg-white dark:bg-[#171717] shadow-vercel-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span>Entity Relationship (ER)</span>
                  <span className="material-symbols-outlined text-[16px]">database</span>
                </button>

                <button
                  onClick={() => setActiveTab('class')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'class' 
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' 
                      : 'bg-white dark:bg-[#171717] shadow-vercel-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span>Class Diagram</span>
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>

                <button
                  onClick={() => setActiveTab('usecase')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'usecase' 
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' 
                      : 'bg-white dark:bg-[#171717] shadow-vercel-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span>Use Case Diagram</span>
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                </button>

                <button
                  onClick={() => setActiveTab('srs')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between ${
                    activeTab === 'srs' 
                      ? 'bg-[#171717] dark:bg-white text-white dark:text-black shadow-sm' 
                      : 'bg-white dark:bg-[#171717] shadow-vercel-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                  }`}
                >
                  <span>SRS Document</span>
                  <span className="material-symbols-outlined text-[16px]">description</span>
                </button>

                <div className="bg-slate-50/50 dark:bg-zinc-900/50 shadow-vercel-border rounded-xl p-4 mt-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Caching Info</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
                    These artifacts are stored securely in Supabase. Editing the specification via the workspace will invalidate this cache and auto-regenerate fresh diagrams.
                  </p>
                </div>
              </div>

              {/* Right Column: Preview & Source Code */}
              <div className="lg:col-span-3 space-y-6">
                {activeTab === 'srs' ? (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                          <h3 className="font-bold text-[#171717] dark:text-white text-sm uppercase tracking-wider">
                            Software Requirements Specification (SRS)
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            Preview the complete requirement specifications for {project.name}.
                          </p>
                        </div>
                        <a
                          href={downloadUrl}
                          download={`srs_${specification.id}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#171717] dark:bg-white text-white dark:text-black hover:bg-[#333333] dark:hover:bg-slate-200 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm self-stretch sm:self-auto justify-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Download SRS PDF
                        </a>
                      </div>

                      <div className="bg-slate-50/50 dark:bg-zinc-900/55 rounded-lg p-6 shadow-inner shadow-vercel-border max-h-[600px] overflow-y-auto leading-relaxed">
                        {renderSimpleMarkdown(srsMarkdown)}
                      </div>
                    </div>
                  </div>
                ) : diagrams ? (
                  <>
                    {/* Diagram Preview Card */}
                    <div className="bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl p-6 flex flex-col justify-center items-center">
                      <h3 className="font-bold text-[#171717] dark:text-white text-xs uppercase tracking-wider mb-6 self-start pb-2 border-b border-slate-100 dark:border-zinc-800 w-full">
                        {activeTab === 'er' ? 'ER Diagram Model' : activeTab === 'class' ? 'Class Model' : 'Use Case Model'}
                      </h3>
                      
                      <div className="bg-slate-50/50 dark:bg-zinc-900/55 rounded-lg p-6 shadow-inner shadow-vercel-border max-w-full overflow-auto flex items-center justify-center min-h-[300px] w-full">
                        <img
                          src={diagrams[activeTab]?.url}
                          alt={`${activeTab} diagram`}
                          className="max-h-[500px] object-contain shadow-sm bg-white dark:bg-zinc-900 p-4"
                        />
                      </div>
                    </div>

                    {/* Raw PlantUML Source Code */}
                    <div className="bg-[#171717] dark:bg-black text-white rounded-xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                        <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
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

                      <pre className="font-mono text-slate-300 text-xs overflow-auto bg-black dark:bg-[#171717] p-4 rounded-lg leading-relaxed max-h-[200px]">
                        {diagrams[activeTab]?.plantuml}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-400 italic bg-white dark:bg-[#171717] shadow-vercel-card rounded-xl">
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

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Artifacts({ specification, project, onBack, theme, toggleTheme }) {
  const [diagrams, setDiagrams] = useState(null);
  const [activeTab, setActiveTab] = useState('er'); // er, class, usecase, srs
  const [srsMarkdown, setSrsMarkdown] = useState('');
  const [error, setError] = useState('');

  // Auto-retry and loading states for on-the-fly PlantUML image rendering
  const [retryKeys, setRetryKeys] = useState({});
  const [imageState, setImageState] = useState({}); // tab -> 'loading' | 'loaded' | 'error'

  const handleImageLoad = (tab) => {
    setImageState(prev => ({ ...prev, [tab]: 'loaded' }));
  };

  const handleImageError = (tab) => {
    const retries = retryKeys[tab] || 0;
    if (retries < 6) {
      setImageState(prev => ({ ...prev, [tab]: 'loading' }));
      setTimeout(() => {
        setRetryKeys(prev => ({
          ...prev,
          [tab]: retries + 1
        }));
      }, 1500);
    } else {
      setImageState(prev => ({ ...prev, [tab]: 'error' }));
    }
  };

  useEffect(() => {
    if (diagrams && diagrams[activeTab]) {
      if (imageState[activeTab] !== 'loaded') {
        setImageState(prev => ({ ...prev, [activeTab]: 'loading' }));
      }
    }
  }, [activeTab, diagrams]);

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
    <div className="min-h-screen bg-white dark:bg-[#0a1317] flex flex-col font-sans antialiased text-[#0a1317] dark:text-[#f1f4f7]">
      {/* Header bar */}
      <header className="bg-white dark:bg-[#0a1317] border-b border-[#dee3e9] dark:border-[#ced0d4]/10 h-16 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack} 
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1 border border-[#ced0d4] dark:border-[#ced0d4]/15 px-3 py-2 rounded-full bg-white dark:bg-[#1c1e21]"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </button>
          <div className="h-4 w-[1px] bg-[#dee3e9] dark:bg-[#ced0d4]/10 mx-2" />
          <span className="font-bold text-sm text-[#0a1317] dark:text-white tracking-tight">Artifacts Center</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center p-2 rounded-full border border-[#ced0d4] dark:border-[#ced0d4]/15 bg-white dark:bg-[#1c1e21]"
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
          <div className="max-w-2xl mx-auto bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-3xl p-8 md:p-12 mt-6">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-slate-50 dark:bg-[#0a1317] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#0064e0] relative">
                <span className="material-symbols-outlined text-[24px] animate-pulse">insights</span>
              </div>
              <h2 className="text-xl font-bold text-[#0a1317] dark:text-white tracking-tight">Generating System Artifacts</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
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
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-350 border ${
                      isRunning 
                        ? 'border-[#0064e0] bg-[#0064e0]/5' 
                        : isCompleted
                        ? 'border-[#dee3e9] dark:border-transparent bg-[#f1f4f7]/30 dark:bg-[#0a1317]/25'
                        : isFailed
                        ? 'border-[#e41e3f] bg-[#e41e3f]/5'
                        : 'border-[#dee3e9] dark:border-[#ced0d4]/10 bg-white dark:bg-[#1c1e21]'
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {isPending && (
                        <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-600 text-[10px] font-bold font-mono">
                          {idx + 1}
                        </div>
                      )}
                      {isRunning && (
                        <div className="w-6 h-6 rounded-full border-2 border-[#0064e0] border-t-transparent animate-spin" />
                      )}
                      {isCompleted && (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-[#31a24c] border border-emerald-500/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/20 text-[#e41e3f] border border-[#e41e3f]/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                        </div>
                      )}
                    </div>

                    {/* Step details */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold transition-colors uppercase tracking-wider ${
                        isRunning ? 'text-[#0064e0] dark:text-[#0091ff]' : isFailed ? 'text-[#e41e3f]' : 'text-[#0a1317] dark:text-white'
                      }`}>
                        {step.label}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider">
                      {isPending && <span className="text-slate-400">Waiting</span>}
                      {isRunning && <span className="text-[#0064e0] dark:text-[#0091ff] animate-pulse">Generating…</span>}
                      {isCompleted && <span className="text-[#31a24c]">Completed</span>}
                      {isFailed && <span className="text-[#e41e3f]">Failed</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Error Message & Retry */}
            {error && (
              <div className="bg-red-50/50 dark:bg-red-950/20 text-[#e41e3f] dark:text-red-400 p-4 rounded-xl text-xs mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#e41e3f]/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#e41e3f] flex-shrink-0 text-[18px]">error</span>
                  <span>{error}</span>
                </div>
                <button
                  onClick={startGenerationFlow}
                  className="bg-[#0064e0] hover:bg-[#0457cb] text-white font-bold text-[10px] py-2.5 px-4 rounded-full flex items-center gap-1 transition-colors flex-shrink-0 shadow-sm uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  Retry Generation
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div className="h-1 w-full bg-slate-100 dark:bg-[#0a1317] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0064e0] transition-all duration-500 ease-out"
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
              <h1 className="text-3xl font-bold text-[#0a1317] dark:text-white tracking-tight">System Architecture & Diagrams</h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                View generated diagram models based on your finalized entities and actors, or preview/download the complete SRS document.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Column: Selector Tabs */}
              <div className="lg:col-span-1 space-y-2.5">
                <button
                  onClick={() => setActiveTab('er')}
                  className={`w-full text-left px-4 py-3.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-between border ${
                    activeTab === 'er' 
                      ? 'bg-[#0a1317] dark:bg-white border-[#0a1317] dark:border-white text-white dark:text-[#0a1317] shadow-sm' 
                      : 'bg-white dark:bg-[#1c1e21] border-[#ced0d4] dark:border-[#ced0d4]/15 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#0a1317] hover:text-[#0a1317] dark:hover:text-white'
                  }`}
                >
                  <span>Entity Relationship (ER)</span>
                  <span className="material-symbols-outlined text-[16px]">database</span>
                </button>

                <button
                  onClick={() => setActiveTab('class')}
                  className={`w-full text-left px-4 py-3.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-between border ${
                    activeTab === 'class' 
                      ? 'bg-[#0a1317] dark:bg-white border-[#0a1317] dark:border-white text-white dark:text-[#0a1317] shadow-sm' 
                      : 'bg-white dark:bg-[#1c1e21] border-[#ced0d4] dark:border-[#ced0d4]/15 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#0a1317] hover:text-[#0a1317] dark:hover:text-white'
                  }`}
                >
                  <span>Class Diagram</span>
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>

                <button
                  onClick={() => setActiveTab('usecase')}
                  className={`w-full text-left px-4 py-3.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-between border ${
                    activeTab === 'usecase' 
                      ? 'bg-[#0a1317] dark:bg-white border-[#0a1317] dark:border-white text-white dark:text-[#0a1317] shadow-sm' 
                      : 'bg-white dark:bg-[#1c1e21] border-[#ced0d4] dark:border-[#ced0d4]/15 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#0a1317] hover:text-[#0a1317] dark:hover:text-white'
                  }`}
                >
                  <span>Use Case Diagram</span>
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                </button>

                <button
                  onClick={() => setActiveTab('srs')}
                  className={`w-full text-left px-4 py-3.5 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-between border ${
                    activeTab === 'srs' 
                      ? 'bg-[#0a1317] dark:bg-white border-[#0a1317] dark:border-white text-white dark:text-[#0a1317] shadow-sm' 
                      : 'bg-white dark:bg-[#1c1e21] border-[#ced0d4] dark:border-[#ced0d4]/15 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#0a1317] hover:text-[#0a1317] dark:hover:text-white'
                  }`}
                >
                  <span>SRS Document</span>
                  <span className="material-symbols-outlined text-[16px]">description</span>
                </button>

                <div className="bg-[#f1f4f7]/30 dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xl p-4 mt-6">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Caching Info</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    These artifacts are stored securely in Supabase. Editing the specification via the workspace will invalidate this cache and auto-regenerate fresh diagrams.
                  </p>
                </div>
              </div>

              {/* Right Column: Preview & Source Code */}
              <div className="lg:col-span-3 space-y-6">
                {activeTab === 'srs' ? (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xl p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-[#dee3e9] dark:border-[#ced0d4]/10">
                        <div>
                          <h3 className="font-bold text-[#0a1317] dark:text-white text-xs uppercase tracking-wider">
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
                          className="bg-[#0064e0] hover:bg-[#0457cb] text-white text-[10px] font-bold py-3 px-4 rounded-full flex items-center gap-1.5 transition-colors uppercase tracking-wider shadow-sm self-stretch sm:self-auto justify-center"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Download SRS PDF
                        </a>
                      </div>

                      <div className="bg-[#f1f4f7]/30 dark:bg-[#0a1317]/40 border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-lg p-6 max-h-[600px] overflow-y-auto leading-relaxed">
                        {renderSimpleMarkdown(srsMarkdown)}
                      </div>
                    </div>
                  </div>
                ) : diagrams ? (
                  <>
                    {/* Diagram Preview Card - card-product-feature style */}
                    <div className="bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xl p-6 flex flex-col justify-center items-center">
                      <h3 className="font-bold text-[#0a1317] dark:text-white text-[10px] uppercase tracking-wider mb-6 self-start pb-2 border-b border-[#dee3e9] dark:border-[#ced0d4]/10 w-full">
                        {activeTab === 'er' ? 'ER Diagram Model' : activeTab === 'class' ? 'Class Model' : 'Use Case Model'}
                      </h3>
                      
                      <div className="bg-[#f1f4f7]/30 dark:bg-[#0a1317]/40 border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-lg p-6 flex items-center justify-center min-h-[300px] w-full relative">
                        {diagrams[activeTab]?.url && (
                          <img
                            key={`${activeTab}-${retryKeys[activeTab] || 0}`}
                            src={`${diagrams[activeTab]?.url}${retryKeys[activeTab] ? `?retry=${retryKeys[activeTab]}` : ''}`}
                            alt={`${activeTab} diagram`}
                            onLoad={() => handleImageLoad(activeTab)}
                            onError={() => handleImageError(activeTab)}
                            className={`max-h-[500px] object-contain border border-[#dee3e9] dark:border-zinc-800 bg-white dark:bg-[#1c1e21] p-4 rounded-lg transition-opacity duration-300 ${
                              imageState[activeTab] === 'loaded' ? 'opacity-100' : 'opacity-0 absolute'
                            }`}
                          />
                        )}

                        {imageState[activeTab] === 'loading' && (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-[#0064e0] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-slate-500 font-medium dark:text-slate-400">Rendering preview on PlantUML server...</span>
                          </div>
                        )}

                        {imageState[activeTab] === 'error' && (
                          <div className="flex flex-col items-center gap-2 text-red-500 dark:text-red-400">
                            <span className="material-symbols-outlined text-[32px]">error_outline</span>
                            <span className="text-xs font-semibold">Failed to load diagram preview.</span>
                            <button
                              onClick={() => {
                                setRetryKeys(prev => ({ ...prev, [activeTab]: 0 }));
                                setImageState(prev => ({ ...prev, [activeTab]: 'loading' }));
                              }}
                              className="text-[10px] text-[#0064e0] hover:underline font-bold uppercase tracking-wider mt-2"
                            >
                              Retry Now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Raw PlantUML Source Code */}
                    <div className="bg-[#0a1317] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#dee3e9]/10">
                        <h4 className="text-white text-[10px] font-bold uppercase tracking-wider">
                          PlantUML Source Code
                        </h4>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(diagrams[activeTab]?.plantuml);
                            alert('Copied to clipboard!');
                          }}
                          className="text-white hover:text-slate-200 transition-colors text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                          Copy Code
                        </button>
                      </div>

                      <pre 
                        className="font-mono text-xs overflow-auto bg-[#1c1e21] p-4 rounded-lg leading-relaxed max-h-[200px]"
                        style={{ color: '#ffffff' }}
                      >
                        {diagrams[activeTab]?.plantuml}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-slate-400 italic bg-white dark:bg-[#1c1e21] border border-[#dee3e9] dark:border-[#ced0d4]/10 rounded-xl">
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

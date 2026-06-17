import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Artifacts({ specification, project, onBack }) {
  const [diagrams, setDiagrams] = useState(null);
  const [activeTab, setActiveTab] = useState('er'); // er, class, usecase, srs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // SRS state
  const [srsMarkdown, setSrsMarkdown] = useState('');
  const [srsLoading, setSrsLoading] = useState(false);
  const [srsError, setSrsError] = useState('');

  const fetchDiagrams = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDiagrams(specification.id);
      setDiagrams(data.diagrams || null);
    } catch (err) {
      console.error(err);
      setError('Failed to generate diagram previews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSrs = async () => {
    if (srsMarkdown) return; // Cached in memory
    setSrsLoading(true);
    setSrsError('');
    try {
      const data = await api.getSrsMarkdown(specification.id);
      setSrsMarkdown(data.markdown || '');
    } catch (err) {
      console.error(err);
      setSrsError('Failed to generate or fetch SRS document. Make sure the specification is approved.');
    } finally {
      setSrsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, [specification.id]);

  useEffect(() => {
    if (activeTab === 'srs') {
      fetchSrs();
    }
  }, [activeTab]);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface">System Architecture & Diagrams</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            View generated diagram models based on your finalized entities and actors, or preview/download the complete SRS document.
          </p>
        </div>

        {error && activeTab !== 'srs' && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-8 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              <span>{error}</span>
            </div>
            <button onClick={fetchDiagrams} className="text-xs underline hover:text-red-900">Retry</button>
          </div>
        )}

        {loading && activeTab !== 'srs' ? (
          <div className="bg-white border border-outline-variant rounded-xl p-20 flex flex-col justify-center items-center gap-4">
            <div className="w-12 h-12 border-4 border-t-[#2563eb] border-slate-200 rounded-full animate-spin"></div>
            <h3 className="font-bold text-on-surface text-base">Rendering PlantUML Models...</h3>
            <p className="text-xs text-on-surface-variant max-w-sm text-center leading-relaxed">
              If this is the first time generating these models, it might take 10-15 seconds. Subsequent loads will render instantly from cache.
            </p>
          </div>
        ) : (
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

                    {srsLoading ? (
                      <div className="py-20 flex flex-col justify-center items-center gap-4">
                        <div className="w-10 h-10 border-4 border-t-[#2563eb] border-slate-200 rounded-full animate-spin"></div>
                        <h4 className="font-bold text-on-surface text-sm font-sans">Compiling SRS Document...</h4>
                        <p className="text-xs text-on-surface-variant max-w-sm text-center leading-relaxed">
                          Generating the document structure, overview details, and non-functional requirements. This might take 5-10 seconds on first load.
                        </p>
                      </div>
                    ) : srsError ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-red-500">error</span>
                          <span>{srsError}</span>
                        </div>
                        <button onClick={fetchSrs} className="text-xs underline hover:text-red-900">Retry</button>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-lg p-6 border border-outline-variant max-h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                        {renderSimpleMarkdown(srsMarkdown)}
                      </div>
                    )}
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
        )}
      </main>
    </div>
  );
}

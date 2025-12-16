
import React, { useState, useCallback, useMemo } from 'react';
import { UploadZone } from './components/UploadZone';
import { ViewCard } from './components/ViewCard';
import { ObjectEraser } from './components/ObjectEraser';
import { MULTI_VIEWS, EXPRESSION_VIEWS, APP_MODES, SYMMETRIC_PAIRS } from './constants';
import { generateCharacterView, ConsistencyMode } from './services/geminiService';
import { removeBackgroundWithPhotoroom } from './services/photoroomService';
import { GeneratedView, ViewGenerationStatus, AppMode, ViewConfig } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('multi-view');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [chibiPrompt, setChibiPrompt] = useState("holding a bubble tea");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSymmetric, setIsSymmetric] = useState(false);
  const [selectedViewIds, setSelectedViewIds] = useState<Set<string>>(new Set([...MULTI_VIEWS.map(v => v.id), ...EXPRESSION_VIEWS.map(v => v.id)]));
  
  const [viewStatus, setViewStatus] = useState<ViewGenerationStatus>(() => {
    const initial: ViewGenerationStatus = {};
    [...MULTI_VIEWS, ...EXPRESSION_VIEWS].forEach(view => {
      initial[view.id] = {
        viewId: view.id,
        imageUrl: null,
        isLoading: false,
        error: null
      };
    });
    initial['chibi-result'] = { viewId: 'chibi-result', imageUrl: null, isLoading: false, error: null };
    initial['remove-bg-result'] = { viewId: 'remove-bg-result', imageUrl: null, isLoading: false, error: null };
    initial['erase-result'] = { viewId: 'erase-result', imageUrl: null, isLoading: false, error: null };
    return initial;
  });

  const handleModeChange = (mode: AppMode) => {
    setActiveMode(mode);
  };

  const handleToggleViewSelection = (viewId: string) => {
    setSelectedViewIds(prev => {
      const next = new Set(prev);
      if (next.has(viewId)) next.delete(viewId);
      else next.add(viewId);
      return next;
    });
  };

  const handleToggleAll = () => {
    const currentViews = activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS;
    const allSelected = currentViews.every(v => selectedViewIds.has(v.id));
    
    setSelectedViewIds(prev => {
      const next = new Set(prev);
      currentViews.forEach(v => {
        if (allSelected) next.delete(v.id);
        else next.add(v.id);
      });
      return next;
    });
  };

  const mirrorImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(img.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.src = base64;
    });
  };

  const handleImageSelect = (base64: string) => {
    setSourceImage(base64);
    setViewStatus(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        next[key] = { ...next[key], imageUrl: null, error: null, isLoading: false };
      });
      return next;
    });
  };

  const updateView = (id: string, updates: Partial<GeneratedView>) => {
    setViewStatus(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  const handleRegenerateView = async (viewId: string) => {
    if (!sourceImage || isGenerating) return;

    let targetId = viewId;
    if (isSymmetric) {
      const pair = SYMMETRIC_PAIRS.find(p => p[1] === viewId);
      if (pair) targetId = pair[0];
    }
    
    const config = [...MULTI_VIEWS, ...EXPRESSION_VIEWS].find(v => v.id === targetId);
    if (!config) return;

    const pair = SYMMETRIC_PAIRS.find(p => p[0] === targetId);
    updateView(targetId, { isLoading: true, error: null });
    if (isSymmetric && pair) {
      updateView(pair[1], { isLoading: true, error: null });
    }
    
    try {
      const mode: ConsistencyMode = activeMode === 'expressions' ? 'expression' : 'strict';
      const imageUrl = await generateCharacterView(sourceImage, config.promptInstruction, mode);
      updateView(targetId, { imageUrl, isLoading: false });

      if (isSymmetric && pair) {
        const mirrored = await mirrorImage(imageUrl);
        updateView(pair[1], { imageUrl: mirrored, isLoading: false });
      }
    } catch (err: any) {
      updateView(targetId, { isLoading: false, error: err.message || '生成失败' });
      if (isSymmetric && pair) {
        updateView(pair[1], { isLoading: false, error: '同步失败' });
      }
    }
  };

  const handleDownloadAll = () => {
    const currentViews = activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS;
    const targets = currentViews.filter(v => viewStatus[v.id].imageUrl && !viewStatus[v.id].isLoading);
    
    if (targets.length === 0) return;

    targets.forEach((view, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = viewStatus[view.id].imageUrl!;
        link.download = `character-${view.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!sourceImage) return;
    setIsGenerating(true);

    const viewsToProcess = (activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS)
      .filter(v => selectedViewIds.has(v.id));

    if (activeMode === 'multi-view' || activeMode === 'expressions') {
      const actualViewsToCall = isSymmetric && activeMode === 'multi-view' 
        ? viewsToProcess.filter(v => !SYMMETRIC_PAIRS.some(pair => pair[1] === v.id))
        : viewsToProcess;

      viewsToProcess.forEach(view => {
        updateView(view.id, { isLoading: true, error: null });
      });
      
      const promises = actualViewsToCall.map(async (view, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 200));
        try {
          const mode: ConsistencyMode = activeMode === 'expressions' ? 'expression' : 'strict';
          const imageUrl = await generateCharacterView(sourceImage, view.promptInstruction, mode);
          updateView(view.id, { imageUrl, isLoading: false });

          if (isSymmetric && activeMode === 'multi-view') {
            const pair = SYMMETRIC_PAIRS.find(p => p[0] === view.id);
            if (pair) {
              const mirrored = await mirrorImage(imageUrl);
              updateView(pair[1], { imageUrl: mirrored, isLoading: false });
            }
          }
        } catch (err: any) {
          updateView(view.id, { isLoading: false, error: err.message || 'Failed' });
          if (isSymmetric) {
            const pair = SYMMETRIC_PAIRS.find(p => p[0] === view.id);
            if (pair) updateView(pair[1], { isLoading: false, error: '同步失败' });
          }
        }
      });
      await Promise.allSettled(promises);

    } else if (activeMode === 'chibi') {
      const id = 'chibi-result';
      updateView(id, { isLoading: true, error: null, imageUrl: null });
      try {
        const prompt = `Generate a Chibi/Q-version of this character. ${chibiPrompt}`;
        const imageUrl = await generateCharacterView(sourceImage, prompt, 'style-transfer');
        updateView(id, { imageUrl, isLoading: false });
      } catch (err: any) {
        updateView(id, { isLoading: false, error: err.message });
      }
    } else if (activeMode === 'remove-bg') {
      const id = 'remove-bg-result';
      updateView(id, { isLoading: true, error: null, imageUrl: null });
      try {
        const imageUrl = await removeBackgroundWithPhotoroom(sourceImage);
        updateView(id, { imageUrl, isLoading: false });
      } catch (err: any) {
        updateView(id, { isLoading: false, error: err.message });
      }
    }
    setIsGenerating(false);
  }, [sourceImage, activeMode, chibiPrompt, selectedViewIds, isSymmetric]);

  const renderContent = () => {
    const currentViews = activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS;
    
    if (activeMode === 'multi-view' || activeMode === 'expressions') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
          {currentViews.map(view => {
            const isMirrored = isSymmetric && activeMode === 'multi-view' && SYMMETRIC_PAIRS.some(p => p[1] === view.id);
            return (
              <div key={view.id} className="relative group">
                <ViewCard 
                  config={view} 
                  data={viewStatus[view.id]} 
                  onRegenerate={handleRegenerateView}
                  canRegenerate={!!sourceImage && !isGenerating}
                  isSelected={selectedViewIds.has(view.id)}
                  onToggleSelect={handleToggleViewSelection}
                />
                {isMirrored && (
                  <div className="absolute top-[38px] left-2 z-10 pointer-events-none">
                    <span className="bg-indigo-600/90 text-white text-[8px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2 h-2">
                        <path fillRule="evenodd" d="M15.312 11.424a1 1 0 0 1 0 1.152l-2.625 3a1 1 0 0 1-1.512 0l-2.625-3a1 1 0 1 1 1.512-1.312L11 12.304V7a1 1 0 0 0-1-1H4a1 1 0 1 1 0-2h6a3 3 0 0 1 3 3v5.304l.938-.938a1 1 0 0 1 1.374-.066ZM5.5 5.8a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 0 1.5H6.26a.75.75 0 0 1-.76-.75Z" clipRule="evenodd" />
                      </svg>
                      镜像同步
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    
    // (Other modes remain same but simplified for brevity in this XML part)
    if (activeMode === 'chibi') return <div className="max-w-xs mx-auto"><ViewCard config={{id: 'chibi-result', title: 'Q版结果', description: chibiPrompt, promptInstruction: ''}} data={viewStatus['chibi-result']} /></div>;
    if (activeMode === 'remove-bg') return <div className="max-w-xs mx-auto"><ViewCard config={{id: 'remove-bg-result', title: '抠图结果', description: 'Photoroom 提取', promptInstruction: ''}} data={viewStatus['remove-bg-result']} /></div>;
    if (activeMode === 'object-erase') return <div className="max-w-md mx-auto">{viewStatus['erase-result'].imageUrl ? <ViewCard config={{id: 'erase-result', title: '完成', description: '已移除', promptInstruction: ''}} data={viewStatus['erase-result']} /> : <div className="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl"><p className="text-sm">涂抹左侧区域并执行</p></div>}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30 selection:text-primary-200">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-primary-400 to-indigo-600 p-1.5 rounded-lg shadow-lg shadow-primary-500/20">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">CharView <span className="text-primary-400 not-italic">AI</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-20">
        {/* Symmetric Mode Banner - CRITICAL OPTION */}
        <div className="mb-6 bg-slate-900/80 border border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl ring-1 ring-white/5">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSymmetric ? 'bg-primary-600 shadow-[0_0_15px_rgba(14,165,233,0.4)]' : 'bg-slate-800'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">人物形象左右对称模式</h3>
              <p className="text-[11px] text-slate-400">开启后只需生成左侧视角，右侧将通过镜像瞬间填充（节省 50% 时间）</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSymmetric(!isSymmetric)}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-full font-bold text-xs transition-all ${isSymmetric ? 'bg-primary-600 text-white shadow-xl translate-y-[-1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {isSymmetric ? '✅ 模式已激活' : '点击开启对称模式'}
            <div className={`w-8 h-4 rounded-full relative transition-colors ${isSymmetric ? 'bg-white/20' : 'bg-slate-600'}`}>
              <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${isSymmetric ? 'left-5' : 'left-1'}`} />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
          {APP_MODES.map((mode) => (
            <button key={mode.id} onClick={() => handleModeChange(mode.id)} className={`relative p-3 rounded-xl border text-left transition-all duration-300 ${activeMode === mode.id ? 'bg-primary-900/20 border-primary-500 shadow-lg' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
              <div className={`mb-1.5 ${activeMode === mode.id ? 'text-primary-400' : 'text-slate-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} /></svg></div>
              <div className={`font-bold text-[11px] ${activeMode === mode.id ? 'text-white' : 'text-slate-400'}`}>{mode.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            {activeMode === 'object-erase' && sourceImage ? (
               <ObjectEraser imageSrc={sourceImage} onResult={(r) => updateView('erase-result', {imageUrl: r, isLoading: false})} onError={(e) => updateView('erase-result', {isLoading: false, error: e})} />
            ) : (
               <UploadZone onImageSelect={handleImageSelect} />
            )}

            {sourceImage && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-xl overflow-hidden group">
                 <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reference Photo</span>
                    <button onClick={() => setSourceImage(null)} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase transition-colors">Clear</button>
                 </div>
                 <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 ring-1 ring-white/5">
                    <img src={sourceImage} alt="Reference" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" />
                 </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 flex flex-col min-h-[600px]">
            <div className="flex justify-between items-end mb-6 px-1 flex-wrap gap-4">
               <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase italic">生成队列</h3>
                  <div className="flex items-center gap-4 mt-1.5">
                    <button onClick={handleToggleAll} className="text-[10px] text-primary-400 hover:text-primary-300 font-black uppercase tracking-widest transition-colors flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" /></svg>
                      全选
                    </button>
                    {Object.values(viewStatus).some(v => v.imageUrl) && (
                       <button onClick={handleDownloadAll} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                         全部下载
                       </button>
                    )}
                  </div>
               </div>
               
               {activeMode !== 'object-erase' && (
                 <button
                  onClick={handleGenerate}
                  disabled={!sourceImage || isGenerating || (activeMode !== 'remove-bg' && selectedViewIds.size === 0)}
                  className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all transform hover:-translate-y-1 active:translate-y-0 ${!sourceImage || isGenerating ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700' : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-[0_10px_25px_rgba(14,165,233,0.3)] hover:shadow-primary-500/40'}`}
                >
                  {isGenerating ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</> : <>Run AI Generator ({selectedViewIds.size})</>}
                </button>
               )}
            </div>

            <div className="flex-1 bg-slate-900/30 rounded-3xl border border-slate-800 p-6 shadow-inner">
               {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

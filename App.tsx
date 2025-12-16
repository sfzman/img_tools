
import React, { useState, useCallback, useMemo } from 'react';
import { UploadZone } from './components/UploadZone';
import { ViewCard } from './components/ViewCard';
import { ObjectEraser } from './components/ObjectEraser';
import { MULTI_VIEWS, EXPRESSION_VIEWS, APP_MODES, SYMMETRIC_PAIRS } from './constants';
import { generateCharacterView, ConsistencyMode } from './services/geminiService';
import { removeBackgroundWithPhotoroom } from './services/photoroomService';
import { GeneratedView, ViewGenerationStatus, AppMode } from './types';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('multi-view');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [chibiPrompt, setChibiPrompt] = useState("拿着一杯奶茶，闭着眼睛，很开心的样子");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSymmetric, setIsSymmetric] = useState(false);
  const [selectedViewIds, setSelectedViewIds] = useState<Set<string>>(new Set([...MULTI_VIEWS.map(v => v.id), ...EXPRESSION_VIEWS.map(v => v.id)]));
  
  const [viewStatus, setViewStatus] = useState<ViewGenerationStatus>(() => {
    const initial: ViewGenerationStatus = {};
    [...MULTI_VIEWS, ...EXPRESSION_VIEWS].forEach(view => {
      initial[view.id] = { viewId: view.id, imageUrl: null, isLoading: false, error: null };
    });
    initial['chibi-result'] = { viewId: 'chibi-result', imageUrl: null, isLoading: false, error: null };
    initial['remove-bg-result'] = { viewId: 'remove-bg-result', imageUrl: null, isLoading: false, error: null };
    initial['erase-result'] = { viewId: 'erase-result', imageUrl: null, isLoading: false, error: null };
    return initial;
  });

  // Batch modes check
  const isBatchMode = activeMode === 'multi-view' || activeMode === 'expressions';

  // Calculate selected count based on current mode
  const currentModeSelectedCount = useMemo(() => {
    if (!isBatchMode) return 0;
    const currentViews = activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS;
    return currentViews.filter(v => selectedViewIds.has(v.id)).length;
  }, [activeMode, selectedViewIds, isBatchMode]);

  const handleModeChange = (mode: AppMode) => setActiveMode(mode);

  const handleToggleViewSelection = (viewId: string) => {
    setSelectedViewIds(prev => {
      const next = new Set(prev);
      if (next.has(viewId)) next.delete(viewId); else next.add(viewId);
      return next;
    });
  };

  const handleToggleAll = () => {
    const currentViews = activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS;
    const allSelected = currentViews.every(v => selectedViewIds.has(v.id));
    setSelectedViewIds(prev => {
      const next = new Set(prev);
      currentViews.forEach(v => { if (allSelected) next.delete(v.id); else next.add(v.id); });
      return next;
    });
  };

  const mirrorImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.translate(img.width, 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); }
      };
      img.src = base64;
    });
  };

  const updateView = (id: string, updates: Partial<GeneratedView>) => {
    setViewStatus(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const handleRegenerateView = async (viewId: string) => {
    if (!frontImage || isGenerating) return;
    let targetId = viewId;
    if (isSymmetric && activeMode === 'multi-view') {
      const pair = SYMMETRIC_PAIRS.find(p => p[1] === viewId);
      if (pair) targetId = pair[0];
    }
    const config = [...MULTI_VIEWS, ...EXPRESSION_VIEWS].find(v => v.id === targetId);
    if (!config) return;

    const pair = SYMMETRIC_PAIRS.find(p => p[0] === targetId);
    updateView(targetId, { isLoading: true, error: null });
    if (isSymmetric && activeMode === 'multi-view' && pair) updateView(pair[1], { isLoading: true, error: null });
    
    try {
      const mode: ConsistencyMode = activeMode === 'expressions' ? 'expression' : 'strict';
      const imageUrl = await generateCharacterView(frontImage, backImage, config.promptInstruction, mode);
      updateView(targetId, { imageUrl, isLoading: false });
      if (isSymmetric && activeMode === 'multi-view' && pair) {
        const mirrored = await mirrorImage(imageUrl);
        updateView(pair[1], { imageUrl: mirrored, isLoading: false });
      }
    } catch (err: any) {
      updateView(targetId, { isLoading: false, error: err.message });
      if (isSymmetric && activeMode === 'multi-view' && pair) updateView(pair[1], { isLoading: false, error: '同步失败' });
    }
  };

  const handleDownloadAll = () => {
    const currentViews = activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS;
    const targets = currentViews.filter(v => viewStatus[v.id].imageUrl && !viewStatus[v.id].isLoading);
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
    if (!frontImage) return;
    setIsGenerating(true);

    if (isBatchMode) {
      const viewsToProcess = (activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS)
        .filter(v => selectedViewIds.has(v.id));

      const actualViewsToCall = isSymmetric && activeMode === 'multi-view' 
        ? viewsToProcess.filter(v => !SYMMETRIC_PAIRS.some(pair => pair[1] === v.id))
        : viewsToProcess;

      viewsToProcess.forEach(view => updateView(view.id, { isLoading: true, error: null }));
      
      const promises = actualViewsToCall.map(async (view, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 200));
        try {
          const mode: ConsistencyMode = activeMode === 'expressions' ? 'expression' : 'strict';
          const generatedUrl = await generateCharacterView(frontImage, backImage, view.promptInstruction, mode);
          updateView(view.id, { imageUrl: generatedUrl, isLoading: false });
          if (isSymmetric && activeMode === 'multi-view') {
            const pair = SYMMETRIC_PAIRS.find(p => p[0] === view.id);
            if (pair) { const mirrored = await mirrorImage(generatedUrl); updateView(pair[1], { imageUrl: mirrored, isLoading: false }); }
          }
        } catch (err: any) {
          updateView(view.id, { isLoading: false, error: err.message });
          if (isSymmetric && activeMode === 'multi-view') {
            const pair = SYMMETRIC_PAIRS.find(p => p[0] === view.id);
            if (pair) updateView(pair[1], { isLoading: false, error: '同步失败' });
          }
        }
      });
      await Promise.allSettled(promises);
    } else if (activeMode === 'chibi') {
      updateView('chibi-result', { isLoading: true, error: null, imageUrl: null });
      try {
        const chibiUrl = await generateCharacterView(frontImage, backImage, `Generate a Chibi of this character. ${chibiPrompt}`, 'style-transfer');
        // Fix for "No value exists in scope for the shorthand property 'imageUrl'" by using explicit property name
        updateView('chibi-result', { imageUrl: chibiUrl, isLoading: false });
      } catch (err: any) { updateView('chibi-result', { isLoading: false, error: err.message }); }
    } else if (activeMode === 'remove-bg') {
      updateView('remove-bg-result', { isLoading: true, error: null, imageUrl: null });
      try {
        const bgRemovedUrl = await removeBackgroundWithPhotoroom(frontImage);
        // Using unique variable name and explicit property name to ensure correctness
        updateView('remove-bg-result', { imageUrl: bgRemovedUrl, isLoading: false });
      } catch (err: any) { updateView('remove-bg-result', { isLoading: false, error: err.message }); }
    }
    setIsGenerating(false);
  }, [frontImage, backImage, activeMode, chibiPrompt, selectedViewIds, isSymmetric, isBatchMode]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30 selection:text-primary-200">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-primary-400 to-indigo-600 p-1.5 rounded-lg shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
            </div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">CharView <span className="text-primary-400 not-italic">AI</span></h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-20">
        {/* Symmetric Mode Banner - Only shown in Multi-view mode */}
        {activeMode === 'multi-view' && (
          <div className="mb-6 bg-slate-900/80 border border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl ring-1 ring-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl transition-all duration-500 ${isSymmetric ? 'bg-primary-600 shadow-[0_0_15px_rgba(14,165,233,0.4)]' : 'bg-slate-800'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">人物镜像对称模式</h3>
                <p className="text-[11px] text-slate-400">自动从左侧视角同步镜像至右侧，无需重复生成。</p>
              </div>
            </div>
            <button onClick={() => setIsSymmetric(!isSymmetric)} className={`flex items-center gap-3 px-6 py-2.5 rounded-full font-bold text-xs transition-all ${isSymmetric ? 'bg-primary-600 text-white shadow-xl' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {isSymmetric ? '✅ 已开启镜像' : '点击开启镜像模式'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
          {APP_MODES.map((mode) => (
            <button key={mode.id} onClick={() => handleModeChange(mode.id)} className={`relative p-3 rounded-xl border text-left transition-all duration-300 ${activeMode === mode.id ? 'bg-primary-900/20 border-primary-500 shadow-lg' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
              <div className={`mb-1.5 ${activeMode === mode.id ? 'text-primary-400' : 'text-slate-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} /></svg></div>
              <div className={`font-bold text-[11px] ${activeMode === mode.id ? 'text-white' : 'text-slate-400'}`}>{mode.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            {/* Conditional Upload Slots */}
            <div className="grid grid-cols-1 gap-4">
               {activeMode === 'object-erase' && frontImage ? (
                  <ObjectEraser imageSrc={frontImage} onResult={(r) => updateView('erase-result', {imageUrl: r, isLoading: false})} onError={(e) => updateView('erase-result', {isLoading: false, error: e})} />
               ) : (
                  <>
                    <div className="relative group">
                       <div className="flex justify-between items-center mb-1.5 px-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            正面参考 {activeMode === 'multi-view' ? '(必填)' : ''}
                          </span>
                          {frontImage && <button onClick={() => setFrontImage(null)} className="text-[10px] text-red-500 font-bold hover:underline">清除</button>}
                       </div>
                       {frontImage ? (
                          <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black/40 shadow-inner group-hover:border-slate-600 transition-colors">
                            <img src={frontImage} className="w-full h-full object-contain" />
                          </div>
                       ) : <UploadZone label="正面参考" onImageSelect={setFrontImage} />}
                    </div>
                    
                    {/* Only Multi-View supports dual input to keep UI clean */}
                    {activeMode === 'multi-view' && (
                      <div className="relative group">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">背面参考 (选填)</span>
                            {backImage && <button onClick={() => setBackImage(null)} className="text-[10px] text-red-500 font-bold hover:underline">清除</button>}
                        </div>
                        {backImage ? (
                            <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-800 bg-black/40 shadow-inner group-hover:border-slate-600 transition-colors">
                              <img src={backImage} className="w-full h-full object-contain" />
                            </div>
                        ) : <UploadZone label="背面参考" onImageSelect={setBackImage} />}
                      </div>
                    )}
                  </>
               )}
            </div>
            
            {activeMode === 'multi-view' && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-xl mt-4">
                <h4 className="text-xs font-bold text-white mb-2 uppercase italic tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                  AI 进阶提示
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                   同时提供<span className="text-primary-400 font-bold">正面和背面</span>图，AI 将能完美还原角色的背部细节（如披风、发行、饰品），无需二次修补。
                </p>
              </div>
            )}

            {/* Chibi Prompt Input */}
            {activeMode === 'chibi' && (
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-xl mt-4 animate-in slide-in-from-left-2 duration-300">
                <h4 className="text-xs font-bold text-white mb-3 uppercase italic tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  Q版动作/道具描述
                </h4>
                <textarea
                  value={chibiPrompt}
                  onChange={(e) => setChibiPrompt(e.target.value)}
                  placeholder="例如：拿着奶茶、在睡觉、穿着宇航服..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none h-24 shadow-inner"
                />
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  描述您想让 Q 版角色展现的动作或携带的道具，AI 将基于角色特征进行风格化处理。
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 flex flex-col min-h-[600px]">
            <div className="flex justify-between items-end mb-6 px-1 flex-wrap gap-4">
               <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase italic">
                    {isBatchMode ? "视图生成队列" : "处理结果"}
                  </h3>
                  {isBatchMode && (
                    <div className="flex items-center gap-4 mt-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                      <button onClick={handleToggleAll} className="text-[10px] text-primary-400 hover:text-primary-300 font-black uppercase tracking-widest transition-colors flex items-center gap-1.5">全选</button>
                      {Object.values(viewStatus).some(v => v.imageUrl) && (
                         <button onClick={handleDownloadAll} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-widest flex items-center gap-2">全部下载</button>
                      )}
                    </div>
                  )}
               </div>
               
               {activeMode !== 'object-erase' && (
                 <button
                  onClick={handleGenerate}
                  disabled={!frontImage || isGenerating || (isBatchMode && currentModeSelectedCount === 0)}
                  className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all transform hover:-translate-y-1 ${!frontImage || isGenerating ? 'bg-slate-800 text-slate-600' : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-xl'}`}
                >
                  {isGenerating ? "生成中..." : `开始 AI 生成 ${isBatchMode ? `(${currentModeSelectedCount})` : ''}`}
                </button>
               )}
            </div>

            <div className="flex-1 bg-slate-900/30 rounded-3xl border border-slate-800 p-6 shadow-inner">
               <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                 {isBatchMode ? (activeMode === 'multi-view' ? MULTI_VIEWS : EXPRESSION_VIEWS).map(view => (
                    <ViewCard 
                      key={view.id}
                      config={view} 
                      data={viewStatus[view.id]} 
                      onRegenerate={handleRegenerateView}
                      canRegenerate={!!frontImage && !isGenerating}
                      isSelected={selectedViewIds.has(view.id)}
                      onToggleSelect={handleToggleViewSelection}
                    />
                 )) : null}
                 
                 {activeMode === 'chibi' && <div className="col-span-full max-w-xs mx-auto"><ViewCard config={{id: 'chibi-result', title: 'Q版结果', description: chibiPrompt, promptInstruction: ''}} data={viewStatus['chibi-result']} /></div>}
                 {activeMode === 'remove-bg' && <div className="col-span-full max-w-xs mx-auto"><ViewCard config={{id: 'remove-bg-result', title: '抠图结果', description: '基于 Photoroom', promptInstruction: ''}} data={viewStatus['remove-bg-result']} /></div>}
                 {activeMode === 'object-erase' && <div className="col-span-full max-w-md mx-auto">{viewStatus['erase-result'].imageUrl ? <ViewCard config={{id: 'erase-result', title: '完成', description: '物体已擦除', promptInstruction: ''}} data={viewStatus['erase-result']} /> : <div className="h-64 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">涂抹左侧区域并点击“开始擦除”</div>}</div>}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;


import React, { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { ViewCard } from './components/ViewCard';
import { ObjectEraser } from './components/ObjectEraser';
import { MULTI_VIEWS, EXPRESSION_VIEWS, APP_MODES } from './constants';
import { generateCharacterView, ConsistencyMode } from './services/geminiService';
import { removeBackgroundWithPhotoroom } from './services/photoroomService';
import { GeneratedView, ViewGenerationStatus, AppMode, ViewConfig } from './types';

const App: React.FC = () => {
  // Set default mode to 'remove-bg' as requested
  const [activeMode, setActiveMode] = useState<AppMode>('remove-bg');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [chibiPrompt, setChibiPrompt] = useState("holding a bubble tea");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [viewStatus, setViewStatus] = useState<ViewGenerationStatus>(() => {
    const initial: ViewGenerationStatus = {};
    // Initialize for all potential static views
    [...MULTI_VIEWS, ...EXPRESSION_VIEWS].forEach(view => {
      initial[view.id] = {
        viewId: view.id,
        imageUrl: null,
        isLoading: false,
        error: null
      };
    });
    // Also initialize dynamic single views
    initial['chibi-result'] = { viewId: 'chibi-result', imageUrl: null, isLoading: false, error: null };
    initial['remove-bg-result'] = { viewId: 'remove-bg-result', imageUrl: null, isLoading: false, error: null };
    initial['erase-result'] = { viewId: 'erase-result', imageUrl: null, isLoading: false, error: null };
    return initial;
  });

  const handleModeChange = (mode: AppMode) => {
    setActiveMode(mode);
    // Optional: Reset source image on mode change if we wanted strict separation, 
    // but keeping it allows reusing the same image for different tasks.
  };

  const handleImageSelect = (base64: string) => {
    setSourceImage(base64);
    // Reset results when new image is uploaded
    setViewStatus(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        next[key] = { ...next[key], imageUrl: null, error: null, isLoading: false };
      });
      return next;
    });
  };

  const handleEraseResult = (resultBase64: string) => {
     setViewStatus(prev => ({
        ...prev,
        ['erase-result']: { 
          viewId: 'erase-result', 
          imageUrl: resultBase64, 
          isLoading: false, 
          error: null 
        }
      }));
  };

  const handleEraseError = (error: string) => {
     setViewStatus(prev => ({
        ...prev,
        ['erase-result']: { ...prev['erase-result'], isLoading: false, error: error }
      }));
  };

  const handleGenerate = useCallback(async () => {
    if (!sourceImage) return;
    setIsGenerating(true);

    const updateView = (id: string, updates: Partial<GeneratedView>) => {
      setViewStatus(prev => ({
        ...prev,
        [id]: { ...prev[id], ...updates }
      }));
    };

    // Strategy Pattern for different modes
    if (activeMode === 'multi-view') {
      MULTI_VIEWS.forEach(view => updateView(view.id, { isLoading: true, error: null }));
      
      const promises = MULTI_VIEWS.map(async (view, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 300));
        try {
          const imageUrl = await generateCharacterView(sourceImage, view.promptInstruction, 'strict');
          updateView(view.id, { imageUrl, isLoading: false });
        } catch (err: any) {
          updateView(view.id, { isLoading: false, error: err.message || 'Failed' });
        }
      });
      await Promise.allSettled(promises);

    } else if (activeMode === 'expressions') {
      EXPRESSION_VIEWS.forEach(view => updateView(view.id, { isLoading: true, error: null }));
      
      const promises = EXPRESSION_VIEWS.map(async (view, index) => {
        await new Promise(resolve => setTimeout(resolve, index * 300));
        try {
          const imageUrl = await generateCharacterView(sourceImage, view.promptInstruction, 'expression');
          updateView(view.id, { imageUrl, isLoading: false });
        } catch (err: any) {
          updateView(view.id, { isLoading: false, error: err.message || 'Failed' });
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
        // Use Photoroom Service
        const imageUrl = await removeBackgroundWithPhotoroom(sourceImage);
        updateView(id, { imageUrl, isLoading: false });
      } catch (err: any) {
        updateView(id, { isLoading: false, error: err.message });
      }
    }

    setIsGenerating(false);
  }, [sourceImage, activeMode, chibiPrompt]);

  // Render Helper
  const renderContent = () => {
    if (activeMode === 'multi-view') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {MULTI_VIEWS.map(view => (
            <ViewCard key={view.id} config={view} data={viewStatus[view.id]} />
          ))}
        </div>
      );
    }
    
    if (activeMode === 'expressions') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {EXPRESSION_VIEWS.map(view => (
            <ViewCard key={view.id} config={view} data={viewStatus[view.id]} />
          ))}
        </div>
      );
    }

    if (activeMode === 'chibi') {
      return (
        <div className="max-w-md mx-auto">
           <ViewCard 
             config={{
               id: 'chibi-result', 
               title: 'Q版生成结果', 
               description: chibiPrompt, 
               promptInstruction: ''
             }} 
             data={viewStatus['chibi-result']} 
           />
        </div>
      );
    }

    if (activeMode === 'remove-bg') {
      return (
         <div className="max-w-md mx-auto">
           <ViewCard 
             config={{
               id: 'remove-bg-result', 
               title: '抠图结果', 
               description: '通过 Photoroom API 去除背景', 
               promptInstruction: ''
             }} 
             data={viewStatus['remove-bg-result']} 
           />
        </div>
      );
    }

    if (activeMode === 'object-erase') {
      return (
        <div className="max-w-md mx-auto">
          {/* If we have a result, show it, otherwise show instructions or nothing specific here since the interaction is on the left */}
          {viewStatus['erase-result'].imageUrl ? (
            <ViewCard 
             config={{
               id: 'erase-result', 
               title: '智能擦除完成', 
               description: '对象已移除并自动补全背景', 
               promptInstruction: ''
             }} 
             data={viewStatus['erase-result']} 
           />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
               <p>请在左侧图片上选择要擦除的物体</p>
               {viewStatus['erase-result'].error && (
                 <p className="text-red-400 mt-2 text-sm px-4 text-center">{viewStatus['erase-result'].error}</p>
               )}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30 selection:text-primary-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-primary-400 to-indigo-600 p-2 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              CharView <span className="text-primary-400">AI</span>
            </h1>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            Powered by Gemini 2.5 & Photoroom
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        
        {/* Mode Selector */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {APP_MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`
                  relative p-3 lg:p-4 rounded-xl border text-left transition-all duration-300
                  ${isActive 
                    ? 'bg-primary-900/30 border-primary-500 shadow-lg shadow-primary-900/20' 
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800'
                  }
                `}
              >
                <div className={`mb-2 ${isActive ? 'text-primary-400' : 'text-slate-400'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                     <path strokeLinecap="round" strokeLinejoin="round" d={mode.icon} />
                   </svg>
                </div>
                <div className={`font-semibold text-sm lg:text-base ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {mode.label}
                </div>
                <div className="text-[10px] lg:text-xs text-slate-500 mt-1 line-clamp-1">{mode.description}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input / Interaction */}
          <div className="lg:col-span-5 space-y-6">
             {/* Helper Text specific to mode */}
            <div className="prose prose-invert">
               <h2 className="text-2xl font-bold text-white">
                {APP_MODES.find(m => m.id === activeMode)?.label}
               </h2>
               <p className="text-slate-400 text-sm">
                {activeMode === 'multi-view' && '请上传角色的全身照或半身照。正面角度效果最佳。'}
                {activeMode === 'expressions' && '请上传一张面部特写或肖像照，以获得最佳的面部细节。'}
                {activeMode === 'chibi' && '上传角色的全身照，将其转换为可爱的 Q 版（2-3头身）风格。'}
                {activeMode === 'remove-bg' && '上传任何角色图片，使用 Photoroom 自动去除背景并提取主体。'}
                {activeMode === 'object-erase' && '上传图片后，系统将自动分析。鼠标移动高亮物体，点击选择要擦除的部分。'}
               </p>
            </div>

            {/* If we are in Erase mode AND have an image, show the interactive eraser. Otherwise show UploadZone */}
            {activeMode === 'object-erase' && sourceImage ? (
               <div className="space-y-4">
                  <ObjectEraser 
                    imageSrc={sourceImage} 
                    onResult={handleEraseResult} 
                    onError={handleEraseError}
                  />
                  <button 
                    onClick={() => setSourceImage(null)}
                    className="text-xs text-red-400 hover:text-red-300 underline w-full text-center"
                  >
                    更换图片
                  </button>
               </div>
            ) : (
               <UploadZone onImageSelect={handleImageSelect} />
            )}

            {/* Mode Specific Inputs (Chibi) */}
            {activeMode === 'chibi' && sourceImage && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-medium text-primary-400 uppercase tracking-wider">Q 版提示词</label>
                <textarea 
                  value={chibiPrompt}
                  onChange={(e) => setChibiPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none h-20"
                  placeholder="例如：手里拿着珍珠奶茶，正在眨眼..."
                />
              </div>
            )}

            {/* For modes OTHER than erase, show the small preview if image exists */}
            {sourceImage && activeMode !== 'object-erase' && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                 <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-slate-300">参考原图</span>
                    <button 
                      onClick={() => setSourceImage(null)}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      移除
                    </button>
                 </div>
                 <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-black">
                    <img src={sourceImage} alt="Reference" className="w-full h-full object-contain" />
                 </div>
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7 flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-semibold text-white">
                 {activeMode === 'object-erase' ? '处理结果' : '生成结果'}
               </h3>
               
               {/* Only show the main "Start Generate" button if NOT in erase mode, because Erase has its own button inside the component */}
               {activeMode !== 'object-erase' && (
                 <button
                  onClick={handleGenerate}
                  disabled={!sourceImage || isGenerating}
                  className={`
                    px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg
                    ${!sourceImage || isGenerating 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-primary-600 hover:bg-primary-500 text-white hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </>
                  ) : (
                    <>
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                       </svg>
                       {activeMode === 'remove-bg' ? '开始抠图' : '开始生成'}
                    </>
                  )}
                </button>
               )}
            </div>

            <div className="flex-1 bg-slate-900/30 rounded-2xl border border-slate-800/50 p-6 overflow-y-auto min-h-[400px]">
               {renderContent()}
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

export default App;

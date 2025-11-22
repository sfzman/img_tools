
import React from 'react';
import { GeneratedView, ViewConfig } from '../types';

interface ViewCardProps {
  config: ViewConfig;
  data: GeneratedView;
}

export const ViewCard: React.FC<ViewCardProps> = ({ config, data }) => {
  const handleDownload = () => {
    if (!data.imageUrl) return;
    const link = document.createElement('a');
    link.href = data.imageUrl;
    link.download = `character-${config.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/30">
        <h3 className="font-semibold text-slate-200">{config.title}</h3>
        {data.imageUrl && !data.isLoading && (
          <button 
            onClick={handleDownload}
            className="text-xs bg-primary-600 hover:bg-primary-500 text-white px-2 py-1 rounded transition-colors"
            title="保存图片"
          >
            保存
          </button>
        )}
      </div>
      
      <div className="relative aspect-square bg-slate-900 group">
        {data.isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 animate-pulse">生成设计中...</span>
          </div>
        ) : data.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-400 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-xs text-red-300">{data.error}</span>
          </div>
        ) : data.imageUrl ? (
          <>
            <img 
              src={data.imageUrl} 
              alt={config.title} 
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            <span className="text-xs">等待生成...</span>
          </div>
        )}
      </div>
      
      <div className="p-2 bg-slate-900/50">
        <p className="text-[10px] text-slate-500 text-center line-clamp-1">{config.description}</p>
      </div>
    </div>
  );
};

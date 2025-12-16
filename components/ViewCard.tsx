
import React from 'react';
import { GeneratedView, ViewConfig } from '../types';

interface ViewCardProps {
  config: ViewConfig;
  data: GeneratedView;
  onRegenerate?: (viewId: string) => void;
  canRegenerate?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (viewId: string) => void;
}

export const ViewCard: React.FC<ViewCardProps> = ({ 
  config, 
  data, 
  onRegenerate, 
  canRegenerate,
  isSelected,
  onToggleSelect
}) => {
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
    <div className={`
      relative bg-slate-800/50 rounded-xl border overflow-hidden flex flex-col shadow-lg transition-all duration-300
      ${isSelected ? 'border-primary-500 ring-1 ring-primary-500/50' : 'border-slate-700 hover:border-slate-600'}
    `}>
      {/* Selection Checkbox Overlay */}
      {onToggleSelect && (
        <div className="absolute top-2 left-2 z-20">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(config.id)}
            className="w-4 h-4 rounded border-slate-700 text-primary-600 focus:ring-primary-500 bg-slate-900 cursor-pointer"
          />
        </div>
      )}

      <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/30 pl-8">
        <h3 className="font-semibold text-xs lg:text-sm text-slate-200 truncate pr-2">{config.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRegenerate && (
            <button 
              onClick={() => onRegenerate(config.id)}
              disabled={data.isLoading || !canRegenerate}
              className={`p-1.5 rounded-md transition-all ${
                data.isLoading || !canRegenerate 
                ? 'text-slate-600 cursor-not-allowed' 
                : 'text-slate-400 hover:text-primary-400 hover:bg-slate-800'
              }`}
              title="重新生成此角度"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 ${data.isLoading ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}
          {data.imageUrl && !data.isLoading && (
            <button 
              onClick={handleDownload}
              className="text-[10px] bg-primary-600 hover:bg-primary-500 text-white px-2 py-1 rounded transition-colors font-medium"
              title="保存图片"
            >
              保存
            </button>
          )}
        </div>
      </div>
      
      <div className="relative aspect-square bg-slate-900 group">
        {data.isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] text-slate-400 animate-pulse">生成设计中...</span>
          </div>
        ) : data.error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-[10px] text-red-300 line-clamp-2">{data.error}</span>
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
          <div className="absolute inset-0 flex items-center justify-center text-slate-700">
            <span className="text-[10px]">等待生成...</span>
          </div>
        )}
      </div>
      
      <div className="p-2 bg-slate-900/50">
        <p className="text-[9px] text-slate-500 text-center line-clamp-1 opacity-70">{config.description}</p>
      </div>
    </div>
  );
};

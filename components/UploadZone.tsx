
import React, { useRef, useState } from 'react';

interface UploadZoneProps {
  onImageSelect: (base64: string) => void;
  label: string;
  icon?: React.ReactNode;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelect, label, icon }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) onImageSelect(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className={`relative group cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 p-4 flex flex-col items-center justify-center min-h-[120px] ${
        isDragging
          ? 'border-primary-400 bg-primary-900/20'
          : 'border-slate-700 hover:border-primary-500 hover:bg-slate-800/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      
      <div className="text-primary-400 mb-2 group-hover:scale-110 transition-transform">
        {icon || (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
      </div>

      <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{label}</p>
      <p className="text-[10px] text-slate-500 mt-1">点击或拖拽上传</p>
    </div>
  );
};

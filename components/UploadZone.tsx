import React, { useRef, useState } from 'react';

interface UploadZoneProps {
  onImageSelect: (base64: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelect(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onClick = () => {
    fileInputRef.current?.click();
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out p-8 flex flex-col items-center justify-center h-64 ${
        isDragging
          ? 'border-primary-400 bg-primary-900/20'
          : 'border-slate-600 hover:border-primary-500 hover:bg-slate-800/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={onChange}
      />
      
      <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/20">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-primary-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 1 5.25 21h13.5A2.25 2.25 0 0 1 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <p className="text-lg font-medium text-slate-200">Upload Character Reference</p>
      <p className="text-sm text-slate-400 mt-2 text-center">
        Drag & drop or click to browse<br/>
        <span className="text-xs opacity-70">(JPEG, PNG, WEBP supported)</span>
      </p>
    </div>
  );
};

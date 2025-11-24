
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision';
import { eraseObjectWithGemini } from '../services/geminiService';

interface ObjectEraserProps {
  imageSrc: string;
  onResult: (resultBase64: string) => void;
  onError: (error: string) => void;
}

export const ObjectEraser: React.FC<ObjectEraserProps> = ({ imageSrc, onResult, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  
  const [segmenter, setSegmenter] = useState<ImageSegmenter | null>(null);
  const [maskData, setMaskData] = useState<Uint8Array | null>(null);
  const imgNaturalSize = useRef<{ width: number, height: number }>({ width: 0, height: 0 });
  
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [hoverCategory, setHoverCategory] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/latest/deeplab_v3.tflite",
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: false
        });
        
        setSegmenter(imageSegmenter);
        setIsModelLoading(false);
      } catch (e: any) {
        console.error(e);
        onError("无法加载分割模型，请确保网络连接正常 (Need @mediapipe/tasks-vision installed or CDN access).");
        setIsModelLoading(false);
      }
    };

    initMediaPipe();
  }, [onError]);

  // Run Segmentation when image loads
  useEffect(() => {
    if (!segmenter || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    
    img.onload = () => {
      if (!canvasRef.current || !overlayRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      const container = containerRef.current;
      
      // Store natural size for coordinate mapping later
      imgNaturalSize.current = { width: img.naturalWidth, height: img.naturalHeight };

      // Responsive sizing logic
      const maxWidth = container.clientWidth;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const displayWidth = img.naturalWidth * scale;
      const displayHeight = img.naturalHeight * scale;

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      overlay.width = displayWidth;
      overlay.height = displayHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      }

      // Run segmentation on the original image
      // segmenter.segment() is synchronous for 'IMAGE' mode
      const result = segmenter.segment(img);
      
      if (result.categoryMask) {
        // CRITICAL FIX: Extract the raw Uint8Array from the MPMask object
        const rawMask = result.categoryMask.getAsUint8Array();
        setMaskData(rawMask);
      }
    };
  }, [segmenter, imageSrc]);

  // Handle Mouse Interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskData || !overlayRef.current || imgNaturalSize.current.width === 0) return;

    const rect = overlayRef.current.getBoundingClientRect();
    
    // 1. Get mouse position relative to the canvas element (CSS pixels)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 2. Normalize coordinates (0.0 to 1.0)
    const normX = x / rect.width;
    const normY = y / rect.height;

    // 3. Map to original image mask coordinates
    const maskX = Math.floor(normX * imgNaturalSize.current.width);
    const maskY = Math.floor(normY * imgNaturalSize.current.height);

    // Boundary check
    if (maskX < 0 || maskX >= imgNaturalSize.current.width || maskY < 0 || maskY >= imgNaturalSize.current.height) {
      setHoverCategory(null);
      return;
    }

    // 4. Look up category in the 1D mask array
    const index = maskY * imgNaturalSize.current.width + maskX;
    
    if (index >= 0 && index < maskData.length) {
      const category = maskData[index];
      if (category !== hoverCategory) {
        setHoverCategory(category);
      }
    }
  };

  const handleClick = () => {
    if (hoverCategory === null) return;
    
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(hoverCategory)) {
        next.delete(hoverCategory);
      } else {
        next.add(hoverCategory);
      }
      return next;
    });
  };

  // Draw Overlay
  useEffect(() => {
    if (!maskData || !overlayRef.current || imgNaturalSize.current.width === 0) return;
    
    const overlay = overlayRef.current;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const maskWidth = imgNaturalSize.current.width;
    const maskHeight = imgNaturalSize.current.height;
    
    if (maskWidth === 0 || maskHeight === 0) return;

    // Create ImageData for the mask at original resolution
    const maskImageData = new ImageData(maskWidth, maskHeight);
    const data = maskImageData.data;

    for (let i = 0; i < maskData.length; i++) {
      const category = maskData[i];
      const isSelected = selectedCategories.has(category);
      const isHovered = category === hoverCategory;

      if (isSelected || isHovered) {
        const pxIndex = i * 4;
        
        if (isSelected) {
          // Purple/Pink for selected
          data[pxIndex] = 236; // R
          data[pxIndex + 1] = 72; // G
          data[pxIndex + 2] = 153; // B
          data[pxIndex + 3] = 180; // A
        } else if (isHovered) {
          // Cyan/Blue for hover
          data[pxIndex] = 14; // R
          data[pxIndex + 1] = 165; // G
          data[pxIndex + 2] = 233; // B
          data[pxIndex + 3] = 150; // A
        }
      }
    }

    // Temporary canvas to hold the mask at native resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskWidth;
    tempCanvas.height = maskHeight;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(maskImageData, 0, 0);
      // Draw scaled to fit the visible canvas
      ctx.drawImage(tempCanvas, 0, 0, overlay.width, overlay.height);
    }

  }, [maskData, hoverCategory, selectedCategories]);

  // Execute Erasure
  const handleErase = async () => {
    if (selectedCategories.size === 0 || !maskData) return;
    setIsProcessing(true);

    try {
      // 1. Generate Black/White Mask Image
      const width = imgNaturalSize.current.width;
      const height = imgNaturalSize.current.height;
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context error");

      // Fill black (background)
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      // Create white mask for selected objects
      const maskImageData = ctx.getImageData(0, 0, width, height);
      const data = maskImageData.data;

      for (let i = 0; i < maskData.length; i++) {
        if (selectedCategories.has(maskData[i])) {
          const pxIndex = i * 4;
          data[pxIndex] = 255;     // R
          data[pxIndex + 1] = 255; // G
          data[pxIndex + 2] = 255; // B
          // Alpha is 255 (opaque)
          data[pxIndex + 3] = 255;
        }
      }
      ctx.putImageData(maskImageData, 0, 0);
      const maskBase64 = maskCanvas.toDataURL('image/png');

      // 2. Call Gemini
      const resultImage = await eraseObjectWithGemini(imageSrc, maskBase64);
      onResult(resultImage);

    } catch (e: any) {
      console.error(e);
      onError(e.message || "Erase failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full" ref={containerRef}>
      
      {/* Controls */}
      <div className="w-full flex justify-between items-center mb-4 bg-slate-900 p-3 rounded-lg border border-slate-800">
        <div className="text-sm text-slate-300">
          {isModelLoading ? (
            <span className="flex items-center gap-2 text-yellow-400">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              加载 AI 模型中...
            </span>
          ) : (
             <span>已选中 <span className="text-primary-400 font-bold">{selectedCategories.size}</span> 个区域</span>
          )}
        </div>

        <button
          onClick={handleErase}
          disabled={isProcessing || selectedCategories.size === 0}
          className={`
            px-4 py-1.5 rounded text-sm font-medium transition-all
            ${selectedCategories.size > 0 && !isProcessing
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg' 
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
          `}
        >
          {isProcessing ? '擦除中...' : '确认擦除'}
        </button>
      </div>

      {/* Canvas Area */}
      <div className="relative border border-slate-700 rounded-lg overflow-hidden bg-black/50 shadow-2xl">
        <canvas ref={canvasRef} className="block max-w-full" />
        <canvas 
          ref={overlayRef} 
          className="absolute top-0 left-0 cursor-crosshair touch-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverCategory(null)}
          onClick={handleClick}
        />
        
        {/* Instructions Overlay if nothing selected */}
        {!isModelLoading && selectedCategories.size === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-xs text-slate-200 pointer-events-none backdrop-blur-sm">
            点击画面中的物体进行选择
          </div>
        )}
      </div>
    </div>
  );
};

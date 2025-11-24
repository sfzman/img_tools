
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
  const [segmentationResult, setSegmentationResult] = useState<ImageSegmenterResult | null>(null);
  
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
              "https://storage.googleapis.com/mediapipe-models/image_segmenter/deep_lab_v3/float32/1/deep_lab_v3.tflite",
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
      if (!canvasRef.current || !overlayRef.current) return;

      // Setup dimensions
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      const container = containerRef.current;
      
      if (!container) return;
      
      // Responsive sizing logic
      const maxWidth = container.clientWidth;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;

      canvas.width = width;
      canvas.height = height;
      overlay.width = width;
      overlay.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
      }

      // Run segmentation
      // We need to pass the DOM image element to MediaPipe
      const result = segmenter.segment(img); // segmenter works best with original resolution
      setSegmentationResult(result);
    };
  }, [segmenter, imageSrc]);

  // Handle Mouse Interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!segmentationResult || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert screen coordinates to original image coordinates for the mask lookup
    // The segmentation result usually matches the input image size (which we scaled in canvas)
    // Wait, deep_lab_v3 result size matches input size.
    // We drew the image scaled.
    
    const scaleX = overlayRef.current.width / rect.width;
    const scaleY = overlayRef.current.height / rect.height;
    
    const canvasX = Math.floor(x * scaleX);
    const canvasY = Math.floor(y * scaleY);

    // However, the categoryMask is based on the ORIGINAL image passed to segment().
    // We need to map canvas coords back to original image coords IF segment() used original image.
    // In our `img.onload`, we passed `img` (natural size) to `segmenter.segment(img)`.
    // So the mask is naturalWidth x naturalHeight.
    
    const img = new Image();
    img.src = imageSrc; // This is sync for cached images usually, but we need dimensions
    const ratioX = img.naturalWidth / overlayRef.current.width;
    const ratioY = img.naturalHeight / overlayRef.current.height;
    
    const maskX = Math.floor(canvasX * ratioX);
    const maskY = Math.floor(canvasY * ratioY);

    // Get category index
    const mask = segmentationResult.categoryMask as any; // Float32Array or Uint8Array
    if (!mask) return;

    const width = img.naturalWidth;
    const index = maskY * width + maskX;
    
    if (index >= 0 && index < mask.length) {
      const category = mask[index];
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
    if (!segmentationResult || !overlayRef.current) return;
    
    const overlay = overlayRef.current;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const mask = segmentationResult.categoryMask as any;
    if (!mask) return;

    // We need to draw on the SCALED canvas, but mask is ORIGINAL size.
    // For performance, doing pixel manipulation on a large image in JS loop every frame is bad.
    // But for a demo, we try to optimize: Create an offscreen canvas of mask size, draw there, then drawImage scaled.
    
    const img = new Image();
    img.src = imageSrc;
    const maskWidth = img.naturalWidth;
    const maskHeight = img.naturalHeight;
    
    if (maskWidth === 0) return;

    // Create ImageData for the mask
    const maskImageData = new ImageData(maskWidth, maskHeight);
    const data = maskImageData.data;

    for (let i = 0; i < mask.length; i++) {
      const category = mask[i];
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
    tempCtx?.putImageData(maskImageData, 0, 0);

    // Draw scaled to fit the visible canvas
    ctx.drawImage(tempCanvas, 0, 0, overlay.width, overlay.height);

  }, [segmentationResult, hoverCategory, selectedCategories, imageSrc]);

  // Execute Erasure
  const handleErase = async () => {
    if (selectedCategories.size === 0 || !segmentationResult) return;
    setIsProcessing(true);

    try {
      // 1. Generate Black/White Mask Image
      const img = new Image();
      img.src = imageSrc;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context error");

      // Fill black
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      const mask = segmentationResult.categoryMask as any;
      const maskImageData = ctx.getImageData(0, 0, width, height);
      const data = maskImageData.data;

      for (let i = 0; i < mask.length; i++) {
        if (selectedCategories.has(mask[i])) {
          const pxIndex = i * 4;
          data[pxIndex] = 255;     // R
          data[pxIndex + 1] = 255; // G
          data[pxIndex + 2] = 255; // B
          // Alpha remains 255 from fillRect or set explicitly
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

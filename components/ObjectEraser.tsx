import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
import { eraseObjectWithGemini } from '../services/geminiService';

interface ObjectEraserProps {
  imageSrc: string;
  onResult: (resultBase64: string) => void;
  onError: (error: string) => void;
}

interface ProcessedSegment {
  id: number;
  label: string;
  visualData: ImageData; // Pre-calculated colored overlay for this segment
}

// COCO/Pascal VOC labels commonly used in DeepLabV3
const DEEPLAB_LABELS = [
  'background', 'aeroplane', 'bicycle', 'bird', 'boat', 'bottle', 'bus',
  'car', 'cat', 'chair', 'cow', 'diningtable', 'dog', 'horse', 'motorbike',
  'person', 'pottedplant', 'sheep', 'sofa', 'train', 'tvmonitor'
];

export const ObjectEraser: React.FC<ObjectEraserProps> = ({ imageSrc, onResult, onError }) => {
  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null); // Layer 1: Base Image
  const aiHighlightRef = useRef<HTMLCanvasElement>(null); // Layer 2: Hover Feedback (Cyan)
  const selectionRef = useRef<HTMLCanvasElement>(null);   // Layer 3: Persistent Selection + Brush
  const cursorRef = useRef<HTMLDivElement>(null);         // Visual Cursor
  
  // --- State ---
  const [status, setStatus] = useState<'loading_model' | 'analyzing' | 'ready' | 'processing'>('loading_model');
  const [imgDims, setImgDims] = useState({ width: 0, height: 0 });
  const [toolMode, setToolMode] = useState<'ai' | 'brush'>('ai');
  const [brushSize, setBrushSize] = useState(30);
  const [brushColor, setBrushColor] = useState('#ec4899'); // Default Pink
  
  // Data Structures for Speed
  const [segmentIndexMap, setSegmentIndexMap] = useState<Uint8Array | null>(null);
  const [segmentVisuals, setSegmentVisuals] = useState<Map<number, ProcessedSegment>>(new Map());
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<Set<number>>(new Set());

  // Drawing State
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const hasPaintedManually = useRef(false);

  // -------------------------------------------------------------------------
  // 1. Analysis Pipeline (MediaPipe DeepLab)
  // -------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    let segmenter: ImageSegmenter | null = null;

    const analyze = async () => {
      if (!imageSrc) return;
      
      try {
        setStatus('loading_model');
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        if (!active) return;

        segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite",
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          outputCategoryMask: true,
          outputConfidenceMasks: false
        });

        if (!active) return;
        setStatus('analyzing');
        
        // Load image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;
        await new Promise((resolve) => { img.onload = resolve; });
        
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setImgDims({ width: w, height: h });

        // Draw Base Image
        if (imageCanvasRef.current) {
          imageCanvasRef.current.width = w;
          imageCanvasRef.current.height = h;
          const ctx = imageCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        }

        // Init other canvases
        [aiHighlightRef, selectionRef].forEach(ref => {
          if (ref.current) {
            ref.current.width = w;
            ref.current.height = h;
          }
        });

        // Run Inference
        const result = segmenter.segment(img);
        const { categoryMask } = result;
        
        if (!categoryMask) throw new Error("No segmentation mask returned");

        const maskData = categoryMask.getAsUint8Array(); 
        
        // Pre-calculation
        const foundClasses = new Set<number>();
        for (let i = 0; i < maskData.length; i++) {
           foundClasses.add(maskData[i]);
        }
        
        const visuals = new Map<number, ProcessedSegment>();

        foundClasses.forEach(classId => {
           // Create cyan overlay for this class
           const visualData = new ImageData(w, h);
           const vData = visualData.data;
           
           for (let i = 0; i < maskData.length; i++) {
             if (maskData[i] === classId) {
                const p = i * 4;
                vData[p] = 6;     // R
                vData[p+1] = 182; // G
                vData[p+2] = 212; // B (Cyan-500)
                vData[p+3] = 160; // Alpha
             }
           }
           
           visuals.set(classId, {
             id: classId,
             label: DEEPLAB_LABELS[classId] || `Object ${classId}`,
             visualData: visualData
           });
        });

        setSegmentIndexMap(maskData);
        setSegmentVisuals(visuals);
        setStatus('ready');

      } catch (e: any) {
        console.error("MediaPipe Error:", e);
        setStatus('ready');
        setToolMode('brush');
        if (e.message?.includes('WebGL')) {
             onError("您的浏览器不支持 WebGL 加速，已切换到纯画笔模式。");
        }
      }
    };

    analyze();
    return () => { 
      active = false; 
      if (segmenter) segmenter.close();
    };
  }, [imageSrc]);

  // -------------------------------------------------------------------------
  // 2. High-Performance Interaction
  // -------------------------------------------------------------------------
  
  // Helper to get coordinates in Image Space (Canvas resolution)
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageCanvasRef.current) return { x: 0, y: 0 };
    const rect = imageCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const scaleX = imageCanvasRef.current.width / rect.width;
    const scaleY = imageCanvasRef.current.height / rect.height;
    
    return {
      x: Math.floor((clientX - rect.left) * scaleX),
      y: Math.floor((clientY - rect.top) * scaleY)
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // A. Update Visual Cursor (Brush Mode)
    if (toolMode === 'brush') {
      if (containerRef.current && cursorRef.current && imageCanvasRef.current) {
        const rect = imageCanvasRef.current.getBoundingClientRect();
        
        // Check if mouse is inside the canvas rect
        const clientX = e.clientX;
        const clientY = e.clientY;
        
        if (
          clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom
        ) {
          // Calculate scale factor to size the cursor correctly
          // Brush size is in Canvas Pixels. We need Screen Pixels.
          const scaleX = rect.width / imageCanvasRef.current.width;
          const visualSize = brushSize * scaleX;
          
          const x = clientX - rect.left;
          const y = clientY - rect.top;

          cursorRef.current.style.display = 'block';
          cursorRef.current.style.width = `${visualSize}px`;
          cursorRef.current.style.height = `${visualSize}px`;
          cursorRef.current.style.transform = `translate(${x}px, ${y}px)`;
          cursorRef.current.style.borderColor = brushColor;
        } else {
          cursorRef.current.style.display = 'none';
        }
      }
    } else {
      if (cursorRef.current) cursorRef.current.style.display = 'none';
    }

    // B. Handle Drawing
    if (toolMode === 'brush' && isDrawing.current) {
      handleBrushMove(e);
      return;
    }

    // C. AI Hover (Zero Latency)
    if (toolMode === 'ai' && status === 'ready' && segmentIndexMap) {
      const { x, y } = getCanvasPos(e);
      
      if (x < 0 || y < 0 || x >= imgDims.width || y >= imgDims.height) {
        clearHighlight();
        return;
      }

      const idx = y * imgDims.width + x;
      const classId = segmentIndexMap[idx];

      if (segmentVisuals.has(classId) && !selectedSegmentIds.has(classId)) {
         const ctx = aiHighlightRef.current?.getContext('2d');
         if (ctx) {
            ctx.putImageData(segmentVisuals.get(classId)!.visualData, 0, 0);
            containerRef.current!.style.cursor = 'pointer';
         }
      } else {
         clearHighlight();
         containerRef.current!.style.cursor = 'default';
      }
    }
  };

  const clearHighlight = () => {
    const ctx = aiHighlightRef.current?.getContext('2d');
    if (ctx && imgDims.width > 0) ctx.clearRect(0, 0, imgDims.width, imgDims.height);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (toolMode !== 'ai' || status !== 'ready' || !segmentIndexMap) return;
    
    const { x, y } = getCanvasPos(e);
    if (x < 0 || y < 0 || x >= imgDims.width || y >= imgDims.height) return;

    const idx = y * imgDims.width + x;
    const classId = segmentIndexMap[idx];

    if (segmentVisuals.has(classId)) {
      toggleSegment(classId);
    }
  };

  const toggleSegment = (id: number) => {
    const newSet = new Set<number>(selectedSegmentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
      rebuildSelectionCanvas(newSet);
    } else {
      newSet.add(id);
      renderAddedSegment(id);
    }
    setSelectedSegmentIds(newSet);
  };

  // -------------------------------------------------------------------------
  // 3. Selection Rendering
  // -------------------------------------------------------------------------

  const renderAddedSegment = (id: number) => {
    const ctx = selectionRef.current?.getContext('2d');
    const visual = segmentVisuals.get(id);
    if (!ctx || !visual) return;

    const currentData = ctx.getImageData(0, 0, imgDims.width, imgDims.height);
    const segData = visual.visualData.data; 
    const targetData = currentData.data;

    // Parse current brush color for blending
    const r = parseInt(brushColor.slice(1, 3), 16);
    const g = parseInt(brushColor.slice(3, 5), 16);
    const b = parseInt(brushColor.slice(5, 7), 16);

    for (let i = 0; i < targetData.length; i += 4) {
      if (segData[i+3] > 0) { 
        targetData[i] = r;    
        targetData[i+1] = g;  
        targetData[i+2] = b; 
        targetData[i+3] = 200; 
      }
    }
    ctx.putImageData(currentData, 0, 0);
  };

  // Naive rebuild - note: this clears brush strokes if they overlap with removed segments conceptually
  // but for now it's acceptable for the "Undo AI Selection" feature.
  const rebuildSelectionCanvas = (activeIds: Set<number>) => {
     const ctx = selectionRef.current?.getContext('2d');
     if (!ctx || imgDims.width === 0 || imgDims.height === 0) return;

     // Clear the entire selection canvas
     ctx.clearRect(0, 0, imgDims.width, imgDims.height);

     // Redraw all active segments
     // Note: This implementation clears manual brush strokes when an AI segment is deselected.
     // This is a known limitation to keep complexity low (no separate layers for brush vs AI).
     activeIds.forEach(id => {
       renderAddedSegment(id);
     });
  };

  // -------------------------------------------------------------------------
  // 4. Brush Tool Logic
  // -------------------------------------------------------------------------

  const startBrush = (e: React.MouseEvent | React.TouchEvent) => {
    if (toolMode !== 'brush') {
       if (toolMode === 'ai') handleClick(e as React.MouseEvent);
       return;
    }
    isDrawing.current = true;
    lastPos.current = getCanvasPos(e);
    drawBrush(lastPos.current);
    hasPaintedManually.current = true;
  };

  const handleBrushMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const newPos = getCanvasPos(e);
    drawBrush(newPos);
    lastPos.current = newPos;
  };

  const stopBrush = () => {
    isDrawing.current = false;
  };

  const drawBrush = (pos: { x: number, y: number }) => {
    const ctx = selectionRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor; 
    ctx.lineWidth = brushSize;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  // -------------------------------------------------------------------------
  // 5. Execution
  // -------------------------------------------------------------------------

  const handleClear = () => {
    const ctx = selectionRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, imgDims.width, imgDims.height);
    setSelectedSegmentIds(new Set());
    hasPaintedManually.current = false;
  };

  const handleExecute = async () => {
    if (selectedSegmentIds.size === 0 && !hasPaintedManually.current) return;
    setStatus('processing');

    try {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imgDims.width;
      maskCanvas.height = imgDims.height;
      const mCtx = maskCanvas.getContext('2d');
      if (!mCtx || !selectionRef.current) return;

      mCtx.fillStyle = '#000000';
      mCtx.fillRect(0, 0, imgDims.width, imgDims.height);
      mCtx.drawImage(selectionRef.current, 0, 0);
      
      const iData = mCtx.getImageData(0, 0, imgDims.width, imgDims.height);
      const data = iData.data;
      for (let i = 0; i < data.length; i+=4) {
        if (data[i+3] > 0) { 
           data[i] = 255; data[i+1] = 255; data[i+2] = 255; data[i+3] = 255;
        }
      }
      mCtx.putImageData(iData, 0, 0);

      const maskBase64 = maskCanvas.toDataURL('image/png');
      const result = await eraseObjectWithGemini(imageSrc, maskBase64);
      onResult(result);
      setStatus('ready');

    } catch (e: any) {
      onError(e.message);
      setStatus('ready');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto" ref={containerRef}>
      
      {/* Toolbar */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        
        {/* Left: Status & Tools */}
        <div className="flex items-center gap-3">
          {status === 'loading_model' || status === 'analyzing' ? (
             <span className="text-primary-400 text-sm flex items-center gap-2 animate-pulse font-medium">
               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
               {status === 'loading_model' ? '加载模型 (10MB)...' : '全图语义分析...'}
             </span>
          ) : status === 'processing' ? (
             <span className="text-purple-400 text-sm flex items-center gap-2 animate-pulse font-medium">
               <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
               Gemini 擦除中...
             </span>
          ) : (
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
               <button
                onClick={() => setToolMode('ai')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${toolMode === 'ai' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                AI 智选
              </button>
              <button
                onClick={() => setToolMode('brush')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${toolMode === 'brush' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                手动涂抹
              </button>
            </div>
          )}
        </div>

        {/* Right: Brush Settings & Actions */}
        <div className="flex items-center gap-3">
          {toolMode === 'brush' && (
            <>
             <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
               <span className="text-[10px] text-slate-400 font-bold uppercase">Color</span>
               <input 
                 type="color" 
                 value={brushColor}
                 onChange={(e) => setBrushColor(e.target.value)}
                 className="w-6 h-6 rounded overflow-hidden cursor-pointer border-none bg-transparent"
               />
             </div>
             <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
               <span className="text-[10px] text-slate-400 font-bold uppercase">Size</span>
               <input 
                 type="range" min="5" max="100" value={brushSize}
                 onChange={(e) => setBrushSize(Number(e.target.value))}
                 className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
               />
             </div>
            </>
          )}

          <div className="h-6 w-px bg-slate-700 mx-1"></div>

          <button onClick={handleClear} className="text-xs text-slate-400 hover:text-white transition-colors">
            重置
          </button>
          
          <button
            onClick={handleExecute}
            disabled={status === 'processing' || (selectedSegmentIds.size === 0 && !hasPaintedManually.current)}
            className={`
              px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2
              ${status !== 'processing' && (selectedSegmentIds.size > 0 || hasPaintedManually.current)
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white hover:scale-105'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }
            `}
          >
            开始擦除
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        className="relative w-full rounded-lg overflow-hidden border-2 border-slate-700 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')]"
        style={{ cursor: toolMode === 'brush' ? 'none' : 'default' }}
      >
        <canvas ref={imageCanvasRef} className="block w-full h-auto" />
        <canvas ref={selectionRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-70 mix-blend-screen" />
        <canvas 
          ref={aiHighlightRef}
          className="absolute inset-0 w-full h-full opacity-50 mix-blend-screen"
          onMouseMove={handleMouseMove}
          onMouseDown={startBrush}
          onTouchStart={startBrush}
          onMouseUp={stopBrush}
          onTouchEnd={stopBrush}
          onMouseLeave={() => {
            stopBrush();
            if (cursorRef.current) cursorRef.current.style.display = 'none';
            clearHighlight();
          }}
          onClick={handleClick}
        />

         {/* Visual Cursor */}
         <div 
             ref={cursorRef}
             className="pointer-events-none absolute border-2 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] z-10 box-border hidden"
             style={{
                transform: 'translate(-50%, -50%)', // Center on mouse
                left: 0, 
                top: 0
             }}
           />
      </div>
      
      <p className="mt-3 text-xs text-slate-500 text-center max-w-lg">
        {toolMode === 'ai' 
          ? "AI 模式：鼠标移动自动高亮物体（人/车/猫/狗等 20 类），点击选中。" 
          : "画笔模式：按住鼠标左键手动涂抹需要移除的区域。可调整颜色和画笔大小。"}
      </p>

    </div>
  );
};
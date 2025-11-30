import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ArrowRight, RotateCcw, Camera, Ruler, Info } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Dimensions {
  length: number;
  width: number;
  height: number;
}

interface CameraDimensionScannerProps {
  onClose: () => void;
  onConfirm: (dims: Dimensions) => void;
}

type Step = 'intro' | 'calibrate' | 'measure-length' | 'measure-width' | 'measure-height' | 'review';

const CREDIT_CARD_WIDTH_CM = 8.56;

export const CameraDimensionScanner: React.FC<CameraDimensionScannerProps> = ({ onClose, onConfirm }) => {
  const [step, setStep] = useState<Step>('intro');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [calibrationPixels, setCalibrationPixels] = useState<number>(0);
  const [measurements, setMeasurements] = useState<Dimensions>({ length: 0, width: 0, height: 0 });
  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please ensure you gave permission and are on HTTPS/localhost.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to container size (screen pixels) 1:1
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (container && canvas) {
        // Set internal resolution to match CSS dimensions exactly
        // We are removing DPR scaling for now to ensure coordinate precision
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Position canvas to fill container
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.transform = 'none';
        canvas.style.touchAction = 'none';

        // No context scaling needed since we match CSS pixels
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    };

    video.addEventListener('loadedmetadata', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);

    // Initial sizing
    updateCanvasSize();

    // Animation loop for drawing
    let animationFrameId: number;

    const render = () => {
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw active points and lines
      if (activePoints.length > 0) {
        ctx.lineWidth = 3;

        activePoints.forEach((point, index) => {
          // Draw dot
          ctx.beginPath();
          ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
          ctx.fillStyle = draggingPointIndex === index ? '#fbbf24' : '#ef4444';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw label (A or B)
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(index === 0 ? 'A' : 'B', point.x, point.y);
        });

        // Draw line if we have 2 points
        if (activePoints.length === 2) {
          ctx.beginPath();
          ctx.moveTo(activePoints[0].x, activePoints[0].y);
          ctx.lineTo(activePoints[1].x, activePoints[1].y);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Draw distance label
          const midX = (activePoints[0].x + activePoints[1].x) / 2;
          const midY = (activePoints[0].y + activePoints[1].y) / 2;
          const distPixels = Math.hypot(activePoints[1].x - activePoints[0].x, activePoints[1].y - activePoints[0].y);

          // Convert pixels to cm using calibration
          // Note: distPixels is in logical pixels (CSS pixels) because our points are stored in CSS pixels
          // But calibrationPixels was calculated in... wait.
          // If we store points in CSS pixels, everything is consistent.

          let label = `${Math.round(distPixels)}px`;

          if (calibrationPixels > 0) {
            const cm = (distPixels / calibrationPixels) * CREDIT_CARD_WIDTH_CM;
            label = `${cm.toFixed(1)} cm`;
          }

          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.roundRect(midX - 40, midY - 15, 80, 30, 5);
          ctx.fill();

          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(label, midX, midY);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      video.removeEventListener('loadedmetadata', updateCanvasSize);
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activePoints, calibrationPixels, draggingPointIndex]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Since canvas now exactly overlays the video, simple offset calculation works
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (step === 'intro' || step === 'review') return;

    // Prevent default on touch to stop scrolling/zooming while interacting with canvas
    if ('touches' in e) {
      // e.preventDefault(); 
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getPointerPos(e, canvas);

    // Check if clicking near an existing point to drag
    const hitThreshold = 40; // Increased threshold for easier grabbing
    const clickedPointIndex = activePoints.findIndex(p =>
      Math.hypot(p.x - pos.x, p.y - pos.y) < hitThreshold
    );

    if (clickedPointIndex !== -1) {
      setDraggingPointIndex(clickedPointIndex);
    } else {
      // Add new point if not dragging and we have room
      if (activePoints.length < 2) {
        setActivePoints([...activePoints, pos]);
        // Immediately start dragging the new point for fine adjustment
        setDraggingPointIndex(activePoints.length);
      } else {
        // If we have 2 points and click elsewhere, reset to just this new point
        setActivePoints([pos]);
        setDraggingPointIndex(0);
      }
    }
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingPointIndex === null) return;

    // Prevent default to stop scrolling while dragging
    if ('touches' in e) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = getPointerPos(e, canvas);

    const newPoints = [...activePoints];
    newPoints[draggingPointIndex] = pos;
    setActivePoints(newPoints);
  };

  const handleEnd = () => {
    setDraggingPointIndex(null);
  };

  const handleConfirmStep = () => {
    if (activePoints.length !== 2) return;

    const distPixels = Math.hypot(activePoints[1].x - activePoints[0].x, activePoints[1].y - activePoints[0].y);

    if (step === 'calibrate') {
      setCalibrationPixels(distPixels);
      setStep('measure-length');
      setActivePoints([]);
    } else if (step === 'measure-length') {
      const cm = (distPixels / calibrationPixels) * CREDIT_CARD_WIDTH_CM;
      setMeasurements({ ...measurements, length: parseFloat(cm.toFixed(1)) });
      setStep('measure-width');
      setActivePoints([]);
    } else if (step === 'measure-width') {
      const cm = (distPixels / calibrationPixels) * CREDIT_CARD_WIDTH_CM;
      setMeasurements({ ...measurements, width: parseFloat(cm.toFixed(1)) });
      setStep('measure-height');
      setActivePoints([]);
    } else if (step === 'measure-height') {
      const cm = (distPixels / calibrationPixels) * CREDIT_CARD_WIDTH_CM;
      setMeasurements({ ...measurements, height: parseFloat(cm.toFixed(1)) });
      setStep('review');
      setActivePoints([]);
    }
  };

  const handleRetake = () => {
    setActivePoints([]);
  };

  const getInstruction = () => {
    switch (step) {
      case 'intro': return "We'll use a credit card to calibrate the camera scale.";
      case 'calibrate': return "Tap the LEFT and RIGHT edges of the credit card.";
      case 'measure-length': return "Tap the start and end points of the object's LENGTH.";
      case 'measure-width': return "Tap the start and end points of the object's WIDTH.";
      case 'measure-height': return "Tap the start and end points of the object's HEIGHT.";
      case 'review': return "Review your measurements.";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Camera className="w-5 h-5" /> Dimension Scanner
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Camera View */}
      <div className="flex-1 relative overflow-hidden bg-black" ref={containerRef}>
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
            <div>
              <p className="text-red-400 mb-2 text-xl">⚠️ Error</p>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
              onMouseMove={handleMove}
              onTouchMove={handleMove}
              onMouseUp={handleEnd}
              onTouchEnd={handleEnd}
              onMouseLeave={handleEnd}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            />

            {/* Overlay UI */}
            <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                {getInstruction()}
              </div>
            </div>

            {step === 'intro' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-white text-center z-10">
                <div className="bg-white/10 p-4 rounded-full mb-4">
                  <Ruler className="w-12 h-12 text-brand-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">How it works</h3>
                <p className="mb-6 max-w-xs text-gray-300">
                  1. Place a standard credit card next to your item.<br />
                  2. Mark the card's width to calibrate scale.<br />
                  3. Measure your item's length, width, and height.
                </p>
                <button
                  onClick={() => setStep('calibrate')}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-full font-bold transition flex items-center gap-2"
                >
                  Start Scanning <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {step === 'review' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-white text-center z-10">
                <h3 className="text-2xl font-bold mb-6">Measurements</h3>
                <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-md">
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase">Length</p>
                    <p className="text-2xl font-bold text-brand-400">{measurements.length} <span className="text-sm text-white">cm</span></p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase">Width</p>
                    <p className="text-2xl font-bold text-brand-400">{measurements.width} <span className="text-sm text-white">cm</span></p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <p className="text-gray-400 text-xs uppercase">Height</p>
                    <p className="text-2xl font-bold text-brand-400">{measurements.height} <span className="text-sm text-white">cm</span></p>
                  </div>
                </div>
                <div className="flex gap-4 w-full max-w-md">
                  <button
                    onClick={() => {
                      setStep('calibrate');
                      setMeasurements({ length: 0, width: 0, height: 0 });
                      setCalibrationPixels(0);
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-semibold"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => onConfirm(measurements)}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-semibold"
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Controls */}
      {step !== 'intro' && step !== 'review' && (
        <div className="bg-slate-900 p-4 pb-8">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <button
              onClick={handleRetake}
              className="p-3 text-gray-400 hover:text-white flex flex-col items-center gap-1"
              disabled={activePoints.length === 0}
            >
              <RotateCcw className="w-6 h-6" />
              <span className="text-xs">Retake</span>
            </button>

            <div className="flex flex-col items-center">
              <div className="text-brand-400 font-bold text-xl mb-1">
                {step === 'calibrate' ? 'CALIBRATION' :
                  step === 'measure-length' ? 'LENGTH' :
                    step === 'measure-width' ? 'WIDTH' : 'HEIGHT'}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-2 h-2 rounded-full ${(step === 'calibrate' && i === 1) ||
                    (step === 'measure-length' && i === 2) ||
                    (step === 'measure-width' && i === 3) ||
                    (step === 'measure-height' && i === 4)
                    ? 'bg-brand-500' : 'bg-slate-700'
                    }`} />
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmStep}
              disabled={activePoints.length !== 2}
              className={`p-3 rounded-full transition ${activePoints.length === 2
                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-900/50'
                : 'bg-slate-800 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Check className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

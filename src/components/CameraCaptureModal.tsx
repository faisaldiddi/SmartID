import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Start webcam stream
  const startCamera = async () => {
    setErrorMsg(null);
    setIsInitializing(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission was denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera device was detected on your computer.');
      } else {
        setErrorMsg(err.message || 'Could not access the camera. Please check device permissions.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // Stop media stream tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Capture frame to canvas
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Center crop to portrait aspect ratio (3:4)
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // 3:4 target
    const targetAspect = 3 / 4;
    let cropWidth = videoWidth;
    let cropHeight = cropWidth / targetAspect;

    if (cropHeight > videoHeight) {
      cropHeight = videoHeight;
      cropWidth = cropHeight * targetAspect;
    }

    const startX = (videoWidth - cropWidth) / 2;
    const startY = (videoHeight - cropHeight) / 2;

    canvas.width = 600;
    canvas.height = 800;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        video,
        startX,
        startY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      onPhotoCaptured(capturedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#FBF9F2] rounded-3xl border border-[#D4CEBA] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D4CEBA] flex items-center justify-between bg-[#F4F0E4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2C4F3A] text-[#DFD9C4]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1D3527]">Capture ID Photo</h3>
              <p className="text-xs text-[#59645C]">Take an instant portrait photo for the ID card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 flex flex-col items-center">
          {errorMsg ? (
            <div className="w-full p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 my-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-2">
                <p className="font-bold">Camera Connection Notice</p>
                <p>{errorMsg}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-red-700 text-white rounded-lg font-bold hover:bg-red-800 transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="flex flex-col items-center">
              <div className="w-64 h-80 rounded-2xl overflow-hidden border-4 border-[#2C4F3A] shadow-lg mb-4 bg-black">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs font-semibold text-[#59645C] mb-2">Photo captured! Review below or retake.</p>
            </div>
          ) : (
            <div className="relative w-72 h-96 rounded-2xl overflow-hidden border-2 border-dashed border-[#2C4F3A] bg-black shadow-inner flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={() => videoRef.current?.play()}
              />
              {/* Overlay ID photo guide oval */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-white/60 rounded-full" />
              </div>
              {isInitializing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Starting camera...
                </div>
              )}
            </div>
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls Footer */}
        <div className="px-6 py-4 bg-[#F4F0E4] border-t border-[#D4CEBA] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1F2D24] hover:bg-[#DFD9C4] rounded-xl transition-colors"
          >
            Cancel
          </button>

          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#2C4F3A] bg-[#DFD9C4] hover:bg-[#D4CEBA] rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleUsePhoto}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] rounded-xl shadow-sm transition-colors"
              >
                <Check className="w-4 h-4" />
                Use Photo
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              disabled={!stream || isInitializing}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] disabled:opacity-50 rounded-xl shadow-sm transition-colors"
            >
              <Camera className="w-4 h-4" />
              Capture
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

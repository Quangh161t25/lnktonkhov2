import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Camera, Scan, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

export function BarcodeScannerModal({ isOpen, onClose, onDetected }) {
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedCode('');
      setCameraError('');
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraError("Không thể mở Camera. Vui lòng cho phép quyền truy cập máy ảnh hoặc nhập mã thủ công.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleManualSubmit = (code) => {
    if (!code) return;
    onDetected(code.trim());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quét mã vạch / Mã sản phẩm" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Video feed or error */}
        <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
          {cameraError ? (
            <div className="p-4 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
              <p className="text-xs">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scan target box overlay */}
              <div className="absolute inset-8 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                <span className="text-[10px] text-blue-200 bg-blue-900/60 px-2 py-0.5 rounded">Căn mã vào khung</span>
              </div>
            </>
          )}
        </div>

        {/* Manual code input */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
            Hoặc nhập mã sản phẩm
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit(scannedCode)}
              placeholder="VD: TK-0348, SP01..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleManualSubmit(scannedCode)}
              disabled={!scannedCode.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 disabled:opacity-50 transition"
            >
              Chọn
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

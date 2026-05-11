import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Scan, 
  UserCheck, 
  Smartphone, 
  Camera, 
  RefreshCcw, 
  History,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  User,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { sendWhatsAppNotification } from '../lib/whatsapp-service';
import { updateRecord } from '../lib/firestore-service';
import { toast } from 'sonner';

interface AttendanceSystemProps {
  students: any[];
  teachers: any[];
  staff: any[];
  onAttendanceAdded: (record: any) => void;
  isAdmin: boolean;
}

export function AttendanceSystem({ students, teachers, staff, onAttendanceAdded, isAdmin }: AttendanceSystemProps) {
  const [mode, setMode] = useState<'face' | 'card'>('card');
  const [isScanning, setIsScanning] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Card Scan (QR) setup
  useEffect(() => {
    if (mode === 'card' && isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scannerRef.current.render(
        (decodedText) => {
          handleScanSuccess(decodedText);
          scannerRef.current?.clear();
          setIsScanning(false);
        },
        (errorMessage) => {
          // ignore common errors
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [mode, isScanning]);

  // Face Scan (Simulation) setup
  useEffect(() => {
    if (mode === 'face' && isScanning) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
          .then(stream => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(err => {
            setError("Gagal mengakses kamera: " + err.message);
            setIsScanning(false);
          });
      }
    } else {
      stopCamera();
    }
  }, [mode, isScanning]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleScanSuccess = async (id: string) => {
    setError(null);
    let foundMember = students.find(s => s.id === id || s.nisn === id || s.nis === id);
    let role = 'student';

    if (!foundMember) {
      foundMember = teachers.find(t => t.id === id || t.employeeId === id);
      role = 'teacher';
    }

    if (!foundMember) {
      foundMember = staff.find(st => st.id === id || st.employeeId === id);
      role = 'staff';
    }

    if (!foundMember) {
      setError("Data anggota tidak ditemukan dalam database.");
      return;
    }

    const timestamp = new Date().toISOString();
    const newRecord = {
      memberId: foundMember.id,
      name: foundMember.name,
      role: role,
      method: mode === 'face' ? 'Face' : 'Card',
      status: 'Hadir',
      timestamp: timestamp,
      parentPhone: role === 'student' ? (foundMember.fatherPhone || foundMember.motherPhone || foundMember.phone) : foundMember.phone,
      notified: false,
      photoUrl: foundMember.photoUrl || null,
      waStatus: role === 'student' ? (foundMember.fatherPhone || foundMember.motherPhone || foundMember.phone ? 'Pending' : undefined) : (foundMember.phone ? 'Pending' : undefined)
    };

    setScanResult(newRecord);
    setIsNotifying(!!newRecord.parentPhone);
    
    // Actually add the record first
    const savedDoc = await onAttendanceAdded(newRecord);

    // Auto-send WA if phone is available
    if (newRecord.parentPhone) {
      const waResult = await sendWhatsAppNotification(
        newRecord.parentPhone, 
        newRecord.name, 
        newRecord.status, 
        new Date(timestamp).toLocaleTimeString()
      );
      
      setIsNotifying(false);
      
      if (waResult.success) {
        toast.success(`WhatsApp terkirim ke orang tua ${newRecord.name}`);
        setScanResult((prev: any) => prev ? { ...prev, notified: true, waStatus: 'Sent' } : null);
        // Update the record in Firestore if we have the ID
        const savedId = (savedDoc as any)?.id;
        if (savedId) {
          await updateRecord('attendance', savedId, { 
            notified: true,
            waStatus: 'Sent'
          });
        }
      } else {
        toast.error(`Gagal mengirim WhatsApp: ${waResult.error || 'Provider Error'}`);
        setScanResult((prev: any) => prev ? { ...prev, waStatus: 'Failed' } : null);
        const savedId = (savedDoc as any)?.id;
        if (savedId) {
          await updateRecord('attendance', savedId, { 
            waStatus: 'Failed'
          });
        }
      }
    }
  };

  const handleFaceCapture = async () => {
    if (!videoRef.current) return;
    
    setIsIdentifying(true);
    setError(null);

    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Gagal menginisialisasi canvas");
      
      ctx.drawImage(videoRef.current, 0, 0);
      const faceData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      // Prepare list of candidates with photos
      const gallery = [...students, ...teachers, ...staff].filter(p => p.photoUrl);
      
      if (gallery.length === 0) {
        throw new Error("Tidak ada data wajah terdaftar di database untuk dicocokkan.");
      }

      // Limit to 20 candidates for efficiency
      const candidates = gallery.slice(0, 20).map(p => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photoUrl
      }));

      // Call Server-side Identification API
      const resp = await fetch('/api/identify-face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scanImage: faceData,
          people: candidates
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Gagal melakukan identifikasi wajah");
      }

      const { matchedId } = await resp.json();
      
      if (matchedId && matchedId !== "NOT_FOUND") {
        handleScanSuccess(matchedId);
        setIsScanning(false);
      } else {
        setError("Wajah tidak dikenali. Pastikan Anda sudah merekam foto di Manajemen Data.");
      }
    } catch (err: any) {
      console.error("Identifikasi Error:", err);
      setError(err.message || "Terjadi kesalahan saat memproses identifikasi");
    } finally {
      setIsIdentifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        {/* SCANNER VIEW - Technical Hardware Look */}
        <Card className="flex-1 overflow-hidden border-none shadow-2xl bg-[#0F1115] rounded-3xl relative">
          {/* Hardware Header Decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 opacity-50 z-20" />
          
          <CardHeader className="p-4 sm:p-6 relative z-10 border-b border-white/5 bg-black/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <CardTitle className="text-lg sm:text-xl font-black flex items-center justify-center sm:justify-start gap-2 text-white uppercase tracking-tighter">
                  <div className="p-1 sm:p-1.5 bg-primary/20 rounded-lg">
                    <Scan className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  System Terminal
                </CardTitle>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
                  <CardDescription className="text-slate-500 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest">
                    Status: Online / Live
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-sm w-full sm:w-auto">
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => { setMode('face'); setIsScanning(false); setScanResult(null); }}
                  className={cn(
                    "flex-1 sm:flex-none h-8 sm:h-9 gap-2 px-3 sm:px-4 rounded-lg transition-all duration-300", 
                    mode === 'face' 
                      ? "bg-primary text-white shadow-lg" 
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight">Face ID</span>
                </Button>
                <Button 
                  variant="ghost"
                  size="sm" 
                  onClick={() => { setMode('card'); setIsScanning(false); setScanResult(null); }}
                  className={cn(
                    "flex-1 sm:flex-none h-8 sm:h-9 gap-2 px-3 sm:px-4 rounded-lg transition-all duration-300", 
                    mode === 'card' 
                      ? "bg-primary text-white shadow-lg" 
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight">Card</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 relative min-h-[350px] sm:min-h-[500px] flex items-center justify-center overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

            {!isScanning ? (
              <div className="text-center space-y-6 sm:space-y-8 p-6 sm:p-12 relative z-10 w-full max-w-[280px] sm:max-w-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto h-24 w-24 sm:h-32 sm:w-32 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative group"
                >
                  <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                  {mode === 'face' ? (
                    <UserCheck className="h-10 w-10 sm:h-14 sm:w-14 text-primary relative z-10" />
                  ) : (
                    <div className="relative z-10">
                      <CreditCard className="h-10 w-10 sm:h-14 sm:w-14 text-primary" />
                      <div className="absolute -top-1 -right-1">
                         <div className="h-4 w-4 bg-primary rounded-full animate-ping" />
                      </div>
                    </div>
                  )}
                </motion.div>
                
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter">Ready</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-[200px] sm:max-w-[250px] mx-auto leading-relaxed">
                    Posisikan {mode === 'face' ? 'wajah' : 'kartu QR'} di depan kamera.
                  </p>
                </div>
                
                <Button 
                  onClick={() => { setIsScanning(true); setScanResult(null); setError(null); }} 
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.2)] rounded-2xl transition-all active:scale-95 sm:translate-y-2"
                >
                  Init Scan
                </Button>
              </div>
            ) : (
              <div className="w-full h-full relative group min-h-[350px] sm:min-h-[500px] bg-black">
                {mode === 'card' ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <div id="qr-reader" className="w-full max-w-[400px] sm:max-w-[500px] !border-none !bg-transparent opacity-90"></div>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover scale-[1.02] filter brightness-75 contrast-125" />
                    
                    {/* Futuristic Overlays */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Scanning Line Animation */}
                      <motion.div 
                        animate={{ top: ['10%', '90%', '10%'] }} 
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent z-30 shadow-[0_0_15px_rgba(var(--primary),0.8)]"
                      />
                      
                      {/* Viewport Guides */}
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="relative w-48 h-64 sm:w-64 sm:h-80">
                            {/* Corners */}
                           <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-primary rounded-tl-xl sm:rounded-tl-2xl" />
                           <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-primary rounded-tr-xl sm:rounded-tr-2xl" />
                           <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-primary rounded-bl-xl sm:rounded-bl-2xl" />
                           <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-primary rounded-br-xl sm:rounded-br-2xl" />
                           
                           {/* Pulsing Target Overlay */}
                           <motion.div 
                             animate={{ opacity: [0.1, 0.3, 0.1] }}
                             transition={{ duration: 2, repeat: Infinity }}
                             className="absolute inset-3 sm:inset-4 border border-primary/30 rounded-xl sm:rounded-2xl" 
                           />
                         </div>
                      </div>
                    </div>

                    <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 w-full px-6 sm:px-12 flex flex-col items-center gap-3 sm:gap-4">
                      {isIdentifying ? (
                        <div className="bg-black/60 backdrop-blur-xl px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 border border-primary/40 animate-pulse scale-90 sm:scale-110">
                          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-spin" />
                          <div className="flex flex-col">
                            <span className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] leading-none text-center sm:text-left">ANALYZING</span>
                            <span className="hidden sm:inline text-[10px] text-white/40 font-mono mt-1 text-center sm:text-left">Cross-referencing DB...</span>
                          </div>
                        </div>
                      ) : (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            onClick={handleFaceCapture} 
                            disabled={isIdentifying}
                            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-[0_0_30px_rgba(var(--primary),0.4)] bg-white/10 hover:bg-white/20 p-0 border-[4px] sm:border-[6px] border-primary backdrop-blur-md transition-all group"
                          >
                            <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-white group-hover:scale-110 transition-transform" />
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Control HUD Details */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 pointer-events-none space-y-1 opacity-60 scale-75 sm:scale-100 origin-top-left">
                   <div className="text-[10px] font-mono text-primary font-bold">MODE: BIOMETRIC</div>
                   <div className="text-[10px] font-mono text-white/40">RESOLUTION: 1080P</div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsScanning(false)}
                  className="absolute top-4 sm:top-6 right-4 sm:right-6 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-500 rounded-lg sm:rounded-xl h-8 w-8 sm:h-10 sm:w-10 border border-white/10 backdrop-blur-md transition-all"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            )}

            {/* ERROR HUD OVERLAY */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ transform: 'translateY(100%)' }}
                  animate={{ transform: 'translateY(0%)' }}
                  exit={{ transform: 'translateY(100%)' }}
                  className="absolute bottom-0 left-0 right-0 bg-red-600/90 backdrop-blur-md p-4 sm:p-5 border-t border-white/20 flex items-center justify-between z-40 transition-all"
                >
                  <div className="flex items-center gap-3 sm:gap-4 pr-4">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">Auth Failed</p>
                      <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">{error}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-8 px-2 text-xs text-white hover:bg-white/10 shrink-0">Dismiss</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* RESULT PANEL - Modern Concierge Look */}
        <div className="w-full lg:w-96 shrink-0 h-full">
          <Card className="border-none shadow-2xl bg-white flex flex-col rounded-3xl overflow-hidden relative group">
            <CardHeader className="bg-slate-50/50 border-b p-4 sm:p-6 relative">
              <div className="absolute top-0 right-0 p-2 sm:p-3 opacity-10">
                <History className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
              <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Identification Receipt</CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 sm:p-8 flex flex-col justify-center min-h-[300px]">
              <AnimatePresence mode="wait">
                {scanResult ? (
                  <motion.div 
                    key={scanResult.id + scanResult.timestamp}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 sm:space-y-10"
                  >
                    {/* Identity Plate */}
                    <div className="space-y-4 sm:space-y-6 text-center">
                      <div className="relative mx-auto group w-24 h-24 sm:w-32 sm:h-32">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                          className="absolute -inset-2 sm:-inset-4 border border-dashed border-slate-200 rounded-full" 
                        />
                        <div className="h-24 w-24 sm:h-32 sm:w-32 mx-auto rounded-2xl sm:rounded-3xl bg-slate-100 flex items-center justify-center border-2 sm:border-4 border-white shadow-[0_15px_30px_rgba(0,0,0,0.08)] overflow-hidden relative z-10 transition-transform group-hover:scale-105 duration-500">
                          {scanResult.photoUrl ? (
                             <img src={scanResult.photoUrl} alt="Persona" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                             <div className="bg-gradient-to-br from-slate-100 to-slate-200 h-full w-full flex items-center justify-center">
                               <User className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300" />
                             </div>
                          )}
                        </div>
                        <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 bg-green-500 rounded-full p-1.5 sm:p-2 border-2 sm:border-4 border-white shadow-md z-20">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </div>

                      <div className="space-y-1 sm:space-y-2 translate-y-2">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter break-words px-2">{scanResult.name}</h3>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-2 sm:px-3 py-0.5 sm:py-1 font-black bg-slate-50 border-slate-200 rounded-lg text-slate-500 tracking-[0.1em]">
                          {scanResult.role.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Arrival Log</p>
                        <p className="text-xs sm:text-sm font-black text-slate-700 font-mono tracking-tighter">{new Date(scanResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100">
                        <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Access</p>
                        <p className="text-xs sm:text-sm font-black text-primary font-mono tracking-tighter">GRANTED</p>
                      </div>
                    </div>

                    {/* Communication Status */}
                    <div className="space-y-3 sm:space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between pr-1">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Cloud Sync</p>
                        {isNotifying && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                      </div>
                      
                      <div className="relative">
                        {isNotifying ? (
                          <div className="flex items-center gap-3 sm:gap-4 bg-primary/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-primary/10 transition-all">
                             <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                               <RefreshCcw className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-spin" />
                             </div>
                             <div>
                               <p className="text-[9px] sm:text-[10px] font-black text-primary uppercase mb-0.5 tracking-tight">Syncing...</p>
                               <p className="text-[10px] sm:text-xs font-bold text-slate-500">Delivering secure record</p>
                             </div>
                          </div>
                        ) : scanResult.waStatus === 'Sent' ? (
                          <div className="flex items-center gap-3 sm:gap-4 bg-green-500/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-green-500/10">
                             <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                               <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                             </div>
                             <div>
                               <p className="text-[9px] sm:text-[10px] font-black text-green-700 uppercase mb-0.5 tracking-tight">Success</p>
                               <p className="text-[10px] sm:text-xs font-bold text-slate-500">Notification and log saved.</p>
                             </div>
                          </div>
                        ) : scanResult.waStatus === 'Failed' ? (
                          <div className="flex items-center gap-3 sm:gap-4 bg-red-500/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-red-500/10">
                             <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                               <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                             </div>
                             <div>
                               <p className="text-[9px] sm:text-[10px] font-black text-red-700 uppercase mb-0.5 tracking-tight">Sync Error</p>
                               <p className="text-[10px] sm:text-xs font-bold text-slate-500">Failed to deliver notification.</p>
                             </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-center border-dashed">
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Passive Sync Active</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 filter saturate-0 space-y-4">
                    <div className="relative">
                       <Scan className="h-16 w-16 sm:h-20 sm:w-20 text-slate-400 animate-pulse" />
                       <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-full animate-spin-slow" />
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">Awaiting Signal</p>
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
            
            <div className="p-4 sm:p-6 bg-slate-50/30 border-t border-slate-100 flex items-center justify-center">
               <p className="text-[8px] font-mono text-slate-400 uppercase tracking-[0.4em]">Core Node v2.4</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

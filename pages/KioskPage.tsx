import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiActivity, FiArrowRight, FiEdit, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import Clock from '../components/Clock';
import Spinner from '../components/ui/Spinner';

// Define custom scan result type for the HUD
interface ScanResult {
  type: 'success' | 'error';
  studentName?: string;
  studentPhotoUrl?: string;
  className?: string;
  status?: string; // 'Tepat Waktu', 'Terlambat', etc.
  message?: string;
  timestamp?: Date;
}

const playNotificationSound = (context: AudioContext, success: boolean) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.01);

  if (success) {
    oscillator.type = 'sine';
    // Happy major chord arpeggio fast
    oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
    oscillator.frequency.linearRampToValueAtTime(659.25, context.currentTime + 0.1); // E5
  } else {
    oscillator.type = 'sawtooth';
    // Error buzz
    oscillator.frequency.setValueAtTime(110, context.currentTime); // A2
    oscillator.frequency.linearRampToValueAtTime(55, context.currentTime + 0.3); // A1
  }
  
  oscillator.start(context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.6);
  oscillator.stop(context.currentTime + 0.6);
};

const KioskPage: React.FC = () => {
  const [rfid, setRfid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New State for HUD Notification instead of Swal/Static Card
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  const { recordAttendance, attendanceLogs } = useData();
  const { settings, getAttendancePeriod } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isProcessingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const attendancePeriod = getAttendancePeriod(currentTime);

  const handleScan = useCallback(async (uid: string) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanResult(null); // Clear previous result immediately

    // Clear any existing timer to remove previous modal
    if (timerRef.current) clearTimeout(timerRef.current);

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      // Simulate minimal delay for UI feedback if API is too fast to show the ripple
      const minDelay = new Promise(resolve => setTimeout(resolve, 400));
      
      const [result] = await Promise.all([
          recordAttendance(uid),
          minDelay
      ]);

      if (result.success && result.log) {
        setScanResult({
            type: 'success',
            studentName: result.log.studentName,
            studentPhotoUrl: result.log.studentPhotoUrl,
            className: result.log.className,
            status: result.log.status,
            message: result.message,
            timestamp: new Date()
        });
        playNotificationSound(audioContext, true);
      } else {
        setScanResult({
            type: 'error',
            message: result.message
        });
        playNotificationSound(audioContext, false);
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.';
       setScanResult({
           type: 'error',
           message: errorMessage
       });
       playNotificationSound(audioContext, false);
    } finally {
      setIsProcessing(false);
      setRfid('');
      isProcessingRef.current = false;
      
      // Focus back
      setTimeout(() => inputRef.current?.focus(), 50);

      // Auto dismiss the HUD after 4 seconds
      timerRef.current = setTimeout(() => {
          setScanResult(null);
      }, 4000);
    }
  }, [recordAttendance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rfid.trim()) {
      handleScan(rfid.trim());
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    const focusInput = () => inputRef.current?.focus();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);
  
  // Filter logs to show only today's activity (Asia/Jakarta timezone)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const recentLogs = attendanceLogs
    .filter(log => {
        const logDate = new Date(log.timestamp);
        const logDateStr = logDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        return logDateStr === todayStr;
    })
    .slice(0, 10);

  // Determine Status Pill Color with Spring classes
  const getStatusPillStyle = (period: string) => {
      switch(period) {
          case 'SCAN MASUK': return 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-emerald-200/50 scale-105';
          case 'SCAN PULANG': return 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-blue-200/50 scale-105';
          default: return 'bg-[#cf8e8e] text-white shadow-red-200/50 scale-100 grayscale-[0.3]';
      }
  };

  // --- HUD RENDER LOGIC ---
  const getStatusColor = (status?: string) => {
      if (!status) return 'teal';
      if (status === 'Tepat Waktu') return 'emerald';
      if (status === 'Terlambat') return 'amber';
      if (status === 'Pulang Cepat') return 'blue';
      return 'indigo';
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 via-cyan-100 to-teal-200 min-h-screen flex flex-col overflow-hidden relative transition-colors duration-1000">
      
      {/* --- HUD OVERLAY (The Futuristic Notification) --- */}
      {scanResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[8px] transition-all duration-300" onClick={() => setScanResult(null)}>
              <div className={`
                  relative w-full max-w-2xl mx-4 p-1 rounded-3xl shadow-2xl animate-hud-enter overflow-hidden
                  ${scanResult.type === 'success' 
                      ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600' 
                      : 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-600'}
              `}>
                  {/* Inner Content */}
                  <div className="bg-white/95 backdrop-blur-xl rounded-[20px] p-8 md:p-10 text-center relative overflow-hidden">
                      
                      {/* Decorative Background Elements inside card */}
                      <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${scanResult.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <div className={`absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-20 ${scanResult.type === 'success' ? 'bg-cyan-500' : 'bg-orange-500'}`}></div>

                      {scanResult.type === 'success' ? (
                          <div className="relative z-10">
                              {/* Student Photo with Glow */}
                              <div className="relative inline-block mb-6">
                                  <div className={`absolute -inset-1 rounded-full blur opacity-75 animate-pulse bg-gradient-to-r from-${getStatusColor(scanResult.status)}-400 to-cyan-400`}></div>
                                  <img 
                                    src={scanResult.studentPhotoUrl} 
                                    alt="Student" 
                                    className="relative w-40 h-40 rounded-full object-cover border-4 border-white shadow-xl"
                                  />
                                  <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white">
                                      <FiCheck size={24} strokeWidth={3} />
                                  </div>
                              </div>

                              <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-2 tracking-tight">
                                  {scanResult.studentName}
                              </h2>
                              <p className="text-xl text-slate-500 font-medium mb-6 flex items-center justify-center gap-2">
                                  <span className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 text-slate-600">
                                      {scanResult.className}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span>{scanResult.message}</span>
                              </p>

                              {/* Status Badge */}
                              <div className={`
                                  inline-flex items-center gap-3 px-8 py-4 rounded-2xl shadow-lg transform scale-110
                                  ${scanResult.status === 'Terlambat' 
                                      ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}
                              `}>
                                  <FiClock size={28} />
                                  <div className="text-left">
                                      <p className="text-xs font-bold uppercase opacity-70 tracking-wider">Status Kehadiran</p>
                                      <p className="text-2xl font-black tracking-tight">{scanResult.status}</p>
                                  </div>
                              </div>
                              
                              <p className="mt-8 text-slate-400 text-sm font-mono">
                                  Waktu: {scanResult.timestamp?.toLocaleTimeString('id-ID', {timeZone: 'Asia/Jakarta'})}
                              </p>
                          </div>
                      ) : (
                          <div className="relative z-10 py-8">
                               <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                                   <FiX size={48} strokeWidth={3} />
                               </div>
                               <h2 className="text-3xl font-black text-slate-800 mb-4">Gagal Memproses</h2>
                               <p className="text-xl text-red-500 font-medium bg-red-50 px-6 py-3 rounded-xl inline-block border border-red-100">
                                   {scanResult.message}
                               </p>
                               <p className="mt-6 text-slate-400">Silakan coba scan ulang kartu Anda.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col lg:flex-row text-gray-800 font-sans p-4 sm:p-6 lg:p-8 flex-1 pb-16">
        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <div className="text-center w-full max-w-2xl">
            {/* Logo Container with Ripple Effect during processing */}
            <div className="relative flex items-center justify-center mx-auto mb-6">
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/50 rounded-full animate-ripple z-0"></div>
                )}
                <div className={`relative z-10 transition-transform duration-500 ${isProcessing ? 'scale-110' : 'animate-float'}`}>
                    <img 
                        src={settings?.schoolLogoUrl} 
                        alt="Logo Sekolah" 
                        className="h-28 w-28 rounded-full bg-white p-2 shadow-2xl object-contain border-4 border-white/80 backdrop-blur-sm"
                    />
                </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight drop-shadow-sm transition-all duration-500">
                {settings?.schoolName || 'Sistem Absensi'}
            </h1>
            <p className="text-lg text-slate-600 mt-3 font-medium opacity-90">Selamat Datang! Silakan tempelkan kartu RFID Anda.</p>
          </div>
          
          {/* Clock Section - Now the Hero (replaces the old card box) */}
          <div className="my-16 w-full max-w-3xl text-center relative group cursor-default">
            <div className="transform transition-all duration-500 hover:scale-105">
                 <Clock />
            </div>
            
            {/* Minimalist Processing Indicator */}
            {isProcessing && (
                 <div className="mt-6 animate-pulse flex items-center justify-center text-teal-800 font-bold tracking-widest bg-white/30 py-2 px-4 rounded-full inline-flex mx-auto backdrop-blur-sm">
                     <Spinner /> 
                     <span className="ml-3">MEMBACA KARTU...</span>
                 </div>
            )}
          </div>

          {/* Status Pill with Spring Animation */}
          <div className="relative w-full max-w-lg flex justify-center">
            <div className={`
                text-2xl md:text-3xl font-black tracking-widest uppercase text-center py-6 px-16 rounded-full shadow-2xl border-4 border-white/30 backdrop-blur-sm
                transition-spring
                ${getStatusPillStyle(attendancePeriod)}
            `}>
              {attendancePeriod}
            </div>

            {/* Hidden Input */}
            <form onSubmit={handleSubmit} className="absolute -top-96">
              <input
                ref={inputRef}
                type="text"
                value={rfid}
                onChange={(e) => setRfid(e.target.value)}
                className="opacity-0"
                autoFocus
                disabled={isProcessing}
              />
            </form>
          </div>
        </div>

        {/* Sidebar - Recent Activity */}
        <div className="w-full lg:w-96 lg:ml-8 mt-8 lg:mt-0 bg-white/40 backdrop-blur-xl rounded-3xl p-6 border border-white/50 shadow-xl flex flex-col h-[calc(100vh-8rem)] transition-all duration-500 hover:shadow-2xl hover:bg-white/50">
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-6">
              <Link to="/manual" className="bg-white/80 border border-teal-100 text-teal-700 hover:bg-white hover:scale-105 font-bold py-3 px-3 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md text-sm">
                  <FiEdit className="mr-2" />
                  Absen Manual
              </Link>
              <Link to="/login" className="bg-teal-600 hover:bg-teal-700 hover:scale-105 text-white font-bold py-3 px-3 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg text-sm">
                  <FiArrowRight className="mr-2" />
                  Admin Panel
              </Link>
          </div>

          <h2 className="flex-shrink-0 text-xl font-bold mb-4 flex items-center text-slate-800">
            <FiActivity className="mr-2 text-teal-600" />
            Aktivitas Terakhir
          </h2>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            {recentLogs.length > 0 ? recentLogs.map((log, index) => (
              <div 
                key={log.id} 
                className="flex items-center p-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/40 hover:bg-white hover:shadow-md transition-all duration-300 animate-scale-spring"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <img src={log.studentPhotoUrl} alt={log.studentName} className="w-10 h-10 rounded-full object-cover mr-3 border-2 border-white shadow-sm"/>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 truncate text-sm">{log.studentName}</p>
                  <p className="text-xs text-slate-500 truncate">{log.className}</p>
                </div>
                <div className="text-right pl-2">
                  <p className="text-xs font-bold text-slate-600 font-mono">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</p>
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full mt-1 inline-block ${log.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {log.type === 'in' ? 'Masuk' : 'Pulang'}
                  </span>
                </div>
              </div>
            )) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <p>Belum ada aktivitas hari ini.</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Running Text Footer */}
      {settings?.runningText && (
        <div className="fixed bottom-0 left-0 right-0 bg-teal-900/95 backdrop-blur text-teal-50 overflow-hidden py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-teal-700">
          <div className="animate-marquee whitespace-nowrap font-semibold text-lg tracking-wide">
            {settings.runningText}
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskPage;
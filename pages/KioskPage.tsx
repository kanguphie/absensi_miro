
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiActivity, FiArrowRight, FiEdit } from 'react-icons/fi';
import { Link } from 'react-router-dom';

import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import Clock from '../components/Clock';
import Spinner from '../components/ui/Spinner';

declare const Swal: any;

const playNotificationSound = (context: AudioContext, success: boolean) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.01);

  if (success) {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(783.99, context.currentTime + 0.1);
  } else {
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(220, context.currentTime + 0.1);
  }
  
  oscillator.start(context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
  oscillator.stop(context.currentTime + 0.5);
};

const KioskPage: React.FC = () => {
  const [rfid, setRfid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScannedRfid, setLastScannedRfid] = useState<string | null>(null);
  const { recordAttendance, attendanceLogs } = useData();
  const { settings, getAttendancePeriod } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Use a ref to prevent race conditions from rapid scans
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const attendancePeriod = getAttendancePeriod(currentTime);

  const handleScan = useCallback(async (uid: string) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    setLastScannedRfid(uid);
    setIsProcessing(true);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const result = await recordAttendance(uid);
      if (result.success && result.log) {
        const statusColor = result.log.status === 'Tepat Waktu' ? '#22c55e' : 
                            result.log.status === 'Terlambat' ? '#f59e0b' :
                            '#3b82f6';

        Swal.fire({
          html: `
            <div style="display: flex; align-items: flex-start; text-align: left;">
              <img src="${result.log.studentPhotoUrl}" alt="${result.log.studentName}" style="width: 64px; height: 64px; border-radius: 9999px; object-fit: cover; margin-right: 16px; border: 2px solid rgba(255,255,255,0.5);" />
              <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <p style="font-weight: bold; font-size: 1.125rem; color: #1f2937; margin:0;">${result.log.studentName}</p>
                  <span style="padding: 4px 8px; font-size: 0.75rem; font-weight: 600; color: white; border-radius: 9999px; background-color: ${statusColor};">
                    ${result.log.status}
                  </span>
                </div>
                <p style="color: #4b5563; margin: 0;">${result.log.className}</p>
                <p style="color: #6b7280; font-size: 0.875rem; margin-top: 4px;">${result.message}</p>
              </div>
            </div>
          `,
          position: 'top-end',
          showConfirmButton: false,
          timer: 6000,
          timerProgressBar: true,
          toast: true,
          background: 'rgba(255, 255, 255, 0.8)',
          backdrop: 'none',
          customClass: {
            popup: 'swal2-backdrop-blur'
          },
          didOpen: (toastEl: HTMLElement) => {
            toastEl.addEventListener('mouseenter', Swal.stopTimer)
            toastEl.addEventListener('mouseleave', Swal.resumeTimer)
          }
        });
        playNotificationSound(audioContext, true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: result.message,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000
        });
        playNotificationSound(audioContext, false);
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.';
       Swal.fire({
          icon: 'error',
          title: 'Absensi Gagal',
          text: errorMessage.includes('configured') ? 'Pengaturan sistem belum siap. Coba lagi dalam beberapa detik.' : errorMessage,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000
        });
       playNotificationSound(audioContext, false);
    } finally {
      setIsProcessing(false);
      setRfid('');
      isProcessingRef.current = false;
      // Re-focus after a short delay to ensure the DOM has updated
      setTimeout(() => inputRef.current?.focus(), 50);
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
  
  const recentLogs = attendanceLogs.slice(0, 10);

  return (
    <div className="bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-200 min-h-screen flex flex-col overflow-hidden relative">
      <div className="flex flex-col lg:flex-row text-gray-800 font-sans p-4 sm:p-6 lg:p-8 flex-1 pb-16">
        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center items-center p-4">
          <div className="text-center w-full max-w-2xl">
            <div className="flex items-center justify-center mx-auto mb-4">
                <img src={settings?.schoolLogoUrl} alt="Logo Sekolah" className="h-16 w-16 rounded-full bg-white p-1 shadow-md"/>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">{settings?.schoolName || 'Sistem Absensi'}</h1>
            <p className="text-lg text-gray-600 mt-2">Selamat Datang! Silakan tempelkan kartu RFID Anda.</p>
          </div>
          
          <div className="my-8 w-full max-w-2xl text-center">
            <Clock />
            <div className="mt-6 bg-white/50 backdrop-blur-sm px-6 py-4 rounded-xl shadow-lg border border-white/30 min-h-[80px] flex items-center justify-center">
              {lastScannedRfid ? (
                <div className="animate-fade-in text-center">
                  <p className="text-gray-600 font-semibold text-sm">KARTU RFID TERBACA</p>
                  <p className="mt-1 text-3xl font-mono tracking-widest text-gray-800">
                    {lastScannedRfid}
                  </p>
                </div>
              ) : (
                <p className="text-2xl text-gray-500 italic">Menunggu Scan...</p>
              )}
            </div>
          </div>

          <div className="relative w-full max-w-lg">
            <div className={`text-xl font-bold tracking-wider text-white text-center py-4 px-10 rounded-full transition-all duration-500 animate-pulse shadow-2xl ${
                attendancePeriod === 'SCAN MASUK' ? 'bg-gradient-to-r from-green-400 to-emerald-600' :
                attendancePeriod === 'SCAN PULANG' ? 'bg-gradient-to-r from-indigo-500 to-blue-600' :
                'bg-gradient-to-r from-rose-500 to-red-600 animate-none'
            }`}>
              {attendancePeriod}
            </div>
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
            {isProcessing && <div className="absolute inset-0 flex justify-center items-center mt-20"><Spinner /></div>}
          </div>
        </div>

        {/* Sidebar - Recent Activity */}
        <div className="w-full lg:w-96 lg:ml-8 mt-8 lg:mt-0 bg-white/40 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-lg flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-4">
              <Link to="/manual" className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-2 px-3 rounded-lg flex items-center justify-center transition-colors shadow-sm text-sm">
                  <FiEdit className="mr-2" />
                  Absen Manual
              </Link>
              <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center transition-colors shadow-md text-sm">
                  <FiArrowRight className="mr-2" />
                  Admin Panel
              </Link>
          </div>

          <h2 className="flex-shrink-0 text-2xl font-bold mb-4 flex items-center text-gray-900"><FiActivity className="mr-3 text-indigo-500" />Aktivitas Terakhir</h2>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 -mr-4 custom-scrollbar">
            {recentLogs.length > 0 ? recentLogs.map((log) => (
              <div key={log.id} className="flex items-center p-3 bg-white/60 backdrop-blur-sm rounded-xl shadow-md border border-white/30">
                <img src={log.studentPhotoUrl} alt={log.studentName} className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-white"/>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{log.studentName}</p>
                  <p className="text-sm text-gray-500">{log.className}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full mt-1 inline-block ${log.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {log.type === 'in' ? 'Masuk' : 'Pulang'}
                  </span>
                </div>
              </div>
            )) : <p className="text-gray-500 text-center pt-8">Belum ada aktivitas hari ini.</p>}
          </div>
        </div>
      </div>

      {/* Running Text Footer */}
      {settings?.runningText && (
        <div className="fixed bottom-0 left-0 right-0 bg-indigo-900 text-white overflow-hidden py-3 z-50 shadow-lg border-t border-indigo-700">
          <div className="animate-marquee whitespace-nowrap font-semibold text-xl tracking-wide">
            {settings.runningText}
          </div>
        </div>
      )}
    </div>
  );
};

export default KioskPage;

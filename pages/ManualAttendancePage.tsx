
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiLoader, FiLock } from 'react-icons/fi';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { Student, SchoolClass } from '../types';
import { api } from '../services/api';

declare const Swal: any;

const ManualAttendancePage: React.FC = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [localStudents, setLocalStudents] = useState<Student[]>([]);
  const [localClasses, setLocalClasses] = useState<SchoolClass[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const { recordAttendanceByNis } = useData();
  const { settings } = useSettings();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus PIN input on mount
    if (isLocked) {
        pinInputRef.current?.focus();
    }
    
    const fetchPublicData = async () => {
      try {
        const [studentsData, classesData] = await Promise.all([
          api.getPublicStudents(),
          api.getClasses(),
        ]);
        setLocalStudents(studentsData);
        setLocalClasses(classesData);
      } catch (error) {
        console.error("Failed to fetch public data for manual attendance:", error);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchPublicData();
  }, [isLocked]);

  const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!pin) return;
      
      try {
          const result = await api.verifyPin(pin);
          if (result.success) {
              setIsLocked(false);
          } else {
              setPinError('PIN salah');
              setPin('');
          }
      } catch (error) {
          setPinError('Terjadi kesalahan server');
      }
  };

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
    } else {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, context.currentTime);
    }
    oscillator.start(context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.5);
    oscillator.stop(context.currentTime + 0.5);
  };

  const handleSelectStudent = async (student: Student) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setSearchQuery('');
    setSearchResults([]);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      const result = await recordAttendanceByNis(student.nis);
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
          background: 'rgba(255, 255, 255, 0.9)',
          customClass: {
            popup: 'swal2-backdrop-blur'
          }
        });
        playNotificationSound(audioContext, true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: result.message,
        });
        playNotificationSound(audioContext, false);
      }
    } catch (error) {
      Swal.fire('Error', 'Terjadi kesalahan koneksi.', 'error');
      playNotificationSound(audioContext, false);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length > 1) {
      const filtered = localStudents.filter(student => 
        student.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLocked) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 text-center">
                 <div className="bg-indigo-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                     <FiLock className="text-indigo-600 text-2xl" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Halaman Terkunci</h2>
                 <p className="text-slate-500 mb-6">Masukkan PIN Petugas untuk mengakses absensi manual.</p>
                 
                 <form onSubmit={handleUnlock}>
                     <input
                        ref={pinInputRef}
                        type="password" 
                        value={pin}
                        onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                        className="w-full text-center text-2xl tracking-widest py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4 font-mono"
                        placeholder="PIN"
                        maxLength={6}
                        autoFocus
                     />
                     {pinError && <p className="text-red-500 text-sm mb-4">{pinError}</p>}
                     <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                         Buka Kunci
                     </button>
                 </form>
                 <div className="mt-6">
                    <Link to="/" className="text-slate-500 hover:text-indigo-600 text-sm">Kembali ke Beranda</Link>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={settings?.schoolLogoUrl} alt="Logo Sekolah" className="mx-auto h-20 w-20 mb-4 rounded-full" />
          <h1 className="text-3xl font-bold text-gray-900">Absensi Manual</h1>
          <p className="text-gray-600 mt-2">Ketik nama siswa untuk mencari dan mencatat kehadiran.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="relative" ref={searchContainerRef}>
            <label htmlFor="student-search" className="block text-sm font-medium text-gray-700 mb-1">
              Cari Nama Siswa
            </label>
            <div className="relative">
              <FiSearch className="absolute top-1/2 -translate-y-1/2 left-4 text-gray-400" />
              <input
                id="student-search"
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={isLoadingData ? "Memuat data siswa..." : "Ketik min. 2 huruf nama siswa..."}
                className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
                autoFocus
                autoComplete="off"
                disabled={isProcessing || isLoadingData}
              />
              {(isProcessing || isLoadingData) && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4">
                  <FiLoader className="animate-spin text-emerald-600" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                {searchResults.map(student => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-50 flex items-center gap-3 transition-colors"
                    >
                      <img src={student.photoUrl} alt={student.name} className="w-10 h-10 rounded-full object-cover"/>
                      <div>
                        <p className="font-semibold text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">{localClasses.find(c => c.id === student.classId)?.name}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            
            {searchQuery.length > 1 && searchResults.length === 0 && !isProcessing && !isLoadingData && (
                <p className="text-center text-sm text-gray-500 mt-4">Siswa tidak ditemukan.</p>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-600 hover:text-emerald-600 transition-colors flex items-center justify-center">
            <FiArrowLeft className="mr-2" />
            Kembali ke Halaman Scan
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ManualAttendancePage;
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiXCircle, FiLogIn } from 'react-icons/fi';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';

declare const Swal: any;

const ManualAttendancePage: React.FC = () => {
  const [nis, setNis] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { recordAttendanceByNis } = useData();
  const { settings } = useSettings();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim() || isProcessing) return;

    setIsProcessing(true);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      const result = await recordAttendanceByNis(nis.trim());
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
    } finally {
      setIsProcessing(false);
      setNis('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={settings?.schoolLogoUrl} alt="Logo Sekolah" className="mx-auto h-20 w-20 mb-4 rounded-full" />
          <h1 className="text-3xl font-bold text-gray-900">Absensi Manual</h1>
          <p className="text-gray-600 mt-2">Masukkan Nomor Induk Siswa (NIS) untuk mencatat kehadiran.</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nis" className="block text-sm font-medium text-gray-700 mb-1">
                Nomor Induk Siswa (NIS)
              </label>
              <input
                id="nis"
                type="text"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="Contoh: 240101"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 ease-in-out flex items-center justify-center disabled:bg-emerald-400"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <FiLogIn className="mr-2" />
                  Catat Kehadiran
                </>
              )}
            </button>
          </form>
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
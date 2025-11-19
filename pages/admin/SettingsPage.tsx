
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import { SchoolSettings, OperatingHours, SpecificSchedule, EarlyDismissal } from '../../types';
import { FiSave, FiPlus, FiTrash2, FiLock, FiKey, FiClock, FiUsers, FiX, FiAlertTriangle, FiCalendar } from 'react-icons/fi';
import { api } from '../../services/api';

declare const Swal: any;

const initialHours: OperatingHours[] = [
    { dayGroup: 'mon-thu', checkInTime: '07:00', lateTolerance: 15, scanInBefore: 60, checkOutTime: '13:00', scanOutBefore: 15, scanOutEndTime: '15:00', enabled: true },
    { dayGroup: 'fri', checkInTime: '07:00', lateTolerance: 15, scanInBefore: 60, checkOutTime: '11:00', scanOutBefore: 15, scanOutEndTime: '13:00', enabled: true },
    { dayGroup: 'sat', checkInTime: '08:00', lateTolerance: 15, scanInBefore: 45, checkOutTime: '12:00', scanOutBefore: 15, scanOutEndTime: '14:00', enabled: false },
];

const OperatingHoursEditor: React.FC<{ 
    hours: OperatingHours[], 
    onChange: (newHours: OperatingHours[]) => void 
}> = ({ hours, onChange }) => {
    
    const handleHoursChange = (dayGroup: OperatingHours['dayGroup'], field: keyof OperatingHours, value: string | boolean) => {
        const newHours = hours.map(h => {
            if (h.dayGroup === dayGroup) {
                if (field === 'lateTolerance' || field === 'scanInBefore' || field === 'scanOutBefore') {
                    const numValue = parseInt(value as string, 10);
                    return { ...h, [field]: isNaN(numValue) ? 0 : numValue };
                }
                return { ...h, [field]: value };
            }
            return h;
        });
        onChange(newHours);
    };

    return (
        <div className="space-y-6">
            {hours.map(op => (
                <div key={op.dayGroup} className="border-b border-slate-200 last:border-b-0 pb-6 mb-6">
                    <div className="flex items-center mb-4">
                        <label className="font-semibold text-slate-800 capitalize w-32 text-lg">{op.dayGroup.replace('-', ' - ')}</label>
                        <div className="flex items-center">
                            <input type="checkbox" checked={op.enabled} onChange={(e) => handleHoursChange(op.dayGroup, 'enabled', e.target.checked)} className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"/>
                            <label className="ml-2 text-sm text-slate-600">Aktif</label>
                        </div>
                    </div>
                    
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${!op.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Jam Masuk */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jam Masuk</label>
                            <input type="time" value={op.checkInTime} onChange={e => handleHoursChange(op.dayGroup, 'checkInTime', e.target.value)} disabled={!op.enabled} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Toleransi Telat (menit)</label>
                            <input type="number" value={op.lateTolerance} onChange={e => handleHoursChange(op.dayGroup, 'lateTolerance', e.target.value)} disabled={!op.enabled} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                        </div>
                        <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bisa Scan Masuk (menit sebelum)</label>
                        <input type="number" value={op.scanInBefore} onChange={e => handleHoursChange(op.dayGroup, 'scanInBefore', e.target.value)} disabled={!op.enabled} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                        </div>

                        {/* Jam Pulang */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Jam Pulang</label>
                            <input type="time" value={op.checkOutTime} onChange={e => handleHoursChange(op.dayGroup, 'checkOutTime', e.target.value)} disabled={!op.enabled} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Bisa Scan Pulang (menit sebelum)</label>
                            <input type="number" value={op.scanOutBefore} onChange={e => handleHoursChange(op.dayGroup, 'scanOutBefore', e.target.value)} disabled={!op.enabled} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Batas Akhir Scan Pulang</label>
                            <input type="time" value={op.scanOutEndTime} onChange={e => handleHoursChange(op.dayGroup, 'scanOutEndTime', e.target.value)} disabled={!op.enabled} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"/>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

const SettingsPage: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();
  const { classes } = useData();
  const [formState, setFormState] = useState<SchoolSettings | null>(null);
  const [newHoliday, setNewHoliday] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'specific' | 'incidental'>('general');
  
  // Specific Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SpecificSchedule | null>(null);
  const [scheduleName, setScheduleName] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [scheduleHours, setScheduleHours] = useState<OperatingHours[]>(JSON.parse(JSON.stringify(initialHours)));

  // Early Dismissal Modal State
  const [isDismissalModalOpen, setIsDismissalModalOpen] = useState(false);
  const [dismissalDate, setDismissalDate] = useState('');
  const [dismissalTime, setDismissalTime] = useState('10:00');
  const [dismissalReason, setDismissalReason] = useState('');
  const [dismissalClasses, setDismissalClasses] = useState<string[]>([]); // Empty = all

  // Password change state
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormState(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (formState) {
      setFormState({ ...formState, [e.target.name]: e.target.value });
    }
  };
  
  const handleGeneralHoursChange = (newHours: OperatingHours[]) => {
      if(formState) setFormState({...formState, operatingHours: newHours});
  }

  const handleAddHoliday = () => {
    if (newHoliday && formState) {
        if (formState.holidays.includes(newHoliday)) {
            Swal.fire('Info', 'Tanggal libur sudah ada.', 'info');
            return;
        }
        const updatedHolidays = [...formState.holidays, newHoliday].sort();
        setFormState({ ...formState, holidays: updatedHolidays });
        setNewHoliday('');
    }
  };

  const handleRemoveHoliday = (dateToRemove: string) => {
      if (formState) {
          setFormState({
              ...formState,
              holidays: formState.holidays.filter(date => date !== dateToRemove),
          });
      }
  };
  
  // --- Specific Schedule Logic ---
  const openScheduleModal = (schedule?: SpecificSchedule) => {
      if (schedule) {
          setEditingSchedule(schedule);
          setScheduleName(schedule.name);
          setSelectedClasses(schedule.classIds);
          setScheduleHours(schedule.operatingHours);
      } else {
          setEditingSchedule(null);
          setScheduleName('');
          setSelectedClasses([]);
          setScheduleHours(JSON.parse(JSON.stringify(initialHours)));
      }
      setIsModalOpen(true);
  }

  const toggleClassSelection = (classId: string) => {
      setSelectedClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  }

  const saveSpecificSchedule = () => {
      if (!scheduleName.trim()) { Swal.fire('Error', 'Nama jadwal wajib diisi', 'error'); return; }
      if (selectedClasses.length === 0) { Swal.fire('Error', 'Pilih minimal satu kelas', 'error'); return; }
      
      if (formState) {
          const newSchedule: SpecificSchedule = {
              id: editingSchedule ? editingSchedule.id : Date.now().toString(),
              name: scheduleName,
              classIds: selectedClasses,
              operatingHours: scheduleHours
          };

          let updatedSchedules = formState.specificSchedules ? [...formState.specificSchedules] : [];
          
          if (editingSchedule) {
              updatedSchedules = updatedSchedules.map(s => s.id === editingSchedule.id ? newSchedule : s);
          } else {
              updatedSchedules = [...updatedSchedules, newSchedule];
          }
          
          setFormState({...formState, specificSchedules: updatedSchedules});
          setIsModalOpen(false);
      }
  }

  const deleteSpecificSchedule = (id: string) => {
      if (formState) {
          const updatedSchedules = formState.specificSchedules ? formState.specificSchedules.filter(s => s.id !== id) : [];
          setFormState({...formState, specificSchedules: updatedSchedules});
      }
  }

  // --- Early Dismissal Logic ---
  const handleAddDismissal = () => {
      if (!dismissalDate) { Swal.fire('Error', 'Tanggal wajib diisi', 'error'); return; }
      if (!dismissalTime) { Swal.fire('Error', 'Jam pulang wajib diisi', 'error'); return; }
      if (!dismissalReason) { Swal.fire('Error', 'Alasan wajib diisi', 'error'); return; }
      
      if (formState) {
          const newDismissal: EarlyDismissal = {
              id: Date.now().toString(),
              date: dismissalDate,
              time: dismissalTime,
              reason: dismissalReason,
              classIds: dismissalClasses
          };
          
          const currentDismissals = formState.earlyDismissals || [];
          // Check if date already exists
          if(currentDismissals.some(d => d.date === dismissalDate && d.classIds.length === 0)) {
               Swal.fire('Error', 'Sudah ada jadwal insidental untuk semua kelas pada tanggal ini.', 'error'); 
               return;
          }

          setFormState({
              ...formState, 
              earlyDismissals: [...currentDismissals, newDismissal].sort((a,b) => a.date.localeCompare(b.date))
          });
          setIsDismissalModalOpen(false);
          setDismissalDate(''); setDismissalReason(''); setDismissalClasses([]);
      }
  }

  const deleteDismissal = (id: string) => {
      if (formState) {
          setFormState({
              ...formState,
              earlyDismissals: formState.earlyDismissals.filter(d => d.id !== id)
          });
      }
  }
  
  const toggleDismissalClass = (classId: string) => {
      setDismissalClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState) {
      await updateSettings(formState);
      Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Pengaturan berhasil disimpan.',
          timer: 2000,
          showConfirmButton: false
      });
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passwords.new !== passwords.confirm) {
          Swal.fire('Error', 'Konfirmasi password baru tidak sesuai.', 'error');
          return;
      }
      try {
          const result = await api.changePassword(passwords.current, passwords.new);
          if (result.success) {
              Swal.fire('Sukses', 'Password berhasil diubah.', 'success');
              setPasswords({ current: '', new: '', confirm: '' });
              setIsChangingPassword(false);
          } else {
              Swal.fire('Gagal', result.message, 'error');
          }
      } catch (error) {
          Swal.fire('Error', 'Terjadi kesalahan saat mengubah password.', 'error');
      }
  };
  
  if (loading || !formState) {
      return <div>Memuat pengaturan...</div>
  }

  return (
    <div className="animate-fade-in pb-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Pengaturan Sistem</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* School Profile */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Profil Sekolah</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                        <label htmlFor="schoolName" className="block text-sm font-medium text-slate-700 mb-1">Nama Sekolah</label>
                        <input type="text" name="schoolName" id="schoolName" value={formState.schoolName} onChange={handleInputChange}
                            className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        </div>
                        <div>
                        <label htmlFor="schoolLogoUrl" className="block text-sm font-medium text-slate-700 mb-1">URL Logo Sekolah</label>
                        <input type="text" name="schoolLogoUrl" id="schoolLogoUrl" value={formState.schoolLogoUrl} onChange={handleInputChange}
                            className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        </div>
                    </div>
                </div>

                {/* Security Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><FiLock className="mr-2"/> Keamanan</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="manualPin" className="block text-sm font-medium text-slate-700 mb-1">PIN Absensi Manual</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                    <FiKey />
                                </span>
                                <input type="text" name="manualPin" id="manualPin" value={formState.manualPin || ''} onChange={handleInputChange}
                                    className="w-full py-2 px-3 border border-slate-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    placeholder="Contoh: 123456"
                                    maxLength={6}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">PIN ini digunakan untuk mengakses halaman Absensi Manual (Kiosk).</p>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Password Admin</label>
                             <button type="button" onClick={() => setIsChangingPassword(!isChangingPassword)} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center">
                                 {isChangingPassword ? 'Batal Ubah Password' : 'Ubah Password Admin'}
                             </button>
                             
                             {isChangingPassword && (
                                 <div className="mt-3 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                     <input type="password" placeholder="Password Lama" className="w-full p-2 border rounded text-sm" value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} />
                                     <input type="password" placeholder="Password Baru" className="w-full p-2 border rounded text-sm" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} />
                                     <input type="password" placeholder="Konfirmasi Password Baru" className="w-full p-2 border rounded text-sm" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} />
                                     <button onClick={handleChangePassword} className="w-full bg-slate-800 text-white py-2 rounded text-sm font-medium hover:bg-slate-900">Simpan Password Baru</button>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Operating Hours with Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex border-b border-slate-200 overflow-x-auto">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('general')} 
                            className={`flex-1 py-4 px-4 whitespace-nowrap text-sm font-medium focus:outline-none ${activeTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center justify-center">
                                <FiClock className="mr-2" /> Jadwal Umum
                            </div>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('specific')} 
                            className={`flex-1 py-4 px-4 whitespace-nowrap text-sm font-medium focus:outline-none ${activeTab === 'specific' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center justify-center">
                                <FiUsers className="mr-2" /> Jadwal Khusus
                            </div>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('incidental')} 
                            className={`flex-1 py-4 px-4 whitespace-nowrap text-sm font-medium focus:outline-none ${activeTab === 'incidental' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center justify-center">
                                <FiAlertTriangle className="mr-2" /> Jadwal Insidental
                            </div>
                        </button>
                    </div>
                    
                    <div className="p-6">
                        {activeTab === 'general' && (
                            <div>
                                <p className="text-slate-500 mb-6 text-sm">Jadwal ini berlaku untuk semua kelas yang <strong>tidak</strong> memiliki jadwal khusus.</p>
                                <OperatingHoursEditor hours={formState.operatingHours} onChange={handleGeneralHoursChange} />
                            </div>
                        )}
                        
                        {activeTab === 'specific' && (
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-slate-500 text-sm">Buat jadwal rutin berbeda untuk kelas tertentu (misal: Kelas 1 & 2 selalu pulang lebih awal).</p>
                                    <button type="button" onClick={() => openScheduleModal()} className="bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-indigo-700 flex items-center"><FiPlus className="mr-1"/> Tambah Jadwal</button>
                                </div>
                                
                                {formState.specificSchedules && formState.specificSchedules.length > 0 ? (
                                    <div className="space-y-4">
                                        {formState.specificSchedules.map(schedule => (
                                            <div key={schedule.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-slate-800">{schedule.name}</h3>
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            Kelas: {schedule.classIds.map(id => classes.find(c => c.id === id)?.name).join(', ') || 'Belum ada kelas'}
                                                        </p>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button type="button" onClick={() => openScheduleModal(schedule)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                                                        <button type="button" onClick={() => deleteSpecificSchedule(schedule.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Hapus</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                        <p className="text-slate-500">Belum ada jadwal khusus.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'incidental' && (
                             <div>
                                <div className="flex justify-between items-center mb-6">
                                    <p className="text-slate-500 text-sm">Atur jadwal pulang lebih awal untuk hari tertentu (misal: Rapat Guru, Ujian, Hari Terjepit). <br/><strong>Prioritas Tertinggi:</strong> Jadwal ini akan mengabaikan Jadwal Umum dan Khusus.</p>
                                    <button type="button" onClick={() => setIsDismissalModalOpen(true)} className="bg-indigo-600 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-indigo-700 flex items-center"><FiPlus className="mr-1"/> Tambah Pengecualian</button>
                                </div>

                                {formState.earlyDismissals && formState.earlyDismissals.length > 0 ? (
                                    <div className="space-y-4">
                                        {formState.earlyDismissals.map(dismissal => {
                                            const isPast = new Date(dismissal.date) < new Date(new Date().setHours(0,0,0,0));
                                            return (
                                                <div key={dismissal.id} className={`border border-slate-200 rounded-lg p-4 flex justify-between items-center ${isPast ? 'bg-slate-50 opacity-70' : 'bg-white'}`}>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800">{new Date(dismissal.date).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                                            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full font-semibold">Pulang {dismissal.time}</span>
                                                            {isPast && <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">Sudah Lewat</span>}
                                                        </div>
                                                        <p className="text-sm text-slate-600 mt-1">
                                                            <strong>Alasan:</strong> {dismissal.reason} | 
                                                            <strong> Berlaku:</strong> {dismissal.classIds.length === 0 ? 'Semua Kelas' : dismissal.classIds.map(id => classes.find(c => c.id === id)?.name).join(', ')}
                                                        </p>
                                                    </div>
                                                    <button type="button" onClick={() => deleteDismissal(dismissal.id)} className="text-red-500 hover:text-red-700 p-2"><FiTrash2 /></button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                        <p className="text-slate-500">Belum ada jadwal insidental.</p>
                                    </div>
                                )}
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Holiday Settings */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 sticky top-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Pengaturan Hari Libur</h2>
                    <div className="flex gap-2 mb-4">
                        <input type="date" value={newHoliday} onChange={e => setNewHoliday(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button type="button" onClick={handleAddHoliday} className="bg-indigo-600 text-white font-bold p-2.5 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors"><FiPlus size={20} /></button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {formState.holidays.length > 0 ? formState.holidays.map(holiday => (
                            <div key={holiday} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                <span className="font-medium text-slate-700">{new Date(holiday + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                <button type="button" onClick={() => handleRemoveHoliday(holiday)} className="text-slate-400 hover:text-red-600 p-1"><FiTrash2 /></button>
                            </div>
                        )) : (
                            <p className="text-center text-slate-500 py-4">Belum ada hari libur.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
        
        <div className="mt-6 flex justify-end">
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">
              <FiSave className="mr-2" /> Simpan Pengaturan
            </button>
        </div>
      </form>
      
      {/* Modal for Specific Schedule */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">{editingSchedule ? 'Edit Jadwal Khusus' : 'Tambah Jadwal Khusus'}</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={24}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Jadwal (misal: Kelas Bawah)</label>
                        <input 
                            type="text" 
                            value={scheduleName} 
                            onChange={e => setScheduleName(e.target.value)} 
                            className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Contoh: Kelas 1 & 2"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Kelas</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {classes.map(cls => (
                                <div 
                                    key={cls.id} 
                                    onClick={() => toggleClassSelection(cls.id)}
                                    className={`cursor-pointer p-3 rounded-lg border text-center transition-colors ${selectedClasses.includes(cls.id) ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {cls.name}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">* Kelas yang dipilih akan mengikuti jam operasional di bawah ini, bukan jadwal umum.</p>
                    </div>
                    
                    <hr className="my-6 border-slate-200"/>
                    
                    <OperatingHoursEditor hours={scheduleHours} onChange={setScheduleHours} />
                </div>
                
                <div className="flex justify-end space-x-3 p-5 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button onClick={() => setIsModalOpen(false)} className="bg-white border border-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
                    <button onClick={saveSpecificSchedule} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">Simpan Jadwal</button>
                </div>
            </div>
        </div>
      )}

      {/* Modal for Early Dismissal */}
      {isDismissalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-fade-in">
                <div className="flex justify-between items-center p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Tambah Jadwal Insidental</h2>
                    <button onClick={() => setIsDismissalModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FiX size={24}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                        <input type="date" value={dismissalDate} onChange={e => setDismissalDate(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Jam Pulang Baru</label>
                        <input type="time" value={dismissalTime} onChange={e => setDismissalTime(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                        <p className="text-xs text-slate-500 mt-1">Jam scan pulang akan dibuka otomatis 15-30 menit sebelum jam ini.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Alasan (Wajib)</label>
                        <input type="text" value={dismissalReason} onChange={e => setDismissalReason(e.target.value)} className="w-full py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Contoh: Rapat Dewan Guru"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Berlaku Untuk</label>
                        <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 grid grid-cols-2 gap-2">
                            <label className={`cursor-pointer p-2 rounded border text-center text-sm ${dismissalClasses.length === 0 ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                                <input type="checkbox" className="hidden" checked={dismissalClasses.length === 0} onChange={() => setDismissalClasses([])} />
                                Semua Kelas
                            </label>
                            {classes.map(cls => (
                                <label key={cls.id} className={`cursor-pointer p-2 rounded border text-center text-sm ${dismissalClasses.includes(cls.id) ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200'}`}>
                                    <input type="checkbox" className="hidden" checked={dismissalClasses.includes(cls.id)} onChange={() => toggleDismissalClass(cls.id)} />
                                    {cls.name}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Jika "Semua Kelas" dipilih, pilihan kelas spesifik akan diabaikan.</p>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 p-5 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button onClick={() => setIsDismissalModalOpen(false)} className="bg-white border border-slate-300 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
                    <button onClick={handleAddDismissal} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center transition-colors">Simpan</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

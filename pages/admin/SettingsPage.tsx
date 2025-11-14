import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { SchoolSettings, OperatingHours } from '../../types';
import { FiSave, FiPlus, FiTrash2 } from 'react-icons/fi';

declare const Swal: any;

const SettingsPage: React.FC = () => {
  const { settings, loading, updateSettings } = useSettings();
  const [formState, setFormState] = useState<SchoolSettings | null>(null);
  const [newHoliday, setNewHoliday] = useState('');

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
  
  const handleHoursChange = (dayGroup: OperatingHours['dayGroup'], field: keyof OperatingHours, value: string | boolean) => {
      if (formState) {
          const newHours = formState.operatingHours.map(h => {
              if (h.dayGroup === dayGroup) {
                  if (field === 'lateTolerance' || field === 'scanInBefore' || field === 'scanOutBefore') {
                      const numValue = parseInt(value as string, 10);
                      return { ...h, [field]: isNaN(numValue) ? 0 : numValue };
                  }
                  return { ...h, [field]: value };
              }
              return h;
          });
          setFormState({...formState, operatingHours: newHours});
      }
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
  
  if (loading || !formState) {
      return <div>Memuat pengaturan...</div>
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Pengaturan Sistem</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
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

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Jam Operasional</h2>
                    {formState.operatingHours.map(op => (
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
            </div>
            
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
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
    </div>
  );
};

export default SettingsPage;
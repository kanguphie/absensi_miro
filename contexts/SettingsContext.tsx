
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { SchoolSettings, OperatingHours } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface SettingsContextType {
  settings: SchoolSettings | null;
  loading: boolean;
  updateSettings: (newSettings: SchoolSettings) => Promise<void>;
  getAttendancePeriod: (date: Date) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: SchoolSettings) => {
    setLoading(true);
    const updatedSettings = await api.updateSettings(newSettings);
    setSettings(updatedSettings);
    setLoading(false);
  };

  const getAttendancePeriod = useCallback((date: Date): string => {
      if (!settings) return "MEMUAT...";
      
      const todayStr = (d => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)(date);
      
      // 1. Check for Holiday
      if (settings.holidays.includes(todayStr)) return 'HARI LIBUR';

      // 2. Check for Early Dismissal (Override) for TODAY
      // Since this context function is used for the GENERAL Kiosk Banner, 
      // we check if there's a dismissal that applies to "All Classes" (empty classIds) OR just check the first one.
      // Visual simplification: If *any* early dismissal is active today for the majority, we show "SCAN PULANG" early.
      const earlyDismissal = settings.earlyDismissals?.find(ed => ed.date === todayStr);
      
      // 3. Determine Base Operating Hours
      const day = date.getDay();
      const dayGroup = (day >= 1 && day <= 4) ? 'mon-thu' : (day === 5) ? 'fri' : (day === 6) ? 'sat' : null;
      
      if (!dayGroup) return 'WAKTU ABSENSI DITUTUP';

      const opHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);
      if (!opHours || !opHours.enabled) return 'WAKTU ABSENSI DITUTUP';

      // CLONE to avoid mutation
      const effectiveOpHours = { ...opHours };

      // Apply Override if exists
      if (earlyDismissal) {
          // We assume the kiosk banner should reflect the early dismissal time
          effectiveOpHours.checkOutTime = earlyDismissal.time;
      }

      const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const currentMinutes = timeToMinutes(currentTime);
      const checkInTimeMinutes = timeToMinutes(effectiveOpHours.checkInTime);
      const scanInStartMinutes = checkInTimeMinutes - effectiveOpHours.scanInBefore;

      const checkOutTimeMinutes = timeToMinutes(effectiveOpHours.checkOutTime);
      const scanOutStartMinutes = checkOutTimeMinutes - effectiveOpHours.scanOutBefore;
      const scanOutEndMinutes = timeToMinutes(effectiveOpHours.scanOutEndTime);

      if (currentMinutes >= scanInStartMinutes && currentMinutes < scanOutStartMinutes) {
          return "SCAN MASUK";
      }
      if (currentMinutes >= scanOutStartMinutes && currentMinutes <= scanOutEndMinutes) {
          return "SCAN PULANG";
      }
      return 'WAKTU ABSENSI DITUTUP';
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, getAttendancePeriod }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

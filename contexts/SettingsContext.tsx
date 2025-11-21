
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
      
      // Force Date Format to Asia/Jakarta
      // 1. Get YYYY-MM-DD in Jakarta
      const jakartaDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      
      // 2. Check for Holiday
      if (settings.holidays.includes(jakartaDateStr)) return 'HARI LIBUR';

      // 3. Check for Early Dismissal (Override) for TODAY in Jakarta
      const earlyDismissal = settings.earlyDismissals?.find(ed => ed.date === jakartaDateStr);
      
      // 4. Determine Day of Week in Jakarta
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' });
      const dayMap: {[key: string]: string} = { 'Mon': 'mon-thu', 'Tue': 'mon-thu', 'Wed': 'mon-thu', 'Thu': 'mon-thu', 'Fri': 'fri', 'Sat': 'sat' };
      const dayGroup = dayMap[dayName] as 'mon-thu' | 'fri' | 'sat' | undefined;
      
      if (!dayGroup) return 'WAKTU ABSENSI DITUTUP';

      const opHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);
      if (!opHours || !opHours.enabled) return 'WAKTU ABSENSI DITUTUP';

      // CLONE to avoid mutation
      const effectiveOpHours = { ...opHours };

      // Apply Override if exists
      if (earlyDismissal) {
          effectiveOpHours.checkOutTime = earlyDismissal.time;
      }

      // 5. Get Current Time HH:MM in Jakarta
      const currentTime = date.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false, 
          timeZone: 'Asia/Jakarta' 
      });

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
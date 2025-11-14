import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { Student, SchoolClass, AttendanceLog, AttendanceStatus } from '../types';
import { api } from '../services/api';

declare const Swal: any;

interface DataContextType {
  students: Student[];
  classes: SchoolClass[];
  attendanceLogs: AttendanceLog[];
  loading: boolean;
  recordAttendance: (rfidUid: string) => Promise<{ success: boolean; log?: AttendanceLog; message: string; }>;
  recordAttendanceByNis: (nis: string) => Promise<{ success: boolean; log?: AttendanceLog; message: string; }>;
  refetchData: () => void;
  // Student CRUD
  addStudent: (studentData: Omit<Student, 'id' | 'photoUrl'>) => Promise<void>;
  updateStudent: (studentId: string, studentData: Partial<Omit<Student, 'id'| 'photoUrl'>>) => Promise<void>;
  updateStudentPhoto: (studentId: string, photoDataUrl: string) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  deleteStudentsBatch: (studentIds: string[]) => Promise<void>;
  addStudentsBatch: (newStudents: Omit<Student, 'id' | 'photoUrl'>[]) => Promise<void>;
  // Class CRUD
  addClass: (name: string) => Promise<void>;
  updateClass: (id: string, name: string) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  // Attendance Management
  markAttendance: (studentId: string, status: AttendanceStatus, date: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, classesData, logsData] = await Promise.all([
        api.getStudents(),
        api.getClasses(),
        api.getAttendanceLogs(),
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setAttendanceLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
      Swal.fire('Error', 'Gagal memuat data dari server.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recordAttendance = useCallback(async (rfidUid: string) => {
    const result = await api.recordAttendance(rfidUid);
    if (result.success) {
        // Refetch logs to update the UI
        api.getAttendanceLogs().then(setAttendanceLogs);
    }
    return result;
  }, []);
  
  const recordAttendanceByNis = useCallback(async (nis: string) => {
    const result = await api.recordAttendanceByNis(nis);
    if (result.success) {
        // Refetch logs to update the UI
        api.getAttendanceLogs().then(setAttendanceLogs);
    }
    return result;
  }, []);

  const refetchData = useCallback(() => {
      fetchData();
  }, [fetchData]);

  const addStudent = useCallback(async (studentData: Omit<Student, 'id' | 'photoUrl'>) => {
    await api.addStudent(studentData);
    Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Siswa "${studentData.name}" berhasil ditambahkan.`,
        timer: 2000,
        showConfirmButton: false
    });
    fetchData();
  }, [fetchData]);

  const updateStudent = useCallback(async (studentId: string, studentData: Partial<Omit<Student, 'id'| 'photoUrl'>>) => {
    await api.updateStudent(studentId, studentData);
    Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Data siswa berhasil diperbarui.`,
        timer: 2000,
        showConfirmButton: false
    });
    fetchData();
  }, [fetchData]);
  
  const updateStudentPhoto = useCallback(async (studentId: string, photoDataUrl: string) => {
      await api.updateStudentPhoto(studentId, photoDataUrl);
      // No toast here to prevent spam during batch uploads.
      // No refetch here to prevent performance issues. The calling component should refetch once.
  }, []);

  const deleteStudent = useCallback(async (studentId: string) => {
    const success = await api.deleteStudent(studentId);
    if (success) {
      Swal.fire('Dihapus!', 'Siswa berhasil dihapus.', 'success');
      fetchData();
    } else {
      Swal.fire('Gagal!', 'Gagal menghapus siswa.', 'error');
    }
  }, [fetchData]);

  const deleteStudentsBatch = useCallback(async (studentIds: string[]) => {
    const success = await api.deleteStudentsBatch(studentIds);
    if (success) {
      Swal.fire('Dihapus!', `${studentIds.length} siswa berhasil dihapus.`, 'success');
      fetchData();
    } else {
      Swal.fire('Gagal!', 'Gagal menghapus siswa.', 'error');
    }
  }, [fetchData]);

  const addClass = useCallback(async (name: string) => {
      await api.addClass(name);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Kelas "${name}" berhasil ditambahkan.`,
        timer: 2000,
        showConfirmButton: false
    });
      fetchData();
  }, [fetchData]);

  const updateClass = useCallback(async (id: string, name: string) => {
      await api.updateClass(id, name);
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Kelas berhasil diperbarui.`,
        timer: 2000,
        showConfirmButton: false
    });
      fetchData();
  }, [fetchData]);

  const deleteClass = useCallback(async (id: string) => {
      // Check if any student is in this class
      const isClassInUse = students.some(s => s.classId === id);
      if (isClassInUse) {
          Swal.fire('Gagal!', 'Tidak dapat menghapus kelas karena masih ada siswa di dalamnya.', 'error');
          return;
      }
      const success = await api.deleteClass(id);
      if (success) {
          Swal.fire('Dihapus!', 'Kelas berhasil dihapus.', 'success');
          fetchData();
      } else {
          Swal.fire('Gagal!', 'Gagal menghapus kelas.', 'error');
      }
  }, [students, fetchData]);
  
  const addStudentsBatch = useCallback(async (newStudents: Omit<Student, 'id' | 'photoUrl'>[]) => {
      const result = await api.addStudentsBatch(newStudents);
      if (result.success) {
          Swal.fire('Berhasil!', `${result.added} siswa berhasil diimpor.`, 'success');
          fetchData();
      } else {
          Swal.fire('Gagal!', 'Gagal mengimpor data siswa.', 'error');
      }
  }, [fetchData]);

  const markAttendance = useCallback(async (studentId: string, status: AttendanceStatus, date: string) => {
    const result = await api.markAttendanceManually(studentId, status, date);
    if (result) {
        Swal.fire('Berhasil!', `Status kehadiran siswa telah diperbarui menjadi "${status}".`, 'success');
        fetchData(); // Refetch all data
    } else {
        Swal.fire('Gagal!', 'Gagal memperbarui status kehadiran.', 'error');
    }
  }, [fetchData]);

  return (
    <DataContext.Provider value={{ students, classes, attendanceLogs, loading, recordAttendance, recordAttendanceByNis, refetchData, addStudent, updateStudent, updateStudentPhoto, deleteStudent, deleteStudentsBatch, addStudentsBatch, addClass, updateClass, deleteClass, markAttendance }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
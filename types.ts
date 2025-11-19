
export interface Student {
  id: string;
  nis: string;
  name: string;
  classId: string;
  rfidUid?: string;
  photoUrl: string;
}

export interface SchoolClass {
  id: string;
  name: string;
}

export enum AttendanceStatus {
  PRESENT = 'Tepat Waktu',
  LATE = 'Terlambat',
  LEAVE_EARLY = 'Pulang Cepat',
  ABSENT = 'Alfa',
  SICK = 'Sakit',
  PERMIT = 'Izin',
}

export enum AttendancePeriod {
  CHECK_IN = 'SCAN MASUK',
  CHECK_OUT = 'SCAN PULANG',
  CLOSED = 'WAKTU ABSENSI DITUTUP',
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  studentName: string;
  studentPhotoUrl: string;
  className: string;
  timestamp: Date;
  type: 'in' | 'out';
  status: AttendanceStatus;
}

export interface OperatingHours {
  dayGroup: 'mon-thu' | 'fri' | 'sat';
  checkInTime: string;      // Jam masuk resmi, e.g., "07:00"
  lateTolerance: number;    // Dalam menit, e.g., 15
  scanInBefore: number;     // Menit sebelum jam masuk bisa scan, e.g., 60
  checkOutTime: string;     // Jam pulang resmi, e.g., "13:00"
  scanOutBefore: number;    // Menit sebelum jam pulang bisa scan, e.g., 15
  scanOutEndTime: string;   // Batas akhir scan pulang, e.g., "15:00"
  enabled: boolean;
}

export interface SchoolSettings {
  schoolName: string;
  schoolLogoUrl: string;
  operatingHours: OperatingHours[];
  holidays: string[];
  manualPin?: string; // PIN for protecting manual attendance page
}

export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Superadmin';
}
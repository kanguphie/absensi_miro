import { Student, SchoolClass, AttendanceLog, SchoolSettings, User, AttendanceStatus, AttendancePeriod, OperatingHours } from '../types';

// --- MOCK DATABASE ---
let students: Student[] = [
    // Kelas 1A (5 siswa)
    { id: 's1a1', nis: '250101', name: 'Ahmad Subarjo', classId: 'c1a', rfidUid: '100001', photoUrl: 'https://picsum.photos/seed/250101/200' },
    { id: 's1a2', nis: '250102', name: 'Budi Santoso', classId: 'c1a', rfidUid: '100002', photoUrl: 'https://picsum.photos/seed/250102/200' },
    { id: 's1a3', nis: '250103', name: 'Citra Lestari', classId: 'c1a', rfidUid: '100003', photoUrl: 'https://picsum.photos/seed/250103/200' },
    { id: 's1a4', nis: '250104', name: 'Dewi Anggraini', classId: 'c1a', rfidUid: '0002317778', photoUrl: 'https://picsum.photos/seed/250104/200' },
    { id: 's1a5', nis: '250105', name: 'Eko Prasetyo', classId: 'c1a', rfidUid: '100005', photoUrl: 'https://picsum.photos/seed/250105/200' },
    // Kelas 1B (5 siswa)
    { id: 's1b1', nis: '250201', name: 'Fitriani', classId: 'c1b', rfidUid: '200001', photoUrl: 'https://picsum.photos/seed/250201/200' },
    { id: 's1b2', nis: '250202', name: 'Gunawan', classId: 'c1b', rfidUid: '200002', photoUrl: 'https://picsum.photos/seed/250202/200' },
    { id: 's1b3', nis: '250203', name: 'Herlina', classId: 'c1b', rfidUid: '200003', photoUrl: 'https://picsum.photos/seed/250203/200' },
    { id: 's1b4', nis: '250204', name: 'Indra Permana', classId: 'c1b', rfidUid: '200004', photoUrl: 'https://picsum.photos/seed/250204/200' },
    { id: 's1b5', nis: '250205', name: 'Joko Widodo', classId: 'c1b', rfidUid: '200005', photoUrl: 'https://picsum.photos/seed/250205/200' },
    // Kelas 2A (5 siswa)
    { id: 's2a1', nis: '240101', name: 'Kevin Sanjaya', classId: 'c2a', rfidUid: '300001', photoUrl: 'https://picsum.photos/seed/240101/200' },
    { id: 's2a2', nis: '240102', name: 'Lia Agustina', classId: 'c2a', rfidUid: '300002', photoUrl: 'https://picsum.photos/seed/240102/200' },
    { id: 's2a3', nis: '240103', name: 'Muhammad Rizky', classId: 'c2a', rfidUid: '300003', photoUrl: 'https://picsum.photos/seed/240103/200' },
    { id: 's2a4', nis: '240104', name: 'Nadia Permata', classId: 'c2a', rfidUid: '300004', photoUrl: 'https://picsum.photos/seed/240104/200' },
    { id: 's2a5', nis: '240105', name: 'Omar Abdullah', classId: 'c2a', rfidUid: '300005', photoUrl: 'https://picsum.photos/seed/240105/200' },
    // Kelas 3 (5 siswa)
    { id: 's3a1', nis: '230101', name: 'Putri Ayu', classId: 'c3', rfidUid: '400001', photoUrl: 'https://picsum.photos/seed/230101/200' },
    { id: 's3a2', nis: '230102', name: 'Qori Ramadhan', classId: 'c3', rfidUid: '400002', photoUrl: 'https://picsum.photos/seed/230102/200' },
    { id: 's3a3', nis: '230103', name: 'Rahmat Hidayat', classId: 'c3', rfidUid: '400003', photoUrl: 'https://picsum.photos/seed/230103/200' },
    { id: 's3a4', nis: '230104', name: 'Siti Nurhaliza', classId: 'c3', rfidUid: '400004', photoUrl: 'https://picsum.photos/seed/230104/200' },
    { id: 's3a5', nis: '230105', name: 'Taufik Hidayat', classId: 'c3', rfidUid: '400005', photoUrl: 'https://picsum.photos/seed/230105/200' },
    // Kelas 4 (5 siswa)
    { id: 's4a1', nis: '220101', name: 'Ujang Maman', classId: 'c4', rfidUid: '500001', photoUrl: 'https://picsum.photos/seed/220101/200' },
    { id: 's4a2', nis: '220102', name: 'Vera Susanti', classId: 'c4', rfidUid: '500002', photoUrl: 'https://picsum.photos/seed/220102/200' },
    { id: 's4a3', nis: '220103', name: 'Wahyu Nugroho', classId: 'c4', rfidUid: '500003', photoUrl: 'https://picsum.photos/seed/220103/200' },
    { id: 's4a4', nis: '220104', name: 'Xena Putri', classId: 'c4', rfidUid: '500004', photoUrl: 'https://picsum.photos/seed/220104/200' },
    { id: 's4a5', nis: '220105', name: 'Yanto Basna', classId: 'c4', rfidUid: '500005', photoUrl: 'https://picsum.photos/seed/220105/200' },
    // Kelas 5 (5 siswa)
    { id: 's5a1', nis: '210101', name: 'Zara Adhisty', classId: 'c5', rfidUid: '600001', photoUrl: 'https://picsum.photos/seed/210101/200' },
    { id: 's5a2', nis: '210102', name: 'Amir Mahmud', classId: 'c5', rfidUid: '600002', photoUrl: 'https://picsum.photos/seed/210102/200' },
    { id: 's5a3', nis: '210103', name: 'Bella Graceva', classId: 'c5', rfidUid: '600003', photoUrl: 'https://picsum.photos/seed/210103/200' },
    { id: 's5a4', nis: '210104', name: 'Chandra Liow', classId: 'c5', rfidUid: '600004', photoUrl: 'https://picsum.photos/seed/210104/200' },
    { id: 's5a5', nis: '210105', name: 'Dinda Hauw', classId: 'c5', rfidUid: '600005', photoUrl: 'https://picsum.photos/seed/210105/200' },
    // Kelas 6 (5 siswa)
    { id: 's6a1', nis: '200101', name: 'Evan Dimas', classId: 'c6', rfidUid: '700001', photoUrl: 'https://picsum.photos/seed/200101/200' },
    { id: 's6a2', nis: '200102', name: 'Fara Shakila', classId: 'c6', rfidUid: '700002', photoUrl: 'https://picsum.photos/seed/200102/200' },
    { id: 's6a3', nis: '200103', name: 'Gilang Dirga', classId: 'c6', rfidUid: '700003', photoUrl: 'https://picsum.photos/seed/200103/200' },
    { id: 's6a4', nis: '200104', name: 'Hana Malasan', classId: 'c6', rfidUid: '700004', photoUrl: 'https://picsum.photos/seed/200104/200' },
    { id: 's6a5', nis: '200105', name: 'Iqbal Ramadhan', classId: 'c6', rfidUid: '700005', photoUrl: 'https://picsum.photos/seed/200105/200' },
];

let classes: SchoolClass[] = [
  { id: 'c1a', name: 'Kelas 1A' },
  { id: 'c1b', name: 'Kelas 1B' },
  { id: 'c2a', name: 'Kelas 2A' },
  { id: 'c3', name: 'Kelas 3' },
  { id: 'c4', name: 'Kelas 4' },
  { id: 'c5', name: 'Kelas 5' },
  { id: 'c6', name: 'Kelas 6' },
];

let attendanceLogs: AttendanceLog[] = [];

let settings: SchoolSettings = {
  schoolName: 'MI Islamiyah Rowosari',
  schoolLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/535px-Kementerian_Agama_new_logo.png',
  operatingHours: [
    { dayGroup: 'mon-thu', checkInTime: '07:00', lateTolerance: 15, scanInBefore: 60, checkOutTime: '13:00', scanOutBefore: 15, scanOutEndTime: '15:00', enabled: true },
    { dayGroup: 'fri', checkInTime: '07:00', lateTolerance: 15, scanInBefore: 60, checkOutTime: '11:00', scanOutBefore: 15, scanOutEndTime: '13:00', enabled: true },
    { dayGroup: 'sat', checkInTime: '08:00', lateTolerance: 15, scanInBefore: 45, checkOutTime: '12:00', scanOutBefore: 15, scanOutEndTime: '14:00', enabled: false },
  ],
  holidays: ['2024-12-25'],
};

let users: User[] = [
    {id: 'u1', username: 'admin', role: 'Superadmin'}
];

// --- API HELPER ---
const simulateDelay = (ms: number = 500) => new Promise(res => setTimeout(res, ms));

const toLocalISOString = (date: Date) => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime.split('T')[0];
}

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}


const generateMockLogs = () => {
    const logs: AttendanceLog[] = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // Start from last month

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        const date = new Date(d);
        const dayOfWeek = date.getDay();

        if (dayOfWeek === 0) continue; // Skip Sunday

        const dayGroup = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 'mon-thu' : (dayOfWeek === 5) ? 'fri' : 'sat';
        const opHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);

        if (!opHours || !opHours.enabled) continue;
        
        students.forEach(student => {
            const className = classes.find(c => c.id === student.classId)?.name || '';
            const random = Math.random();
            let status: AttendanceStatus | null = null;

            if (random < 0.03) {
                status = AttendanceStatus.SICK;
            } else if (random < 0.05) {
                status = AttendanceStatus.PERMIT;
            } else if (random < 0.1) {
                // Absent, do nothing
                return;
            }

            if (status) { // Sick or Permit
                const logTime = new Date(date);
                logTime.setHours(7, Math.floor(Math.random() * 30), 0, 0);
                logs.push({
                    id: `log-status-${student.id}-${date.getTime()}`,
                    studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
                    className, timestamp: logTime, type: 'in', status,
                });
                return; // No other logs for this day
            }

            // --- Check-in Log ---
            const lateDeadlineMinutes = timeToMinutes(opHours.checkInTime) + opHours.lateTolerance;
            const isLate = Math.random() > 0.85;
            
            const checkInMinutes = isLate 
                ? lateDeadlineMinutes + Math.floor(Math.random() * 15)
                : timeToMinutes(opHours.checkInTime) - Math.floor(Math.random() * 45);

            const checkInTime = new Date(date);
            checkInTime.setHours(Math.floor(checkInMinutes / 60), checkInMinutes % 60, 0, 0);

            logs.push({
                id: `log-in-${student.id}-${date.getTime()}`,
                studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
                className, timestamp: checkInTime, type: 'in',
                status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
            });
            
            // --- Check-out Log (most students) ---
            if (Math.random() > 0.1) {
              const isEarly = Math.random() > 0.95;
              const checkOutTimeMinutes = timeToMinutes(opHours.checkOutTime);
              const checkOutMinutes = isEarly 
                ? checkOutTimeMinutes - Math.floor(Math.random() * 20)
                : checkOutTimeMinutes + Math.floor(Math.random() * 30);
              
              const checkOutTime = new Date(date);
              checkOutTime.setHours(Math.floor(checkOutMinutes / 60), checkOutMinutes % 60, 0, 0);


              logs.push({
                  id: `log-out-${student.id}-${date.getTime()}`,
                  studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
                  className, timestamp: checkOutTime, type: 'out',
                  status: isEarly ? AttendanceStatus.LEAVE_EARLY : AttendanceStatus.PRESENT
              });
            }
        });
    }
    // Sort logs descending by timestamp
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    attendanceLogs = logs;
};

// Generate logs on initial load
generateMockLogs();

// Utility function used by the API
const getAttendancePeriod = (currentTime: string, opHours: OperatingHours): AttendancePeriod => {
    const currentMinutes = timeToMinutes(currentTime);

    const checkInTimeMinutes = timeToMinutes(opHours.checkInTime);
    const scanInStartMinutes = checkInTimeMinutes - opHours.scanInBefore;

    const checkOutTimeMinutes = timeToMinutes(opHours.checkOutTime);
    const scanOutStartMinutes = checkOutTimeMinutes - opHours.scanOutBefore;
    const scanOutEndMinutes = timeToMinutes(opHours.scanOutEndTime);

    if (currentMinutes >= scanInStartMinutes && currentMinutes < scanOutStartMinutes) {
        return AttendancePeriod.CHECK_IN;
    }
    if (currentMinutes >= scanOutStartMinutes && currentMinutes <= scanOutEndMinutes) {
        return AttendancePeriod.CHECK_OUT;
    }
    return AttendancePeriod.CLOSED;
};

// --- REFACTORED ATTENDANCE LOGIC ---
const _internalRecordAttendance = (student: Student): { success: boolean; log?: AttendanceLog; message: string } => {
    const now = new Date();
    const todayStr = toLocalISOString(now);

    if (settings.holidays.includes(todayStr)) {
      return { success: false, message: 'Hari ini adalah hari libur' };
    }

    const day = now.getDay(); // Sunday - 0, Monday - 1, ...
    const dayGroup = (day >= 1 && day <= 4) ? 'mon-thu' : (day === 5) ? 'fri' : (day === 6) ? 'sat' : null;
    if (!dayGroup) {
      return { success: false, message: 'Absensi tidak tersedia hari ini' };
    }

    const opHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);
    if (!opHours || !opHours.enabled) {
      return { success: false, message: 'Absensi tidak tersedia saat ini' };
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const period = getAttendancePeriod(currentTime, opHours);
    
    if (period === AttendancePeriod.CLOSED) {
        return { success: false, message: 'Waktu absensi ditutup' };
    }
    
    const todayLogs = attendanceLogs.filter(log => log.studentId === student.id && toLocalISOString(new Date(log.timestamp)) === todayStr);

    if (period === AttendancePeriod.CHECK_IN) {
        if (todayLogs.some(log => log.type === 'in')) {
            return { success: false, message: 'Anda sudah absen masuk hari ini' };
        }
        
        const lateDeadlineMinutes = timeToMinutes(opHours.checkInTime) + opHours.lateTolerance;
        const currentMinutes = timeToMinutes(currentTime);
        const status = currentMinutes > lateDeadlineMinutes ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

        const newLog: AttendanceLog = {
            id: `log-${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            studentPhotoUrl: student.photoUrl,
            className: classes.find(c => c.id === student.classId)?.name || '',
            timestamp: now,
            type: 'in',
            status: status
        };
        attendanceLogs.unshift(newLog);
        return { success: true, log: newLog, message: `Selamat Pagi, ${student.name}!`};
    }

    if (period === AttendancePeriod.CHECK_OUT) {
        if (!todayLogs.some(log => log.type === 'in')) {
            return { success: false, message: 'Anda belum absen masuk hari ini' };
        }
        if (todayLogs.some(log => log.type === 'out')) {
            return { success: false, message: 'Anda sudah absen pulang hari ini' };
        }

        const status = timeToMinutes(currentTime) < timeToMinutes(opHours.checkOutTime) ? AttendanceStatus.LEAVE_EARLY : AttendanceStatus.PRESENT;
        const newLog: AttendanceLog = {
            id: `log-${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            studentPhotoUrl: student.photoUrl,
            className: classes.find(c => c.id === student.classId)?.name || '',
            timestamp: now,
            type: 'out',
            status: status
        };
        attendanceLogs.unshift(newLog);
        return { success: true, log: newLog, message: `Selamat Jalan, ${student.name}!`};
    }
    
    return { success: false, message: 'Absensi tidak tersedia saat ini' };
};


// --- API FUNCTIONS ---
export const api = {
  getStudents: async (): Promise<Student[]> => {
    await simulateDelay();
    return JSON.parse(JSON.stringify(students));
  },

  addStudent: async (studentData: Omit<Student, 'id' | 'photoUrl'>): Promise<Student> => {
    await simulateDelay();
    const newStudent: Student = {
        id: `s-${Date.now()}`,
        ...studentData,
        photoUrl: `https://picsum.photos/seed/${studentData.nis}/200`
    };
    students.unshift(newStudent);
    return JSON.parse(JSON.stringify(newStudent));
  },

  updateStudent: async (studentId: string, studentData: Partial<Omit<Student, 'id' | 'photoUrl'>>): Promise<Student | null> => {
      await simulateDelay();
      const studentIndex = students.findIndex(s => s.id === studentId);
      if (studentIndex > -1) {
          students[studentIndex] = { ...students[studentIndex], ...studentData };
          return JSON.parse(JSON.stringify(students[studentIndex]));
      }
      return null;
  },

  updateStudentPhoto: async (studentId: string, photoDataUrl: string): Promise<Student | null> => {
    await simulateDelay(100);
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex > -1) {
        students[studentIndex].photoUrl = photoDataUrl;
        return JSON.parse(JSON.stringify(students[studentIndex]));
    }
    return null;
  },

  deleteStudent: async (studentId: string): Promise<boolean> => {
      await simulateDelay();
      const initialLength = students.length;
      students = students.filter(s => s.id !== studentId);
      return students.length < initialLength;
  },

  deleteStudentsBatch: async (studentIds: string[]): Promise<boolean> => {
    await simulateDelay();
    const initialLength = students.length;
    students = students.filter(s => !studentIds.includes(s.id));
    return students.length < initialLength;
  },
  
  addStudentsBatch: async (newStudentsData: Omit<Student, 'id' | 'photoUrl'>[]): Promise<{success: boolean; added: number}> => {
    await simulateDelay(1000); // Simulate a longer delay for bulk operation
    const addedStudents: Student[] = newStudentsData.map((s, index) => ({
      id: `s-import-${Date.now()}-${index}`,
      nis: s.nis,
      name: s.name,
      classId: s.classId,
      rfidUid: s.rfidUid,
      photoUrl: `https://picsum.photos/seed/${s.nis}/200`,
    }));
    students.unshift(...addedStudents);
    return { success: true, added: addedStudents.length };
  },

  getClasses: async (): Promise<SchoolClass[]> => {
    await simulateDelay(200);
    return JSON.parse(JSON.stringify(classes));
  },
  
  addClass: async (name: string): Promise<SchoolClass> => {
    await simulateDelay();
    const newClass = { id: `c-${Date.now()}`, name };
    classes.push(newClass);
    return JSON.parse(JSON.stringify(newClass));
  },
  
  updateClass: async (id: string, name: string): Promise<SchoolClass | null> => {
    await simulateDelay();
    const classIndex = classes.findIndex(c => c.id === id);
    if (classIndex > -1) {
      classes[classIndex].name = name;
      return JSON.parse(JSON.stringify(classes[classIndex]));
    }
    return null;
  },
  
  deleteClass: async (id: string): Promise<boolean> => {
    await simulateDelay();
    const initialLength = classes.length;
    classes = classes.filter(c => c.id !== id);
    return classes.length < initialLength;
  },

  getAttendanceLogs: async (): Promise<AttendanceLog[]> => {
    await simulateDelay(400);
    return JSON.parse(JSON.stringify(attendanceLogs.map(log => ({...log, timestamp: new Date(log.timestamp)}))));
  },

  getSettings: async (): Promise<SchoolSettings> => {
      await simulateDelay(100);
      return JSON.parse(JSON.stringify(settings));
  },

  updateSettings: async (newSettings: SchoolSettings): Promise<SchoolSettings> => {
    await simulateDelay();
    settings = {...newSettings};
    return JSON.parse(JSON.stringify(settings));
  },
  
  recordAttendance: async (rfidUid: string): Promise<{ success: boolean; log?: AttendanceLog; message: string }> => {
    await simulateDelay(300);
    const student = students.find(s => s.rfidUid === rfidUid);
    if (!student) {
      return { success: false, message: 'Kartu tidak terdaftar' };
    }
    return _internalRecordAttendance(student);
  },

  recordAttendanceByNis: async (nis: string): Promise<{ success: boolean; log?: AttendanceLog; message: string }> => {
    await simulateDelay(300);
    const student = students.find(s => s.nis === nis);
    if (!student) {
      return { success: false, message: 'NIS tidak ditemukan' };
    }
    return _internalRecordAttendance(student);
  },

  login: async (username: string, password: string):Promise<{success: boolean; user?: User, token?: string}> => {
    await simulateDelay();
    if (username === 'admin' && password === 'admin123') {
        const user = users[0];
        return { success: true, user: user, token: 'fake-jwt-token' };
    }
    return { success: false };
  }
};
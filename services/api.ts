
import { Student, SchoolClass, AttendanceLog, SchoolSettings, User, AttendanceStatus } from '../types';

const API_BASE_URL = 'https://apimiro.madarussalamsubah.id/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const parseSettings = (settings: any): SchoolSettings => {
    if (settings) {
        ['operatingHours', 'holidays', 'specificSchedules', 'earlyDismissals'].forEach(field => {
             if (typeof settings[field] === 'string') {
                try {
                    settings[field] = JSON.parse(settings[field]);
                } catch (e) {
                    console.error(`Failed to parse ${field}`, e);
                    settings[field] = []; // fallback to empty array
                }
            }
        });
        // Ensure arrays are initialized if missing from older DB records
        if (!settings.specificSchedules) settings.specificSchedules = [];
        if (!settings.earlyDismissals) settings.earlyDismissals = [];
    }
    return settings;
};

export const api = {
  // --- Student API ---
  getStudents: async (): Promise<Student[]> => {
    const response = await fetch(`${API_BASE_URL}/students`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },
  
  getPublicStudents: async (): Promise<Student[]> => {
    const response = await fetch(`${API_BASE_URL}/students/public-list`);
    return handleResponse(response);
  },

  addStudent: async (studentData: Omit<Student, 'id' | 'photoUrl'>): Promise<Student> => {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(studentData),
    });
    return handleResponse(response);
  },

  updateStudent: async (studentId: string, studentData: Partial<Omit<Student, 'id' | 'photoUrl'>>): Promise<Student | null> => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(studentData),
    });
    return handleResponse(response);
  },

  updateStudentPhoto: async (studentId: string, photoDataUrl: string): Promise<Student | null> => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}/photo`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ photoDataUrl }),
    });
    return handleResponse(response);
  },

  deleteStudent: async (studentId: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);
    return data.success;
  },
  
  deleteStudentsBatch: async (studentIds: string[]): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/students/batch-delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ studentIds }),
    });
    const data = await handleResponse(response);
    return data.success;
  },

  addStudentsBatch: async (newStudentsData: Omit<Student, 'id' | 'photoUrl'>[]): Promise<{success: boolean; added: number}> => {
     const response = await fetch(`${API_BASE_URL}/students/batch-add`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ students: newStudentsData }),
    });
    return handleResponse(response);
  },

  // --- Class API ---
  getClasses: async (): Promise<SchoolClass[]> => {
    const response = await fetch(`${API_BASE_URL}/classes`);
    return handleResponse(response);
  },

  addClass: async (name: string): Promise<SchoolClass> => {
    const response = await fetch(`${API_BASE_URL}/classes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  },

  updateClass: async (id: string, name: string): Promise<SchoolClass | null> => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    return handleResponse(response);
  },

  deleteClass: async (id: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/classes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);
    return data.success;
  },

  // --- Attendance API ---
  getAttendanceLogs: async (): Promise<AttendanceLog[]> => {
    const response = await fetch(`${API_BASE_URL}/attendance/logs`, { headers: getAuthHeaders() });
    const logs = await handleResponse(response);
    // Convert timestamp strings to Date objects
    return logs.map((log: any) => ({...log, timestamp: new Date(log.timestamp)}));
  },

  deleteAttendanceLogsBatch: async (logIds: string[]): Promise<{ success: boolean; deletedCount: number; }> => {
    const response = await fetch(`${API_BASE_URL}/attendance/logs/batch-delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ logIds }),
    });
    return handleResponse(response);
  },

  recordAttendance: async (rfidUid: string): Promise<{ success: boolean; log?: AttendanceLog; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/attendance/record-rfid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidUid }),
    });
    return handleResponse(response);
  },

  recordAttendanceByNis: async (nis: string): Promise<{ success: boolean; log?: AttendanceLog; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/attendance/record-nis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nis }),
    });
    return handleResponse(response);
  },
  
  markAttendanceManually: async (studentId: string, status: AttendanceStatus, date: string): Promise<AttendanceLog | null> => {
    const response = await fetch(`${API_BASE_URL}/attendance/manual`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ studentId, status, date }),
    });
    return handleResponse(response);
  },
  
  // --- Settings API ---
  getSettings: async (): Promise<SchoolSettings> => {
      const response = await fetch(`${API_BASE_URL}/settings`, { headers: getAuthHeaders() });
      const settings = await handleResponse(response);
      return parseSettings(settings);
  },

  updateSettings: async (newSettings: SchoolSettings): Promise<SchoolSettings> => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(newSettings),
    });
    const updatedSettings = await handleResponse(response);
    return parseSettings(updatedSettings);
  },

  // --- Auth API ---
  login: async (username: string, password: string): Promise<{ success: boolean; user?: User; token?: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    return response.json(); // Don't use handleResponse as 401 is a valid failed login
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response.json();
  },
  
  verifyPin: async (pin: string): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
    });
    return response.json();
  }
};


import React from 'react';
import { AttendanceLog } from '../types';

interface AttendanceToastProps {
  log: AttendanceLog;
  message: string;
}

const AttendanceToast: React.FC<AttendanceToastProps> = ({ log, message }) => {
  const statusColor = log.status === 'Tepat Waktu' ? 'bg-green-500' : 
                      log.status === 'Terlambat' ? 'bg-yellow-500' :
                      'bg-blue-500';

  return (
    <div className="flex items-start p-4 bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-xl shadow-2xl w-96 text-gray-800">
      <img src={log.studentPhotoUrl} alt={log.studentName} className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-white/50" />
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <p className="font-bold text-lg text-gray-900">{log.studentName}</p>
          <span className={`px-2 py-1 text-xs font-semibold text-white rounded-full ${statusColor}`}>
            {log.status}
          </span>
        </div>
        <p className="text-gray-600">{log.className}</p>
        <p className="text-gray-500 text-sm mt-1">{message}</p>
      </div>
    </div>
  );
};

export default AttendanceToast;

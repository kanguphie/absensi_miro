
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User, Student, SchoolClass, AttendanceLog, Setting } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { initialSettings } = require('../util/initialData');


const router = express.Router();

// --- Helper Functions ---
const timeToMinutes = (time) => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const getNowInWIB = () => {
    const now = new Date(); // This is the correct universal timestamp for storage.

    // We need parts of the date/time *as they are in WIB* for logic checks.
    // Using a single formatter to get all parts is efficient.
    const partsFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false,
    });

    const parts = partsFormatter.formatToParts(now).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    // Construct YYYY-MM-DD date string using a specific formatter for that format.
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const dateStr = dateFormatter.format(now);

    const timeStr = `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;

    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const day = dayMap[parts.weekday];

    return {
        dateObject: now,      // Correct object for DB storage (current UTC timestamp)
        day,                  // Correct day of the week in WIB
        dateString: dateStr,  // Correct YYYY-MM-DD date string in WIB
        timeString: timeStr,  // Correct HH:mm time string in WIB
    };
};


const getAttendancePeriod = (currentTime, opHours) => {
    const currentMinutes = timeToMinutes(currentTime);
    const checkInTimeMinutes = timeToMinutes(opHours.checkInTime);
    const scanInStartMinutes = checkInTimeMinutes - opHours.scanInBefore;
    const checkOutTimeMinutes = timeToMinutes(opHours.checkOutTime);
    const scanOutStartMinutes = checkOutTimeMinutes - opHours.scanOutBefore;
    const scanOutEndMinutes = timeToMinutes(opHours.scanOutEndTime);

    if (currentMinutes >= scanInStartMinutes && currentMinutes < scanOutStartMinutes) return 'CHECK_IN';
    if (currentMinutes >= scanOutStartMinutes && currentMinutes <= scanOutEndMinutes) return 'CHECK_OUT';
    return 'CLOSED';
};


// --- Auth Routes (Public) ---
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, user: { id: user.id, username: user.username, role: user.role }, token });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- PIN Verification (Public) ---
router.post('/auth/verify-pin', async (req, res) => {
    try {
        const { pin } = req.body;
        const [setting] = await Setting.findOrCreate({ where: { id: 1 } });
        
        if (setting.manualPin === pin) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'PIN Salah' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- Kiosk/Manual Attendance Routes (Public) ---
const internalRecordAttendance = async (student) => {
    const [settingsInstance] = await Setting.findOrCreate({
        where: { id: 1 },
        defaults: initialSettings
    });
    
    if (!settingsInstance) return { success: false, message: 'System settings not configured.' };

    const settings = settingsInstance.get({ plain: true });
    
    // Parsing JSON fields safely
    ['operatingHours', 'holidays', 'specificSchedules', 'earlyDismissals'].forEach(field => {
        if (typeof settings[field] === 'string') {
            try { settings[field] = JSON.parse(settings[field]); }
            catch (e) { 
                console.error(`Error parsing ${field}:`, e); 
                settings[field] = []; 
            }
        }
    });
    // Ensure arrays
    if (!Array.isArray(settings.specificSchedules)) settings.specificSchedules = [];
    if (!Array.isArray(settings.earlyDismissals)) settings.earlyDismissals = [];

    const { dateObject, day, dateString: todayStr, timeString: currentTime } = getNowInWIB();

    if (settings.holidays.includes(todayStr)) {
        return { success: false, message: 'Hari ini adalah hari libur' };
    }

    const dayGroup = (day >= 1 && day <= 4) ? 'mon-thu' : (day === 5) ? 'fri' : (day === 6) ? 'sat' : null;
    if (!dayGroup) return { success: false, message: 'Absensi tidak tersedia hari ini' };

    // === LOGIC FOR DETERMINING SCHEDULE PRIORITY ===
    
    // 0. Determine Base Operating Hours (General Schedule)
    let baseOpHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);
    
    if (!baseOpHours || !baseOpHours.enabled) {
         return { success: false, message: 'Absensi tidak tersedia saat ini untuk kelas ini' };
    }
    
    // Clone to avoid mutating original settings reference
    let finalOpHours = { ...baseOpHours };

    // 1. Check for Specific Schedules (Overrides General)
    // Does this student's class have a specific regular schedule?
    if (settings.specificSchedules.length > 0) {
        const matchedSchedule = settings.specificSchedules.find(schedule => 
            schedule.classIds && schedule.classIds.includes(student.classId)
        );
        
        if (matchedSchedule) {
            const specificDayHours = matchedSchedule.operatingHours.find(h => h.dayGroup === dayGroup);
            if (specificDayHours && specificDayHours.enabled) {
                finalOpHours = { ...specificDayHours };
            }
        }
    }

    // 2. Check for Early Dismissals / Incidental (Overrides Everything)
    // Is there a rule for TODAY?
    if (settings.earlyDismissals.length > 0) {
        const override = settings.earlyDismissals.find(ed => ed.date === todayStr);
        if (override) {
            // Check if this override applies to this student (empty classIds means ALL classes)
            const appliesToStudent = override.classIds.length === 0 || override.classIds.includes(student.classId);
            
            if (appliesToStudent) {
                // Apply the override!
                // We keep check-in time as is, but change check-out time
                finalOpHours.checkOutTime = override.time;
                // Adjust scanOutBefore to ensure it's reasonable (e.g. 30 mins before new time)
                // or keep original if it makes sense. Let's stick to the config but ensure it works.
                // Usually for early dismissal, we want to allow scanning out immediately or a bit before.
            }
        }
    }

    // 3. Calculate Period based on FINAL Operating Hours
    const period = getAttendancePeriod(currentTime, finalOpHours);
    if (period === 'CLOSED') return { success: false, message: 'Waktu absensi ditutup' };

    const startOfDay = new Date(dateObject);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObject);
    endOfDay.setHours(23, 59, 59, 999);

    const todayLogs = await AttendanceLog.findAll({
        where: { studentId: student.id, timestamp: { [Op.between]: [startOfDay, endOfDay] } }
    });

    const studentClass = await SchoolClass.findByPk(student.classId);

    if (period === 'CHECK_IN') {
        if (todayLogs.some(log => log.type === 'in')) {
            return { success: false, message: 'Anda sudah absen masuk hari ini' };
        }
        const lateDeadlineMinutes = timeToMinutes(finalOpHours.checkInTime) + finalOpHours.lateTolerance;
        const currentMinutes = timeToMinutes(currentTime);
        const status = currentMinutes > lateDeadlineMinutes ? 'Terlambat' : 'Tepat Waktu';

        const newLog = await AttendanceLog.create({
            studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
            className: studentClass?.name || '', timestamp: dateObject, type: 'in', status,
        });
        return { success: true, log: newLog, message: `Selamat Pagi, ${student.name}!` };
    }

    if (period === 'CHECK_OUT') {
        if (!todayLogs.some(log => log.type === 'in')) {
            return { success: false, message: 'Anda belum absen masuk hari ini' };
        }
        if (todayLogs.some(log => log.type === 'out')) {
            return { success: false, message: 'Anda sudah absen pulang hari ini' };
        }
        const status = timeToMinutes(currentTime) < timeToMinutes(finalOpHours.checkOutTime) ? 'Pulang Cepat' : 'Tepat Waktu';
        
        const newLog = await AttendanceLog.create({
            studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
            className: studentClass?.name || '', timestamp: dateObject, type: 'out', status,
        });
        return { success: true, log: newLog, message: `Selamat Jalan, ${student.name}!` };
    }

    return { success: false, message: 'Absensi tidak tersedia saat ini' };
};

router.post('/attendance/record-rfid', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { rfidUid: req.body.rfidUid } });
        if (!student) return res.status(404).json({ success: false, message: 'Kartu tidak terdaftar' });
        const result = await internalRecordAttendance(student);
        res.json(result);
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/attendance/record-nis', async (req, res) => {
    try {
        const student = await Student.findOne({ where: { nis: req.body.nis } });
        if (!student) return res.status(404).json({ success: false, message: 'NIS tidak ditemukan' });
        const result = await internalRecordAttendance(student);
        res.json(result);
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// --- Public Data Routes ---
router.get('/settings', async (req, res) => {
    try {
        const [setting] = await Setting.findOrCreate({
            where: { id: 1 },
            defaults: initialSettings
        });
        res.json(setting);
    } catch (error) {
        console.error("Error fetching settings (Attempt 1):", error);
        
        // Self-Healing: If first attempt fails (likely due to missing column/schema mismatch),
        // attempt to sync the Setting model and retry.
        try {
            console.log("Attempting to sync Setting model...");
            await Setting.sync({ alter: true });
            
            const [setting] = await Setting.findOrCreate({
                where: { id: 1 },
                defaults: initialSettings
            });
            console.log("Self-healing successful, settings returned.");
            return res.json(setting);
        } catch (retryError) {
             console.error("Retry failed:", retryError);
        }

        res.status(500).json({ message: "Gagal memuat pengaturan dari database." });
    }
});

router.get('/students/public-list', async (req, res) => {
    try {
        const students = await Student.findAll({
            attributes: ['id', 'nis', 'name', 'classId', 'photoUrl'],
            order: [['name', 'ASC']],
        });
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Gagal memuat daftar siswa." });
    }
});

router.get('/classes', async (req, res) => res.json(await SchoolClass.findAll({ order: [['name', 'ASC']] })));


// --- Protected Routes ---
router.use(authMiddleware);

// Auth
router.put('/auth/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        const user = await User.findByPk(userId);
        if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(400).json({ success: false, message: 'Password lama salah' });
        }

        const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
        await user.update({ password: hashedNewPassword });
        res.json({ success: true, message: 'Password berhasil diubah' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengubah password' });
    }
});

// Students
router.get('/students', async (req, res) => res.json(await Student.findAll({ include: SchoolClass, order: [['name', 'ASC']] })));
router.post('/students', async (req, res) => res.status(201).json(await Student.create(req.body)));
router.put('/students/:id', async (req, res) => {
    await Student.update(req.body, { where: { id: req.params.id } });
    res.json(await Student.findByPk(req.params.id));
});
router.put('/students/:id/photo', async (req, res) => {
    await Student.update({ photoUrl: req.body.photoDataUrl }, { where: { id: req.params.id } });
    res.json(await Student.findByPk(req.params.id));
});
router.delete('/students/:id', async (req, res) => {
    const deleted = await Student.destroy({ where: { id: req.params.id } });
    res.json({ success: deleted > 0 });
});
router.post('/students/batch-delete', async (req, res) => {
    const deleted = await Student.destroy({ where: { id: { [Op.in]: req.body.studentIds } } });
    res.json({ success: deleted > 0 });
});
router.post('/students/batch-add', async (req, res) => {
    const newStudents = req.body.students.map(s => ({
        ...s,
        photoUrl: `https://picsum.photos/seed/${s.nis}/200`
    }));
    const created = await Student.bulkCreate(newStudents);
    res.json({ success: true, added: created.length });
});

// Classes
router.post('/classes', async (req, res) => res.status(201).json(await SchoolClass.create(req.body)));
router.put('/classes/:id', async (req, res) => {
    await SchoolClass.update(req.body, { where: { id: req.params.id } });
    res.json(await SchoolClass.findByPk(req.params.id));
});
router.delete('/classes/:id', async (req, res) => {
    const studentCount = await Student.count({ where: { classId: req.params.id } });
    if (studentCount > 0) {
        return res.status(400).json({ success: false, message: 'Tidak dapat menghapus kelas karena masih ada siswa di dalamnya.' });
    }
    const deleted = await SchoolClass.destroy({ where: { id: req.params.id } });
    res.json({ success: deleted > 0 });
});

// Attendance Logs
router.get('/attendance/logs', async (req, res) => res.json(await AttendanceLog.findAll({ order: [['timestamp', 'DESC']] })));

router.post('/attendance/logs/batch-delete', async (req, res) => {
    const { logIds } = req.body;
    if (!logIds || !Array.isArray(logIds) || logIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Log IDs must be a non-empty array.' });
    }
    const deletedCount = await AttendanceLog.destroy({ where: { id: { [Op.in]: logIds } } });
    res.json({ success: true, deletedCount });
});

router.post('/attendance/manual', async (req, res) => {
    const { studentId, status, date } = req.body;
    const student = await Student.findByPk(studentId, { include: SchoolClass });
    if (!student) return res.status(404).json(null);

    const logDate = new Date(date);
    const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

    await AttendanceLog.destroy({ where: { studentId, timestamp: { [Op.between]: [startOfDay, endOfDay] } } });

    const newLog = await AttendanceLog.create({
        studentId, status, timestamp: new Date(`${date}T00:00:00Z`), // Set to midnight UTC, which is 7 AM WIB
        type: 'in', // Manual entries are always 'in' type
        studentName: student.name, studentPhotoUrl: student.photoUrl,
        className: student.SchoolClass?.name || ''
    });
    res.status(201).json(newLog);
});

// Settings
router.put('/settings', async (req, res) => {
    const [setting] = await Setting.findOrCreate({ where: { id: 1 } });
    await setting.update(req.body);
    res.json(setting);
});

module.exports = router;

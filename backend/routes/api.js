
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

const toLocalISOString = (date) => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(date - tzoffset)).toISOString().split('T')[0];
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

// --- Kiosk/Manual Attendance Routes (Public) ---
const internalRecordAttendance = async (student) => {
    // Use findOrCreate to ensure settings always exist, making this endpoint robust
    const [settings] = await Setting.findOrCreate({
        where: { id: 1 },
        defaults: initialSettings
    });
    
    if (!settings) return { success: false, message: 'System settings not configured.' };

    const now = new Date();
    const todayStr = toLocalISOString(now);

    if (settings.holidays.includes(todayStr)) {
        return { success: false, message: 'Hari ini adalah hari libur' };
    }

    const day = now.getDay();
    const dayGroup = (day >= 1 && day <= 4) ? 'mon-thu' : (day === 5) ? 'fri' : (day === 6) ? 'sat' : null;
    if (!dayGroup) return { success: false, message: 'Absensi tidak tersedia hari ini' };

    const opHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);
    if (!opHours || !opHours.enabled) return { success: false, message: 'Absensi tidak tersedia saat ini' };

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const period = getAttendancePeriod(currentTime, opHours);

    if (period === 'CLOSED') return { success: false, message: 'Waktu absensi ditutup' };

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todayLogs = await AttendanceLog.findAll({
        where: { studentId: student.id, timestamp: { [Op.between]: [startOfDay, endOfDay] } }
    });

    const studentClass = await SchoolClass.findByPk(student.classId);

    if (period === 'CHECK_IN') {
        if (todayLogs.some(log => log.type === 'in')) {
            return { success: false, message: 'Anda sudah absen masuk hari ini' };
        }
        const lateDeadlineMinutes = timeToMinutes(opHours.checkInTime) + opHours.lateTolerance;
        const currentMinutes = timeToMinutes(currentTime);
        const status = currentMinutes > lateDeadlineMinutes ? 'Terlambat' : 'Tepat Waktu';

        const newLog = await AttendanceLog.create({
            studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
            className: studentClass?.name || '', timestamp: now, type: 'in', status,
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
        const status = timeToMinutes(currentTime) < timeToMinutes(opHours.checkOutTime) ? 'Pulang Cepat' : 'Tepat Waktu';
        
        const newLog = await AttendanceLog.create({
            studentId: student.id, studentName: student.name, studentPhotoUrl: student.photoUrl,
            className: studentClass?.name || '', timestamp: now, type: 'out', status,
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

// --- Public Settings Route ---
// This is intentionally made public so kiosk/login page can fetch school name/logo
router.get('/settings', async (req, res) => {
    try {
        const [setting] = await Setting.findOrCreate({
            where: { id: 1 },
            defaults: initialSettings
        });
        res.json(setting);
    } catch (error) {
        console.error("Error fetching settings:", error);
        res.status(500).json({ message: "Gagal memuat pengaturan dari database." });
    }
});


// --- Protected Routes ---
router.use(authMiddleware);

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
router.get('/classes', async (req, res) => res.json(await SchoolClass.findAll({ order: [['name', 'ASC']] })));
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
router.post('/attendance/manual', async (req, res) => {
    const { studentId, status, date } = req.body;
    const student = await Student.findByPk(studentId, { include: SchoolClass });
    if (!student) return res.status(404).json(null);

    const logDate = new Date(date);
    const startOfDay = new Date(logDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(logDate); endOfDay.setHours(23, 59, 59, 999);

    await AttendanceLog.destroy({ where: { studentId, timestamp: { [Op.between]: [startOfDay, endOfDay] } } });

    const newLog = await AttendanceLog.create({
        studentId, status, timestamp: new Date(`${date}T07:00:00`),
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
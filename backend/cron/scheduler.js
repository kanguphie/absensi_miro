const cron = require('node-cron');
const { Op } = require('sequelize');
const { Student, AttendanceLog, Setting, SchoolClass } = require('../models');
const { initialSettings } = require('../util/initialData');

const timeToMinutes = (time) => {
    if (!time || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const getTodayWIB = () => {
    const now = new Date();
    const partsFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
        weekday: 'short'
    });

    const parts = partsFormatter.formatToParts(now).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});

    // Day mapping: Sun=0, Mon=1, ... Sat=6
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    
    return {
        dateObject: now,
        day: dayMap[parts.weekday],
        dateString: `${parts.year}-${parts.month}-${parts.day}`, // YYYY-MM-DD
        timeString: `${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}` // HH:mm
    };
};

const runAutoCheckout = async () => {
    console.log('[Cron] Checking for missing checkouts...');

    try {
        // 1. Get Settings
        const [settingsInstance] = await Setting.findOrCreate({ where: { id: 1 }, defaults: initialSettings });
        const settings = settingsInstance.get({ plain: true });
        
        // Parse JSON fields
        ['operatingHours', 'holidays', 'specificSchedules', 'earlyDismissals'].forEach(field => {
            if (typeof settings[field] === 'string') {
                try { settings[field] = JSON.parse(settings[field]); } catch (e) { settings[field] = []; }
            }
        });

        const { dateString, timeString, day, dateObject } = getTodayWIB();

        // 2. Check if today is holiday
        if (settings.holidays.includes(dateString)) return;

        // 3. Determine Schedule
        // Simple logic: Use General Schedule for now. 
        // (Handling specific schedules per class in cron is complex, assuming general schedule applies for cutoff)
        const dayGroup = (day >= 1 && day <= 4) ? 'mon-thu' : (day === 5) ? 'fri' : (day === 6) ? 'sat' : null;
        if (!dayGroup) return;

        let opHours = settings.operatingHours.find(h => h.dayGroup === dayGroup);
        if (!opHours || !opHours.enabled) return;

        // Check for Early Dismissal Override
        const dismissal = settings.earlyDismissals.find(d => d.date === dateString);
        
        // Determine the Cutoff Time (EndTime)
        // If early dismissal exists, we assume the cutoff is reasonably after the dismissal time (e.g., +2 hours)
        // or use the standard scanOutEndTime if not specified.
        // For simplicity, we stick to scanOutEndTime from opHours unless strictly overridden.
        
        let cutoffTime = opHours.scanOutEndTime; // e.g., "15:00"

        // Check if NOW is past the Cutoff Time + Buffer (e.g., 1 minute)
        // We add a buffer to ensure we don't run exactly at the closing second while someone is scanning.
        const currentMinutes = timeToMinutes(timeString);
        const cutoffMinutes = timeToMinutes(cutoffTime);

        // Run only if we are PAST the scan end time
        if (currentMinutes <= cutoffMinutes) {
            // console.log(`[Cron] Still within scan hours. Current: ${timeString}, Cutoff: ${cutoffTime}`);
            return;
        }

        // 4. Find Students who Checked IN but NOT Checked OUT today
        const startOfDay = new Date(dateObject); startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date(dateObject); endOfDay.setHours(23,59,59,999);

        // Get all logs for today
        const logs = await AttendanceLog.findAll({
            where: { timestamp: { [Op.between]: [startOfDay, endOfDay] } }
        });

        const checkInMap = new Map(); // studentId -> log
        const checkOutSet = new Set(); // studentIds who checked out

        logs.forEach(log => {
            if (log.type === 'in') checkInMap.set(log.studentId, log);
            if (log.type === 'out') checkOutSet.add(log.studentId);
        });

        // Identify targets
        const studentsForgotCheckout = [];
        for (let [studentId, inLog] of checkInMap) {
            if (!checkOutSet.has(studentId)) {
                studentsForgotCheckout.push({
                    studentId: studentId,
                    studentName: inLog.studentName,
                    studentPhotoUrl: inLog.studentPhotoUrl,
                    className: inLog.className
                });
            }
        }

        if (studentsForgotCheckout.length === 0) return;

        console.log(`[Cron] Found ${studentsForgotCheckout.length} students with missing checkout.`);

        // 5. Bulk Insert Auto-Checkout Logs
        const newLogs = studentsForgotCheckout.map(s => ({
            id: require('crypto').randomUUID(),
            studentId: s.studentId,
            studentName: s.studentName,
            studentPhotoUrl: s.studentPhotoUrl,
            className: s.className,
            timestamp: new Date(), // Current time (processed time)
            type: 'out',
            status: 'Tidak Scan Pulang'
        }));

        await AttendanceLog.bulkCreate(newLogs);
        console.log(`[Cron] Successfully recorded 'Tidak Scan Pulang' for ${newLogs.length} students.`);

    } catch (error) {
        console.error('[Cron] Error in runAutoCheckout:', error);
    }
};

const initScheduler = () => {
    // Run every 15 minutes to ensure we catch it, but logic handles duplicates (by checking existing logs)
    // However, to be safe against duplicates, we should refine the query or just rely on the fact 
    // that once we insert the 'out' log, the next run won't find them in "studentsForgotCheckout".
    // Cron syntax: */15 * * * * (Every 15 minutes)
    cron.schedule('*/15 * * * *', () => {
        runAutoCheckout();
    });
    
    console.log('Scheduler initialized: Auto-Checkout check every 15 minutes.');
};

module.exports = initScheduler;
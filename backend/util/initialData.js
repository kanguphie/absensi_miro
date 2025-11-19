
const initialAdmin = {
    username: 'admin',
    password: 'admin123',
    role: 'Superadmin'
};

const initialSettings = {
    schoolName: 'MI Islamiyah Rowosari',
    schoolLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Kementerian_Agama_new_logo.png/535px-Kementerian_Agama_new_logo.png',
    operatingHours: [
        { dayGroup: 'mon-thu', checkInTime: '07:00', lateTolerance: 15, scanInBefore: 60, checkOutTime: '13:00', scanOutBefore: 15, scanOutEndTime: '15:00', enabled: true },
        { dayGroup: 'fri', checkInTime: '07:00', lateTolerance: 15, scanInBefore: 60, checkOutTime: '11:00', scanOutBefore: 15, scanOutEndTime: '13:00', enabled: true },
        { dayGroup: 'sat', checkInTime: '08:00', lateTolerance: 15, scanInBefore: 45, checkOutTime: '12:00', scanOutBefore: 15, scanOutEndTime: '14:00', enabled: false },
    ],
    specificSchedules: [],
    holidays: ['2024-12-25'],
    manualPin: '123456'
};

const initialClasses = [
    { name: '1A' }, { name: '1B' }, { name: '2A' }, { name: '3' }, { name: '4' }, { name: '5' }, { name: '6' },
];

const initialStudents = [
    { nis: '250101', name: 'Ahmad Subarjo', className: '1A', rfidUid: '100001', photoUrl: 'https://picsum.photos/seed/250101/200' },
    { nis: '250102', name: 'Budi Santoso', className: '1A', rfidUid: '100002', photoUrl: 'https://picsum.photos/seed/250102/200' },
    { nis: '250103', name: 'Citra Lestari', className: '1A', rfidUid: '100003', photoUrl: 'https://picsum.photos/seed/250103/200' },
    { nis: '250104', name: 'Dewi Anggraini', className: '1A', rfidUid: '0002317778', photoUrl: 'https://picsum.photos/seed/250104/200' },
    { nis: '250105', name: 'Eko Prasetyo', className: '1A', rfidUid: '100005', photoUrl: 'https://picsum.photos/seed/250105/200' },
    { nis: '250201', name: 'Fitriani', className: '1B', rfidUid: '200001', photoUrl: 'https://picsum.photos/seed/250201/200' },
    { nis: '250202', name: 'Gunawan', className: '1B', rfidUid: '200002', photoUrl: 'https://picsum.photos/seed/250202/200' },
    { nis: '250203', name: 'Herlina', className: '1B', rfidUid: '200003', photoUrl: 'https://picsum.photos/seed/250203/200' },
    { nis: '240101', name: 'Kevin Sanjaya', className: '2A', rfidUid: '300001', photoUrl: 'https://picsum.photos/seed/240101/200' },
    { nis: '240102', name: 'Lia Agustina', className: '2A', rfidUid: '300002', photoUrl: 'https://picsum.photos/seed/240102/200' },
    { nis: '230101', name: 'Putri Ayu', className: '3', rfidUid: '400001', photoUrl: 'https://picsum.photos/seed/230101/200' },
    { nis: '230102', name: 'Qori Ramadhan', className: '3', rfidUid: '400002', photoUrl: 'https://picsum.photos/seed/230102/200' },
    { nis: '220101', name: 'Ujang Maman', className: '4', rfidUid: '500001', photoUrl: 'https://picsum.photos/seed/220101/200' },
    { nis: '210101', name: 'Zara Adhisty', className: '5', rfidUid: '600001', photoUrl: 'https://picsum.photos/seed/210101/200' },
    { nis: '200101', name: 'Evan Dimas', className: '6', rfidUid: '700001', photoUrl: 'https://picsum.photos/seed/200101/200' },
];

module.exports = {
    initialAdmin,
    initialSettings,
    initialClasses,
    initialStudents
};
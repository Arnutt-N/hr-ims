
export const MOCK_DB = {
    users: [
        { id: 1, name: 'Admin User', role: 'admin', department: 'IT Management', email: 'admin@ims.pro', status: 'active', avatar: 'https://i.pravatar.cc/150?u=1' },
        { id: 2, name: 'Somchai Staff', role: 'user', department: 'Sales Dept', email: 'somchai@ims.pro', status: 'active', avatar: 'https://i.pravatar.cc/150?u=8' },
        { id: 3, name: 'Somsri Accounting', role: 'user', department: 'Accounting', email: 'somsri@ims.pro', status: 'inactive', avatar: 'https://i.pravatar.cc/150?u=5' }
    ],
    inventory: [
        { id: 101, name: 'MacBook Pro M2', category: 'IT Equipment', type: 'durable', serial: 'MBP-2023-001', status: 'available', image: '💻', stock: 1 },
        { id: 102, name: 'Projector Epson', category: 'Audio Visual', type: 'durable', serial: 'PJ-EPS-099', status: 'borrowed', image: '📽️', stock: 1 },
        { id: 103, name: 'Canon DSLR 80D', category: 'Camera', type: 'durable', serial: 'CAM-80D-005', status: 'available', image: '📷', stock: 1 },
        { id: 104, name: 'A4 Paper (Double A)', category: 'Office Supply', type: 'consumable', serial: 'SUP-A4-001', status: 'available', image: '📄', stock: 50 },
        { id: 105, name: 'Microphone Shure', category: 'Audio Visual', type: 'durable', serial: 'MIC-SH-001', status: 'available', image: '🎤', stock: 1 },
        { id: 106, name: 'Blue Pen Box', category: 'Office Supply', type: 'consumable', serial: 'SUP-PEN-022', status: 'available', image: '🖊️', stock: 20 },
        { id: 107, name: 'Dell Monitor 24"', category: 'IT Equipment', type: 'durable', serial: 'DEL-24-112', status: 'maintenance', image: '🖥️', stock: 1 },
    ],
    myAssets: [
        { id: 1, itemId: 102, name: 'Projector Epson', serial: 'PJ-EPS-099', borrowDate: '2023-10-20', lastCheckDate: '2023-10-20', status: 'normal' },
        { id: 2, itemId: 101, name: 'MacBook Pro M2 (Old)', serial: 'MBP-2021-OLD', borrowDate: '2023-10-01', lastCheckDate: '2023-10-08', status: 'warning' }
    ],
    requests: [
        { id: 1, user: 'Somchai Staff', items: 'A4 Paper (x2)', date: '2023-10-26', status: 'pending', type: 'withdraw' },
        { id: 2, user: 'Somchai Staff', items: 'Canon DSLR 80D', date: '2023-10-26', status: 'pending', type: 'borrow' },
        { id: 3, user: 'Somchai Staff', items: 'Dell Monitor 24"', date: '2023-10-27', status: 'pending', type: 'return', assetId: 999 }
    ],
    history: [
        { id: 1, date: '2023-10-25', user: 'Somchai Staff', action: 'Borrow', item: 'Projector Epson', status: 'Active' },
        { id: 2, date: '2023-10-24', user: 'Admin User', action: 'Restock', item: 'A4 Paper', status: 'Completed' },
        { id: 3, date: '2023-10-20', user: 'Somchai Staff', action: 'Return', item: 'Microphone Shure', status: 'Completed' }
    ],
    notifications: [
        { id: 1, text: 'New request from Somchai Staff', time: '10 min ago', read: false },
        { id: 2, text: 'Printer HP-01 maintenance due', time: '2 hours ago', read: false },
        { id: 3, text: 'Your request #REQ-005 approved', time: '1 day ago', read: true },
    ],
    settings: {
        orgName: 'IMS Corporation',
        borrowLimit: 7,
        checkInterval: 7,
        maintenanceAlert: true
    }
};

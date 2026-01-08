
import React from 'react';

const StatusBadge = ({ status }) => {
    const styles = {
        available: 'bg-emerald-100 text-emerald-700 border-emerald-200 ring-emerald-50',
        borrowed: 'bg-amber-100 text-amber-700 border-amber-200 ring-amber-50',
        maintenance: 'bg-rose-100 text-rose-700 border-rose-200 ring-rose-50',
    };

    const labels = {
        available: 'Available',
        borrowed: 'Borrowed',
        maintenance: 'Repair'
    };

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ring-2 uppercase tracking-wide shadow-sm ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {labels[status] || status}
        </span>
    );
};

export default StatusBadge;

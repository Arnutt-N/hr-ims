
import React from 'react';
import { ChevronRight } from 'lucide-react';

const SidebarItem = ({ icon, label, active, onClick, isOpen, count, isSubItem, hasSubMenu, isExpanded }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full p-3.5 rounded-xl transition-all duration-300 group relative my-1
      ${active
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
      ${isSubItem ? 'pl-11 text-sm' : ''}
    `}
    >
        <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-300 transition-colors'} ${!isOpen && 'mx-auto'}`}>
            {React.cloneElement(icon, { size: isSubItem ? 18 : 22 })}
        </div>

        {isOpen && (
            <div className="flex-1 flex justify-between items-center ml-4 overflow-hidden">
                <span className={`font-medium tracking-wide whitespace-nowrap ${isSubItem ? 'font-normal text-slate-300' : ''}`}>{label}</span>
                {hasSubMenu ? (
                    <ChevronRight size={16} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                ) : (
                    null
                )}
            </div>
        )}

        {count > 0 && (
            <span className={`absolute ${isOpen ? 'right-2 top-1/2 -translate-y-1/2' : 'top-1 right-1'} bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md border border-rose-400 min-w-[1.25rem]`}>
                {count}
            </span>
        )}
    </button>
);

export default SidebarItem;

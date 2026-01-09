import { Bell } from 'lucide-react';

export function Header() {
    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
            <div className="md:hidden" /> {/* Spacer for mobile menu button */}

            <div className="flex items-center gap-4 ml-auto">
                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-900">Admin User</p>
                        <p className="text-xs text-slate-500">ICT Department</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        AD
                    </div>
                </div>
            </div>
        </header>
    );
}

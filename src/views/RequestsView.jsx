
import React from 'react';

const RequestsView = ({ requests = [], onAction }) => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Pending Requests</h2>
                    <p className="text-slate-500">Approve or reject inventory requests from users.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto main-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">{req.date}</td>
                                    <td className="px-6 py-4 font-bold">{req.user}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                      ${req.type === 'withdraw' ? 'bg-blue-100 text-blue-700' :
                                                req.type === 'return' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {req.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{req.items}</td>
                                    <td className="px-6 py-4 text-center">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => onAction(req.id, 'approved')} className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-xs font-bold">
                                                    {req.type === 'return' ? 'Receive' : 'Approve'}
                                                </button>
                                                <button onClick={() => onAction(req.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-bold">Reject</button>
                                            </div>
                                        ) : (
                                            <span className={`font-bold uppercase text-xs ${req.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>{req.status}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RequestsView;

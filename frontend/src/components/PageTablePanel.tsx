import React from 'react';
import { Database } from 'lucide-react';
import { SimulationStepEvent } from '../types';

interface PageTablePanelProps {
  event: SimulationStepEvent;
}

export const PageTablePanel: React.FC<PageTablePanelProps> = ({ event }) => {
  const entries = Object.entries(event.page_table).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-4 h-4 text-cyan-400" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">Page Table State</h3>
          <p className="text-xs text-slate-400">Virtual pages mapped to physical frames after this reference.</p>
        </div>
      </div>
      <div className="overflow-x-auto border border-dark-750 rounded-lg">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-dark-850 text-slate-400">
            <tr>
              <th className="px-3 py-2">Virtual page</th>
              <th className="px-3 py-2">Valid</th>
              <th className="px-3 py-2">Present</th>
              <th className="px-3 py-2">Physical frame</th>
              <th className="px-3 py-2">Dirty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {entries.map(([page, entry]) => (
              <tr key={page} className="text-slate-300">
                <td className="px-3 py-2 font-bold text-white">Page {page}</td>
                <td className="px-3 py-2 text-emerald-300">{entry.valid ? 'Yes' : 'No'}</td>
                <td className={`px-3 py-2 ${entry.present ? 'text-emerald-300' : 'text-slate-500'}`}>{entry.present ? 'Resident' : 'Not resident'}</td>
                <td className="px-3 py-2">{entry.frame === null ? '—' : `Frame ${entry.frame}`}</td>
                <td className={`px-3 py-2 ${entry.dirty ? 'text-amber-300' : 'text-slate-500'}`}>{entry.dirty ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

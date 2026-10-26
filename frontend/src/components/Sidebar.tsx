import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  GitCompare,
  Brain,
  Flame,
  Users,
  FlaskConical,
  GraduationCap,
  Database,
  Server
} from 'lucide-react';

export type NavItemKey =
  | 'overview'
  | 'simulator'
  | 'algorithms'
  | 'prediction'
  | 'thrashing'
  | 'multiprocess'
  | 'experiments'
  | 'learn';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  backendOnline: boolean;
  lstmStatus?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  backendOnline,
  lstmStatus = 'untrained'
}) => {
  const navItems: { key: NavItemKey; label: string; icon: React.ComponentType<{ className?: string }>; tag?: string }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'simulator', label: 'Simulator', icon: Cpu },
    { key: 'algorithms', label: 'Algorithms', icon: GitCompare },
    { key: 'prediction', label: 'Prediction Models', icon: Brain },
    { key: 'thrashing', label: 'Memory Pressure', icon: Flame },
    { key: 'multiprocess', label: 'Process Allocation', icon: Users },
    { key: 'experiments', label: 'Experiments', icon: FlaskConical },
    { key: 'learn', label: 'Reference', icon: GraduationCap }
  ];

  return (
    <aside className="w-60 bg-dark-900 border-r border-dark-750 flex flex-col justify-between h-screen shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-dark-750">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-slate-200 flex items-center justify-center text-dark-950">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-[0.16em] text-white flex items-center gap-1.5">
                MEMORA
              </h1>
              <p className="text-[10px] text-slate-500">
                Virtual memory simulator
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectTab(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-200 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-dark-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.tag && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider ${
                      isActive
                        ? 'bg-indigo-700 text-indigo-100'
                        : item.tag === 'VIVA'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                        : 'bg-violet-950/80 text-violet-300 border border-violet-800/40'
                    }`}
                  >
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="p-4 border-t border-dark-750/60 bg-dark-950/50">
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              Backend API
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className={backendOnline ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                {backendOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              LSTM model
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                lstmStatus === 'trained'
                  ? 'bg-violet-950 text-violet-300 border border-violet-700/60'
                  : 'bg-dark-800 text-slate-400'
              }`}
            >
              {lstmStatus}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-dark-800 text-[10px] text-slate-500 text-center font-mono">
          OSDS · Educational simulator
        </div>
      </div>
    </aside>
  );
};

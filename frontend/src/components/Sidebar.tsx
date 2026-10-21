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
  Sparkles,
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
    { key: 'simulator', label: 'Memory Simulator', icon: Cpu },
    { key: 'algorithms', label: 'Algorithm Lab', icon: GitCompare },
    { key: 'prediction', label: 'AI Prediction Center', icon: Brain, tag: 'ML' },
    { key: 'thrashing', label: 'Thrashing Monitor', icon: Flame },
    { key: 'multiprocess', label: 'Multi-Process Manager', icon: Users },
    { key: 'experiments', label: 'Experiments & Reports', icon: FlaskConical },
    { key: 'learn', label: 'Learn OS Concepts', icon: GraduationCap, tag: 'VIVA' }
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-750/70 flex flex-col justify-between h-screen shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-dark-750/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wider text-white font-mono flex items-center gap-1.5">
                MEMORA
                <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-700/50 px-1.5 py-0.2 rounded font-mono">
                  v1.0
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 tracking-tight font-sans">
                Predictive & Adaptive Paging
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectTab(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-700/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-dark-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              PyTorch LSTM
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
          OSDS Course Project • Academic Simulator
        </div>
      </div>
    </aside>
  );
};

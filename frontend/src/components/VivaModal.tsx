import React from 'react';
import { X, GraduationCap, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface VivaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VivaModal: React.FC<VivaModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const faqs = [
    {
      q: "1. Why is Belady's Optimal algorithm strictly an offline theoretical benchmark?",
      a: "Optimal (MIN) requires future knowledge of all upcoming page references (clairvoyance). In real OS hardware/kernels, future memory access instructions cannot be predicted with 100% certainty because branching, user input, and interrupts alter execution flow. Optimal serves as the mathematical lower-bound benchmark for evaluating online algorithms."
    },
    {
      q: "2. How does MEMORA demonstrate and prove Belady's Anomaly?",
      a: "Belady's Anomaly is a counter-intuitive phenomenon where increasing the number of physical memory frames results in MORE page faults for FIFO. Using the classic reference sequence [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], FIFO incurs 9 faults with 3 frames, but 10 faults with 4 frames! LRU and Optimal are stack algorithms and are mathematically immune to Belady's Anomaly."
    },
    {
      q: "3. How does the First-Order Markov Engine predict without leaking future references?",
      a: "The Markov engine records transitions C[u][v] strictly after both u and v have been sequentially observed in past simulation steps. At step t, it computes conditional probabilities P(v | u = current_page). During page eviction, resident pages with the lowest predicted transition probabilities are prioritized as victim candidates, falling back to LRU for ties."
    },
    {
      q: "4. Why does higher next-page prediction accuracy not always yield fewer page faults?",
      a: "Paging replacement is a cache state retention problem, not merely a single-step token classification task. Even if a model accurately predicts the immediate next page (t+1), evicting a page that will be heavily needed at t+3, t+4, t+5 can trigger cascade faults. Victim selection requires estimating reuse horizons across all resident frames."
    },
    {
      q: "5. What is Thrashing and how does MEMORA detect it using the Working-Set model?",
      a: "Thrashing occurs when a process spends more time paging (swapping pages in/out of secondary storage) than executing useful instructions. MEMORA computes the working-set size WSS(t, Δ) = |{pages referenced in [t-Δ+1, t]}| and rolling Page-Fault Frequency (PFF). If WSS exceeds allocated frames and PFF spikes above critical threshold, Thrashing is flagged and frame reallocation is triggered."
    },
    {
      q: "6. How does the Adaptive Controller avoid unstable rapid policy switching?",
      a: "The Adaptive Controller uses hysteresis and a strict cooldown period (e.g. minimum 5 references between switches). It monitors rolling fault rates over sliding window W alongside model confidence metrics, preventing high-frequency oscillating between LRU, Markov, and LSTM."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-dark-750 flex items-center justify-between bg-dark-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                OSDS Viva Defense & Conceptual Architecture Guide
              </h2>
              <p className="text-xs text-slate-400">
                Key questions and academic explanations for defending MEMORA in an examination
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-750 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-indigo-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Academic Integrity & Scope Statement</p>
              <p className="mt-1 leading-relaxed text-indigo-200/90">
                MEMORA is an educational virtual memory simulator. It models operating system paging mechanisms, frame tables, page replacement policies, and ML prediction engines using synthetic workloads. It does NOT alter host OS hardware page tables or physical RAM.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {faqs.map((item, idx) => (
              <div key={idx} className="bg-dark-850 border border-dark-750 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-amber-300 font-mono mb-2">
                  {item.q}
                </h4>
                <p className="text-slate-300 leading-relaxed font-sans text-xs">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-750 bg-dark-850/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Operating Systems & System Design (OSDS)</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

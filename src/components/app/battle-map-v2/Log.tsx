import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { LogList } from "@/components/app/LogList";
import { LogSegments } from "@/components/app/LogSegments";
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Props {
  logs: any[];
  expanded: boolean;
  onToggle: () => void;
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenChar: (id: string) => void;
}

export function Log({ logs, expanded, onToggle, nameOverrides, onOpenChar }: Props) {
  return (
    <motion.div 
      initial={false}
      animate={{ height: expanded ? 300 : 80 }}
      className={cn(
        "absolute bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-lg border-t border-[var(--gold)]/30 flex flex-col transition-all duration-300",
        expanded ? "rounded-t-2xl" : ""
      )}
    >
      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className="absolute -top-10 right-6 bg-black/60 border border-[var(--gold)]/30 p-2 rounded-t-lg text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors shadow-2xl"
      >
        {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
      </button>

      <div className="flex-1 overflow-hidden p-3 pt-4">
        <div className="flex items-center gap-2 mb-2 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
          <h3 className="font-display text-[10px] uppercase tracking-widest text-[var(--gold)]">
            Registro de la Campaña
          </h3>
        </div>

        <div className="h-full overflow-y-auto">
          <LogList 
            rows={logs} 
            initial={30} 
            maxH="none" 
            empty="No hay actividad reciente."
            renderRow={(l: any) => (
              <div key={l.id} className="text-[11px] bg-white/5 rounded px-2 py-1.5 mb-1 leading-relaxed border border-white/5">
                <LogSegments 
                  segments={l.segments as any}
                  nameOverrides={nameOverrides}
                  onChar={(id) => onOpenChar(id)} 
                />
                <p className="text-[8px] text-white/30 mt-0.5">{new Date(l.created_at).toLocaleTimeString()}</p>
              </div>
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, UserPlus, Box, X, Plus, BookOpen, Users, ScrollText, HeartPulse } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { backdropProps } from '@/lib/modalBackdrop';

interface CreationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CreationItem[];
}

export function CreationGridModal({ isOpen, onClose, items }: Props) {
  const { t } = useT();
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleItemClick = (item: CreationItem) => {
    if (animatingId) return;
    setAnimatingId(item.id);
    setTimeout(() => {
      item.action();
      setAnimatingId(null);
    }, 350);
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      {...backdropProps(onClose)}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="ornate-card w-full max-w-4xl bg-[#0a0a0c]/95 border border-[var(--gold)]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex flex-col">
            <h2 className="font-display text-xl uppercase tracking-[0.3em] text-[var(--gold)]">
              Centro de Creación
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              Accede rápidamente a todas las herramientas de gestión
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const isAnimating = animatingId === item.id;
              return (
                <motion.div
                  key={item.id}
                  animate={isAnimating ? {
                    scale: 1.08,
                    boxShadow: `0 0 50px ${item.color}88, 0 0 100px ${item.color}44`,
                  } : {
                    scale: 1,
                    boxShadow: '0 0 0px transparent',
                  }}
                  whileHover={isAnimating ? undefined : { scale: 1.02, translateY: -4 }}
                  whileTap={isAnimating ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="group relative flex flex-col p-5 rounded-2xl cursor-pointer overflow-hidden border"
                  style={{
                    backgroundColor: isAnimating ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                    borderColor: isAnimating ? item.color : 'rgba(255,255,255,0.1)',
                  }}
                  onClick={() => handleItemClick(item)}
                >
                  {/* Decorative background glow */}
                  <div 
                    className={`absolute -right-4 -top-4 w-24 h-24 blur-3xl transition-opacity ${isAnimating ? 'opacity-50' : 'opacity-10 group-hover:opacity-20'}`}
                    style={{ backgroundColor: item.color }}
                  />

                  <div className="flex items-start gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all"
                      style={{ 
                        backgroundColor: isAnimating ? `${item.color}55` : `${item.color}22`, 
                        border: `1px solid ${isAnimating ? `${item.color}aa` : `${item.color}44`}`
                      }}
                    >
                      <div style={{ color: item.color }}>
                        {item.icon}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-display text-sm uppercase tracking-wider transition-colors truncate ${isAnimating ? 'text-[var(--gold)]' : 'text-white group-hover:text-[var(--gold)]'}`}>
                        {item.label}
                      </h3>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className={`text-[9px] uppercase tracking-widest transition-colors ${isAnimating ? 'text-white' : 'text-muted-foreground group-hover:text-white'}`}>
                      Herramienta DM
                    </span>
                    <button 
                      className="px-4 py-1.5 rounded-lg bg-[var(--gold)] text-black text-[10px] font-bold uppercase tracking-widest shadow-lg hover:brightness-110 transition-all"
                      style={{ background: item.color === 'var(--gold)' ? 'var(--gradient-gold)' : `linear-gradient(180deg, ${item.color}, color-mix(in oklab, ${item.color} 80%, black))` }}
                    >
                      Crear
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-black/20 border-t border-white/10 text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">
            Dungeon Master Toolbox · Visual Grid v1.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}

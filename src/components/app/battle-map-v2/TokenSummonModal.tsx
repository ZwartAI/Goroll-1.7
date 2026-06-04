import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Search, BookOpen, Users, UserCircle, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useGameData } from '@/lib/useGame';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { backdropProps } from '@/lib/modalBackdrop';
import type { MapToken } from '@/hooks/useBattleMap';

type Source = 'bestiary' | 'players' | 'npcs';

interface Entry {
  key: string;
  name: string;
  image_url: string | null;
  color: string | null;
  template: Partial<MapToken>;
}

interface Props {
  campaignId: string;
  onClose: () => void;
  onConfirm: (tokens: Partial<MapToken>[]) => void;
}

export const TokenSummonModal: React.FC<Props> = ({ campaignId, onClose, onConfirm }) => {
  const { t } = useT();
  const { characters } = useGameData();
  const [source, setSource] = useState<Source | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enemies, setEnemies] = useState<any[]>([]);
  const [npcs, setNpcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!source || source === 'players' || !campaignId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const table = source === 'bestiary' ? 'enemy_templates' : 'npc_templates';
      const { data } = await (supabase as any)
        .from(table)
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });
      if (cancelled) return;
      if (source === 'bestiary') setEnemies(data || []);
      else setNpcs(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [source, campaignId]);

  useEffect(() => {
    setSelected(new Set());
    setQuery('');
  }, [source]);

  const entries: Entry[] = useMemo(() => {
    if (source === 'players') {
      return characters.filter(c => c.role !== 'dm').map(c => ({
        key: `player:${c.id}`,
        name: c.name,
        image_url: c.image_url,
        color: c.color,
        template: {
          character_id: c.id,
          name: c.name,
          image_url: c.image_url,
          token_type: 'player',
          image_scale: (c as any).image_scale || 1,
          image_offset_x: (c as any).image_offset_x ?? 50,
          image_offset_y: (c as any).image_offset_y ?? 50,
          color: c.color,
        },
      }));
    }
    if (source === 'bestiary') {
      return enemies.map(e => ({
        key: `enemy:${e.id}`,
        name: e.name,
        image_url: e.image_url || null,
        color: e.color,
        template: {
          character_id: null,
          name: e.name,
          image_url: e.image_url || null,
          token_type: 'enemy',
          image_scale: e.image_scale || 1,
          image_offset_x: e.image_offset_x ?? 50,
          image_offset_y: e.image_offset_y ?? 50,
          color: e.color,
        },
      }));
    }
    if (source === 'npcs') {
      return npcs.map(n => ({
        key: `npc:${n.id}`,
        name: n.name,
        image_url: n.image_url || null,
        color: n.color,
        template: {
          character_id: null,
          name: n.name,
          image_url: n.image_url || null,
          token_type: 'npc',
          image_scale: n.image_scale || 1,
          image_offset_x: n.image_offset_x ?? 50,
          image_offset_y: n.image_offset_y ?? 50,
          color: n.color,
        },
      }));
    }
    return [];
  }, [source, characters, enemies, npcs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => e.name.toLowerCase().includes(q));
  }, [entries, query]);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const picked = entries.filter(e => selected.has(e.key)).map(e => e.template);
    if (picked.length === 0) return;
    onConfirm(picked);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" {...backdropProps(onClose)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0a0a0c]/98 border border-[var(--gold)]/30 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {source && (
              <button
                onClick={() => setSource(null)}
                className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors"
                aria-label={t('battleMap.summon.back')}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--gold)] truncate">
                {t('battleMap.summon.title')}
              </h2>
              <span className="text-[7px] text-muted-foreground uppercase tracking-widest">
                {source ? t(`battleMap.summon.${source}` as any) : t('battleMap.summon.subtitle')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {!source ? (
          <div className="p-4 grid grid-cols-1 gap-3">
            <SourceTile icon={<BookOpen size={22} />} label={t('battleMap.summon.bestiary')} color="#ef4444" onClick={() => setSource('bestiary')} />
            <SourceTile icon={<Users size={22} />} label={t('battleMap.summon.players')} color="var(--gold)" onClick={() => setSource('players')} />
            <SourceTile icon={<UserCircle size={22} />} label={t('battleMap.summon.npcs')} color="#3b82f6" onClick={() => setSource('npcs')} />
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-white/5 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('battleMap.summon.search')}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground/60 focus:outline-none focus:border-[var(--gold)]/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {loading ? (
                <div className="text-center py-10 text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">…</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">
                  {t('battleMap.summon.empty')}
                </div>
              ) : (
                filtered.map(entry => {
                  const isSel = selected.has(entry.key);
                  return (
                    <button
                      key={entry.key}
                      onClick={() => toggle(entry.key)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-xl border transition-all text-left',
                        isSel
                          ? 'bg-[var(--gold)]/15 border-[var(--gold)]/50'
                          : 'bg-white/5 border-transparent hover:bg-white/10'
                      )}
                    >
                      <div
                        className="w-9 h-9 rounded-full border overflow-hidden shrink-0 bg-black"
                        style={{ borderColor: entry.color || 'rgba(255,255,255,0.1)' }}
                      >
                        {entry.image_url ? (
                          <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm opacity-60">🧙</div>
                        )}
                      </div>
                      <span className="flex-1 text-[11px] font-display uppercase tracking-wider truncate" style={{ color: entry.color || 'var(--gold)' }}>
                        {entry.name}
                      </span>
                      <div className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        isSel ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'border-white/20'
                      )}>
                        {isSel && <Check size={12} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-white/10 bg-black/30 shrink-0">
              <button
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className={cn(
                  'w-full h-10 rounded-xl font-display text-[11px] uppercase tracking-widest transition-all',
                  selected.size === 0
                    ? 'bg-white/5 text-muted-foreground cursor-not-allowed'
                    : 'bg-[var(--gold)] text-black hover:brightness-110 shadow-lg'
                )}
              >
                {t('battleMap.summon.summonSelected', { n: String(selected.size) })}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

const SourceTile: React.FC<{ icon: React.ReactNode; label: string; color: string; onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--gold)]/40 transition-all text-left group"
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center border shrink-0"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
    >
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-display text-xs uppercase tracking-widest text-white truncate">{label}</p>
    </div>
  </button>
);

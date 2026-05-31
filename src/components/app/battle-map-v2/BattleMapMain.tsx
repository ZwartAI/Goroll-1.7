import React, { useState, useEffect } from 'react';
import { useBattleMap } from '@/hooks/useBattleMap';
import { useGameData } from '@/lib/useGame';
import { Header } from './Header';
import { Stage } from './Stage';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { Log } from './Log';
import { SceneManager } from './SceneManager';
import { MapSettings } from './MapSettings';
import { useT } from '@/lib/i18n';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  onBack: () => void;
  logs: any[];
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenChar: (id: string) => void;
}

export default function BattleMapMain({ onBack, logs, nameOverrides, onOpenChar }: Props) {
  const { campaign, character } = useGameData();
  const campaignId = campaign?.id || '';
  const isDM = character?.role === 'dm';
  const { t } = useT();
  
  const battleMap = useBattleMap(campaignId);
  const [showScenes, setShowScenes] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTool, setActiveTool] = useState<'move' | 'measure' | 'pencil'>('move');
  const [logExpanded, setLogExpanded] = useState(false);

  // If loading, show a nice loading state
  if (battleMap.isLoading) {
    return (
      <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin mb-6" />
        <p className="font-display text-[var(--gold)] text-sm uppercase tracking-widest animate-pulse">
          Cargando Mapa Táctico...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] bg-[#0a0a0a] flex flex-col overflow-hidden text-white font-sans">
      {/* Header */}
      <Header 
        onBack={onBack} 
        isDM={isDM} 
        campaignName={campaign?.name || ''} 
      />

      <div className="flex-1 relative overflow-hidden flex">
        {/* Main Stage Area */}
        <Stage 
          battleMap={battleMap} 
          isDM={isDM} 
          activeTool={activeTool}
          characterId={character?.id}
        />

        {/* Sidebar (Turns/Participants) */}
        <Sidebar 
          onOpenChar={onOpenChar}
        />

        {/* Toolbar (Right) */}
        <Toolbar 
          activeTool={activeTool} 
          setActiveTool={setActiveTool} 
          isDM={isDM}
          onOpenScenes={() => setShowScenes(true)}
          onOpenSettings={() => setShowSettings(true)}
          onInvokeToken={() => {
            if (character) {
              const hasToken = battleMap.tokens.some(t => t.character_id === character.id);
              if (hasToken) {
                const token = battleMap.tokens.find(t => t.character_id === character.id);
                if (token) battleMap.removeToken(token.id);
              } else {
                battleMap.addToken({
                  character_id: character.id,
                  name: character.name,
                  image_url: character.image_url,
                  token_type: 'player',
                  x: 100,
                  y: 100
                });
              }
            }
          }}
          hasMyToken={character ? battleMap.tokens.some(t => t.character_id === character.id) : false}
        />
      </div>

      {/* Log (Bottom) */}
      <Log 
        logs={logs} 
        expanded={logExpanded} 
        onToggle={() => setLogExpanded(!logExpanded)} 
        nameOverrides={nameOverrides}
        onOpenChar={onOpenChar}
      />

      {/* Modals */}
      <AnimatePresence>
        {showScenes && isDM && (
          <SceneManager 
            battleMap={battleMap} 
            onClose={() => setShowScenes(false)} 
          />
        )}
        {showSettings && isDM && (
          <MapSettings 
            battleMap={battleMap} 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

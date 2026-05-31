import React, { useState, useCallback } from 'react';
import { useBattleMap } from '@/hooks/useBattleMap';
import { useGameData } from '@/lib/useGame';
import { Header } from './Header';
import { Stage } from './Stage';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { Log } from './Log';
import { SceneManager } from './SceneManager';
import { MapSettings } from './MapSettings';
import { DiceButton } from './DiceButton';
import { DicePanel, DieSelection } from './DicePanel';
import { useT } from '@/lib/i18n';
import { AnimatePresence, motion } from 'framer-motion';
import { pushLog } from '@/lib/log';
import { toast } from 'sonner';

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
  const [showDicePanel, setShowDicePanel] = useState(false);

  const handleRollDice = useCallback((selections: DieSelection[]) => {
    setShowDicePanel(false);
    
    let total = 0;
    const individualResults: string[] = [];

    selections.forEach(sel => {
      const sides = parseInt(sel.type.substring(1));
      for (let i = 0; i < sel.count; i++) {
        const res = Math.floor(Math.random() * sides) + 1;
        total += res;
        individualResults.push(`${sel.type}: ${res}`);
      }
    });

    if (campaignId && character) {
      pushLog(campaignId, [
        { t: 'char', v: character.name, color: character.color || 'var(--gold)', id: character.id },
        { t: 'text', v: ' ha lanzado los dados: ' },
        { t: 'text', v: individualResults.join(', ') },
        { t: 'text', v: ' | Total: ' },
        { t: 'text', v: total.toString() }
      ]);
      toast.success(`Tirada: ${total}`);
    }
  }, [campaignId, character]);

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
              const hasToken = battleMap.tokens.some((t: any) => t.character_id === character.id);
              if (hasToken) {
                const token = battleMap.tokens.find((t: any) => t.character_id === character.id);
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
          hasMyToken={character ? battleMap.tokens.some((t: any) => t.character_id === character.id) : false}
        />

        {/* Floating Dice Button */}
        <div 
          className="absolute right-6 transition-all duration-300 z-50"
          style={{ bottom: logExpanded ? '320px' : '100px' }}
        >
          <DiceButton onClick={() => setShowDicePanel(!showDicePanel)} />
        </div>

        <AnimatePresence>
          {showDicePanel && (
            <DicePanel 
              onClose={() => setShowDicePanel(false)} 
              onRoll={handleRollDice} 
            />
          )}
        </AnimatePresence>
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

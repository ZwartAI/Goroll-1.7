import React from 'react';
import { LogList } from '@/components/app/LogList';
import { LogSegments } from '@/components/app/LogSegments';
import type { LogRow } from '@/lib/game';
import { useT } from '@/lib/i18n';

interface Props {
  logs: LogRow[];
  nameOverrides?: Record<string, { name: string; color: string }>;
  onOpenItem?: (id: string) => void;
  onOpenBooster?: (id: string) => void;
  onOpenChar?: (id: string) => void;
}

export const BattleMapLog: React.FC<Props> = ({ 
  logs, 
  nameOverrides, 
  onOpenItem, 
  onOpenBooster, 
  onOpenChar 
}) => {
  const { t } = useT();

  return (
    <div className="absolute bottom-0 right-0 w-full sm:w-[400px] h-[120px] bg-black/60 border-t sm:border-l border-border/50 backdrop-blur-md z-20 flex flex-col p-2">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[9px] font-display uppercase tracking-[0.2em] text-muted-foreground">
          {t('battleMap.recentLog')}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <LogList 
          rows={logs} 
          initial={10} 
          maxH="h-full" 
          empty={t("escenario.noActivity")} 
          renderRow={(l: any) => (
            <div key={l.id} className={`text-[10px] bg-secondary/20 rounded px-2 py-1 leading-relaxed mb-1 ${l.undone ? "opacity-50 line-through" : ""}`}>
              <LogSegments 
                segments={l.segments as any}
                nameOverrides={nameOverrides}
                onItem={(id) => onOpenItem?.(id)}
                onBooster={(id) => onOpenBooster?.(id)}
                onChar={(id) => onOpenChar?.(id)} 
              />
            </div>
          )} 
        />
      </div>
    </div>
  );
};

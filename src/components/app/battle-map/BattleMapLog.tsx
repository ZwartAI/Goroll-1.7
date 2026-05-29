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
    <div className="flex flex-col h-full w-full p-2">
      <div className="flex-1 overflow-hidden">
        <LogList 
          rows={logs} 
          initial={20} 
          maxH="h-full" 
          empty={t("escenario.noActivity")} 
          renderRow={(l: any) => (
            <div key={l.id} className={`text-[10px] bg-secondary/20 rounded px-2 py-1 leading-relaxed mb-1.5 ${l.undone ? "opacity-50 line-through" : ""}`}>
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


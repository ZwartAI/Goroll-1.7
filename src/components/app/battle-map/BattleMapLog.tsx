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
  isExpanded?: boolean;
}

export const BattleMapLog: React.FC<Props> = ({ 
  logs, 
  nameOverrides, 
  onOpenItem, 
  onOpenBooster, 
  onOpenChar,
  isExpanded
}) => {
  const { t } = useT();

  return (
    <div className="flex flex-col h-full w-full">
      <div className={`flex-1 overflow-y-auto px-4 py-3 custom-scrollbar ${!isExpanded ? 'mask-bottom-fade' : ''}`}>
        <LogList 
          rows={logs} 
          initial={isExpanded ? 30 : 5} 
          maxH="h-full" 
          empty={t("escenario.noActivity")} 
          renderRow={(l: any) => (
            <div key={l.id} className="text-[10px] leading-relaxed mb-1 opacity-90 hover:opacity-100 transition-opacity">
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


import React from 'react';
import { Group, Line } from 'react-konva';
import { FogElement } from '@/hooks/useBattleMap';

interface Props {
  fogElements: FogElement[];
  opacity?: number;
}

export const FogLayer = React.memo(({ fogElements, opacity = 1 }: Props) => {
  if (fogElements.length === 0) return null;

  return (
    <Group opacity={opacity}>
      {fogElements.map((el) => {
        if (el.type === 'brush') {
          return (
            <Line
              key={el.id}
              points={el.points}
              stroke="black"
              strokeWidth={80} // Larger default for fog
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={el.is_eraser ? 'destination-out' : 'source-over'}
              tension={0.5}
            />
          );
        } else if (el.type === 'polygon') {
          return (
            <Line
              key={el.id}
              points={el.points}
              fill="black"
              closed={true}
              globalCompositeOperation={el.is_eraser ? 'destination-out' : 'source-over'}
            />
          );
        }
        return null;
      })}
    </Group>
  );
});

FogLayer.displayName = 'FogLayer';

import React from 'react';
import { Layer, Group, Line, Path } from 'react-konva';
import { FogElement } from '@/hooks/useBattleMap';

interface Props {
  fogElements: FogElement[];
}

export const FogLayer = React.memo(({ fogElements }: Props) => {
  if (fogElements.length === 0) return null;

  return (
    <Layer listening={false}>
      <Group>
        {fogElements.map((el) => {
          if (el.type === 'brush') {
            return (
              <Line
                key={el.id}
                points={el.points}
                stroke="black"
                strokeWidth={40} // Default brush size for fog
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
    </Layer>
  );
});

FogLayer.displayName = 'FogLayer';

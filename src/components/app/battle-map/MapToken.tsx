import React, { useMemo } from 'react';
import { Group, Circle, Image } from 'react-konva';
import useImage from 'use-image';
import type { CombatParticipant } from '@/lib/combat';
import { getEnemyCustomImage, getEnemyAssetUrl } from '@/components/app/EnemyIconPicker';

// FASE 1: Preparación de Tokens (Mejorado con Framing)
// Sistema de tokens circulares con imagen y animaciones básicas.

interface Props {
  participant: CombatParticipant;
  x: number;
  y: number;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const MapToken: React.FC<Props> = ({ participant, x, y, onSelect, isSelected }) => {
  // Obtener la imagen (custom o asset)
  const customImg = getEnemyCustomImage(participant);
  const assetUrl = getEnemyAssetUrl(participant.enemy_icon);
  const imageUrl = participant.image_url || assetUrl || '';
  
  const [image] = useImage(imageUrl);
  
  const color = participant.enemy_color || participant.color || "var(--gold)";
  const radius = 25;


  return (
    <Group 
      x={x} 
      y={y} 
      draggable 
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={(e) => {
        e.target.moveToTop();
        e.target.scale({ x: 1.1, y: 1.1 });
      }}
      onDragEnd={(e) => {
        e.target.scale({ x: 1, y: 1 });
      }}
    >
      {/* Sombra / Glow de selección */}
      {isSelected && (
        <Circle
          radius={radius + 4}
          fill="transparent"
          stroke={color}
          strokeWidth={2}
          shadowBlur={15}
          shadowColor={color}
          opacity={0.6}
        />
      )}

      {/* Borde del token */}
      <Circle
        radius={radius}
        fill="#1a1a1a"
        stroke={color}
        strokeWidth={2}
      />

      {/* Clip de imagen circular */}
      {image ? (
        <Group clipFunc={(ctx) => ctx.arc(0, 0, radius - 1, 0, Math.PI * 2)}>
          <Image
            image={image}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            imageSmoothingEnabled={true}
          />
        </Group>
      ) : (
        <Circle radius={radius - 2} fill={color} opacity={0.3} />
      )}
    </Group>
  );
};

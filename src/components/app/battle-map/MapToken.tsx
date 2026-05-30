import React, { useMemo, useRef } from 'react';
import { Group, Circle, Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import type { CombatParticipant } from '@/lib/combat';
import { getEnemyCustomImage, getEnemyAssetUrl } from '@/components/app/EnemyIconPicker';
import { playMapSound } from './BattleMapSounds';

// FASE 7: Enhanced Map Tokens with better animations and role-based visuals
interface Props {
  participant: CombatParticipant;
  x: number;
  y: number;
  gridSize: number;
  onSelect?: () => void;
  isSelected?: boolean;
  onLongPress?: (x: number, y: number) => void;
  onProjectionStart?: (type: 'distance' | 'area' | 'line' | 'cone', origin: { x: number; y: number }) => void;
  draggable?: boolean;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export const MapToken: React.FC<Props> = ({ 
  participant, x, y, gridSize, onSelect, isSelected, onLongPress, onProjectionStart,
  draggable, onDragMove, onDragEnd
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const customImg = useMemo(() => {
    if (participant.participant_type === 'enemy') {
      return getEnemyCustomImage(participant);
    }
    // Para jugadores, usamos los campos de offset y escala del personaje
    // Estos campos suelen venir en el objeto participant si es un jugador
    return {
      offsetX: (participant as any).image_offset_x ?? 50,
      offsetY: (participant as any).image_offset_y ?? 50,
      scale: (participant as any).image_scale ?? 1
    };
  }, [participant]);

  const assetUrl = getEnemyAssetUrl(participant.enemy_icon);
  const imageUrl = participant.image_url || assetUrl || '';
  
  const [image] = useImage(imageUrl);

  
  const color = participant.enemy_color || participant.color || "var(--gold)";
  const radius = gridSize * 0.44;

  // FASE 7: Role-based glow color
  const roleGlowColor = useMemo(() => {
    if (participant.participant_type === 'enemy') return '#ef4444'; // Red for Enemy
    return '#3b82f6'; // Blue for Players
  }, [participant.participant_type]);
  
  const isMyTurn = false; 

  return (
    <Group 
      x={x} 
      y={y} 
      name="token-group"
      participantId={participant.id}
      draggable={draggable} 
      onDragMove={onDragMove}
      onClick={onSelect}
      onTap={onSelect}
      onMouseDown={(e) => {
        longPressTimer.current = setTimeout(() => {
          const stage = e.target.getStage();
          if (stage) {
            const pos = stage.getPointerPosition();
            if (pos) onLongPress?.(pos.x, pos.y);
          }
        }, 600);
      }}
      onTouchStart={(e) => {
        longPressTimer.current = setTimeout(() => {
          const stage = e.target.getStage();
          if (stage) {
            const pos = stage.getPointerPosition();
            if (pos) onLongPress?.(pos.x, pos.y);
          }
        }, 600);
      }}
      onMouseUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onDragStart={(e) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        e.target.moveToTop();
        playMapSound('move');
        
        // FASE 7: Enhanced lift animation
        e.target.to({
          scaleX: 1.15,
          scaleY: 1.15,
          shadowBlur: 20,
          shadowOpacity: 0.5,
          shadowOffset: { x: 5, y: 15 },
          duration: 0.15,
          easing: Konva.Easings.EaseOut
        });
      }}
      onDragEnd={(e) => {
        const node = e.target;
        const newX = Math.round(node.x() / gridSize) * gridSize;
        const newY = Math.round(node.y() / gridSize) * gridSize;
        
        node.to({
          x: newX,
          y: newY,
          scaleX: 1,
          scaleY: 1,
          shadowBlur: 0,
          shadowOffset: { x: 0, y: 0 },
          duration: 0.3,
          easing: Konva.Easings.BackEaseOut,
          onFinish: () => {
            onDragEnd?.(e);
          }
        });
      }}
    >
      {/* Role-based glow (Fase 7) */}
      <Circle
        radius={radius + 3}
        fill="transparent"
        stroke={roleGlowColor}
        strokeWidth={1.5}
        shadowBlur={10}
        shadowColor={roleGlowColor}
        opacity={0.4}
      />

      {/* Sombra / Glow de selección */}
      {isSelected && (
        <Circle
          radius={radius + 6}
          fill="transparent"
          stroke={color}
          strokeWidth={2.5}
          shadowBlur={20}
          shadowColor={color}
          opacity={0.7}
        />
      )}

      {/* Borde del token */}
      <Circle
        radius={radius}
        fill="#1a1a1a"
        stroke={color}
        strokeWidth={2.5}
      />

      {/* Clip de imagen circular */}
      {image ? (
        <Group clipFunc={(ctx) => ctx.arc(0, 0, radius - 1, 0, Math.PI * 2)}>
          <KonvaFramedImage 
            image={image} 
            radius={radius} 
            offsetX={customImg?.offsetX ?? 50} 
            offsetY={customImg?.offsetY ?? 50} 
            scale={customImg?.scale ?? 1} 
          />
        </Group>
      ) : (
        <Circle radius={radius - 2} fill={color} opacity={0.3} />
      )}

      {/* Indicador de Turno */}
      {isMyTurn && (
        <Group x={radius - 6} y={-radius + 6}>
           <Circle radius={8} fill="var(--gold)" shadowBlur={8} shadowColor="black" />
           <Circle radius={2} fill="black" x={-2} y={0} />
           <Circle radius={2} fill="black" x={2} y={0} />
        </Group>
      )}
    </Group>
  );
};

const KonvaFramedImage: React.FC<{
  image: HTMLImageElement;
  radius: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}> = ({ image, radius, offsetX, offsetY, scale }) => {
  const size = radius * 2;
  const imgAspect = image.width / image.height;
  let drawW = size;
  let drawH = size;
  
  if (imgAspect > 1) {
    drawW = size * imgAspect;
  } else {
    drawH = size / imgAspect;
  }

  const finalW = drawW * scale;
  const finalH = drawH * scale;
  const x = -finalW / 2 + (offsetX - 50) * (finalW / 100);
  const y = -finalH / 2 + (offsetY - 50) * (finalH / 100);

  return (
    <Image
      image={image}
      x={x}
      y={y}
      width={finalW}
      height={finalH}
      imageSmoothingEnabled={true}
    />
  );
};

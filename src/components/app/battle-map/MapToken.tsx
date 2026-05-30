import React, { useMemo, useRef } from 'react';
import { Group, Circle, Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import type { CombatParticipant } from '@/lib/combat';
import { getEnemyCustomImage, getEnemyAssetUrl } from '@/components/app/EnemyIconPicker';

// FASE 1: Preparación de Tokens (Mejorado con Framing)
// Sistema de tokens circulares con imagen y animaciones básicas.

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
  // Obtener la imagen (custom o asset)
  const customImg = getEnemyCustomImage(participant);
  const assetUrl = getEnemyAssetUrl(participant.enemy_icon);
  const imageUrl = participant.image_url || assetUrl || '';
  
  const [image] = useImage(imageUrl);
  
  const color = participant.enemy_color || participant.color || "var(--gold)";
  const radius = gridSize * 0.44; // Proporcional a la grid
  
  // FASE 7: Role-based glow color
  const roleGlowColor = useMemo(() => {
    if (participant.role === 'dm') return '#eab308'; // Gold for DM
    if (participant.role === 'enemy') return '#ef4444'; // Red for Enemy
    return '#3b82f6'; // Blue for Players
  }, [participant.role]);

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
        // Long press detection
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
        e.target.to({
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 0.1,
          easing: Konva.Easings.EaseOut
        });
      }}
      onDragEnd={(e) => {
        // SNAP TO GRID
        const node = e.target;
        const newX = Math.round(node.x() / gridSize) * gridSize;
        const newY = Math.round(node.y() / gridSize) * gridSize;
        
        node.to({
          x: newX,
          y: newY,
          scaleX: 1,
          scaleY: 1,
          duration: 0.2,
          easing: Konva.Easings.BackEaseOut,
          onFinish: () => {
            onDragEnd?.(e);
          }
        });
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

      {/* Clip de imagen circular con encuadre (Framing) */}
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

      {/* Indicador de Turno (Game Controller icon) */}
      {isMyTurn && (
        <Group x={radius - 6} y={-radius + 6}>
           <Circle radius={7} fill="var(--gold)" shadowBlur={5} shadowColor="black" />
           {/* Simple icon representation */}
           <Circle radius={2} fill="black" x={-2} y={0} />
           <Circle radius={2} fill="black" x={2} y={0} />
        </Group>
      )}
    </Group>
  );
};

/**
 * Componente interno para manejar el escalado y desplazamiento (Framing) en Konva.
 * Simula el comportamiento de object-cover + transform: translate/scale.
 */
const KonvaFramedImage: React.FC<{
  image: HTMLImageElement;
  radius: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}> = ({ image, radius, offsetX, offsetY, scale }) => {
  const size = radius * 2;
  
  // Calcular dimensiones para simular "object-cover"
  const imgAspect = image.width / image.height;
  let drawW = size;
  let drawH = size;
  
  if (imgAspect > 1) {
    drawW = size * imgAspect;
  } else {
    drawH = size / imgAspect;
  }

  // Aplicar el encuadre (offset y scale adicional)
  const finalW = drawW * scale;
  const finalH = drawH * scale;
  
  // El offset 50,50 es el centro del recorte.
  // Calculamos la posición relativa al centro del token (0,0)
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


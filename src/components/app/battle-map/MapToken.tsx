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


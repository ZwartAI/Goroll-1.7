import React from 'react';
import { Layer, Line, Group, Rect, Text } from 'react-konva';

// FASE 4: Chalk Drawing Layer
// Renderizado de trazos y notas con estilo "tiza" y "fantasía"

export interface ChalkLine {
  points: number[];
  color: string;
  size: number;
}

export interface ChalkNote {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface Props {
  lines: ChalkLine[];
  notes: ChalkNote[];
  onNoteDragEnd?: (id: string, x: number, y: number) => void;
  onNoteClick?: (id: string) => void;
}

export const BattleMapChalkLayer: React.FC<Props> = ({ 
  lines, 
  notes, 
  onNoteDragEnd,
  onNoteClick
}) => {
  return (
    <Layer id="chalk-layer">
      {/* Trazos de tiza */}
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          stroke={line.color}
          strokeWidth={line.size}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation="source-over"
          shadowBlur={line.size * 0.8}
          shadowColor={line.color}
          opacity={0.6} // Más translúcido (pedido por el usuario)
        />
      ))}

      {/* Notas / Etiquetas */}
      {notes.map((note) => (
        <Group
          key={note.id}
          x={note.x}
          y={note.y}
          draggable
          onDragEnd={(e) => onNoteDragEnd?.(note.id, e.target.x(), e.target.y())}
          onClick={() => onNoteClick?.(note.id)}
          onTap={() => onNoteClick?.(note.id)}
        >
          {/* Sombra/Resplandor exterior */}
          <Rect
            width={120}
            height={40}
            fill="black"
            opacity={0.3}
            cornerRadius={4}
            shadowBlur={10}
            shadowColor="black"
            offsetX={60}
            offsetY={20}
          />
          
          {/* Estilo Pergamino/Fantasy */}
          <Rect
            width={120}
            height={40}
            fill="#f3e5ab" // Color pergamino base
            stroke="#8b4513" // Borde cuero/madera
            strokeWidth={2}
            cornerRadius={4}
            offsetX={60}
            offsetY={20}
            shadowBlur={2}
            shadowColor="rgba(0,0,0,0.5)"
          />
          
          {/* Detalles decorativos en esquinas */}
          <Rect width={4} height={4} fill="#8b4513" x={-58} y={-18} cornerRadius={1} />
          <Rect width={4} height={4} fill="#8b4513" x={54} y={-18} cornerRadius={1} />
          <Rect width={4} height={4} fill="#8b4513" x={-58} y={14} cornerRadius={1} />
          <Rect width={4} height={4} fill="#8b4513" x={54} y={14} cornerRadius={1} />

          <Text
            text={note.text}
            fontSize={12}
            fontFamily="serif"
            fill="#5d4037"
            align="center"
            verticalAlign="middle"
            width={110}
            height={30}
            offsetX={55}
            offsetY={15}
            fontStyle="bold"
          />
        </Group>
      ))}
    </Layer>
  );
};

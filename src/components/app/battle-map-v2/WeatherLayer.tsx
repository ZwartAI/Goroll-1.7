import React, { useMemo } from 'react';

export type WeatherEffect =
  | 'none'
  | 'sunny'
  | 'rain'
  | 'storm'
  | 'radiation'
  | 'volcanic'
  | 'night'
  | 'snow';

export type WeatherIntensity = 'low' | 'medium' | 'high';

interface Props {
  effect: WeatherEffect;
  intensity?: WeatherIntensity;
  layer?: 'all' | 'filter' | 'particles';
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

// Stable seeded counts per effect+intensity
const COUNTS: Record<Exclude<WeatherEffect, 'none'>, Record<WeatherIntensity, number>> = {
  sunny:     { low: 3,  medium: 5,  high: 7 },
  rain:      { low: 60, medium: 90, high: 130 },
  storm:     { low: 60, medium: 100, high: 140 },
  radiation: { low: 20, medium: 35, high: 55 },
  volcanic:  { low: 20, medium: 45, high: 70 },
  night:     { low: 15, medium: 30, high: 45 },
  snow:      { low: 35, medium: 70, high: 110 },
};

export function WeatherLayer({ effect, intensity = 'medium', layer = 'all' }: Props) {
  const particles = useMemo(() => {
    if (effect === 'none') return null;
    const count = COUNTS[effect][intensity];
    return Array.from({ length: count }).map((_, i) => {
      const left = rand(-5, 105);
      const delay = -rand(0, 12);
      switch (effect) {
        case 'rain':
        case 'storm': {
          const duration = rand(0.7, 1.6);
          const height = rand(35, 75);
          return { i, left, delay, duration, height };
        }
        case 'snow': {
          const size = rand(2, 7);
          const opacity = rand(0.35, 0.95);
          const duration = rand(5, 14);
          return { i, left, delay, duration, size, opacity };
        }
        case 'radiation': {
          const duration = rand(6, 14);
          const size = rand(3, 6);
          return { i, left, delay, duration, size };
        }
        case 'volcanic': {
          const duration = rand(4, 10);
          const size = rand(2, 5);
          return { i, left, delay, duration, size };
        }
        case 'night': {
          const duration = rand(2.5, 5.5);
          const top = rand(0, 100);
          return { i, left, top, delay, duration };
        }
        case 'sunny': {
          const duration = rand(8, 14);
          const rot = rand(8, 28);
          const leftRay = rand(-10, 80);
          return { i, left: leftRay, delay, duration, rot };
        }
      }
    });
  }, [effect, intensity]);

  if (effect === 'none' || !particles) return null;

  return (
    <div className={`battle-weather battle-weather--${effect} battle-weather--${intensity}`} aria-hidden>
      {(layer === 'all' || layer === 'filter') && <div className="battle-weather__filter" />}
      {(layer === 'all' || layer === 'particles') && (effect === 'rain' || effect === 'storm') && particles.map((p: any) => (
        <div
          key={p.i}
          className="weather-rain-drop"
          style={{
            left: `${p.left}%`,
            height: `${p.height}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      {(layer === 'all' || layer === 'particles') && effect === 'snow' && particles.map((p: any) => (
        <div
          key={p.i}
          className="weather-snowflake"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      {(layer === 'all' || layer === 'particles') && effect === 'radiation' && particles.map((p: any) => (
        <div
          key={p.i}
          className="weather-radiation-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      {(layer === 'all' || layer === 'particles') && effect === 'volcanic' && particles.map((p: any) => (
        <div
          key={p.i}
          className="weather-ember"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      {(layer === 'all' || layer === 'particles') && effect === 'night' && particles.map((p: any) => (
        <div
          key={p.i}
          className="weather-night-star"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      {(layer === 'all' || layer === 'particles') && effect === 'sunny' && particles.map((p: any) => (
        <div
          key={p.i}
          className="weather-sun-ray"
          style={{
            left: `${p.left}%`,
            transform: `rotate(${p.rot}deg)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

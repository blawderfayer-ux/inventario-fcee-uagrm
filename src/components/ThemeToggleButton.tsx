'use client';

import { useTheme } from './ThemeProvider';
import { MoonIcon, SunIcon } from './Icons';

interface Props {
  /** `navy` para las barras azul institucional, `ghost` para el contenido. */
  variant?: 'navy' | 'ghost';
  size?: number;
}

export default function ThemeToggleButton({ variant = 'ghost', size = 16 }: Props) {
  const { dark, toggle } = useTheme();
  const label = dark ? 'Modo día' : 'Modo noche';

  if (variant === 'navy') {
    return (
      <button
        onClick={toggle}
        title={label}
        aria-label={label}
        style={{
          width: 34,
          height: 34,
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {dark ? <SunIcon size={size} /> : <MoonIcon size={size} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="btn-ghost"
      title={label}
      aria-label={label}
      style={{
        width: 34,
        height: 34,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {dark ? <SunIcon size={size} /> : <MoonIcon size={size} />}
    </button>
  );
}

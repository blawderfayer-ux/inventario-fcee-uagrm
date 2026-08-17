'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeToggleButton from './ThemeToggleButton';
import { MenuIcon } from './Icons';

const BREADCRUMBS: Record<string, string[]> = {
  '/dashboard': ['Inicio', 'Panel de Control'],
  '/inventario': ['Inicio', 'Inventario'],
  '/usuarios': ['Inicio', 'Usuarios'],
  '/reportes': ['Inicio', 'Reportes'],
  '/kiosco': ['Inicio', 'Extracción'],
};

interface TopbarProps {
  user: { name: string; department: string; initials: string };
  onMenuClick: () => void;
}

export default function Topbar({ user, onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const breadcrumbs = BREADCRUMBS[pathname] ?? ['Inicio'];

  // La hora se calcula en el cliente para no desajustar la hidratación.
  const [now, setNow] = useState('');
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString('es-BO', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        height: 56,
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      <button
        onClick={onMenuClick}
        className="btn-ghost"
        aria-label="Abrir menú"
        style={{
          display: 'none',
          width: 34,
          height: 34,
          padding: 0,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        data-hamburger
      >
        <MenuIcon size={17} />
      </button>

      <nav style={{ flex: 1, minWidth: 0 }}>
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {breadcrumbs.map((crumb, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span style={{ color: 'var(--border)', fontSize: 13 }}>/</span>}
              <span
                style={{
                  fontSize: 12,
                  color: i === breadcrumbs.length - 1 ? 'var(--fg)' : 'var(--muted-fg)',
                  fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} data-desktop-only>
          <span
            className="live-pulse"
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              backgroundColor: '#16a34a',
              borderRadius: '50%',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--muted-fg)', fontWeight: 500 }}>
            En Vivo{now && ` · ${now}`}
          </span>
        </div>

        <ThemeToggleButton />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              backgroundColor: '#13294B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{user.initials}</span>
          </div>
          <div data-desktop-only>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--fg)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted-fg)', lineHeight: 1.3 }}>
              {user.department}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          [data-hamburger] { display: flex !important; }
          [data-desktop-only] { display: none !important; }
        }
      `}</style>
    </header>
  );
}

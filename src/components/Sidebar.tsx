'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROLE_LABELS, type Role } from '@/lib/types';
import { BarChartIcon, BoxIcon, HomeIcon, LogOutIcon, UsersIcon, XIcon } from './Icons';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Panel de Control', icon: <HomeIcon size={16} />, roles: ['admin'] },
  {
    href: '/inventario',
    label: 'Inventario',
    icon: <BoxIcon size={16} />,
    roles: ['admin', 'stockkeeper'],
  },
  {
    href: '/kiosco',
    label: 'Extracción',
    icon: <BoxIcon size={16} />,
    roles: ['admin', 'stockkeeper'],
  },
  { href: '/usuarios', label: 'Usuarios', icon: <UsersIcon size={16} />, roles: ['admin'] },
  { href: '/reportes', label: 'Reportes', icon: <BarChartIcon size={16} />, roles: ['admin'] },
];

interface SidebarProps {
  role: Role;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({ role, open, onClose, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const navItems = NAV.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fade-in"
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 40 }}
          data-sidebar-backdrop
        />
      )}

      <aside
        data-sidebar
        style={{
          width: 240,
          backgroundColor: '#13294B',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflowY: 'auto',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(.16,1,.3,1)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: '20px 16px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: '#9E1B32',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>U</span>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
                  FCEE · UAGRM
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 10,
                    lineHeight: 1.3,
                    marginTop: 2,
                  }}
                >
                  Gestión de Inventarios
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              data-sidebar-close
              aria-label="Cerrar menú"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                padding: 4,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '12px 16px 4px', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: 2,
            }}
          >
            Acceso
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
            {ROLE_LABELS[role]}
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: '8px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.28)',
              padding: '8px 8px 4px',
            }}
          >
            Menú principal
          </div>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="nav-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  textDecoration: 'none',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.52)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  borderLeft: active ? '2px solid #9E1B32' : '2px solid transparent',
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  borderRadius: 4,
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '12px 8px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onLogout}
            className="nav-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.38)',
              fontSize: 12,
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <LogOutIcon size={15} />
            <span>Cerrar sesión</span>
          </button>
          <div
            style={{
              marginTop: 10,
              padding: '0 10px',
              fontSize: 10,
              color: 'rgba(255,255,255,0.18)',
              lineHeight: 1.6,
            }}
          >
            FCEE UAGRM © {new Date().getFullYear()}
            <br />
            Sistema de Inventarios v2.4
          </div>
        </div>
      </aside>

      <style>{`
        @media (min-width: 1024px) {
          [data-sidebar] {
            position: relative !important;
            transform: translateX(0) !important;
            transition: none !important;
            z-index: auto !important;
          }
          [data-sidebar-backdrop] { display: none !important; }
          [data-sidebar-close] { display: none !important; }
        }
      `}</style>
    </>
  );
}

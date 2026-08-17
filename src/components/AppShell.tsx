'use client';

import { useState, useTransition } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import type { Role } from '@/lib/types';

interface Props {
  user: { name: string; department: string; initials: string; role: Role };
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}

export default function AppShell({ user, onLogout, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg)',
      }}
    >
      <Sidebar
        role={user.role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => startTransition(() => void onLogout())}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Topbar user={user} onMenuClick={() => setSidebarOpen((o) => !o)} />
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--bg)',
            padding: '24px',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

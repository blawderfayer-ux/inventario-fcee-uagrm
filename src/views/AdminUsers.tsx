'use client';

import { useCallback, useEffect, useState } from 'react';
import { SkeletonCard, SkeletonTableRow } from '@/components/Skeleton';
import ErrorBanner from '@/components/ErrorBanner';
import { CheckIcon, EditIcon, PlusIcon, TrashIcon, XIcon } from '@/components/Icons';
import { api } from '@/lib/api';
import { ROLE_SHORT_LABELS, type AppUser, type Role } from '@/lib/types';

const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  admin: { bg: '#13294B', color: '#fff' },
  stockkeeper: { bg: '#1e4080', color: '#fff' },
  employee: { bg: '#E2E8F0', color: '#0F172A' },
};

function RoleBadge({ role }: { role: Role }) {
  const style = ROLE_COLORS[role];
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 7px',
        borderRadius: 2,
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {ROLE_SHORT_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 500,
        color: status === 'active' ? '#16a34a' : 'var(--muted-fg)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: status === 'active' ? '#16a34a' : 'var(--border)',
          display: 'inline-block',
        }}
      />
      {status === 'active' ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--muted-fg)',
          marginBottom: 5,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
        {required && <span style={{ color: '#9E1B32', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

interface UserModalProps {
  user?: AppUser | null;
  onClose: () => void;
  onSaved: (u: AppUser) => void;
}

function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const isEdit = !!user;
  const [form, setForm] = useState<Partial<AppUser>>(
    user ?? { role: 'employee', status: 'active', department: '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name ?? '',
      email: form.email ?? '',
      role: form.role ?? 'employee',
      department: form.department ?? '',
      status: form.status ?? 'active',
    };

    try {
      const res = await api<{ user: AppUser }>(isEdit ? `/api/users/${user.id}` : '/api/users', {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      onSaved(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 4,
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
              {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
              {isEdit ? `Modificando: ${user.email}` : 'Complete los campos requeridos'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted-fg)',
              padding: 4,
              borderRadius: 3,
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          <div style={{ display: 'grid', gap: 14 }}>
            <FormField label="Nombre completo" required>
              <input
                required
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: MSc. Carlos Mamani"
                style={{ width: '100%', height: 36, padding: '0 10px' }}
              />
            </FormField>
            <FormField
              label="Correo de Google"
              required
              hint={
                isEdit
                  ? undefined
                  : 'Debe coincidir con la cuenta de Google con la que iniciará sesión.'
              }
            >
              <input
                required
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@uagrm.edu.bo"
                style={{ width: '100%', height: 36, padding: '0 10px' }}
              />
            </FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Rol" required>
                <select
                  value={form.role}
                  required
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  style={{ width: '100%', height: 36, padding: '0 10px' }}
                >
                  <option value="employee">Empleado</option>
                  <option value="stockkeeper">Reponedor</option>
                  <option value="admin">Super Admin</option>
                </select>
              </FormField>
              <FormField label="Estado">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))
                  }
                  style={{ width: '100%', height: 36, padding: '0 10px' }}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </FormField>
            </div>
            <FormField label="Departamento" required>
              <input
                required
                value={form.department ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                placeholder="Ej: Dpto. Contabilidad"
                style={{ width: '100%', height: 36, padding: '0 10px' }}
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              style={{ padding: '0 16px', height: 36 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{
                padding: '0 20px',
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'wait' : 'pointer',
              }}
            >
              <CheckIcon size={14} color="#fff" />
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ users: AppUser[] }>('/api/users');
      setUsers(res.users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });

  const handleSaved = (u: AppUser) => {
    setUsers((prev) =>
      prev.find((x) => x.id === u.id) ? prev.map((x) => (x.id === u.id ? u : x)) : [u, ...prev]
    );
    setModal(null);
    setEditTarget(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este usuario del sistema?')) return;
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.');
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
            Gestión de Usuarios
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-fg)' }}>
            Asignación de roles y control de acceso institucional
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setEditTarget(null);
            setModal('new');
          }}
          style={{
            height: 36,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <PlusIcon size={14} color="#fff" />
          Nuevo usuario
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted-fg)',
              display: 'flex',
              pointerEvents: 'none',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o departamento..."
            style={{ width: '100%', height: 34, paddingLeft: 32, paddingRight: 10 }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted-fg)', flexShrink: 0 }}>
          {filtered.length} usuario{filtered.length !== 1 ? 's' : ''}
          {' · '}
          <span style={{ color: '#16a34a' }}>
            {users.filter((u) => u.status === 'active').length} activos
          </span>
          {' · '}
          <span>{users.filter((u) => u.status === 'inactive').length} inactivos</span>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }} data-desktop-table>
          <thead>
            <tr style={{ backgroundColor: '#13294B' }}>
              {['Nombre', 'Correo', 'Rol', 'Departamento', 'Estado', 'Último acceso', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.75)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => <SkeletonTableRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--muted-fg)',
                  }}
                >
                  No hay usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td
                    style={{
                      padding: '11px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--fg)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.name}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted-fg)' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <RoleBadge role={u.role} />
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--muted-fg)' }}>
                    {u.department}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <StatusBadge status={u.status} />
                  </td>
                  <td
                    style={{
                      padding: '11px 16px',
                      fontSize: 11,
                      color: 'var(--muted-fg)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {u.lastLogin}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          setEditTarget(u);
                          setModal('edit');
                        }}
                        className="btn-ghost"
                        style={{
                          width: 30,
                          height: 30,
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Editar"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        onClick={() => void handleDelete(u.id)}
                        style={{
                          width: 30,
                          height: 30,
                          padding: 0,
                          borderRadius: 4,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                          color: '#9E1B32',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title="Eliminar"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div data-mobile-cards>
          {loading
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i} style={{ padding: 12 }}>
                    <SkeletonCard />
                  </div>
                ))
            : filtered.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      backgroundColor: '#13294B',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {u.name
                      .split(' ')
                      .filter((w) => /^[\p{Lu}]/u.test(w))
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                      {u.email}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        marginTop: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <RoleBadge role={u.role} />
                      <StatusBadge status={u.status} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditTarget(u);
                        setModal('edit');
                      }}
                      className="btn-ghost"
                      style={{
                        width: 30,
                        height: 30,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <EditIcon size={13} />
                    </button>
                    <button
                      onClick={() => void handleDelete(u.id)}
                      className="btn-ghost"
                      style={{
                        width: 30,
                        height: 30,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9E1B32',
                        border: 'none',
                      }}
                    >
                      <TrashIcon size={13} />
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <UserModal
          user={editTarget}
          onClose={() => {
            setModal(null);
            setEditTarget(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <style>{`
        @media (max-width: 767px) {
          [data-desktop-table] { display: none !important; }
          [data-mobile-cards] { display: block !important; }
        }
        @media (min-width: 768px) {
          [data-desktop-table] { display: table !important; }
          [data-mobile-cards] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

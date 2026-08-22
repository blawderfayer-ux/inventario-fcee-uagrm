'use client';

import { useCallback, useEffect, useState } from 'react';
import ErrorBanner from '@/components/ErrorBanner';
import { AlertIcon, RefreshIcon, TrashIcon } from '@/components/Icons';
import { api } from '@/lib/api';

interface ActividadPorUsuario {
  userName: string;
  total: number;
  ingresos: number;
  extracciones: number;
  ultimo: string | null;
}

function fecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Depuración de la bitácora durante las pruebas. Va aparte del resto de la
 * pantalla porque borra registros de auditoría: no es una acción del día a día.
 */
export default function MantenimientoActividad() {
  const [usuarios, setUsuarios] = useState<ActividadPorUsuario[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ usuarios: ActividadPorUsuario[]; total: number }>(
        '/api/mantenimiento/actividad'
      );
      setUsuarios(res.usuarios);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la bitácora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (abierto) void load();
  }, [abierto, load]);

  const borrar = async (u: ActividadPorUsuario) => {
    const ok = confirm(
      `¿Borrar los ${u.total} movimiento(s) registrados por "${u.userName}"?\n\n` +
        'Esta acción no se puede deshacer. Los movimientos son el respaldo de los ' +
        'informes de gestión, así que úsela solo para limpiar datos de prueba.\n\n' +
        'Si esos movimientos afectaron el stock de productos que siguen existiendo, ' +
        'los cuadros de cierre dejarán de cuadrar para esos artículos.'
    );
    if (!ok) return;

    setBusy(u.userName);
    setError(null);
    try {
      const res = await api<{ eliminados: number }>(
        `/api/mantenimiento/actividad?userName=${encodeURIComponent(u.userName)}`,
        { method: 'DELETE' }
      );
      setNotice(`Se borraron ${res.eliminados} movimiento(s) de ${u.userName}.`);
      setTimeout(() => setNotice(null), 6000);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar la actividad.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderTop: '3px solid #9E1B32',
        borderRadius: 4,
        padding: 20,
        marginTop: 16,
      }}
    >
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
            Depuración de datos de prueba
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-fg)', lineHeight: 1.5 }}>
            Borra la actividad registrada por un usuario. Pensado para limpiar las pruebas
            antes de poner el sistema en uso real.
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#9E1B32', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {abierto ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {abierto && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              padding: '10px 13px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 4,
              marginBottom: 16,
              fontSize: 12,
              color: '#92400e',
              lineHeight: 1.5,
            }}
          >
            <span style={{ paddingTop: 1, flexShrink: 0 }}>
              <AlertIcon size={13} color="#92400e" />
            </span>
            <span>
              Los movimientos son el respaldo de los informes y de los cuadros de cierre.
              Borrarlos es irreversible: hágalo solo con datos de prueba.
            </span>
          </div>

          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          {notice && (
            <div
              className="fade-in"
              style={{
                padding: '9px 13px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 4,
                marginBottom: 14,
                fontSize: 12,
                color: '#166534',
                fontWeight: 500,
              }}
            >
              ✓ {notice}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              fontSize: 12,
              color: 'var(--muted-fg)',
            }}
          >
            <span>{loading ? 'Leyendo bitácora...' : `${total} movimiento(s) en total`}</span>
            <button
              onClick={() => void load()}
              className="btn-ghost"
              style={{
                height: 30,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
              }}
            >
              <RefreshIcon size={12} />
              Actualizar
            </button>
          </div>

          {!loading && usuarios.length === 0 ? (
            <div
              style={{
                padding: '26px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--muted-fg)',
                border: '1px dashed var(--border)',
                borderRadius: 4,
              }}
            >
              La bitácora está vacía.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {usuarios.map((u) => (
                <div
                  key={u.userName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                      {u.userName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                      {u.total} movimiento(s) · {u.ingresos} ingreso(s) · {u.extracciones}{' '}
                      extracción(es) · último {fecha(u.ultimo)}
                    </div>
                  </div>
                  <button
                    onClick={() => void borrar(u)}
                    disabled={busy === u.userName}
                    className="btn-danger"
                    style={{
                      height: 32,
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: busy === u.userName ? 0.7 : 1,
                    }}
                  >
                    <TrashIcon size={13} color="#fff" />
                    {busy === u.userName ? 'Borrando...' : 'Borrar su actividad'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

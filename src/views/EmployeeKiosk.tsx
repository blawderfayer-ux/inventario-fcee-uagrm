'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import ErrorBanner from '@/components/ErrorBanner';
import { CheckIcon, HomeIcon, LogOutIcon, MinusIcon, PlusIcon, SearchIcon } from '@/components/Icons';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

type KioskState = 'idle' | 'searching' | 'found' | 'not-found' | 'confirming' | 'success';

interface Props {
  user: { name: string; department: string };
  canReturnToPanel: boolean;
  onLogout: () => Promise<void>;
}

export default function EmployeeKiosk({ user, canReturnToPanel, onLogout }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<KioskState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ quantity: number; unit: string; name: string; reason: string } | null>(
    null
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleReset = () => {
    setQuery('');
    setResult(null);
    setQuantity(1);
    setReason('');
    setError(null);
    setConfirmed(null);
    setState('idle');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setState('searching');
    setError(null);
    try {
      const res = await api<{ products: Product[] }>(
        `/api/products?search=${encodeURIComponent(query.trim())}`
      );
      const found = res.products[0];
      if (found) {
        setResult(found);
        setQuantity(1);
        setState('found');
      } else {
        setResult(null);
        setState('not-found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo buscar el material.');
      setState('idle');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSearch();
  };

  const handleRegister = async () => {
    if (!result || !reason.trim()) return;
    setState('confirming');
    setError(null);
    try {
      await api(`/api/products/${result.id}/extraer`, {
        method: 'POST',
        body: JSON.stringify({ quantity, reason: reason.trim() }),
      });
      setConfirmed({ quantity, unit: result.unit, name: result.name, reason: reason.trim() });
      setState('success');
      setTimeout(handleReset, 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la extracción.');
      setState('found');
    }
  };

  const canRegister =
    !!result && quantity >= 1 && quantity <= result.quantity && reason.trim().length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Kiosk header */}
      <div
        style={{
          height: 52,
          backgroundColor: '#13294B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              backgroundColor: '#9E1B32',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>U</span>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>FCEE · UAGRM</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>Kiosco de Extracción</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right', marginRight: 4 }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 500 }}>
              {user.name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{user.department}</div>
          </div>
          <ThemeToggleButton variant="navy" size={15} />
          {canReturnToPanel ? (
            <Link
              href="/dashboard"
              title="Volver al panel"
              aria-label="Volver al panel"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                padding: 6,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <HomeIcon size={15} />
            </Link>
          ) : (
            <button
              onClick={() => startTransition(() => void onLogout())}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                padding: 6,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LogOutIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Main kiosk content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 16px 24px',
          maxWidth: 600,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {state === 'success' && confirmed && (
          <div
            className="fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              textAlign: 'center',
              gap: 20,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckIcon size={36} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>
                Extracción Registrada
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted-fg)' }}>
                <strong style={{ color: 'var(--fg)' }}>
                  {confirmed.quantity} {confirmed.unit}(s)
                </strong>{' '}
                de <strong style={{ color: 'var(--fg)' }}>{confirmed.name}</strong>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 4 }}>
                Motivo: {confirmed.reason}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>Reiniciando en unos segundos...</div>
          </div>
        )}

        {state === 'confirming' && (
          <div
            className="fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 20,
            }}
          >
            <div
              className="skeleton"
              style={{ width: 56, height: 56, borderRadius: 4, backgroundColor: 'var(--muted)' }}
            />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>
              Registrando extracción...
            </div>
          </div>
        )}

        {state !== 'success' && state !== 'confirming' && (
          <>
            <div style={{ width: '100%', marginBottom: 32 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--muted-fg)',
                  textAlign: 'center',
                  marginBottom: 16,
                }}
              >
                Buscar material
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--muted-fg)',
                      display: 'flex',
                      pointerEvents: 'none',
                    }}
                  >
                    <SearchIcon size={20} />
                  </span>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      if (state !== 'idle') setState('idle');
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Nombre del material o código SKU..."
                    style={{
                      width: '100%',
                      height: 56,
                      paddingLeft: 48,
                      paddingRight: 16,
                      fontSize: 16,
                      borderRadius: 4,
                      border: '2px solid var(--border)',
                      outline: 'none',
                      backgroundColor: 'var(--card)',
                      color: 'var(--fg)',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#13294B')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={() => void handleSearch()}
                  disabled={state === 'searching'}
                  style={{
                    height: 56,
                    padding: '0 20px',
                    fontSize: 14,
                    flexShrink: 0,
                    borderRadius: 4,
                  }}
                >
                  {state === 'searching' ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {state === 'not-found' && (
                <div
                  className="fade-in"
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 4,
                    fontSize: 13,
                    color: '#9E1B32',
                    textAlign: 'center',
                  }}
                >
                  No se encontró ningún producto con &quot;{query}&quot;
                </div>
              )}
            </div>

            <div style={{ width: '100%' }}>
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>

            {result && state === 'found' && (
              <div className="fade-in" style={{ width: '100%' }}>
                <div
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '2px solid #13294B',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 24,
                  }}
                >
                  {result.imageUrl && (
                    <div style={{ height: 200, backgroundColor: 'var(--muted)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={result.imageUrl}
                        alt={result.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div style={{ padding: '16px 20px' }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: 'var(--muted-fg)',
                        marginBottom: 4,
                      }}
                    >
                      {result.category} · {result.sku}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>
                      {result.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: result.quantity <= result.minStock ? '#9E1B32' : '#16a34a',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {result.quantity}
                      </span>
                      <span style={{ fontSize: 14, color: 'var(--muted-fg)', fontWeight: 500 }}>
                        {result.unit}s disponibles
                      </span>
                      {result.quantity <= result.minStock && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: 2,
                            backgroundColor: '#fef2f2',
                            color: '#9E1B32',
                            border: '1px solid #fecaca',
                          }}
                        >
                          STOCK BAJO
                        </span>
                      )}
                    </div>
                    {result.location && (
                      <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginTop: 4 }}>
                        {result.location}
                      </div>
                    )}
                  </div>
                </div>

                {result.quantity === 0 ? (
                  <div
                    style={{
                      padding: '14px 16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 4,
                      fontSize: 13,
                      color: '#9E1B32',
                      textAlign: 'center',
                      marginBottom: 16,
                    }}
                  >
                    Este material está agotado. Comuníquese con el Almacén Central.
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--muted-fg)',
                          marginBottom: 10,
                          textAlign: 'center',
                        }}
                      >
                        Cantidad a retirar
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 0,
                        }}
                      >
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          aria-label="Disminuir cantidad"
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '4px 0 0 4px',
                            border: '2px solid var(--border)',
                            borderRight: 'none',
                            backgroundColor: quantity <= 1 ? 'var(--muted)' : 'var(--card)',
                            cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--fg)',
                            transition: 'background-color 0.1s ease',
                          }}
                        >
                          <MinusIcon size={22} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={result.quantity}
                          value={quantity}
                          aria-label="Cantidad"
                          onChange={(e) =>
                            setQuantity(Math.max(1, Math.min(result.quantity, Number(e.target.value))))
                          }
                          style={{
                            width: 100,
                            height: 64,
                            textAlign: 'center',
                            fontSize: 28,
                            fontWeight: 800,
                            borderRadius: 0,
                            border: '2px solid var(--border)',
                            fontVariantNumeric: 'tabular-nums',
                            backgroundColor: 'var(--card)',
                            color: 'var(--fg)',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={() => setQuantity((q) => Math.min(result.quantity, q + 1))}
                          disabled={quantity >= result.quantity}
                          aria-label="Aumentar cantidad"
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '0 4px 4px 0',
                            border: '2px solid var(--border)',
                            borderLeft: 'none',
                            backgroundColor:
                              quantity >= result.quantity ? 'var(--muted)' : 'var(--card)',
                            cursor: quantity >= result.quantity ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--fg)',
                            transition: 'background-color 0.1s ease',
                          }}
                        >
                          <PlusIcon size={22} />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: 'var(--muted-fg)',
                          marginBottom: 8,
                        }}
                      >
                        Motivo de extracción <span style={{ color: '#9E1B32' }}>*</span>
                      </div>
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Ej: Elaboración de informe trimestral, Examen parcial, etc."
                        style={{ width: '100%', height: 48, padding: '0 14px', fontSize: 14, borderRadius: 4 }}
                      />
                    </div>

                    <button
                      onClick={() => void handleRegister()}
                      disabled={!canRegister}
                      style={{
                        width: '100%',
                        height: 56,
                        borderRadius: 4,
                        fontSize: 15,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        cursor: canRegister ? 'pointer' : 'not-allowed',
                        border: 'none',
                        fontFamily: 'inherit',
                        backgroundColor: canRegister ? '#9E1B32' : 'var(--muted)',
                        color: canRegister ? '#fff' : 'var(--muted-fg)',
                        transition: 'background-color 0.15s ease, opacity 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                      }}
                    >
                      <CheckIcon
                        size={18}
                        color={canRegister ? '#fff' : 'var(--muted-fg)'}
                        strokeWidth={2.5}
                      />
                      Registrar extracción
                    </button>
                  </>
                )}

                <button
                  onClick={handleReset}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    height: 40,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--muted-fg)',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancelar y volver a buscar
                </button>
              </div>
            )}

            {(state === 'idle' || state === 'searching') && !result && (
              <div style={{ textAlign: 'center', color: 'var(--muted-fg)', marginTop: 16 }}>
                <div style={{ fontSize: 13 }}>
                  Escriba el nombre del material o su código SKU y presione <strong>Buscar</strong> o{' '}
                  <strong>Enter</strong>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

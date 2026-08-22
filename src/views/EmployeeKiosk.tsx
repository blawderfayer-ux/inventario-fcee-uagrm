'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import Logo from '@/components/Logo';
import ErrorBanner from '@/components/ErrorBanner';
import { SkeletonCard } from '@/components/Skeleton';
import {
  CheckIcon,
  HomeIcon,
  ImageIcon,
  LogOutIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from '@/components/Icons';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

type KioskState = 'browse' | 'selected' | 'confirming' | 'success';

interface Props {
  user: { name: string; department: string };
  canReturnToPanel: boolean;
  onLogout: () => Promise<void>;
}

/** Quita tildes y pasa a minúsculas para que "toner" encuentre "Tóner". */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Resalta en negrita el tramo que coincide con lo escrito. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const i = fold(text).indexOf(fold(term));
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark
        style={{
          background: 'rgba(158,27,50,0.16)',
          color: 'inherit',
          padding: '0 1px',
          borderRadius: 2,
          fontWeight: 700,
        }}
      >
        {text.slice(i, i + term.length)}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

function Thumb({ src, alt, size }: { src: string; alt: string; size: number }) {
  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 4,
    flexShrink: 0,
    backgroundColor: 'var(--muted)',
    overflow: 'hidden',
  };
  if (!src) {
    return (
      <div
        style={{
          ...box,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted-fg)',
        }}
      >
        <ImageIcon size={Math.round(size / 2.6)} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- las fotos vienen de GridFS.
  return <img src={src} alt={alt} style={{ ...box, objectFit: 'cover' }} />;
}

function StockTag({ product }: { product: Product }) {
  const out = product.quantity === 0;
  const low = !out && product.quantity <= product.minStock;
  const [bg, fg, border, label] = out
    ? ['#fef2f2', '#9E1B32', '#fecaca', 'Agotado']
    : low
      ? ['#fffbeb', '#92400e', '#fde68a', 'Stock bajo']
      : ['#f0fdf4', '#16a34a', '#bbf7d0', 'Disponible'];

  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 2,
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export default function EmployeeKiosk({ user, canReturnToPanel, onLogout }: Props) {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<KioskState>('browse');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    quantity: number;
    unit: string;
    name: string;
    reason: string;
  } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await api<{ products: Product[] }>('/api/products');
      setCatalog(res.products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state === 'browse') searchRef.current?.focus();
  }, [state]);

  // Filtrado instantáneo mientras se escribe: los que empiezan con el término
  // primero, luego los que lo contienen en cualquier parte.
  const results = useMemo(() => {
    const term = fold(query.trim());
    if (!term) return catalog;
    const scored = catalog
      .map((p) => {
        const name = fold(p.name);
        const sku = fold(p.sku);
        const cat = fold(p.category);
        if (name.startsWith(term) || sku.startsWith(term)) return { p, rank: 0 };
        if (name.includes(term) || sku.includes(term)) return { p, rank: 1 };
        if (cat.includes(term)) return { p, rank: 2 };
        return null;
      })
      .filter((x): x is { p: Product; rank: number } => x !== null);
    scored.sort((a, b) => a.rank - b.rank || a.p.name.localeCompare(b.p.name, 'es'));
    return scored.map((x) => x.p);
  }, [catalog, query]);

  const backToBrowse = () => {
    setSelected(null);
    setQuantity(1);
    setReason('');
    setError(null);
    setState('browse');
  };

  const handleReset = () => {
    setQuery('');
    setConfirmed(null);
    backToBrowse();
    void load();
  };

  const pick = (p: Product) => {
    if (p.quantity === 0) return;
    setSelected(p);
    setQuantity(1);
    setReason('');
    setError(null);
    setState('selected');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) pick(results[0]);
    if (e.key === 'Escape') setQuery('');
  };

  const handleRegister = async () => {
    if (!selected || !reason.trim()) return;
    setState('confirming');
    setError(null);
    try {
      await api(`/api/products/${selected.id}/extraer`, {
        method: 'POST',
        body: JSON.stringify({ quantity, reason: reason.trim() }),
      });
      setConfirmed({
        quantity,
        unit: selected.unit,
        name: selected.name,
        reason: reason.trim(),
      });
      setState('success');
      setTimeout(handleReset, 3200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la extracción.');
      setState('selected');
    }
  };

  const canRegister =
    !!selected && quantity >= 1 && quantity <= selected.quantity && reason.trim().length > 0;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Cabecera */}
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
          <Logo size={30} />
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

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px 32px',
          maxWidth: 880,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* ---------- Confirmación ---------- */}
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
            <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
              Volviendo al catálogo en unos segundos...
            </div>
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

        {/* ---------- Catálogo con búsqueda en vivo ---------- */}
        {state === 'browse' && (
          <>
            <div style={{ position: 'relative', marginBottom: 8 }}>
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
                <SearchIcon size={19} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escriba para filtrar el material..."
                aria-label="Filtrar material"
                style={{
                  width: '100%',
                  height: 54,
                  paddingLeft: 48,
                  paddingRight: query ? 46 : 16,
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
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  aria-label="Limpiar búsqueda"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--muted)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 26,
                    height: 26,
                    cursor: 'pointer',
                    color: 'var(--muted-fg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
                fontSize: 12,
                color: 'var(--muted-fg)',
                flexWrap: 'wrap',
              }}
            >
              <span>
                {loading
                  ? 'Cargando catálogo...'
                  : query
                    ? `${results.length} de ${catalog.length} materiales`
                    : `${catalog.length} materiales disponibles`}
              </span>
              <span>Toque un material para retirarlo</span>
            </div>

            <ErrorBanner message={error} onDismiss={() => setError(null)} />

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
              </div>
            ) : results.length === 0 ? (
              <div
                style={{
                  padding: '44px 16px',
                  textAlign: 'center',
                  color: 'var(--muted-fg)',
                  border: '1px dashed var(--border)',
                  borderRadius: 4,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                  {catalog.length === 0
                    ? 'Todavía no hay materiales registrados'
                    : `Sin resultados para «${query}»`}
                </div>
                <div style={{ fontSize: 12 }}>
                  {catalog.length === 0
                    ? 'El almacén aún no ha cargado el inventario.'
                    : 'Pruebe con otra palabra o revise el nombre del material.'}
                </div>
              </div>
            ) : (
              <div
                data-kiosk-grid
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                }}
              >
                {results.map((p) => {
                  const out = p.quantity === 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => pick(p)}
                      disabled={out}
                      className="kiosk-card"
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        cursor: out ? 'not-allowed' : 'pointer',
                        opacity: out ? 0.55 : 1,
                        fontFamily: 'inherit',
                        transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
                      }}
                    >
                      <Thumb src={p.imageUrl} alt={p.name} size={54} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--fg)',
                            lineHeight: 1.3,
                          }}
                        >
                          <Highlight text={p.name} term={query.trim()} />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--muted-fg)',
                            marginTop: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <span style={{ fontFamily: 'monospace' }}>{p.sku}</span> · {p.category}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 7,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 800,
                              color: out ? '#9E1B32' : 'var(--fg)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {p.quantity}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--muted-fg)' }}>{p.unit}s</span>
                          <StockTag product={p} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ---------- Retiro del material elegido ---------- */}
        {state === 'selected' && selected && (
          <div className="fade-in" style={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
            <button
              onClick={backToBrowse}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted-fg)',
                fontSize: 12,
                fontFamily: 'inherit',
                padding: '4px 0',
                marginBottom: 12,
              }}
            >
              ← Volver al catálogo
            </button>

            <div
              style={{
                backgroundColor: 'var(--card)',
                border: '2px solid #13294B',
                borderRadius: 4,
                overflow: 'hidden',
                marginBottom: 22,
              }}
            >
              {selected.imageUrl && (
                <div style={{ height: 190, backgroundColor: 'var(--muted)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.imageUrl}
                    alt={selected.name}
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
                  {selected.category} · {selected.sku}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg)', marginBottom: 8 }}>
                  {selected.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: selected.quantity <= selected.minStock ? '#9E1B32' : '#16a34a',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {selected.quantity}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--muted-fg)', fontWeight: 500 }}>
                    {selected.unit}s disponibles
                  </span>
                  <StockTag product={selected} />
                </div>
              </div>
            </div>

            <ErrorBanner message={error} onDismiss={() => setError(null)} />

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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  }}
                >
                  <MinusIcon size={22} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={selected.quantity}
                  value={quantity}
                  aria-label="Cantidad"
                  onChange={(e) =>
                    setQuantity(Math.max(1, Math.min(selected.quantity, Number(e.target.value))))
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
                  onClick={() => setQuantity((q) => Math.min(selected.quantity, q + 1))}
                  disabled={quantity >= selected.quantity}
                  aria-label="Aumentar cantidad"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '0 4px 4px 0',
                    border: '2px solid var(--border)',
                    borderLeft: 'none',
                    backgroundColor:
                      quantity >= selected.quantity ? 'var(--muted)' : 'var(--card)',
                    cursor: quantity >= selected.quantity ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg)',
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
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <CheckIcon size={18} color={canRegister ? '#fff' : 'var(--muted-fg)'} strokeWidth={2.5} />
              Registrar extracción
            </button>
          </div>
        )}
      </div>

      <style>{`
        .kiosk-card:hover:not(:disabled) {
          border-color: #13294B !important;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        @media (max-width: 560px) {
          [data-kiosk-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

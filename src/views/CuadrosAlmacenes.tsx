'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/Skeleton';
import ErrorBanner from '@/components/ErrorBanner';
import { AlertIcon, DownloadIcon, FileTextIcon } from '@/components/Icons';
import { api } from '@/lib/api';

interface DetalleRow {
  n: number;
  category: string;
  partida: string;
  unit: string;
  qtyInitial: number;
  qtyIn: number;
  qtyOut: number;
  qtyFinal: number;
  valInitial: number;
  valIn: number;
  valOut: number;
  valFinal: number;
}

interface ResumenRow {
  n: number;
  partida: string;
  qtyInitial: number;
  valInitial: number;
  qtyFinal: number;
  valFinal: number;
}

interface AlmacenesReport {
  year: number;
  detalle: DetalleRow[];
  resumen: ResumenRow[];
  totals: {
    qtyInitial: number;
    qtyIn: number;
    qtyOut: number;
    qtyFinal: number;
    valInitial: number;
    valIn: number;
    valOut: number;
    valFinal: number;
  };
  sinPartida: string[];
}

const nf = (n: number) =>
  n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const th: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.8)',
  backgroundColor: '#13294B',
  whiteSpace: 'nowrap',
  border: '1px solid #1e3a63',
};

const td: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 12,
  color: 'var(--fg)',
  border: '1px solid var(--border)',
};

const tdNum: React.CSSProperties = {
  ...td,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const tfootCell: React.CSSProperties = {
  ...tdNum,
  fontWeight: 700,
  backgroundColor: 'var(--muted)',
};

function SectionTitle({ code, title }: { code: string; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 10,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>{title}</div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#9E1B32',
          fontFamily: 'monospace',
        }}
      >
        {code} · Versión 01
      </div>
    </div>
  );
}

export default function CuadrosAlmacenes() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<AlmacenesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<AlmacenesReport>(`/api/reportes/cuadros?year=${year}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron calcular los cuadros.');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  };

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const t = data?.totals;

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderTop: '3px solid #13294B',
        borderRadius: 4,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
          Cuadros de cierre de gestión
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-fg)', lineHeight: 1.5 }}>
          Formularios oficiales de almacenes exigidos por la Dirección General de Contabilidad
          Fiscal, calculados a partir de los movimientos registrados en el sistema.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          flexWrap: 'wrap',
          margin: '16px 0',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--muted-fg)',
              marginBottom: 5,
            }}
          >
            Gestión
          </label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ height: 36, padding: '0 10px', minWidth: 110 }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            notify('Libro con los dos cuadros descargado.');
            window.location.href = `/api/reportes/cuadros/excel?year=${year}`;
          }}
          style={{ height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <DownloadIcon size={14} color="#fff" />
          Cuadros en Excel
        </button>

        <button
          onClick={() => {
            notify('Cuadros abiertos en una pestaña nueva; guárdelos como PDF al imprimir.');
            window.open(`/api/reportes/cuadros/pdf?year=${year}`, '_blank', 'noopener');
          }}
          style={{
            height: 36,
            padding: '0 16px',
            borderRadius: 4,
            border: '1px solid #13294B',
            backgroundColor: 'transparent',
            color: '#13294B',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'inherit',
          }}
        >
          <FileTextIcon size={14} />
          Cuadros en PDF
        </button>
      </div>

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

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {data && data.sinPartida.length > 0 && (
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
            Sin partida presupuestaria: <strong>{data.sinPartida.join(', ')}</strong>. El Cuadro 5
            las agrupa aparte hasta que asigne su partida en <em>Inventario → Categorías</em>.
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} width="100%" height={26} />
            ))}
        </div>
      ) : (
        <>
          {/* ---------------- Cuadro 5 ---------------- */}
          <SectionTitle code="DGCF - R1.05" title="Cuadro 5 · Resumen de Almacenes por partida" />
          <div style={{ overflowX: 'auto', marginBottom: 26 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: 'center' }}>N°</th>
                  <th style={{ ...th, textAlign: 'left' }}>Partida</th>
                  <th style={{ ...th, textAlign: 'right' }}>Cant. inicial 01/01</th>
                  <th style={{ ...th, textAlign: 'right' }}>Saldo inicial (Bs)</th>
                  <th style={{ ...th, textAlign: 'right' }}>Cant. final 31/12</th>
                  <th style={{ ...th, textAlign: 'right' }}>Saldo final (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {data?.resumen.length ? (
                  data.resumen.map((r) => (
                    <tr key={`${r.partida}-${r.n}`}>
                      <td style={{ ...td, textAlign: 'center' }}>{r.n}</td>
                      <td style={{ ...td, fontFamily: r.partida ? 'monospace' : 'inherit' }}>
                        {r.partida || (
                          <span style={{ color: '#9E1B32', fontStyle: 'italic' }}>Sin partida</span>
                        )}
                      </td>
                      <td style={tdNum}>{nf(r.qtyInitial)}</td>
                      <td style={tdNum}>{nf(r.valInitial)}</td>
                      <td style={tdNum}>{nf(r.qtyFinal)}</td>
                      <td style={tdNum}>{nf(r.valFinal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--muted-fg)' }}>
                      Sin movimientos ni existencias en la gestión {year}.
                    </td>
                  </tr>
                )}
              </tbody>
              {t && (
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ ...tfootCell, textAlign: 'center' }}>
                      TOTAL
                    </td>
                    <td style={tfootCell}>{nf(t.qtyInitial)}</td>
                    <td style={tfootCell}>{nf(t.valInitial)}</td>
                    <td style={tfootCell}>{nf(t.qtyFinal)}</td>
                    <td style={tfootCell}>{nf(t.valFinal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ---------------- Cuadro 6 ---------------- */}
          <SectionTitle code="DGCF - R1.06" title="Cuadro 6 · Detalle de Almacenes por categoría" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...th, textAlign: 'center' }}>
                    N°
                  </th>
                  <th rowSpan={2} style={{ ...th, textAlign: 'left' }}>
                    Descripción (ítem)
                  </th>
                  <th colSpan={4} style={{ ...th, textAlign: 'center' }}>
                    Cantidad
                  </th>
                  <th colSpan={4} style={{ ...th, textAlign: 'center' }}>
                    Valores (Bs)
                  </th>
                </tr>
                <tr>
                  {['S. inicial', 'Entradas', 'Salidas', 'S. final'].map((h) => (
                    <th key={`q-${h}`} style={{ ...th, textAlign: 'right' }}>
                      {h}
                    </th>
                  ))}
                  {['S. inicial', 'Entradas', 'Salidas', 'S. final'].map((h) => (
                    <th key={`v-${h}`} style={{ ...th, textAlign: 'right' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.detalle.length ? (
                  data.detalle.map((r) => (
                    <tr key={r.category}>
                      <td style={{ ...td, textAlign: 'center' }}>{r.n}</td>
                      <td style={td}>
                        {r.category}
                        {r.partida && (
                          <span
                            style={{
                              marginLeft: 7,
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: 'var(--muted-fg)',
                            }}
                          >
                            {r.partida}
                          </span>
                        )}
                      </td>
                      <td style={tdNum}>{nf(r.qtyInitial)}</td>
                      <td style={tdNum}>{nf(r.qtyIn)}</td>
                      <td style={tdNum}>{nf(r.qtyOut)}</td>
                      <td style={tdNum}>{nf(r.qtyFinal)}</td>
                      <td style={tdNum}>{nf(r.valInitial)}</td>
                      <td style={tdNum}>{nf(r.valIn)}</td>
                      <td style={tdNum}>{nf(r.valOut)}</td>
                      <td style={{ ...tdNum, fontWeight: 600 }}>{nf(r.valFinal)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ ...td, textAlign: 'center', color: 'var(--muted-fg)' }}>
                      Sin movimientos ni existencias en la gestión {year}.
                    </td>
                  </tr>
                )}
              </tbody>
              {t && (
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ ...tfootCell, textAlign: 'center' }}>
                      TOTAL
                    </td>
                    <td style={tfootCell}>{nf(t.qtyInitial)}</td>
                    <td style={tfootCell}>{nf(t.qtyIn)}</td>
                    <td style={tfootCell}>{nf(t.qtyOut)}</td>
                    <td style={tfootCell}>{nf(t.qtyFinal)}</td>
                    <td style={tfootCell}>{nf(t.valInitial)}</td>
                    <td style={tfootCell}>{nf(t.valIn)}</td>
                    <td style={tfootCell}>{nf(t.valOut)}</td>
                    <td style={tfootCell}>{nf(t.valFinal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 12, lineHeight: 1.55 }}>
            El saldo final se obtiene de las existencias al 31/12 de la gestión y el saldo inicial
            se deduce por la identidad <strong>inicial + entradas − salidas = final</strong>, la
            misma que verifica Contabilidad. Los documentos exportados incluyen las notas
            normativas y los tres bloques de firma del formulario oficial.
          </div>
        </>
      )}
    </div>
  );
}

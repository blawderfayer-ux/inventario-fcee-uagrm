'use client';

import { useCallback, useEffect, useState } from 'react';
import { Skeleton } from '@/components/Skeleton';
import ErrorBanner from '@/components/ErrorBanner';
import { DownloadIcon, FileTextIcon, FilterIcon } from '@/components/Icons';
import { api } from '@/lib/api';
import { DEFAULT_CATEGORIES } from '@/lib/types';

interface ReportRow {
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minStock: number;
  unitPrice: number;
  totalValue: number;
  entradas: number;
  salidas: number;
  estado: 'Crítico' | 'Normal';
}

interface ReportData {
  rows: ReportRow[];
  totalValue: number;
  totalUnits: number;
  totalEntradas: number;
  totalSalidas: number;
  criticalCount: number;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--muted-fg)',
  marginBottom: 5,
};

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: firstOfMonth(),
    dateTo: today(),
    category: 'Todas',
    type: 'all',
  });

  const query = new URLSearchParams(filters).toString();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<ReportData>(`/api/reportes?${query}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la vista previa.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<{ categories: string[] }>('/api/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories(DEFAULT_CATEGORIES));
  }, []);

  const notify = (msg: string) => {
    setGenerated(msg);
    setTimeout(() => setGenerated(null), 5000);
  };

  const handleExcel = () => {
    notify('Libro de Excel (.xlsx) descargado, con hoja de detalle y resumen por categoría.');
    window.location.href = `/api/reportes/export?${query}`;
  };

  const handlePdf = () => {
    notify('Informe abierto en una pestaña nueva; guárdelo como PDF desde el diálogo de impresión.');
    window.open(`/api/reportes/pdf?${query}`, '_blank', 'noopener');
  };

  const handleLatex = () => {
    notify('Código fuente LaTeX (.tex) descargado. Compílelo con pdflatex.');
    window.location.href = `/api/reportes/latex?${query}`;
  };

  const rows = data?.rows ?? [];
  const totalValue = data?.totalValue ?? 0;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
          Reportes e Informes
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-fg)' }}>
          Generación de reportes financieros y de inventario en formato Excel y PDF institucional
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      <div
        style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}
        data-reports-grid
      >
        {/* Filter panel */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#13294B',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FilterIcon size={14} color="rgba(255,255,255,0.7)" />
            <span
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Parámetros
            </span>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FilterSection label="Rango de fechas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    style={{ width: '100%', height: 34, padding: '0 8px' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    style={{ width: '100%', height: 34, padding: '0 8px' }}
                  />
                </div>
              </div>
            </FilterSection>

            <FilterSection label="Categoría">
              <select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', height: 34, padding: '0 8px' }}
              >
                <option>Todas</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FilterSection>

            <FilterSection label="Tipo de movimiento">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { val: 'all', label: 'Todos' },
                  { val: 'entradas', label: 'Solo entradas' },
                  { val: 'salidas', label: 'Solo salidas' },
                ].map((opt) => (
                  <label
                    key={opt.val}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--fg)',
                    }}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={opt.val}
                      checked={filters.type === opt.val}
                      onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                      style={{ accentColor: '#13294B' }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </FilterSection>
          </div>
        </div>

        {/* Preview + export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 20,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
              Exportar reporte
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 16 }}>
              Periodo: {filters.dateFrom.split('-').reverse().join('/')} –{' '}
              {filters.dateTo.split('-').reverse().join('/')}
              {filters.category !== 'Todas' && ` · Categoría: ${filters.category}`}
            </div>

            {generated && (
              <div
                className="fade-in"
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 4,
                  marginBottom: 12,
                  fontSize: 12,
                  color: '#166534',
                  fontWeight: 500,
                }}
              >
                ✓ {generated}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={handleExcel}
                style={{
                  height: 38,
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <DownloadIcon size={14} color="#fff" />
                Exportar Excel (.xlsx)
              </button>
              <button
                onClick={handlePdf}
                style={{
                  height: 38,
                  padding: '0 20px',
                  borderRadius: 4,
                  border: '1px solid #13294B',
                  backgroundColor: 'transparent',
                  color: '#13294B',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f4ff')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <FileTextIcon size={14} />
                Generar PDF institucional
              </button>
              <button
                onClick={handleLatex}
                style={{
                  height: 38,
                  padding: '0 20px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--fg)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                }}
              >
                <FileTextIcon size={14} />
                Código LaTeX (.tex)
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted-fg)',
                }}
              >
                Vista previa del reporte
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                {rows.length} artículos · Valor total:{' '}
                <strong style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                  Bs. {totalValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            <div
              className="font-report"
              style={{
                margin: '0 16px',
                padding: '16px',
                border: '1px solid var(--border)',
                borderTop: 'none',
                borderBottom: '2px solid #13294B',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--fg)',
                    letterSpacing: '0.05em',
                  }}
                >
                  UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg)', marginTop: 2 }}>
                  Facultad de Ciencias Económicas y Empresariales
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>
                  Informe de Inventario · Período {filters.dateFrom} / {filters.dateTo}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ backgroundColor: '#13294B' }}>
                    {[
                      'Código',
                      'Descripción',
                      'Categoría',
                      'Unidad',
                      'Stock',
                      'P. Unitario (Bs.)',
                      'Valor Total (Bs.)',
                      'Estado',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '9px 14px',
                          textAlign:
                            h.includes('Bs.') || h === 'Stock'
                              ? 'right'
                              : h === 'Estado'
                                ? 'center'
                                : 'left',
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
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          {Array(8)
                            .fill(0)
                            .map((_, j) => (
                              <td key={j} style={{ padding: '10px 14px' }}>
                                <Skeleton width={j === 1 ? 120 : 55} height={11} />
                              </td>
                            ))}
                        </tr>
                      ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: '28px 14px',
                          textAlign: 'center',
                          fontSize: 13,
                          color: 'var(--muted-fg)',
                        }}
                      >
                        Sin datos para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    rows.map((p, i) => (
                      <tr
                        key={p.sku}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--muted)',
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: 11,
                            color: 'var(--muted-fg)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {p.sku}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: 12,
                            color: 'var(--fg)',
                            fontWeight: 500,
                          }}
                        >
                          {p.name}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted-fg)' }}>
                          {p.category}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted-fg)' }}>
                          {p.unit}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: 12,
                            color: 'var(--fg)',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {p.quantity.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: 12,
                            color: 'var(--fg)',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {p.unitPrice.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--fg)',
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {p.totalValue.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '3px 7px',
                              borderRadius: 2,
                              backgroundColor: p.estado === 'Crítico' ? '#fef2f2' : '#f0fdf4',
                              color: p.estado === 'Crítico' ? '#9E1B32' : '#16a34a',
                              border: `1px solid ${p.estado === 'Crítico' ? '#fecaca' : '#bbf7d0'}`,
                            }}
                          >
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', backgroundColor: 'var(--muted)' }}>
                    <td
                      colSpan={6}
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: 'right',
                        color: 'var(--fg)',
                      }}
                    >
                      TOTAL INVENTARIADO
                      {data && data.criticalCount > 0 && (
                        <span style={{ color: '#9E1B32', marginLeft: 10, fontWeight: 600 }}>
                          · {data.criticalCount} en stock crítico
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: 'right',
                        color: '#13294B',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      Bs. {totalValue.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          [data-reports-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

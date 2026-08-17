'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SkeletonMetricCard, Skeleton } from '@/components/Skeleton';
import ErrorBanner from '@/components/ErrorBanner';
import { AlertIcon, ArrowDownIcon, ArrowUpIcon } from '@/components/Icons';
import { api } from '@/lib/api';
import type { ActivityItem, Metrics, WeeklyFlowPoint } from '@/lib/types';

interface DashboardData {
  metrics: Metrics;
  weeklyFlow: WeeklyFlowPoint[];
  activity: ActivityItem[];
}

/** Cada cuánto se refresca el panel (ms). */
const REFRESH_MS = 30_000;

function bs(value: number): string {
  return value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function metricDefs(m: Metrics) {
  return [
    {
      label: 'UNIDADES EN STOCK',
      value: m.totalStock.toLocaleString('es-BO'),
      delta:
        m.unitsToday === 0
          ? 'Sin cambios hoy'
          : `${m.unitsToday > 0 ? '+' : ''}${m.unitsToday} hoy`,
      positive: m.unitsToday >= 0,
      accent: false,
    },
    {
      label: 'VALOR INVENTARIADO',
      value: `Bs. ${bs(m.totalValue)}`,
      delta:
        m.valueDeltaWeek === 0
          ? 'Sin movimientos esta semana'
          : `${m.valueDeltaWeek > 0 ? '+' : '−'}Bs. ${bs(Math.abs(m.valueDeltaWeek))} semana`,
      positive: m.valueDeltaWeek >= 0,
      accent: false,
    },
    {
      label: 'MOVIMIENTOS HOY',
      value: String(m.movementsToday),
      delta: `${m.entriesToday} entradas · ${m.exitsToday} salidas`,
      positive: true,
      accent: false,
    },
    {
      label: 'ALERTAS CRÍTICAS',
      value: String(m.criticalAlerts),
      delta: m.criticalAlerts > 0 ? 'Stock mínimo alcanzado' : 'Sin alertas activas',
      positive: m.criticalAlerts === 0,
      accent: m.criticalAlerts > 0,
    },
  ];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '10px 14px',
        fontSize: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--fg)' }}>{label}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}
        >
          <span style={{ color: p.color, fontWeight: 500 }}>{p.name}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fg)' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<DashboardData>('/api/dashboard'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const metrics = data ? metricDefs(data.metrics) : [];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
          Panel de Control
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-fg)' }}>
          Resumen operativo — Facultad de Ciencias Económicas y Empresariales
        </p>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Metric cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {loading
          ? Array(4)
              .fill(0)
              .map((_, i) => <SkeletonMetricCard key={i} />)
          : metrics.map((m, i) => (
              <div
                key={i}
                className="fade-in"
                style={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid ${m.accent ? '#9E1B32' : 'var(--border)'}`,
                  borderTop: `3px solid ${m.accent ? '#9E1B32' : '#13294B'}`,
                  borderRadius: 4,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: m.accent ? '#9E1B32' : 'var(--muted-fg)',
                    marginBottom: 12,
                  }}
                >
                  {m.label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: m.accent ? '#9E1B32' : 'var(--fg)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1,
                    marginBottom: 10,
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: m.positive ? '#16a34a' : '#9E1B32',
                    fontWeight: 500,
                  }}
                >
                  {m.accent ? (
                    <AlertIcon size={12} color="#9E1B32" />
                  ) : m.positive ? (
                    <ArrowUpIcon size={12} color="#16a34a" />
                  ) : (
                    <ArrowDownIcon size={12} color="#9E1B32" />
                  )}
                  <span>{m.delta}</span>
                </div>
              </div>
            ))}
      </div>

      {/* Chart + Activity feed row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}
        data-dashboard-grid
      >
        <div
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                Flujo de Inventario — Últimos 7 días
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                Entradas vs. Salidas de unidades
              </div>
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '3px 8px',
                backgroundColor: 'var(--muted)',
                color: 'var(--muted-fg)',
                borderRadius: 2,
                letterSpacing: '0.05em',
              }}
            >
              SEMANAL
            </div>
          </div>

          {loading || !data ? (
            <div style={{ height: 220 }}>
              <Skeleton width="100%" height={220} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.weeklyFlow} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 11, fill: 'var(--muted-fg)', fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-fg)', fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12, fontFamily: 'Inter' }}
                  iconType="square"
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#13294B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#13294B', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="salidas"
                  name="Salidas"
                  stroke="#9E1B32"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#9E1B32', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Activity feed */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 16px 12px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                Actividad Reciente
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>
                Actualizando en tiempo real
              </div>
            </div>
            <span
              className="live-pulse"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                display: 'inline-block',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 420 }}>
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}
                  >
                    <Skeleton width="80%" height={11} />
                    <div style={{ marginTop: 6 }}>
                      <Skeleton width="55%" height={10} />
                    </div>
                  </div>
                ))
            ) : data?.activity.length ? (
              data.activity.map((item) => <ActivityRow key={item.id} item={item} />)
            ) : (
              <div
                style={{
                  padding: '28px 16px',
                  fontSize: 12,
                  color: 'var(--muted-fg)',
                  textAlign: 'center',
                }}
              >
                Todavía no se registran movimientos.
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          [data-dashboard-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const isIngreso = item.action === 'ingreso';
  const dotColor = isIngreso ? '#16a34a' : item.action === 'modificación' ? '#64748B' : '#9E1B32';
  const actionLabel = isIngreso ? 'ingresó' : item.action === 'modificación' ? 'modificó' : 'retiró';
  const [first, second] = item.user.split(' ');

  return (
    <div
      className="fade-in"
      style={{
        padding: '11px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ paddingTop: 4, flexShrink: 0 }}>
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: dotColor,
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.4 }}>
          <strong style={{ fontWeight: 600 }}>
            {first}
            {second ? ` ${second}` : ''}
          </strong>{' '}
          {actionLabel}{' '}
          {item.quantity > 0 && (
            <span
              style={{
                color: isIngreso ? '#16a34a' : '#9E1B32',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.quantity} {item.unit}
              {item.quantity !== 1 ? 's' : ''}{' '}
            </span>
          )}
          de <em style={{ fontStyle: 'normal', color: 'var(--fg)' }}>{item.product}</em>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 3 }}>
          {item.department} · {item.minutesAgo === 0 ? 'ahora' : `hace ${item.minutesAgo} min`}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted-fg)', flexShrink: 0 }}>{item.time}</div>
    </div>
  );
}

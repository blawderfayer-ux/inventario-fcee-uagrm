'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: 2 }}
    />
  );
}

export function SkeletonMetricCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: 24,
      }}
    >
      <Skeleton width={80} height={10} />
      <div style={{ marginTop: 16 }}>
        <Skeleton width={120} height={32} />
      </div>
      <div style={{ marginTop: 12 }}>
        <Skeleton width={60} height={10} />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {[80, 140, 90, 70, 80, 90].map((w, i) => (
        <td key={i} style={{ padding: '12px 16px' }}>
          <Skeleton width={w} height={12} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <Skeleton width={48} height={48} />
      <div style={{ flex: 1 }}>
        <Skeleton width="70%" height={12} />
        <div style={{ marginTop: 8 }}>
          <Skeleton width="50%" height={10} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Skeleton width="40%" height={10} />
        </div>
      </div>
    </div>
  );
}
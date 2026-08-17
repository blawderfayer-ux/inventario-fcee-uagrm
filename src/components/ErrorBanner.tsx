'use client';

import { AlertIcon, XIcon } from './Icons';

export default function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div
      className="fade-in"
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 14px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: 4,
        marginBottom: 16,
        fontSize: 12,
        color: '#9E1B32',
        lineHeight: 1.5,
      }}
    >
      <span style={{ paddingTop: 1, flexShrink: 0 }}>
        <AlertIcon size={13} color="#9E1B32" />
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Cerrar aviso"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9E1B32',
            padding: 0,
            display: 'flex',
            flexShrink: 0,
          }}
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}

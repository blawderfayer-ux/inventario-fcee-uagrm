'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckIcon, ImageIcon, RefreshIcon, XIcon } from './Icons';

/** Fondo azul claro institucional que se aplica al quitar el fondo original. */
export const SOFT_BLUE = '#E8F0FA';

/** Lado máximo del lienzo de trabajo; mantiene el procesado rápido. */
const MAX_SIDE = 1200;

interface Props {
  file: File;
  onCancel: () => void;
  onAccept: (blob: Blob) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Quita el fondo propagando desde los bordes de la imagen: los píxeles
 * conectados al borde cuyo color se parece al del borde se vuelven
 * transparentes. Funciona bien con fotos de producto sobre fondo liso
 * (blanco, gris, mesa uniforme), que es el caso habitual del almacén.
 */
function removeBackground(canvas: HTMLCanvasElement, tolerance: number) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  const push = (x: number, y: number) => {
    const i = y * w + x;
    if (!visited[i]) {
      visited[i] = 1;
      queue.push(i);
    }
  };

  // Semillas: todo el marco exterior.
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  // Color de referencia: promedio del marco.
  let rs = 0;
  let gs = 0;
  let bs = 0;
  for (const i of queue) {
    rs += px[i * 4];
    gs += px[i * 4 + 1];
    bs += px[i * 4 + 2];
  }
  const n = queue.length || 1;
  const [br, bg, bb] = [rs / n, gs / n, bs / n];

  const limit = tolerance * tolerance * 3;
  const matches = (i: number) => {
    const dr = px[i * 4] - br;
    const dg = px[i * 4 + 1] - bg;
    const db = px[i * 4 + 2] - bb;
    return dr * dr + dg * dg + db * db <= limit;
  };

  const clear: number[] = [];
  while (queue.length) {
    const i = queue.pop()!;
    if (!matches(i)) continue;
    clear.push(i);

    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  for (const i of clear) px[i * 4 + 3] = 0;
  ctx.putImageData(img, 0, 0);

  // Se compone sobre el azul claro para que el resultado sea el definitivo.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = SOFT_BLUE;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

export default function ImageEditor({ file, onCancel, onAccept }: Props) {
  const displayRef = useRef<HTMLCanvasElement>(null);
  const workRef = useRef<HTMLCanvasElement | null>(null);
  const originalRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noBackground, setNoBackground] = useState(false);
  const [tolerance, setTolerance] = useState(42);
  const [sel, setSel] = useState<Rect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  /** Vuelca el lienzo de trabajo en el visible, ajustado al ancho disponible. */
  const redraw = useCallback(() => {
    const work = workRef.current;
    const display = displayRef.current;
    const wrap = wrapRef.current;
    if (!work || !display || !wrap) return;

    const maxW = Math.min(wrap.clientWidth || 420, 460);
    const scale = Math.min(1, maxW / work.width);
    display.width = Math.round(work.width * scale);
    display.height = Math.round(work.height * scale);

    const ctx = display.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.drawImage(work, 0, 0, display.width, display.height);
  }, []);

  // Carga inicial del archivo en el lienzo de trabajo.
  useEffect(() => {
    let revoked = '';
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    revoked = url;

    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);

      const backup = document.createElement('canvas');
      backup.width = c.width;
      backup.height = c.height;
      backup.getContext('2d')?.drawImage(c, 0, 0);

      workRef.current = c;
      originalRef.current = backup;
      setReady(true);
      URL.revokeObjectURL(url);
    };
    img.src = url;

    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [redraw]);

  const pointer = (e: React.PointerEvent) => {
    const rect = displayRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointer(e);
    dragStart.current = p;
    setSel({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const p = pointer(e);
    const s = dragStart.current;
    setSel({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  };

  const onPointerUp = () => {
    dragStart.current = null;
    setSel((s) => (s && s.w > 8 && s.h > 8 ? s : null));
  };

  const applyCrop = () => {
    const work = workRef.current;
    const display = displayRef.current;
    if (!work || !display || !sel) return;

    const ratio = work.width / display.width;
    const cut = document.createElement('canvas');
    cut.width = Math.max(1, Math.round(sel.w * ratio));
    cut.height = Math.max(1, Math.round(sel.h * ratio));
    cut
      .getContext('2d')
      ?.drawImage(
        work,
        Math.round(sel.x * ratio),
        Math.round(sel.y * ratio),
        cut.width,
        cut.height,
        0,
        0,
        cut.width,
        cut.height
      );

    workRef.current = cut;
    setSel(null);
    redraw();
  };

  const applyRemoveBackground = () => {
    const work = workRef.current;
    if (!work) return;
    setBusy(true);
    // Se cede un frame para que el botón muestre el estado antes de bloquear.
    setTimeout(() => {
      removeBackground(work, tolerance);
      setNoBackground(true);
      redraw();
      setBusy(false);
    }, 20);
  };

  const reset = () => {
    const original = originalRef.current;
    if (!original) return;
    const c = document.createElement('canvas');
    c.width = original.width;
    c.height = original.height;
    c.getContext('2d')?.drawImage(original, 0, 0);
    workRef.current = c;
    setNoBackground(false);
    setSel(null);
    redraw();
  };

  const accept = () => {
    const work = workRef.current;
    if (!work) return;
    setBusy(true);
    work.toBlob(
      (blob) => {
        setBusy(false);
        if (blob) onAccept(blob);
      },
      'image/png',
      0.92
    );
  };

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 70,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#13294B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Ajustar fotografía</div>
          <button
            onClick={onCancel}
            aria-label="Cerrar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              padding: 4,
            }}
          >
            <XIcon size={17} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div
            ref={wrapRef}
            style={{
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: 'var(--muted)',
              borderRadius: 4,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ position: 'relative', lineHeight: 0, touchAction: 'none' }}>
              <canvas
                ref={displayRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{
                  display: 'block',
                  cursor: 'crosshair',
                  borderRadius: 3,
                  maxWidth: '100%',
                }}
              />
              {sel && sel.w > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: sel.x,
                    top: sel.y,
                    width: sel.w,
                    height: sel.h,
                    border: '2px solid #9E1B32',
                    backgroundColor: 'rgba(158,27,50,0.12)',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {!ready && (
                <div style={{ padding: 40, color: 'var(--muted-fg)', fontSize: 12 }}>
                  Cargando imagen...
                </div>
              )}
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginBottom: 14, lineHeight: 1.5 }}>
            Arrastre sobre la imagen para marcar el área que quiere conservar y pulse
            <strong> Recortar</strong>. Con <strong>Quitar fondo</strong> se elimina el fondo liso y
            se reemplaza por un azul claro institucional.
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={applyCrop}
              disabled={!sel || busy}
              style={{ height: 34, padding: '0 14px', opacity: sel && !busy ? 1 : 0.5 }}
            >
              Recortar
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={applyRemoveBackground}
              disabled={busy}
              style={{ height: 34, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ImageIcon size={13} />
              {busy ? 'Procesando...' : 'Quitar fondo'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={reset}
              disabled={busy}
              style={{ height: 34, padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshIcon size={13} />
              Restablecer
            </button>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted-fg)',
                marginBottom: 6,
              }}
            >
              Sensibilidad del fondo · {tolerance}
            </label>
            <input
              type="range"
              min={10}
              max={110}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#13294B', height: 'auto', padding: 0 }}
            />
            <div style={{ fontSize: 10, color: 'var(--muted-fg)', marginTop: 4 }}>
              Si quedan restos del fondo suba el valor; si se come el producto, bájelo y pulse
              Restablecer antes de reintentar.
            </div>
          </div>

          {noBackground && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 4,
                backgroundColor: SOFT_BLUE,
                border: '1px solid #C7DBF2',
                fontSize: 12,
                color: '#13294B',
                marginBottom: 16,
              }}
            >
              <CheckIcon size={13} color="#13294B" />
              Fondo reemplazado por azul claro institucional.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost"
              style={{ padding: '0 16px', height: 36 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={accept}
              disabled={!ready || busy}
              className="btn-primary"
              style={{
                padding: '0 20px',
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: !ready || busy ? 0.7 : 1,
              }}
            >
              <CheckIcon size={14} color="#fff" />
              Usar esta imagen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

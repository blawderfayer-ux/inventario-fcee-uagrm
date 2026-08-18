'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SkeletonCard, SkeletonTableRow } from '@/components/Skeleton';
import ErrorBanner from '@/components/ErrorBanner';
import {
  AlertIcon,
  CheckIcon,
  EditIcon,
  ImageIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from '@/components/Icons';
import ImageEditor from '@/components/ImageEditor';
import { api } from '@/lib/api';
import { DEFAULT_CATEGORIES, type CategoryItem, type Product, type Role } from '@/lib/types';

const emptyCatalog = (): CategoryItem[] =>
  DEFAULT_CATEGORIES.map((name) => ({ name, partida: '' }));

function LowStockBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 7px',
        borderRadius: 2,
        backgroundColor: '#fef2f2',
        color: '#9E1B32',
        border: '1px solid #fecaca',
      }}
    >
      <AlertIcon size={10} color="#9E1B32" />
      Stock Bajo
    </span>
  );
}

function ProductImage({ src, alt, style }: { src: string; alt: string; style: React.CSSProperties }) {
  if (!src) {
    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--muted)',
          color: 'var(--muted-fg)',
        }}
      >
        <ImageIcon size={22} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- las fotos vienen de GridFS, no del optimizador.
  return <img src={src} alt={alt} style={style} />;
}

interface DrawerProps {
  product: Product;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProductDrawer({ product, canManage, onClose, onEdit, onDelete }: DrawerProps) {
  const isLow = product.quantity <= product.minStock;

  return (
    <>
      <div
        className="fade-in"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 55 }}
      />

      <div
        className="slide-right"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 420,
          backgroundColor: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          zIndex: 56,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#13294B',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Detalle del Producto</div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginTop: 2,
                fontFamily: 'monospace',
              }}
            >
              {product.sku}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              padding: 6,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div
          style={{ position: 'relative', height: 200, backgroundColor: 'var(--muted)', flexShrink: 0 }}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {isLow && (
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <LowStockBadge />
            </div>
          )}
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: 'var(--fg)' }}>
            {product.name}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted-fg)', marginBottom: 16 }}>
            {product.category}
          </div>
          {product.description && (
            <p style={{ fontSize: 13, color: 'var(--muted-fg)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {product.description}
            </p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1,
              border: '1px solid var(--border)',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            {[
              { label: 'Stock actual', value: `${product.quantity} ${product.unit}s`, alert: isLow },
              { label: 'Stock mínimo', value: `${product.minStock} ${product.unit}s`, alert: false },
              { label: 'Precio unitario', value: `Bs. ${product.unitPrice.toFixed(2)}`, alert: false },
              {
                label: 'Valor total',
                value: `Bs. ${(product.quantity * product.unitPrice).toFixed(2)}`,
                alert: false,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--muted)',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted-fg)',
                    marginBottom: 4,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: stat.alert ? '#9E1B32' : 'var(--fg)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginBottom: 20 }}>
            Última actualización: {product.lastUpdated}
          </div>

          {canManage && (
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <button
                className="btn-primary"
                onClick={onEdit}
                style={{
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <EditIcon size={14} color="#fff" />
                Editar producto
              </button>
              <button
                className="btn-danger"
                onClick={onDelete}
                style={{
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <TrashIcon size={14} color="#fff" />
                Eliminar del inventario
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', height: 34, padding: '0 10px' };

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted-fg)',
          marginBottom: 5,
        }}
      >
        {label}
        {required && <span style={{ color: '#9E1B32', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

interface ProductFormProps {
  product?: Product | null;
  categories: CategoryItem[];
  onClose: () => void;
  onSaved: (p: Product) => void;
}

function ProductForm({ product, categories, onClose, onSaved }: ProductFormProps) {
  const isEdit = !!product;
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(product?.imageUrl ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product>>(
    product ?? { category: categories[0]?.name ?? 'Papelería', unit: 'unidad' }
  );

  /** Sube la imagen ya recortada y sin fondo que devuelve el editor. */
  const uploadBlob = async (blob: Blob) => {
    setPendingFile(null);
    setError(null);
    setUploading(true);
    const localUrl = URL.createObjectURL(blob);
    setPreview(localUrl);
    try {
      const body = new FormData();
      body.append('file', new File([blob], 'producto.png', { type: 'image/png' }));
      const saved = await api<{ url: string }>('/api/images', { method: 'POST', body });
      setImageUrl(saved.url);
      setPreview(saved.url);
    } catch (err) {
      setPreview(imageUrl);
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      URL.revokeObjectURL(localUrl);
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) setPendingFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name ?? '',
      category: form.category ?? categories[0]?.name ?? 'Papelería',
      quantity: Number(form.quantity) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      minStock: Number(form.minStock) || 0,
      unit: form.unit ?? 'unidad',
      imageUrl,
      description: form.description ?? '',
    };

    try {
      const res = await api<{ product: Product }>(
        isEdit ? `/api/products/${product.id}` : '/api/products',
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      );
      onSaved(res.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
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
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: 4,
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#13294B',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {isEdit ? 'Editar Producto' : 'Nuevo Ingreso de Stock'}
          </div>
          <button
            onClick={onClose}
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

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted-fg)',
                marginBottom: 8,
              }}
            >
              Fotografía del producto
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#13294B' : 'var(--border)'}`,
                borderRadius: 4,
                padding: 24,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease',
                backgroundColor: dragging ? 'rgba(19,41,75,0.04)' : 'var(--muted)',
                position: 'relative',
                overflow: 'hidden',
                height: preview ? 160 : 120,
              }}
            >
              {preview ? (
                <ProductImage
                  src={preview}
                  alt="Vista previa"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    inset: 0,
                  }}
                />
              ) : (
                <>
                  <ImageIcon size={24} color="var(--muted-fg)" />
                  <div style={{ fontSize: 13, color: 'var(--muted-fg)', marginTop: 8 }}>
                    Arrastre la fotografía del producto aquí
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 4 }}>
                    o haga clic para seleccionar · podrá recortarla y quitarle el fondo
                  </div>
                </>
              )}
              {uploading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(19,41,75,0.65)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Subiendo imagen...
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPendingFile(f);
                e.target.value = '';
              }}
            />
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Nombre del producto" required>
              <input
                required
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Resma de Papel A4"
                style={inputStyle}
              />
            </Field>
            {isEdit ? (
              <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>
                Código del producto:{' '}
                <strong style={{ fontFamily: 'monospace', color: 'var(--fg)' }}>{product.sku}</strong>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted-fg)' }}>
                El código se genera automáticamente al registrar el producto.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Categoría">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  style={inputStyle}
                >
                  {categories.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unidad de medida">
                <input
                  value={form.unit ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="Ej: resma, unidad, caja"
                  style={inputStyle}
                />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Field label="Cantidad" required>
                <input
                  required
                  type="number"
                  min="0"
                  value={form.quantity ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                  placeholder="0"
                  style={inputStyle}
                />
              </Field>
              <Field label="Precio unitario (Bs.)" required>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </Field>
              <Field label="Stock mínimo">
                <input
                  type="number"
                  min="0"
                  value={form.minStock ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) }))}
                  placeholder="10"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Características del producto..."
                style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
              />
            </Field>
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
              disabled={saving || uploading}
              style={{
                padding: '0 20px',
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: saving || uploading ? 0.7 : 1,
                cursor: saving || uploading ? 'wait' : 'pointer',
              }}
            >
              <CheckIcon size={14} color="#fff" />
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar ingreso'}
            </button>
          </div>
        </form>
      </div>

      {pendingFile && (
        <ImageEditor
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onAccept={(blob) => void uploadBlob(blob)}
        />
      )}
    </div>
  );
}

function CategoryModal({
  categories,
  onClose,
  onChange,
}: {
  categories: CategoryItem[];
  onClose: () => void;
  onChange: (next: CategoryItem[]) => void;
}) {
  const [name, setName] = useState('');
  const [partida, setPartida] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ categories: CategoryItem[] }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), partida: partida.trim() }),
      });
      onChange(res.categories);
      setName('');
      setPartida('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la categoría.');
    } finally {
      setBusy(false);
    }
  };

  const savePartida = async (cat: string, value: string) => {
    setError(null);
    try {
      const res = await api<{ categories: CategoryItem[] }>('/api/categories', {
        method: 'PATCH',
        body: JSON.stringify({ name: cat, partida: value.trim() }),
      });
      onChange(res.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la partida.');
    }
  };

  const remove = async (cat: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ categories: CategoryItem[] }>(
        `/api/categories?name=${encodeURIComponent(cat)}`,
        { method: 'DELETE' }
      );
      onChange(res.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la categoría.');
    } finally {
      setBusy(false);
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
          maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
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
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            Administrar Categorías
          </div>
          <button
            onClick={onClose}
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
          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          <form onSubmit={add} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nueva categoría"
              style={{ flex: 1, height: 34, padding: '0 10px' }}
            />
            <input
              value={partida}
              onChange={(e) => setPartida(e.target.value)}
              placeholder="Partida"
              inputMode="numeric"
              style={{ width: 90, height: 34, padding: '0 10px' }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={busy}
              style={{
                height: 34,
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <PlusIcon size={13} color="#fff" />
              Agregar
            </button>
          </form>

          <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginBottom: 14, lineHeight: 1.5 }}>
            La <strong>partida presupuestaria</strong> (ej. 39100) es la que agrupa las
            categorías en el Cuadro 5 de cierre de gestión. Puede editarla en cualquier momento.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {categories.map((c) => (
              <div
                key={c.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  fontSize: 13,
                  color: 'var(--fg)',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{c.name}</span>
                <input
                  defaultValue={c.partida}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== c.partida) {
                      void savePartida(c.name, e.target.value);
                    }
                  }}
                  placeholder="Partida"
                  inputMode="numeric"
                  title="Partida presupuestaria"
                  style={{
                    width: 88,
                    height: 28,
                    padding: '0 8px',
                    fontSize: 12,
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  onClick={() => void remove(c.name)}
                  disabled={busy}
                  title="Eliminar categoría"
                  aria-label={`Eliminar ${c.name}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9E1B32',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            ))}
            {categories.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted-fg)' }}>
                Todavía no hay categorías registradas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockInventory({ role }: { role: Role }) {
  const canManage = role === 'stockkeeper' || role === 'admin';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(emptyCatalog);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api<{ products: Product[] }>('/api/products'),
        api<{ categories: CategoryItem[] }>('/api/categories'),
      ]);
      setProducts(p.products);
      setCategories(c.categories);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    const matchCat = categoryFilter === 'Todas' || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleSaved = (p: Product) => {
    setProducts((prev) =>
      prev.find((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev]
    );
    setShowForm(false);
    setEditProduct(null);
    setSelectedProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto del inventario?')) return;
    try {
      await api(`/api/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProduct(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
    }
  };

  const criticalCount = products.filter((p) => p.quantity <= p.minStock).length;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>Inventario</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-fg)' }}>
            {products.length} artículos registrados
            {criticalCount > 0 && (
              <span style={{ color: '#9E1B32', fontWeight: 600, marginLeft: 8 }}>
                · {criticalCount} con stock crítico
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="btn-ghost"
              onClick={() => setShowCategories(true)}
              style={{ height: 36, padding: '0 14px' }}
            >
              Categorías
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditProduct(null);
                setShowForm(true);
              }}
              style={{
                height: 36,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <PlusIcon size={14} color="#fff" />
              Nuevo ingreso
            </button>
          </div>
        )}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Filters */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 10,
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
            <SearchIcon size={14} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            style={{ width: '100%', height: 34, paddingLeft: 32, paddingRight: 10 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Todas', ...categories.map((c) => c.name)].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                height: 30,
                padding: '0 10px',
                borderRadius: 3,
                border: `1px solid ${categoryFilter === cat ? '#13294B' : 'var(--border)'}`,
                backgroundColor: categoryFilter === cat ? '#13294B' : 'transparent',
                color: categoryFilter === cat ? '#fff' : 'var(--muted-fg)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.1s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table — desktop */}
      <div
        data-inv-table
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#13294B' }}>
              {['SKU', 'Producto', 'Categoría', 'Stock', 'Mínimo', 'P. Unit.', 'Valor', 'Estado', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 14px',
                      textAlign: ['Stock', 'Mínimo', 'P. Unit.', 'Valor'].includes(h)
                        ? 'right'
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
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(6)
                .fill(0)
                .map((_, i) => <SkeletonTableRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: '32px 14px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--muted-fg)',
                  }}
                >
                  No hay productos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isLow = p.quantity <= p.minStock;
                return (
                  <tr
                    key={p.id}
                    className="table-row"
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setSelectedProduct(p)}
                  >
                    <td
                      style={{
                        padding: '11px 14px',
                        fontSize: 11,
                        color: 'var(--muted-fg)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {p.sku}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 1 }}>
                        {p.description ? p.description.slice(0, 60) : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--muted-fg)' }}>
                      {p.category}
                    </td>
                    <td
                      style={{
                        padding: '11px 14px',
                        textAlign: 'right',
                        fontSize: 13,
                        fontWeight: 700,
                        color: isLow ? '#9E1B32' : 'var(--fg)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {p.quantity}
                    </td>
                    <td
                      style={{
                        padding: '11px 14px',
                        textAlign: 'right',
                        fontSize: 12,
                        color: 'var(--muted-fg)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {p.minStock}
                    </td>
                    <td
                      style={{
                        padding: '11px 14px',
                        textAlign: 'right',
                        fontSize: 12,
                        color: 'var(--fg)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      Bs. {p.unitPrice.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '11px 14px',
                        textAlign: 'right',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--fg)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      Bs. {(p.quantity * p.unitPrice).toFixed(2)}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {isLow ? (
                        <LowStockBadge />
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '3px 7px',
                            borderRadius: 2,
                            backgroundColor: '#f0fdf4',
                            color: '#16a34a',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          Normal
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                          style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div data-inv-cards style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading
          ? Array(5)
              .fill(0)
              .map((_, i) => <SkeletonCard key={i} />)
          : filtered.map((p) => {
              const isLow = p.quantity <= p.minStock;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  style={{
                    backgroundColor: 'var(--card)',
                    border: `1px solid ${isLow ? '#fecaca' : 'var(--border)'}`,
                    borderRadius: 4,
                    padding: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 4,
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: 'var(--muted)',
                    }}
                  >
                    <ProductImage
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted-fg)', marginTop: 2 }}>
                      {p.sku} · {p.category}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isLow ? '#9E1B32' : 'var(--fg)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {p.quantity} {p.unit}s
                      </span>
                      {isLow && <LowStockBadge />}
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {selectedProduct && !showForm && (
        <ProductDrawer
          product={selectedProduct}
          canManage={canManage}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => {
            setEditProduct(selectedProduct);
            setShowForm(true);
          }}
          onDelete={() => void handleDelete(selectedProduct.id)}
        />
      )}

      {showForm && (
        <ProductForm
          product={editProduct}
          categories={categories}
          onClose={() => {
            setShowForm(false);
            setEditProduct(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {showCategories && (
        <CategoryModal
          categories={categories}
          onClose={() => setShowCategories(false)}
          onChange={setCategories}
        />
      )}

      <style>{`
        @media (max-width: 767px) {
          [data-inv-table] { display: none !important; }
          [data-inv-cards] { display: flex !important; }
        }
        @media (min-width: 768px) {
          [data-inv-table] { display: block !important; }
          [data-inv-cards] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

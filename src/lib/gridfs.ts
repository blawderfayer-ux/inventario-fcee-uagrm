import { GridFSBucket, ObjectId } from 'mongodb';
import { getDb } from './mongodb';

const BUCKET = 'product_images';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function bucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: BUCKET });
}

/** Guarda una imagen en GridFS y devuelve la ruta pública para servirla. */
export async function saveImage(
  file: File
): Promise<{ id: string; url: string; contentType: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Formato no permitido (${file.type}). Use JPG, PNG, WebP o GIF.`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen supera el límite de 5 MB.');
  }

  const gfs = await bucket();
  const buffer = Buffer.from(await file.arrayBuffer());

  const id = await new Promise<ObjectId>((resolve, reject) => {
    const stream = gfs.openUploadStream(file.name || 'producto', {
      contentType: file.type,
      metadata: { uploadedAt: new Date() },
    });
    stream.once('error', reject);
    stream.once('finish', () => resolve(stream.id as ObjectId));
    stream.end(buffer);
  });

  return { id: id.toString(), url: `/api/images/${id.toString()}`, contentType: file.type };
}

export async function readImage(
  id: string
): Promise<{ body: Buffer; contentType: string } | null> {
  if (!ObjectId.isValid(id)) return null;
  const gfs = await bucket();
  const objectId = new ObjectId(id);

  const [meta] = await gfs.find({ _id: objectId }).limit(1).toArray();
  if (!meta) return null;

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = gfs.openDownloadStream(objectId);
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.once('error', reject);
    stream.once('end', () => resolve());
  });

  return {
    body: Buffer.concat(chunks),
    contentType: meta.contentType ?? 'application/octet-stream',
  };
}

/** Borra la imagen si la URL apunta a GridFS. Silencioso si ya no existe. */
export async function deleteImageByUrl(url: string | undefined): Promise<void> {
  const match = url?.match(/^\/api\/images\/([a-f0-9]{24})$/i);
  if (!match) return;
  try {
    const gfs = await bucket();
    await gfs.delete(new ObjectId(match[1]));
  } catch {
    // La imagen ya no existe: no es un error para el llamador.
  }
}

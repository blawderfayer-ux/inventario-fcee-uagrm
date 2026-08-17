import { readFile } from 'node:fs/promises';
import path from 'node:path';

let cached: Buffer | null = null;

/** Lee el escudo de la FCEE desde `public/` para incrustarlo en los informes. */
export async function logoBuffer(): Promise<Buffer | null> {
  if (cached) return cached;
  try {
    cached = await readFile(path.join(process.cwd(), 'public', 'logo-fcee.png'));
    return cached;
  } catch {
    // Sin logo el informe sigue siendo válido; solo pierde el escudo.
    return null;
  }
}

/** El mismo escudo como data URI, para el HTML imprimible. */
export async function logoDataUri(): Promise<string | null> {
  const buf = await logoBuffer();
  return buf ? `data:image/png;base64,${buf.toString('base64')}` : null;
}

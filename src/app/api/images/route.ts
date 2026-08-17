import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/guard';
import { saveImage } from '@/lib/gridfs';

export const runtime = 'nodejs';

export const POST = route(async (req: Request) => {
  await requireUser(['admin', 'stockkeeper']);

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new HttpError(400, 'No se recibió ninguna imagen.');
  }

  try {
    const saved = await saveImage(file);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : 'Imagen inválida.');
  }
});

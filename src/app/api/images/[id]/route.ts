import { NextResponse } from 'next/server';
import { route } from '@/lib/guard';
import { readImage } from '@/lib/gridfs';

export const runtime = 'nodejs';

export const GET = route(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    const image = await readImage(id);
    if (!image) {
      return NextResponse.json({ error: 'Imagen no encontrada.' }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        'Content-Type': image.contentType,
        // Los ficheros de GridFS son inmutables: el id cambia si cambia la foto.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
);

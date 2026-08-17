/** Cliente HTTP mínimo para las vistas. Convierte errores del API en Error. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(payload?.error ?? `Error ${res.status} al contactar el servidor.`);
  }
  return payload as T;
}

export const jsonBody = (data: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(data),
});

import { signInWithGoogle } from '../actions';
import ThemeToggleButton from '@/components/ThemeToggleButton';
import Logo from '@/components/Logo';
import { ChevronRightIcon } from '@/components/Icons';

const ERRORS: Record<string, string> = {
  AccessDenied:
    'Su cuenta está desactivada. Comuníquese con el administrador del sistema para reactivarla.',
  Configuration:
    'El inicio de sesión con Google no está configurado. Revise las variables AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET.',
  Verification: 'El enlace de acceso expiró. Intente iniciar sesión nuevamente.',
};

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  const message = error ? (ERRORS[error] ?? 'No se pudo iniciar sesión. Intente nuevamente.') : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          height: 56,
          backgroundColor: '#13294B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={34} />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>FCEE · UAGRM</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, lineHeight: 1.3 }}>
              Sistema de Gestión de Inventarios
            </div>
          </div>
        </div>
        <ThemeToggleButton variant="navy" />
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40, maxWidth: 540 }}>
          <div style={{ marginBottom: 18 }}>
            <Logo size={96} />
          </div>
          <div
            style={{
              display: 'inline-block',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#9E1B32',
              marginBottom: 12,
              borderBottom: '2px solid #9E1B32',
              paddingBottom: 4,
            }}
          >
            Acceso institucional
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--fg)', margin: '0 0 10px', lineHeight: 1.15 }}>
            Inventario FCEE
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted-fg)', margin: 0, lineHeight: 1.6 }}>
            Universidad Autónoma Gabriel René Moreno
            <br />
            Facultad de Ciencias Económicas y Empresariales
          </p>
        </div>

        {/* Tarjeta de acceso */}
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderTop: '3px solid #13294B',
            borderRadius: 4,
            padding: '24px 24px 26px',
          }}
        >
          {message && (
            <div
              style={{
                marginBottom: 18,
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 4,
                fontSize: 12,
                color: '#9E1B32',
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--fg)', marginBottom: 4 }}>
            Iniciar sesión
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#9E1B32',
              marginBottom: 14,
            }}
          >
            Cuenta de Google
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-fg)', lineHeight: 1.55, margin: '0 0 20px' }}>
            Ingrese con su cuenta de Google. Sus permisos se asignan automáticamente según el perfil
            registrado por la Facultad; no necesita elegir nivel de acceso.
          </p>

          <form action={signInWithGoogle}>
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? '/'} />
            <button
              type="submit"
              className="google-btn"
              style={{
                width: '100%',
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderRadius: 4,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--fg)',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <GoogleMark />
              Continuar con Google
              <ChevronRightIcon size={16} color="var(--muted-fg)" />
            </button>
          </form>
        </div>

        <div style={{ marginTop: 40, fontSize: 11, color: 'var(--muted-fg)', textAlign: 'center' }}>
          FCEE UAGRM © {new Date().getFullYear()} · Facultad de Ciencias Económicas y Empresariales
          <br />
          Todos los accesos son auditados y registrados.
        </div>
      </div>
    </div>
  );
}

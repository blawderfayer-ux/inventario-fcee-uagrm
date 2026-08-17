# Sistema de Gestión de Inventarios — FCEE UAGRM

Aplicación web para el control de inventarios de la **Facultad de Ciencias Económicas y
Empresariales** de la **Universidad Autónoma Gabriel René Moreno**.

El diseño proviene del prototipo de Figma de la Facultad. La única diferencia respecto al
prototipo es la pantalla de inicio: en lugar de elegir manualmente un perfil (Super
Administrador / Reponedor / Empleado), **el usuario entra con su cuenta de Google y el
sistema le asigna automáticamente el nivel de acceso** que tiene registrado en la base de
datos.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Base de datos | **MongoDB** (driver oficial) |
| Autenticación | NextAuth v5 (Auth.js) con proveedor Google, sesión JWT |
| Imágenes | **GridFS** dentro de la misma base MongoDB |
| Gráficos | Recharts |
| Estilos | Tailwind v4 + variables CSS del prototipo |

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Complete `.env.local`:

| Variable | Para qué sirve |
| --- | --- |
| `MONGODB_URI` | Cadena de conexión de MongoDB Atlas o local |
| `MONGODB_DB` | Nombre de la base (por defecto `inventario_fcee`) |
| `AUTH_SECRET` | Secreto de sesión — genérelo con `npx auth secret` |
| `NEXTAUTH_URL` | URL pública de la app |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales OAuth de Google |
| `ADMIN_EMAILS` | Correos que entran como Super Administrador, separados por coma |

### 3. Credenciales de Google

En [Google Cloud Console](https://console.cloud.google.com/) → *APIs y servicios* →
*Credenciales* → **Crear credenciales** → *ID de cliente de OAuth* → **Aplicación web**:

- **Orígenes autorizados de JavaScript**: `http://localhost:3000`
- **URI de redireccionamiento autorizados**: `http://localhost:3000/api/auth/callback/google`

En producción repita ambos campos con el dominio real.

### 4. Datos iniciales (opcional)

```bash
npm run seed
```

Crea las categorías base y un catálogo de productos de ejemplo. Es idempotente: puede
ejecutarse varias veces sin duplicar nada.

### 5. Levantar la app

```bash
npm run dev     # http://localhost:3000
```

---

## Cómo se asignan los roles

El usuario **nunca elige su nivel de acceso**. Al iniciar sesión con Google:

1. Si su correo figura en `ADMIN_EMAILS` → entra como **Super Administrador**.
2. Si la colección `users` está vacía, el **primer** usuario en entrar queda como
   Super Administrador (arranque del sistema).
3. En cualquier otro caso entra como **Empleado**, con acceso únicamente al kiosco.
4. Un Super Administrador puede cambiar el rol de cualquiera desde **Usuarios**, o
   pre-registrar a alguien con su rol antes de su primer inicio de sesión.
5. Un usuario marcado como **Inactivo** no puede volver a entrar.

Los cambios de rol se reflejan en la sesión activa en un máximo de 5 minutos.

### Qué ve cada rol

| Rol | Acceso |
| --- | --- |
| **Super Administrador** | Panel de control, inventario, kiosco, usuarios y reportes |
| **Reponedor** | Inventario (alta/edición/baja de productos, fotos, categorías) y kiosco |
| **Empleado** | Solo el kiosco de extracción |

El acceso se aplica en dos capas: el `middleware` redirige las rutas de página y cada
ruta de API vuelve a validar el rol por su cuenta.

---

## Estructura

```
src/
├── app/
│   ├── (panel)/            Vistas con barra lateral: dashboard, inventario, usuarios, reportes
│   ├── kiosco/             Kiosco de extracción a pantalla completa
│   ├── login/              Acceso con Google (reemplaza al selector de perfiles)
│   ├── api/                Rutas de API (productos, usuarios, categorías, imágenes, reportes)
│   └── actions.ts          Server actions de inicio y cierre de sesión
├── components/             Sidebar, Topbar, iconos, skeletons, tema
├── views/                  Las cinco pantallas del prototipo
├── lib/                    MongoDB, GridFS, inventario, usuarios, guardas de rol
└── types/                  Ampliación de tipos de NextAuth
```

## Colecciones de MongoDB

| Colección | Contenido |
| --- | --- |
| `products` | Catálogo: SKU, nombre, categoría, stock, precio, mínimo, ubicación, foto |
| `users` | Personas con acceso: correo, rol, departamento, estado, último acceso |
| `movements` | Bitácora de ingresos, extracciones y modificaciones |
| `categories` | Categorías administrables por el reponedor |
| `product_images.*` | Fotografías de productos almacenadas en GridFS |

Los índices (incluidos los únicos sobre `sku` y `email`) se crean solos en la primera
consulta.

## Reportes

- **Excel financiero** → descarga un CSV en UTF-8 con separador `;`, listo para abrir en
  Excel en configuración regional boliviana.
- **PDF institucional** → abre el informe con el membrete de la UAGRM en una pestaña
  nueva y lanza el diálogo de impresión, desde donde se guarda como PDF.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run start` | Servir la compilación de producción |
| `npm run typecheck` | Verificación de tipos |
| `npm run seed` | Cargar categorías y productos de ejemplo |

## Despliegue

Funciona en cualquier plataforma que ejecute Next.js (Vercel, Railway, Render, un VPS
propio). Configure las mismas variables de entorno del `.env.example`, y añada la URI de
redireccionamiento del dominio de producción en la consola de Google.

# Inventario FCEE — UAGRM

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
| Imágenes | **GridFS** dentro de la misma base MongoDB, con recorte y quitado de fondo en el navegador |
| Informes | Excel real (.xlsx, ExcelJS), PDF imprimible y código fuente LaTeX (.tex) |
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
├── lib/                    MongoDB, GridFS, inventario, usuarios, guardas de rol,
│                           y los generadores de Excel, PDF y LaTeX
└── types/                  Ampliación de tipos de NextAuth
```

## Colecciones de MongoDB

| Colección | Contenido |
| --- | --- |
| `products` | Catálogo: código, nombre, categoría, stock, precio, mínimo, foto |
| `users` | Personas con acceso: correo, rol, estado, último acceso |
| `movements` | Bitácora de ingresos, extracciones y modificaciones |
| `categories` | Categorías administrables por el reponedor |
| `counters` | Contador del correlativo de códigos de producto |
| `product_images.*` | Fotografías de productos almacenadas en GridFS |

Los índices (incluidos los únicos sobre `sku` y `email`) se crean solos en la primera
consulta.

## Códigos de producto

El SKU no se escribe a mano: el sistema asigna `FCEE-0001`, `FCEE-0002`, … en orden de
alta. El contador vive en la colección `counters` y se incrementa de forma atómica, así
dos altas simultáneas nunca reciben el mismo código.

## Fotografías

Al elegir una imagen se abre un editor dentro del navegador donde se puede:

- **Recortar** arrastrando el área que se quiere conservar.
- **Quitar el fondo**: se elimina el fondo liso propagando desde los bordes y se
  reemplaza por un azul claro institucional. Funciona bien con fotos sobre fondo
  uniforme (blanco, gris, mesa lisa); con fondos muy recargados conviene recortar
  primero. El deslizador de sensibilidad ajusta cuánto se considera fondo.

La imagen resultante se sube a GridFS y se sirve desde `/api/images/[id]`.

## Reportes

- **Excel (.xlsx)** → libro real de Excel con el escudo de la Facultad, banda de
  totales, tabla con cabecera institucional, filas alternadas, anchos de columna
  ajustados, formato de moneda boliviana, filtros, paneles congelados y barras de datos
  dentro de las celdas. Segunda hoja con la distribución por categoría. Al ser un
  `.xlsx` nativo no hay problemas de codificación con tildes ni con la ñ.
- **PDF institucional** → informe con membrete, tarjetas de totales y tablas alineadas;
  se abre en una pestaña nueva y lanza el diálogo de impresión para guardarlo como PDF.
- **LaTeX (.tex)** → código fuente completo listo para `pdflatex`, con portada,
  resumen ejecutivo, `longtable` paginada y barras de participación por categoría. Si
  se coloca `logo-fcee.png` junto al `.tex`, el escudo aparece en la portada.

## Cuadros de cierre de gestión

Además de los reportes operativos, el sistema emite los dos formularios oficiales de
almacenes que exige la Dirección General de Contabilidad Fiscal, calculados desde los
movimientos registrados:

| Formulario | Contenido |
| --- | --- |
| **Cuadro 5** (DGCF-R1.05) | Resumen de Almacenes agrupado por **partida presupuestaria**: cantidad y saldo al 01/01 y al 31/12 |
| **Cuadro 6** (DGCF-R1.06) | Detalle de Almacenes por **categoría**: saldo inicial, entradas, salidas y saldo final, en cantidades y en valores |

Se descargan en Excel o se imprimen a PDF desde **Reportes → Cuadros de cierre de
gestión**, eligiendo la gestión. Ambos documentos incluyen el membrete de la Facultad,
las dos notas normativas y los tres bloques de firma del formulario original.

**Cómo se calculan.** El saldo final parte de las existencias actuales y revierte los
movimientos posteriores al 31/12, de modo que el cuadro sigue siendo correcto aunque se
emita meses después del cierre. El saldo inicial se deduce por la identidad contable
`inicial + entradas − salidas = final`, que se cumple fila por fila tanto en cantidades
como en valores.

**Partidas.** Cada categoría lleva su partida presupuestaria (39100, 32100, …), que se
asigna desde **Inventario → Categorías**. Es lo que permite agrupar el Cuadro 5. Las
categorías sin partida se agrupan aparte y el sistema avisa para que se complete.

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

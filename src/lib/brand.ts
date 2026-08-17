/** Identidad institucional usada en pantallas, informes y exportaciones. */
export const BRAND = {
  app: 'Inventario FCEE',
  short: 'FCEE · UAGRM',
  subtitle: 'Sistema de Gestión de Inventarios',
  university: 'Universidad Autónoma Gabriel René Moreno',
  faculty: 'Facultad de Ciencias Económicas y Empresariales',
  department: 'Decanato FCEE',
  navy: '#13294B',
  crimson: '#9E1B32',
} as const;

/** Único departamento de la Facultad; no hay más unidades registradas. */
export const DEPARTMENT = BRAND.department;

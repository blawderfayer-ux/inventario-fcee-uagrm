export type Role = 'admin' | 'stockkeeper' | 'employee';

export const ROLES: Role[] = ['admin', 'stockkeeper', 'employee'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Super Administrador',
  stockkeeper: 'Reponedor',
  employee: 'Empleado',
};

export const ROLE_SHORT_LABELS: Record<Role, string> = {
  admin: 'Super Admin',
  stockkeeper: 'Reponedor',
  employee: 'Empleado',
};

/** Ruta a la que se envía a cada rol después de iniciar sesión. */
export const ROLE_HOME: Record<Role, string> = {
  admin: '/dashboard',
  stockkeeper: '/inventario',
  employee: '/kiosco',
};

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  minStock: number;
  unit: string;
  imageUrl: string;
  lastUpdated: string;
  description: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  image?: string;
}

export type MovementAction = 'ingreso' | 'extracción' | 'modificación';

export interface ActivityItem {
  id: string;
  user: string;
  action: MovementAction;
  product: string;
  quantity: number;
  unit: string;
  department: string;
  time: string;
  minutesAgo: number;
  reason?: string;
}

export interface Metrics {
  totalStock: number;
  totalValue: number;
  movementsToday: number;
  criticalAlerts: number;
  entriesToday: number;
  exitsToday: number;
  unitsToday: number;
  valueDeltaWeek: number;
}

export interface WeeklyFlowPoint {
  dia: string;
  entradas: number;
  salidas: number;
}

export interface CategoryItem {
  name: string;
  /** Partida presupuestaria asociada, para el Cuadro 5 (DGCF-R1.05). */
  partida: string;
}

export const DEFAULT_CATEGORIES = [
  'Material de Escritorio',
  'Material de Papelería',
  'Material de Limpieza',
  'Material de Bioseguridad',
];

/** Partida presupuestaria habitual de cada categoría de almacén. */
export const DEFAULT_PARTIDAS: Record<string, string> = {
  'Material de Limpieza': '39100',
  'Material de Papelería': '32100',
  'Material de Bioseguridad': '39990',
  'Material de Escritorio': '39500',
};

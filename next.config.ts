import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongodb', 'exceljs'],
  // El escudo se lee desde disco para incrustarlo en el Excel y en el PDF,
  // así que hay que asegurarse de que viaje en el bundle del servidor.
  outputFileTracingIncludes: {
    '/api/reportes/**': ['./public/logo-fcee.png'],
  },
};

export default nextConfig;

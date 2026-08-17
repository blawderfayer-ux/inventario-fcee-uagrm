import Image from 'next/image';

/**
 * Escudo institucional de la FCEE. El PNG tiene fondo transparente, así que
 * funciona igual sobre la barra azul y sobre el fondo claro del contenido.
 */
export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <Image
      src="/logo-fcee.png"
      alt="Escudo de la Facultad de Ciencias Económicas y Empresariales — UAGRM"
      width={size}
      height={size}
      priority
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

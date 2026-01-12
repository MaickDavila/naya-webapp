/**
 * Formatea un número como moneda Sol Peruano (PEN).
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(price);
};

/**
 * Formatea una fecha en formato corto (ej: 12 ene).
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
  }).format(date);
};

/**
 * Direccion de envio del usuario
 */
export interface UserShippingAddress {
  id: string;
  label: string; // "Casa", "Oficina", etc.
  recipientName: string;
  phone: string;
  street: string;
  number: string;
  apartment?: string; // Depto, piso, etc.
  district: string; // Distrito
  city: string;
  state: string; // Departamento/Region
  zipCode?: string;
  country: string;
  reference?: string; // Referencias adicionales
  isDefault: boolean;
  createdAt: Date;
}

/**
 * Zonas de envio disponibles
 */
export type ShippingZone = "lima_metropolitana" | "lima_provincias" | "costa" | "sierra" | "selva";

/**
 * Configuracion de tarifas de envio por zona
 */
export interface ShippingRate {
  zone: ShippingZone;
  label: string;
  price: number;
  estimatedDays: string; // "1-2 dias", "3-5 dias", etc.
  description?: string;
}

/**
 * Departamentos de Peru agrupados por zona
 */
export const SHIPPING_ZONES: Record<ShippingZone, string[]> = {
  lima_metropolitana: ["Lima Metropolitana"],
  lima_provincias: ["Lima Provincias"],
  costa: ["Tumbes", "Piura", "Lambayeque", "La Libertad", "Ancash", "Ica", "Arequipa", "Moquegua", "Tacna"],
  sierra: ["Cajamarca", "Huanuco", "Pasco", "Junin", "Huancavelica", "Ayacucho", "Apurimac", "Cusco", "Puno"],
  selva: ["Amazonas", "San Martin", "Loreto", "Ucayali", "Madre de Dios"],
};

/**
 * Tarifas de envio por zona
 */
export const SHIPPING_RATES: ShippingRate[] = [
  {
    zone: "lima_metropolitana",
    label: "Lima Metropolitana",
    price: 10,
    estimatedDays: "1-2 dias habiles",
    description: "Envio express a distritos de Lima",
  },
  {
    zone: "lima_provincias",
    label: "Lima Provincias",
    price: 15,
    estimatedDays: "2-3 dias habiles",
    description: "Envio a provincias de Lima",
  },
  {
    zone: "costa",
    label: "Costa",
    price: 20,
    estimatedDays: "3-5 dias habiles",
    description: "Envio a departamentos de la costa",
  },
  {
    zone: "sierra",
    label: "Sierra",
    price: 25,
    estimatedDays: "5-7 dias habiles",
    description: "Envio a departamentos de la sierra",
  },
  {
    zone: "selva",
    label: "Selva",
    price: 30,
    estimatedDays: "7-10 dias habiles",
    description: "Envio a departamentos de la selva",
  },
];

/**
 * Distritos de Lima Metropolitana
 */
export const LIMA_DISTRICTS = [
  "Ate",
  "Barranco",
  "Breña",
  "Carabayllo",
  "Chaclacayo",
  "Chorrillos",
  "Cieneguilla",
  "Comas",
  "El Agustino",
  "Independencia",
  "Jesus Maria",
  "La Molina",
  "La Victoria",
  "Lima",
  "Lince",
  "Los Olivos",
  "Lurigancho",
  "Lurin",
  "Magdalena del Mar",
  "Miraflores",
  "Pachacamac",
  "Pucusana",
  "Pueblo Libre",
  "Puente Piedra",
  "Punta Hermosa",
  "Punta Negra",
  "Rimac",
  "San Bartolo",
  "San Borja",
  "San Isidro",
  "San Juan de Lurigancho",
  "San Juan de Miraflores",
  "San Luis",
  "San Martin de Porres",
  "San Miguel",
  "Santa Anita",
  "Santa Maria del Mar",
  "Santa Rosa",
  "Santiago de Surco",
  "Surquillo",
  "Villa El Salvador",
  "Villa Maria del Triunfo",
];

/**
 * Departamentos de Peru
 */
export const PERU_DEPARTMENTS = [
  "Amazonas",
  "Ancash",
  "Apurimac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Cusco",
  "Huancavelica",
  "Huanuco",
  "Ica",
  "Junin",
  "La Libertad",
  "Lambayeque",
  "Lima Metropolitana",
  "Lima Provincias",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martin",
  "Tacna",
  "Tumbes",
  "Ucayali",
];

/**
 * Obtener zona de envio por departamento
 */
export function getShippingZone(department: string): ShippingZone {
  for (const [zone, departments] of Object.entries(SHIPPING_ZONES)) {
    if (departments.includes(department)) {
      return zone as ShippingZone;
    }
  }
  // Default a costa si no se encuentra
  return "costa";
}

/**
 * Obtener tarifa de envio por zona
 */
export function getShippingRate(zone: ShippingZone): ShippingRate {
  return SHIPPING_RATES.find((rate) => rate.zone === zone) || SHIPPING_RATES[0];
}

/**
 * Calcular costo de envio por direccion
 */
export function calculateShippingCost(address: UserShippingAddress): ShippingRate {
  const zone = getShippingZone(address.state);
  return getShippingRate(zone);
}

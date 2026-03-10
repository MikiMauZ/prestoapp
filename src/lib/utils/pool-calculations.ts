export const POOL_PRODUCTS = {
  chlorine: {
    'AQUACLOR 180 PEDROSA': { concentration: 12, type: 'liquid', density: 1.12 },
    'CLA LEJÍA PEDROSA': { concentration: 5, type: 'liquid', density: 1.05 },
    'Hipoclorito cálcico 70%': { concentration: 70, type: 'solid', density: 1 },
    'Hipoclorito cálcico 65%': { concentration: 65, type: 'solid', density: 1 }
  },
  phUp: {
    'Carbonato sódico': { type: 'solid', factor: 0.015 },
    'Hidróxido sódico': { type: 'solid', factor: 0.012 }
  },
  phDown: {
    'AQUA-PEDROSA': { type: 'liquid', factor: 0.01, concentration: 38 },
    'Ácido Clorhídrico 33%': { type: 'liquid', factor: 0.008, concentration: 33 },
    'Bisulfato sódico': { type: 'solid', factor: 0.018 }
  }
};

export const CHEMICAL_PRODUCTS_LIST = [
  "SAL DESCALCIFICADOR PASTILLAS 25KG",
  "HIPOCLORITO PISCINAS",
  "DISMINUIDOR PH LIQUIDO AQUA PEDROSA 23KG",
  "ACIDO CLORHIDRICO 32% CONS.HUMANO 23KG",
  "REACTIVO FOTOMETRO DPD-1 C/250UN",
  "REACTIVO FOTOMETRO DPD-3 C/250UN",
  "REACTIVO FOTOMETRO PH (PHENOL RED) C/250UN",
  "LEJIA ALIMENTARIA 40GR/L 22KG",
  "ANTIINCRUSTANTE QUIMIFOS GFA 20L",
  "ESTABILIZANTE CTX-400",
  "DESENGRASANTE CTX-75",
  "CLORO GRANULADO CTX-300",
  "BROMO TABLETAS CUBO 20KG",
  "COAGULANTE GOLDENFLOK GFA 5KG",
  "ALGIBLACK GFA 5KG",
  "REACTIVO ISOCIANURICO",
  "NEUTRALIZANTE CTX-12"
];

export function calculateChlorineDose(volume: number, targetPpm: number, currentPpm: number, productName: string) {
  const product = (POOL_PRODUCTS.chlorine as any)[productName];
  if (!product) return 0;

  const diff = Math.max(0, targetPpm - currentPpm);
  const chlorineNeededKg = (diff * volume) / 1000;
  const productNeededKg = chlorineNeededKg / (product.concentration / 100);

  if (product.type === 'liquid') {
    return productNeededKg / product.density; // returns Liters
  }
  return productNeededKg; // returns Kg
}

export function calculatePHDose(volume: number, targetPH: number, currentPH: number, productName: string, type: 'up' | 'down') {
  const products = type === 'up' ? POOL_PRODUCTS.phUp : POOL_PRODUCTS.phDown;
  const product = (products as any)[productName];
  if (!product) return 0;

  const diff = Math.abs(targetPH - currentPH);
  // Factor is based on 100m3 to change 0.1 pH unit (standard industry approx)
  return (diff * 10) * product.factor * volume;
}


export const calculateParameterStatus = (
  obtained: number,
  pattern: number,
  tolerance: number
): 'PASS' | 'FAIL' => {
  const diff = Math.abs(obtained - pattern);
  return diff <= tolerance ? 'PASS' : 'FAIL';
};

export const PARAMETER_TEMPLATES = {
  PHOTOMETER: [
    { name: 'Patrón Cloro Bajo', patternValue: 0.5, unit: 'mg/L', tolerance: 0.1 },
    { name: 'Patrón Cloro Alto', patternValue: 2.0, unit: 'mg/L', tolerance: 0.2 },
    { name: 'Patrón pH (Phenol Red)', patternValue: 7.2, unit: 'pH', tolerance: 0.2 },
  ],
  TURBIDIMETER: [
    { name: 'Patrón Turbidez', patternValue: 0.5, unit: 'UNF', tolerance: 0.1 },
  ],
};

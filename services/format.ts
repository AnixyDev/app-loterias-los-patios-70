/**
 * Formatea un importe de premio al formato español (es-ES) con el símbolo €.
 *
 * Acepta lo que devuelve SELAE en sus distintas formas: "718,29", "17000000",
 * un número, o un texto sin cifras como "Sin Bote" (que se devuelve tal cual).
 * Para importes enteros grandes (≥ 1000) no muestra decimales; para el resto,
 * dos decimales.
 *
 * Ejemplos: "17000000" → "17.000.000 €", "718,29" → "718,29 €", "3" → "3,00 €".
 */
export const formatPremio = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return '';

    const valueStr = String(value);
    // Sin cifras → es un mensaje de estado (p. ej. "Sin Bote"); se deja igual.
    if (!/\d/.test(valueStr)) return valueStr;

    // Normaliza a número: quita símbolos y el punto de los miles, y pasa la coma
    // decimal a punto para parseFloat.
    const numberString = valueStr
        .replace(/[€$]/g, '')
        .trim()
        .replace(/\./g, '')
        .replace(',', '.');

    const number = parseFloat(numberString);
    if (isNaN(number)) return valueStr; // si no se puede parsear, no mostramos "NaN"

    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'EUR' };
    if (number % 1 === 0 && number >= 1000) {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }

    return new Intl.NumberFormat('es-ES', options).format(number);
};

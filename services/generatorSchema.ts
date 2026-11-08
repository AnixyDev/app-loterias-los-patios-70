import { z } from 'zod';
import { LotteryGame, GeneratedNumbers } from '../types';

/**
 * Validación robusta de lo que devuelve la IA en el generador de números.
 *
 * La IA puede equivocarse (formato raro, números fuera de rango, una cantidad
 * distinta de la pedida...). Antes, esa respuesta se pintaba tal cual y podía
 * romper la interfaz o mostrar una combinación inválida. Aquí comprobamos
 * primero la *forma* con Zod y luego las *reglas del juego*, y si algo no
 * cuadra lanzamos un error claro para que el usuario vuelva a generar.
 *
 * Nota sobre los juegos (son heterogéneos):
 *  - El Reintegro (Primitiva) y el Nº Clave (El Gordo) pueden ser 0 → se admite 0.
 *  - La Quiniela (1/X/2) y Quinigol admiten valores repetidos → solo exigimos
 *    que no haya repetidos cuando el juego tiene más valores posibles que los
 *    que se eligen (maxNumber >= numbersToPick), que es justo cuando la unicidad
 *    tiene sentido (sorteos tipo Euromillones, Primitiva, Bonoloto, Gordo...).
 */

// Estructura mínima esperada. `.strip()` ignora claves de más que meta la IA.
// Se admite 0 (Reintegro, Nº Clave, resultados 0-0 de Quinigol, etc.).
const intArray = z.array(z.number().int().nonnegative());

const estructuraSchema = z
    .object({
        main: intArray.min(1),
        special: intArray.optional(),
        addOn: z
            .object({
                name: z.string(),
                numbers: intArray,
            })
            .optional(),
    })
    .strip();

const ERR_FORMATO =
    'La IA devolvió una respuesta con un formato inesperado. Inténtalo de nuevo.';
const ERR_COMBINACION =
    'La IA generó una combinación no válida para este juego. Inténtalo de nuevo.';

const todosEnRango = (nums: number[], max: number): boolean =>
    nums.every((n) => n >= 0 && n <= max);

const sinRepetidos = (nums: number[]): boolean =>
    new Set(nums).size === nums.length;

/**
 * Comprueba un grupo de números (cantidad exacta, rango y, si procede, que no
 * se repitan). Devuelve true si es válido.
 */
const grupoValido = (nums: number[], cantidad: number, max: number): boolean => {
    if (nums.length !== cantidad) return false;
    if (!todosEnRango(nums, max)) return false;
    // La unicidad solo se exige cuando hay más valores posibles que elegidos.
    if (max >= cantidad && !sinRepetidos(nums)) return false;
    return true;
};

/**
 * Comprueba y normaliza la respuesta de la IA contra las reglas del juego.
 * Devuelve unos GeneratedNumbers limpios o lanza un Error con mensaje claro.
 */
export function parseGeneratedNumbers(
    raw: unknown,
    game: LotteryGame,
    includeAddOn: boolean,
): GeneratedNumbers {
    const parsed = estructuraSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(ERR_FORMATO);
    }
    const data = parsed.data;

    // --- Números principales ---
    if (!grupoValido(data.main, game.numbersToPick, game.maxNumber)) {
        throw new Error(ERR_COMBINACION);
    }

    const resultado: GeneratedNumbers = { main: data.main };

    // --- Números especiales (estrellas, clave, reintegro, sueño...) ---
    if (game.specialNumbers) {
        const special = data.special ?? [];
        if (!grupoValido(special, game.specialNumbers.count, game.specialNumbers.max)) {
            throw new Error(ERR_COMBINACION);
        }
        resultado.special = special;
    }
    // Si el juego no tiene especiales, ignoramos cualquier `special` que venga.

    // --- Complemento opcional (Joker...), solo si se pidió ---
    if (includeAddOn && game.addOn) {
        if (
            !data.addOn ||
            !grupoValido(data.addOn.numbers, game.addOn.numbersToPick, game.addOn.maxNumber)
        ) {
            throw new Error(ERR_COMBINACION);
        }
        resultado.addOn = { name: data.addOn.name, numbers: data.addOn.numbers };
    }
    // Si no se pidió complemento, ignoramos cualquier `addOn` que venga.

    return resultado;
}

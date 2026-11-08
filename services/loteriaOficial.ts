/**
 * loteriaOficial.ts
 * Cliente de los DATOS OFICIALES de SELAE (api/loteria-oficial.php):
 * comprobador de boletos, historial, destacados y ticker. Sustituye a la IA.
 */
import { LotteryGame, LotteryResult, FeaturedResult, WeeklyTickerResult } from '../types';

const PROXY_URL =
    (import.meta.env.VITE_OFICIAL_PROXY_URL as string | undefined) ||
    '/api/loteria-oficial.php';

/** Juegos que el comprobador oficial soporta hoy. */
export const JUEGOS_OFICIALES = ['euromillones', 'primitiva', 'bonoloto', 'gordo', 'eurodreams'] as const;
export type JuegoOficial = (typeof JUEGOS_OFICIALES)[number];

export const esJuegoOficial = (id: string): id is JuegoOficial =>
    (JUEGOS_OFICIALES as readonly string[]).includes(id);

export interface ResultadoOficial {
    isWinner: boolean;
    premio: string;              // p.ej. "718,29"
    categoriaTxt: string | null; // p.ej. "4ª (4 Aciertos)"
    winningMain: number[];       // combinación ganadora (principales)
    winningSpecial: number[];    // estrellas / sueño / nº clave / complementario
    matchedMain: number[];       // tus aciertos principales
    drawDate: string;            // fecha consultada (YYYY-MM-DD)
    pendiente?: boolean;         // el sorteo aún no tiene resultados
    error?: string;
}

/**
 * Comprueba un boleto contra el sorteo oficial de SELAE.
 * @param game   id del juego (euromillones, primitiva, ...)
 * @param main   números principales del usuario
 * @param special números especiales (estrellas / reintegro / clave / sueño) o []
 * @param date   fecha del sorteo en formato YYYY-MM-DD (obligatoria)
 */
export const checkTicketOficial = async (
    game: string,
    main: number[],
    special: number[],
    date: string
): Promise<ResultadoOficial> => {
    let res: Response;
    try {
        res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'checkTicket', payload: { game, main, special, date } }),
        });
    } catch {
        throw new Error('Sin conexión con el servidor al comprobar el boleto.');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Error del servidor al comprobar el boleto.');
    }
    if (data?.pendiente) {
        return {
            isWinner: false, premio: '0', categoriaTxt: null,
            winningMain: [], winningSpecial: [], matchedMain: [], drawDate: date, pendiente: true,
            error: typeof data?.error === 'string' ? data.error : 'Aún no hay resultados para esa fecha.',
        };
    }

    const comb = data?.combinacion ?? {};
    let winningSpecial: number[] = [];
    if (Array.isArray(comb.estrellas)) winningSpecial = comb.estrellas;
    else if (comb.sueno != null) winningSpecial = [comb.sueno];
    else if (comb.clave != null) winningSpecial = [comb.clave];
    else if (comb.comp != null) winningSpecial = [comb.comp];

    return {
        isWinner: !!data?.isWinner,
        premio: String(data?.premio ?? '0'),
        categoriaTxt: data?.categoriaTxt ?? null,
        winningMain: Array.isArray(comb.main) ? comb.main : [],
        winningSpecial,
        matchedMain: Array.isArray(data?.aciertos?.main) ? data.aciertos.main : [],
        drawDate: date,
    };
};

// ---------------------------------------------------------------------------
//  Resultados oficiales (Historial, Destacados, Ticker)
// ---------------------------------------------------------------------------

/** POST genérico al endpoint oficial; devuelve el JSON ya parseado. */
const postOficial = async (action: string, payload: unknown, contexto: string): Promise<any> => {
    let res: Response;
    try {
        res = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });
    } catch {
        throw new Error(`Sin conexión con el servidor (${contexto}).`);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : `Error del servidor (${contexto}).`);
    }
    return data;
};

/** Resultados oficiales de un juego (pestaña Historial). */
export const fetchResultsOficial = async (game: LotteryGame, date?: string): Promise<LotteryResult[]> => {
    const data = await postOficial('getResults', { game: game.id, date: date || '' }, 'historial');
    return Array.isArray(data) ? (data as LotteryResult[]) : [];
};

/** Resultados destacados (Euromillones, Primitiva, EuroDreams). */
export const fetchFeaturedOficial = async (): Promise<FeaturedResult[]> => {
    const data = await postOficial('getFeatured', {}, 'destacados');
    return Array.isArray(data) ? (data as FeaturedResult[]) : [];
};

/** Ticker de últimos resultados de varios juegos. */
export const fetchTickerOficial = async (): Promise<WeeklyTickerResult[]> => {
    const data = await postOficial('getTicker', {}, 'ticker');
    return Array.isArray(data) ? (data as WeeklyTickerResult[]) : [];
};

import {
    LotteryGame,
    LotteryResult,
    FeaturedResult,
    WeeklyTickerResult,
    GenerationStrategy,
    GeneratedNumbers,
    CheckResult,
    ChatMessage
} from '../types';

/**
 * La app ya NO habla con Gemini directamente (eso expondría la clave en el
 * navegador). Habla con nuestro proxy PHP, que guarda la clave en el servidor
 * y solo acepta un conjunto cerrado de acciones.
 *
 * URL del proxy: por defecto, mismo dominio en /api/gemini-proxy.php.
 * Si la app vive en un dominio distinto al del PHP, define en el build la
 * variable VITE_GEMINI_PROXY_URL con la URL completa del endpoint.
 */
const PROXY_URL =
    (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined) ||
    '/api/gemini-proxy.php';

/**
 * Llama al proxy con una acción y su payload, y devuelve el texto que generó
 * el modelo. Lanza un Error con mensaje claro si algo falla.
 */
const callProxy = async (action: string, payload: unknown, context: string): Promise<string> => {
    let response: Response;
    try {
        response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });
    } catch {
        throw new Error(`Sin conexión con el servidor al procesar ${context}.`);
    }

    if (!response.ok) {
        // Intentamos leer el mensaje de error del proxy; si no, uno genérico.
        let detail = '';
        try {
            const errJson = await response.json();
            detail = typeof errJson?.error === 'string' ? ` (${errJson.error})` : '';
        } catch { /* ignore */ }
        throw new Error(`Error del servidor al procesar ${context}${detail}.`);
    }

    const data = await response.json();
    if (typeof data?.text !== 'string') {
        throw new Error(`Respuesta vacía del servidor al procesar ${context}.`);
    }
    return data.text;
};

/**
 * Parsea el JSON que devuelve el modelo, quitando las vallas markdown (```json)
 * si las hubiera.
 */
const parseJson = <T>(jsonString: string, context: string): T => {
    try {
        const clean = jsonString.replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(clean) as T;
    } catch (error) {
        console.error(`Error parsing JSON for ${context}:`, error, jsonString);
        throw new Error(`Respuesta inválida del servidor al procesar ${context}.`);
    }
};

export const fetchFeaturedResults = async (): Promise<FeaturedResult[]> => {
    const text = await callProxy('featured', {}, 'resultados destacados');
    return parseJson<FeaturedResult[]>(text, 'resultados destacados');
};

export const fetchWeeklyTickerResults = async (): Promise<WeeklyTickerResult[]> => {
    const text = await callProxy('weeklyTicker', {}, 'ticker de resultados');
    return parseJson<WeeklyTickerResult[]>(text, 'ticker de resultados');
};

export const fetchLatestResults = async (game: LotteryGame, date?: string): Promise<LotteryResult[]> => {
    const text = await callProxy('latestResults', { game, date }, 'historial de resultados');
    return parseJson<LotteryResult[]>(text, 'historial de resultados');
};

export const generateNumbers = async (
    game: LotteryGame,
    strategy: GenerationStrategy,
    includeAddOn: boolean,
    inspirationText?: string
): Promise<GeneratedNumbers> => {
    const text = await callProxy(
        'generateNumbers',
        { game, strategy, includeAddOn, inspirationText },
        'generador de números'
    );
    return parseJson<GeneratedNumbers>(text, 'generador de números');
};

export const checkTicket = async (
    game: LotteryGame,
    numbers: { main: number[]; special?: number[]; addOn?: number },
    date: string
): Promise<CheckResult> => {
    const text = await callProxy('checkTicket', { game, numbers, date }, 'comprobador de boletos');
    return parseJson<CheckResult>(text, 'comprobador de boletos');
};

export const getChatResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    // El chat devuelve texto libre, no JSON.
    return callProxy('chat', { history, newMessage }, 'asistente de chat');
};

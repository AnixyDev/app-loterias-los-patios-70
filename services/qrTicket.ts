/**
 * qrTicket.ts
 * Decodifica el texto que contiene el QR de un resguardo de SELAE y lo convierte
 * en una apuesta legible (juego, números jugados, fecha del sorteo, etc.).
 *
 * El QR NO es un simple código de validación: lleva los números jugados en claro.
 * Formato observado:
 *   A=<código>;P=<producto>;S=<SSS DD MMM AA:semanas>;W=<>;.1=<comb>.2=<comb>;
 *   R=<reintegro>;N=<número LN>;F=<fracción>;SE=<serie>;J=<joker>;T=<terminal>
 *
 * Ejemplos reales:
 *   Bonoloto:  A=...;P=2;S=33501DIC23:10;.1=122022273446;R=3  → [12,20,22,27,34,46] reintegro 3, 01/12/2023
 *   EuroDreams:A=...;P=14;S=00422ENE17:2;.1=081416192128:02.2=... → 6 números + sueño, 22/01/2017
 *   Nacional:  A=...;P=5;S=10222DIC19:1;N=40008;F=1;SE=2        → número 40008, serie 2, fracción 1
 *
 * Nota: este formato es de ingeniería inversa (no documentado por SELAE) y podría
 * cambiar. Por eso parseQrTicket devuelve null si el texto no encaja, y nunca
 * inventa datos.
 */

export type QrGameId =
    | 'primitiva' | 'bonoloto' | 'gordo' | 'nacional'
    | 'euromillones' | 'eurodreams' | 'quiniela';

export interface QrBet {
    main: number[];       // números principales de una apuesta
    special: number[];    // estrellas / sueño / nº clave, si los hay
}

export interface QrTicket {
    game: QrGameId | null;   // juego deducido del campo P=
    sorteo: string | null;   // nº de sorteo (3 dígitos)
    fecha: string | null;    // fecha del sorteo en formato YYYY-MM-DD
    semanas: string | null;  // nº de sorteos jugados (abono); "1" si es uno solo
    apuestas: QrBet[];        // combinaciones jugadas (puede haber varias)
    reintegro?: string;      // Primitiva / Bonoloto / Gordo
    joker?: string;          // Primitiva (Joker)
    numero?: string;         // Lotería Nacional: número del décimo
    fraccion?: string;       // Lotería Nacional: fracción
    serie?: string;          // Lotería Nacional: serie
}

const MESES: Record<string, string> = {
    ENE: '01', FEB: '02', MAR: '03', ABR: '04', MAY: '05', JUN: '06',
    JUL: '07', AGO: '08', SEP: '09', OCT: '10', NOV: '11', DIC: '12',
};

const PRODUCTO_A_JUEGO: Record<number, QrGameId> = {
    1: 'primitiva',
    2: 'bonoloto',
    3: 'quiniela',
    4: 'gordo',
    5: 'nacional',
    10: 'nacional',
    7: 'euromillones',
    14: 'eurodreams',
};

const pares = (s?: string): number[] =>
    (s || '').match(/.{1,2}/g)?.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n)) || [];

/**
 * Convierte el texto crudo de un QR de SELAE en una apuesta. Devuelve null si el
 * texto no parece un resguardo SELAE (no empieza por "A=").
 */
export const parseQrTicket = (raw: string): QrTicket | null => {
    if (!raw || raw.substring(0, 2) !== 'A=') return null;

    const t: Record<string, string> = {};
    for (const campo of raw.split(';')) {
        if (campo.startsWith('P=')) t.producto = campo.substring(2);
        else if (campo.startsWith('S=')) t.s = campo.substring(2);
        else if (campo.startsWith('.1=')) t.listaComb = campo;
        else if (campo.startsWith('R=')) t.reintegro = campo.substring(2);
        else if (campo.startsWith('N=')) t.numero = campo.substring(2);
        else if (campo.startsWith('F=')) t.fraccion = campo.substring(2);
        else if (campo.startsWith('SE=')) t.serie = campo.substring(3);
        else if (campo.startsWith('J=')) t.joker = campo.substring(2);
    }

    const game = PRODUCTO_A_JUEGO[parseInt(t.producto, 10)] ?? null;

    // S = SSS DD MMM AA : semanas   (p. ej. "33501DIC23:10")
    let sorteo: string | null = null;
    let fecha: string | null = null;
    let semanas: string | null = null;
    if (t.s) {
        const m = t.s.match(/^(\d{3})(\d{2})([A-Z]{3})(\d{2}):?(\d+)?/);
        if (m) {
            sorteo = m[1];
            const mes = MESES[m[3]];
            fecha = mes ? `20${m[4]}-${mes}-${m[2]}` : null;
            semanas = m[5] || '1';
        }
    }

    // Combinaciones jugadas: ".1=NN NN...:SS.2=..." (separadas por ".")
    const apuestas: QrBet[] = [];
    if (t.listaComb) {
        for (const parte of t.listaComb.split('.')) {
            if (!parte) continue;
            const val = parte.substring(2); // quita "1=", "2="...
            const [main, spec] = val.split(':');
            apuestas.push({ main: pares(main), special: pares(spec) });
        }
    }

    return {
        game,
        sorteo,
        fecha,
        semanas,
        apuestas,
        reintegro: t.reintegro,
        joker: t.joker,
        numero: t.numero,
        fraccion: t.fraccion,
        serie: t.serie,
    };
};

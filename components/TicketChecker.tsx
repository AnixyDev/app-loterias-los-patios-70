import React, { useState, useEffect, useCallback } from 'react';
import { LotteryGame } from '../types';
import {
    checkTicketOficial,
    esJuegoOficial,
    ResultadoOficial,
    JUEGOS_OFICIALES,
} from '../services/loteriaOficial';
import { QrTicket } from '../services/qrTicket';
import QrScanner from './QrScanner';

interface TicketCheckerProps {
    games: LotteryGame[];
}

// Nombres legibles de juegos que el QR reconoce pero el comprobador aún no maneja.
const NOMBRE_JUEGO: Record<string, string> = {
    nacional: 'Lotería Nacional',
    quiniela: 'La Quiniela',
};

const fechaBonita = (iso: string | null): string => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
};

/**
 * Mensaje para cuando el QR se lee bien pero es de un juego que todavía no se
 * comprueba aquí. Para Lotería Nacional mostramos los datos del décimo que SÍ
 * hemos leído (número, serie, fracción, sorteo), para que quede claro que el
 * lector funciona y el usuario pueda comprobarlo en la web oficial.
 */
const mensajeJuegoNoSoportado = (ticket: QrTicket): string => {
    if (ticket.game === 'nacional') {
        const datos = [
            ticket.numero ? `número ${ticket.numero}` : null,
            ticket.serie ? `serie ${ticket.serie}` : null,
            ticket.fraccion ? `fracción ${ticket.fraccion}` : null,
            ticket.fecha ? `sorteo del ${fechaBonita(ticket.fecha)}` : null,
        ].filter(Boolean).join(', ');
        return `He leído un décimo de Lotería Nacional${datos ? ` (${datos})` : ''}. `
            + 'La comprobación de Lotería Nacional todavía no está disponible aquí; '
            + 'puedes comprobarlo en la web oficial de SELAE.';
    }
    const nombre = ticket.game ? NOMBRE_JUEGO[ticket.game] : null;
    return `He leído un resguardo${nombre ? ` de ${nombre}` : ''} de un juego que todavía `
        + 'no se comprueba aquí. Puedes comprobarlo en la web oficial de SELAE.';
};

const TicketChecker: React.FC<TicketCheckerProps> = ({ games }) => {
    // Solo los juegos que el comprobador oficial soporta hoy.
    const juegos = games.filter((g) => esJuegoOficial(g.id));

    const [selectedGameId, setSelectedGameId] = useState<string>(juegos[0]?.id || '');
    const [mainNumbers, setMainNumbers] = useState<string[]>([]);
    const [specialNumbers, setSpecialNumbers] = useState<string[]>([]);
    const [drawDate, setDrawDate] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ResultadoOficial | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    const selectedGame = juegos.find((g) => g.id === selectedGameId);

    useEffect(() => {
        if (selectedGame) {
            setMainNumbers(Array(selectedGame.numbersToPick).fill(''));
            setSpecialNumbers(Array(selectedGame.specialNumbers?.count || 0).fill(''));
            setResult(null);
            setError(null);
        }
    }, [selectedGameId, selectedGame]);

    const handleMainChange = (i: number, v: string) => {
        const n = [...mainNumbers]; n[i] = v; setMainNumbers(n);
    };
    const handleSpecialChange = (i: number, v: string) => {
        const n = [...specialNumbers]; n[i] = v; setSpecialNumbers(n);
    };

    const comprobar = useCallback(async (game: LotteryGame, main: number[], special: number[], date: string) => {
        if (!date) { setError('Indica la fecha del sorteo.'); return; }
        if (main.length !== game.numbersToPick) {
            setError(`Introduce ${game.numbersToPick} números principales.`); return;
        }
        setIsLoading(true); setError(null); setResult(null);
        try {
            const r = await checkTicketOficial(game.id, main, special, date);
            setResult(r);
            if (r.error) setError(r.error);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al comprobar el boleto.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleCheckClick = () => {
        if (!selectedGame) return;
        const main = mainNumbers.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
        const special = specialNumbers.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
        comprobar(selectedGame, main, special, drawDate);
    };

    // --- Al leer un QR de resguardo: rellenar y comprobar automáticamente ---
    const handleQrDetected = (ticket: QrTicket) => {
        setShowScanner(false);
        if (!ticket.game || !esJuegoOficial(ticket.game)) {
            setError(mensajeJuegoNoSoportado(ticket));
            return;
        }
        const game = juegos.find((g) => g.id === ticket.game);
        if (!game) { setError('Juego no disponible.'); return; }

        const bet = ticket.apuestas[0];
        const main = bet?.main ?? [];
        let special: number[] = [];
        if (ticket.game === 'euromillones' || ticket.game === 'eurodreams') special = bet?.special ?? [];
        else if (ticket.game === 'primitiva' || ticket.game === 'gordo') {
            if (ticket.reintegro) special = [parseInt(ticket.reintegro, 10)];
        }

        // Reflejar en el formulario
        setSelectedGameId(game.id);
        if (ticket.fecha) setDrawDate(ticket.fecha);
        setMainNumbers(Array(game.numbersToPick).fill('').map((_, i) => (main[i] != null ? String(main[i]) : '')));
        setSpecialNumbers(Array(game.specialNumbers?.count || 0).fill('').map((_, i) => (special[i] != null ? String(special[i]) : '')));

        if (!ticket.fecha) { setError('No se pudo leer la fecha del sorteo en el QR. Indícala y pulsa Comprobar.'); return; }
        comprobar(game, main, special, ticket.fecha);
    };

    const renderResult = () => {
        if (isLoading) {
            return (
                <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-brand-gold/50 bg-gray-800/50 p-6">
                    <svg className="mb-3 h-8 w-8 animate-spin text-brand-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-lg font-semibold text-brand-gold">Comprobando en resultados oficiales…</p>
                </div>
            );
        }
        if (error && !result) return <p className="mt-4 text-center text-sm text-red-400">{error}</p>;
        if (!result) return null;
        if (result.pendiente) return <p className="mt-4 text-center text-sm text-yellow-300">{result.error}</p>;

        return (
            <div className={`animate-fade-in-up mt-6 rounded-lg border p-4 text-center ${result.isWinner ? 'border-green-500/50 bg-green-900/30' : 'border-red-500/50 bg-red-900/30'}`}>
                <h3 className="mb-2 text-xl font-bold">
                    {result.isWinner ? '🎉 ¡Enhorabuena, tienes premio!' : 'Este boleto no tiene premio.'}
                </h3>
                {result.categoriaTxt && <p className="mb-1 text-lg">Categoría: {result.categoriaTxt}</p>}
                {result.isWinner && <p className="mb-3 text-2xl font-bold text-brand-gold">Premio: {result.premio} €</p>}

                <div className="mt-4 space-y-2 rounded-md bg-black/30 p-3 text-left text-sm">
                    <p><span className="font-semibold text-gray-300">Sorteo del:</span> {result.drawDate}</p>
                    <p>
                        <span className="font-semibold text-gray-300">Combinación ganadora:</span>{' '}
                        {result.winningMain.join(', ')}
                        {result.winningSpecial.length > 0 ? ` | ${result.winningSpecial.join(', ')}` : ''}
                    </p>
                    <p>
                        <span className="font-semibold text-gray-300">
                            Números acertados ({result.matchedMain.length}):
                        </span>{' '}
                        {result.matchedMain.length > 0
                            ? <span className="font-bold text-green-400">{result.matchedMain.join(', ')}</span>
                            : <span className="text-gray-400">ninguno</span>}
                    </p>
                    <p className="pt-1 text-xs text-gray-500">Fuente: resultados oficiales de SELAE.</p>
                </div>
            </div>
        );
    };

    if (juegos.length === 0) {
        return <p className="text-center text-sm text-gray-400">No hay juegos disponibles para comprobar.</p>;
    }

    return (
        <div className="space-y-6">
            {showScanner && <QrScanner onDetect={handleQrDetected} onClose={() => setShowScanner(false)} />}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-400">Comprueba tu boleto con los resultados oficiales de SELAE.</p>
                <button
                    onClick={() => { setError(null); setShowScanner(true); }}
                    className="flex items-center justify-center gap-2 rounded-lg border border-brand-gold/60 px-4 py-2 font-semibold text-brand-gold hover:bg-brand-gold/10"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h3M4 17v3h3M20 7V4h-3M20 17v3h-3M8 12h8" />
                    </svg>
                    Escanear QR
                </button>
            </div>

            <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-2">
                <select
                    value={selectedGameId}
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    className="w-full rounded-lg border border-brand-gold/50 bg-black p-3 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                >
                    {juegos.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <input
                    type="date"
                    value={drawDate}
                    onChange={(e) => setDrawDate(e.target.value)}
                    className="w-full rounded-lg border border-brand-gold/50 bg-black p-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    aria-label="Fecha del sorteo"
                />
            </div>

            {selectedGame && (
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                        Números principales ({selectedGame.numbersToPick})
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {mainNumbers.map((num, i) => (
                            <input key={i} type="number" inputMode="numeric" value={num}
                                onChange={(e) => handleMainChange(i, e.target.value)}
                                className="w-14 rounded-lg border border-brand-gold/50 bg-black p-2 text-center focus:outline-none focus:ring-2 focus:ring-brand-gold" />
                        ))}
                    </div>
                </div>
            )}

            {selectedGame?.specialNumbers && (
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-300">
                        {selectedGame.specialNumbers.name} ({selectedGame.specialNumbers.count})
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {specialNumbers.map((num, i) => (
                            <input key={i} type="number" inputMode="numeric" value={num}
                                onChange={(e) => handleSpecialChange(i, e.target.value)}
                                className="w-14 rounded-lg border border-brand-gold/50 bg-brand-gold/20 p-2 text-center focus:outline-none focus:ring-2 focus:ring-brand-gold" />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleCheckClick}
                    disabled={isLoading}
                    className="w-full rounded-lg bg-brand-gold px-8 py-3 font-bold text-black transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-600 sm:w-auto"
                >
                    {isLoading ? 'Comprobando…' : 'Comprobar Boleto'}
                </button>
            </div>

            {renderResult()}
        </div>
    );
};

export default TicketChecker;

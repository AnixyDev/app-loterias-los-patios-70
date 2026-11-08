// Fix: Provide full implementation for constants.ts to resolve module errors.
// This file defines shared constants used throughout the application,
// such as game data and image URLs.

import { LotteryGame } from './types';

export const LOTTERY_GAMES: LotteryGame[] = [
    {
        id: 'euromillones',
        name: 'Euromillones',
        numbersToPick: 5,
        maxNumber: 50,
        specialNumbers: {
            name: 'Estrellas',
            count: 2,
            max: 12,
        },
        displayType: 'balls',
        urlSlug: 'euromillones',
    },
    {
        id: 'eurodreams',
        name: 'EuroDreams',
        numbersToPick: 6,
        maxNumber: 40,
        specialNumbers: {
            name: 'Sueño',
            count: 1,
            max: 5,
        },
        displayType: 'balls',
        urlSlug: 'eurodreams',
    },
    {
        id: 'primitiva',
        name: 'La Primitiva',
        numbersToPick: 6,
        maxNumber: 49,
        specialNumbers: {
            name: 'Reintegro',
            count: 1,
            max: 9,
        },
        addOn: {
            id: 'joker',
            name: 'Joker',
            numbersToPick: 1,
            maxNumber: 9999999,
        },
        displayType: 'ticket',
        urlSlug: 'primitiva',
    },
    {
        id: 'bonoloto',
        name: 'Bonoloto',
        numbersToPick: 6,
        maxNumber: 49,
        displayType: 'ticket',
        urlSlug: 'bonoloto',
    },
    {
        id: 'gordo',
        name: 'El Gordo de la Primitiva',
        numbersToPick: 5,
        maxNumber: 54,
        specialNumbers: {
            name: 'Nº Clave',
            count: 1,
            max: 9,
        },
        displayType: 'balls',
        urlSlug: 'el-gordo-de-la-primitiva',
    },
    {
        id: 'nacional',
        name: 'Lotería Nacional',
        numbersToPick: 1,
        maxNumber: 99999,
        displayType: 'ticket',
        urlSlug: 'loteria-nacional',
    },
];

/**
 * Juegos para el GENERADOR de números: solo aquellos en los que eliges una
 * combinación de números. Se excluye Lotería Nacional (no se elige número: se
 * compra un décimo ya impreso), por lo que generar números para ella no tiene
 * sentido.
 */
export const JUEGOS_GENERADOR: LotteryGame[] = LOTTERY_GAMES.filter(
    (g) => g.id !== 'nacional',
);

// Fix: Export GAME_IMAGES to resolve the import error in FeaturedResultBanner.tsx.
export const GAME_IMAGES: { [key: string]: string } = {
    euromillones: 'https://www.loteriasmalaga70.com/images/juegos/euromillones.jpg',
    eurodreams: 'https://www.loteriasmalaga70.com/images/juegos/eurodreams.jpg',
    primitiva: 'https://www.loteriasmalaga70.com/images/juegos/primitiva.jpg',
    bonoloto: 'https://www.loteriasmalaga70.com/images/juegos/bonoloto.jpg',
    gordo: 'https://www.loteriasmalaga70.com/images/juegos/gordo.jpg',
    nacional: 'https://www.loteriasmalaga70.com/images/juegos/loteria-nacional.jpg',
    default: 'https://www.loteriasmalaga70.com/images/logo-malaga70.png'
};
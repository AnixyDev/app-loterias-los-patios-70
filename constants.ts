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

// Imágenes de fondo (textura sutil) de las tarjetas de destacados.
// Reutilizamos los logos que ya están subidos en la biblioteca de medios
// (los mismos del carrusel de la web), para que no den 404.
const UPLOADS = 'https://loteriasmalaga70.com/wp-content/uploads/2025/08';
export const GAME_IMAGES: { [key: string]: string } = {
    euromillones: `${UPLOADS}/2.webp`,
    eurodreams:   `${UPLOADS}/1.webp`,
    primitiva:    `${UPLOADS}/7.webp`,
    bonoloto:     `${UPLOADS}/10.webp`,
    gordo:        `${UPLOADS}/5.webp`,
    nacional:     `${UPLOADS}/3-2.webp`,
    default:      `${UPLOADS}/7.webp`,
};
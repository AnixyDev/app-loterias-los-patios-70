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
     {
        id: 'quiniela',
        name: 'La Quiniela',
        numbersToPick: 15,
        maxNumber: 3, // 1, X, 2
        displayType: 'ticket',
        urlSlug: 'la-quiniela'
    },
    {
        id: 'quinigol',
        name: 'Quinigol',
        numbersToPick: 6, // 6 matches
        maxNumber: 4, // 0, 1, 2, M
        displayType: 'ticket',
        urlSlug: 'quinigol'
    },
    {
        id: 'lototurf',
        name: 'Lototurf',
        numbersToPick: 6,
        maxNumber: 31,
        specialNumbers: {
            name: 'Caballo',
            count: 1,
            max: 12,
        },
        displayType: 'balls',
        urlSlug: 'lototurf'
    },
    {
        id: 'quintuple-plus',
        name: 'Quintuple Plus',
        numbersToPick: 6, // 5 winners + 1 second
        maxNumber: 20, // Simplified number of horses
        displayType: 'ticket',
        urlSlug: 'quintuple-plus'
    }
];

// Fix: Export GAME_IMAGES to resolve the import error in FeaturedResultBanner.tsx.
export const GAME_IMAGES: { [key: string]: string } = {
    euromillones: 'https://www.loteriasmalaga70.com/images/juegos/euromillones.jpg',
    eurodreams: 'https://www.loteriasmalaga70.com/images/juegos/eurodreams.jpg',
    primitiva: 'https://www.loteriasmalaga70.com/images/juegos/primitiva.jpg',
    bonoloto: 'https://www.loteriasmalaga70.com/images/juegos/bonoloto.jpg',
    gordo: 'https://www.loteriasmalaga70.com/images/juegos/gordo.jpg',
    nacional: 'https://www.loteriasmalaga70.com/images/juegos/loteria-nacional.jpg',
    quiniela: 'https://www.loteriasmalaga70.com/images/juegos/quiniela.jpg',
    quinigol: 'https://www.loteriasmalaga70.com/images/juegos/quinigol.jpg',
    lototurf: 'https://www.loteriasmalaga70.com/images/juegos/lototurf.jpg',
    'quintuple-plus': 'https://www.loteriasmalaga70.com/images/juegos/quintuple-plus.jpg',
    default: 'https://www.loteriasmalaga70.com/images/logo-malaga70.png'
};
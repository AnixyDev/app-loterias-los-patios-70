// This file defines shared TypeScript types used throughout the application.

export interface LotteryGame {
    id: string;
    name: string;
    numbersToPick: number;
    maxNumber: number;
    specialNumbers?: {
        name: string;
        count: number;
        max: number;
    };
    addOn?: {
        id: string;
        name: string;
        numbersToPick: number;
        maxNumber: number;
    };
    displayType: 'balls' | 'ticket';
    urlSlug: string;
}

export interface PrizeTier {
    category: string;
    winners: string | number;
    prize: string | number;
}

export interface LotteryResult {
    date: string;
    jackpot: string | number | null;
    nextJackpot?: string;
    mainNumbers: (string | number)[];
    specialNumbers?: (string | number)[] | string | number;
    prizeLocation?: string;
    prizeTiers?: PrizeTier[];
}

export interface FeaturedResult {
    gameId: string;
    gameName: string;
    date: string;
    jackpot: string | number;
    mainNumbers: (string | number)[];
    specialNumbers?: (string | number)[];
}

export interface WeeklyTickerResult {
    gameName: string;
    numbers: string;
    date: string;
}

export interface CheckResult {
    isWinner: boolean;
    prizeAmount: string; // Keep as string for "Pendiente de Escrutinio" etc.
    winningNumbers: {
        main: (string | number)[];
        special?: (string | number)[];
    };
    matchedNumbers: {
        main: (string | number)[];
        special?: (string | number)[];
    };
    message: string;
    prizeTiers?: PrizeTier[];
    drawDate?: string;
}

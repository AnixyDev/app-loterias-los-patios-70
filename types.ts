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
  displayType?: 'balls' | 'ticket';
  addOn?: {
    id: string;
    name: string;
    numbersToPick: number;
    maxNumber: number;
  };
  urlSlug: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export interface PrizeTier {
    category: string;
    winners: string;
    prize: string;
}

export interface LotteryResult {
    date: string;
    mainNumbers: number[];
    specialNumbers?: number[];
    specialNumbersName?: string;
    jackpot: string;
    prizeLocation?: string;
    nextJackpot?: string;
    prizeTiers?: PrizeTier[];
}

export interface FeaturedResult extends LotteryResult {
    gameName: string;
    gameId: string;
}

export interface WeeklyTickerResult {
    gameName: string;
    date: string;
    numbers: string;
}


// Fix: Add missing GenerationStrategy enum for NumberGenerator component.
export enum GenerationStrategy {
    RANDOM = 'Aleatorio',
    DREAM = 'Inspirado en un sueño/frase',
}

// Fix: Add missing GeneratedNumbers interface for SavedPlays component.
export interface GeneratedNumbers {
  main: number[];
  special?: number[];
  addOn?: {
    name: string;
    numbers: number[];
  };
}
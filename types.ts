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

export enum GenerationStrategy {
  RANDOM = 'Aleatoriedad Pura',
  HOT = 'Números Calientes',
  COLD = 'Números Fríos',
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export type GeneratedNumbers = {
  main: number[];
  special?: number[];
  addOn?: {
    name: string;
    numbers: number[];
  };
};

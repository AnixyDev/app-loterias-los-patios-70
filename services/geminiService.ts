import { GoogleGenAI, Type } from "@google/genai";
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

// The API key is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = 'gemini-2.5-flash'; // A good balance of speed and capability for this app.

/**
 * Safely parses a JSON string returned by the Gemini API.
 * It handles potential markdown code fences around the JSON.
 * @param jsonString The raw string from the API response.
 * @param context A string describing the operation for better error messages.
 * @returns The parsed JSON object.
 */
const parseGeminiJson = <T>(jsonString: string, context: string): T => {
    try {
        // The API might wrap the JSON in markdown fences, remove them.
        const cleanJsonString = jsonString.replace(/^```json\s*/, '').replace(/```$/, '');
        return JSON.parse(cleanJsonString) as T;
    } catch (error) {
        console.error(`Error parsing JSON from Gemini for ${context}:`, error);
        console.error("Original string:", jsonString);
        throw new Error(`Respuesta inválida del servidor al procesar ${context}.`);
    }
};

export const fetchFeaturedResults = async (): Promise<FeaturedResult[]> => {
    const prompt = `
        Provide the latest featured lottery results for Spain. I need the 3 most important ones, typically Euromillones, Primitiva, and Eurodreams.
        For each game, give me the game ID, game name, draw date (in "DD/MM/YYYY" format), the main jackpot amount as a number (or a string like "Sin Bote"), the main winning numbers, and special numbers (if any).
        The game IDs should be: 'euromillones', 'primitiva', 'eurodreams'.
    `;
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        gameId: { type: Type.STRING },
                        gameName: { type: Type.STRING },
                        date: { type: Type.STRING },
                        jackpot: { type: Type.ANY, description: "Jackpot amount as a number or string." },
                        mainNumbers: { type: Type.ARRAY, items: { type: Type.ANY } },
                        specialNumbers: { type: Type.ARRAY, items: { type: Type.ANY } }
                    },
                    required: ["gameId", "gameName", "date", "jackpot", "mainNumbers"]
                }
            }
        }
    });

    return parseGeminiJson(response.text, "resultados destacados");
};

export const fetchWeeklyTickerResults = async (): Promise<WeeklyTickerResult[]> => {
    const prompt = `
        Provide a ticker of the latest results for about 5-7 main Spanish lotteries from the last 7 days (e.g., Bonoloto, Gordo, Nacional, Quiniela).
        For each, provide the game name, a compact string representation of the winning numbers, and the draw date in "DD/MM" format.
        Example for Bonoloto: "6, 12, 23, 34, 45, 48 C(9) R(1)".
    `;
     const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        gameName: { type: Type.STRING },
                        numbers: { type: Type.STRING },
                        date: { type: Type.STRING }
                    },
                    required: ["gameName", "numbers", "date"]
                }
            }
        }
    });

    return parseGeminiJson(response.text, "ticker de resultados");
};

export const fetchLatestResults = async (game: LotteryGame, date?: string): Promise<LotteryResult[]> => {
    const dateQuery = date ? `for the draw on or nearest to the date ${date}` : 'for the most recent draw';
    const prompt = `
        Get the lottery results for the game "${game.name}" in Spain, ${dateQuery}.
        If it's a game with daily draws (like Bonoloto) and no date is specified, return the last 3 results. Otherwise, get the single most recent result.
        Provide the draw date, main numbers, special numbers (if any, using the correct name like "${game.specialNumbers?.name}"), the main jackpot amount (as a string), the next jackpot amount (if available, as a string), and a detailed prize tiers breakdown (category, number of winners, prize per winner).
        If a jackpot was won, mention the location(s) where the winning ticket was sold if that information is public.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING },
                        jackpot: { type: Type.STRING },
                        nextJackpot: { type: Type.STRING },
                        mainNumbers: { type: Type.ARRAY, items: { type: Type.ANY } },
                        specialNumbers: { type: Type.ARRAY, items: { type: Type.ANY } },
                        prizeLocation: { type: Type.STRING },
                        prizeTiers: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    category: { type: Type.STRING },
                                    winners: { type: Type.STRING },
                                    prize: { type: Type.STRING }
                                },
                                required: ["category", "winners", "prize"]
                            }
                        }
                    },
                    required: ["date", "mainNumbers"]
                }
            }
        }
    });

    return parseGeminiJson(response.text, "historial de resultados");
};

export const generateNumbers = async (game: LotteryGame, strategy: GenerationStrategy, includeAddOn: boolean, inspirationText?: string): Promise<GeneratedNumbers> => {
    const inspirationPrompt = strategy === GenerationStrategy.DREAM && inspirationText ? `The user's inspiration is: "${inspirationText}". Base the numbers on the key concepts in this text.` : '';
    const addOnPrompt = includeAddOn && game.addOn ? `Also generate ${game.addOn.numbersToPick} number(s) for the add-on game "${game.addOn.name}" up to a max of ${game.addOn.maxNumber}.` : '';

    const prompt = `
        Generate a lottery combination for the Spanish game "${game.name}".
        Game rules:
        - Pick ${game.numbersToPick} main numbers from 1 to ${game.maxNumber}.
        ${game.specialNumbers ? `- Pick ${game.specialNumbers.count} special number(s) called "${game.specialNumbers.name}" from 1 to ${game.specialNumbers.max}.` : ''}
        
        Generation strategy: ${strategy}. ${inspirationPrompt}
        ${addOnPrompt}

        Return ONLY the numbers in the specified JSON format, with no explanations.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    main: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    special: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    addOn: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            numbers: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                        }
                    }
                },
                required: ["main"]
            }
        }
    });

    return parseGeminiJson(response.text, "generador de números");
};

export const checkTicket = async (game: LotteryGame, numbers: { main: number[], special?: number[], addOn?: number }, date: string): Promise<CheckResult> => {
     const dateQuery = date ? `for the draw date ${date}` : 'for the latest available draw';
     const userNumbers = `Main numbers: ${numbers.main.join(', ')}` +
        (numbers.special && game.specialNumbers ? `, ${game.specialNumbers.name}: ${numbers.special.join(', ')}` : '') +
        (numbers.addOn && game.addOn ? `, ${game.addOn.name}: ${numbers.addOn}` : '');

    const prompt = `
        Check the following lottery ticket for the Spanish game "${game.name}" ${dateQuery}.
        User's ticket: ${userNumbers}.

        First, find the official winning numbers for that draw.
        Then, compare the user's ticket to the winning numbers.
        Determine if the user has won, calculate the prize amount based on the prize tiers for that draw, and list which numbers they matched.
        Provide a clear, brief message summarizing the result.
        If the results for that date are not out yet, state that clearly in the message.
        Return the result in the specified JSON format.
    `;
    
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isWinner: { type: Type.BOOLEAN },
                    prizeAmount: { type: Type.STRING, description: "Prize amount as a formatted string, or a status like 'No premiado'." },
                    winningNumbers: {
                        type: Type.OBJECT,
                        properties: {
                            main: { type: Type.ARRAY, items: { type: Type.ANY } },
                            special: { type: Type.ARRAY, items: { type: Type.ANY } }
                        },
                        required: ["main"]
                    },
                    matchedNumbers: {
                        type: Type.OBJECT,
                        properties: {
                            main: { type: Type.ARRAY, items: { type: Type.ANY } },
                            special: { type: Type.ARRAY, items: { type: Type.ANY } }
                        },
                         required: ["main"]
                    },
                    message: { type: Type.STRING },
                    drawDate: { type: Type.STRING }
                },
                required: ["isWinner", "prizeAmount", "winningNumbers", "matchedNumbers", "message"]
            }
        }
    });
    
    return parseGeminiJson(response.text, "comprobador de boletos");
};

export const getChatResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    const prompt = `
        You are a helpful assistant for a Spanish lottery results website called "Asistente de Loterías Los Patios 70".
        The user's latest message is: "${newMessage}".
        Previous conversation for context: ${JSON.stringify(history)}.
        Answer the user's question concisely and accurately. You can talk about lottery results, how to play, or generate numbers.
        If asked to generate numbers, suggest they use the "Generador" tab for a better experience.
        If asked for results, suggest they use the "Historial" tab for detailed information.
        Keep responses short, friendly, and helpful.
    `;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
    });
    
    return response.text;
};

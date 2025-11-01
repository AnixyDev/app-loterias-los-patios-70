import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import { GenerationStrategy, LotteryGame, GeneratedNumbers } from '../types';
import { SYSTEM_INSTRUCTION, LOTTERY_GAMES, CTA_LINK } from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chat: Chat | null = null;

const generateLotteryNumbersTool: FunctionDeclaration = {
    name: 'generateLotteryNumbers',
    description: 'Genera una combinación de números para un sorteo de lotería específico usando una estrategia. Llama a esta función si el usuario pide números para un juego.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            gameName: {
                type: Type.STRING,
                description: `El nombre del sorteo. Opciones: ${LOTTERY_GAMES.map(g => g.name).join(', ')}.`,
            },
            strategy: {
                type: Type.STRING,
                description: `La estrategia a usar. Opciones: ${Object.values(GenerationStrategy).join(', ')}. Si el usuario no especifica, usa '${GenerationStrategy.RANDOM}'.`,
            },
        },
        required: ['gameName'],
    },
};

function getChat(): Chat {
    if (!chat) {
        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations: [generateLotteryNumbersTool] }],
            },
        });
    }
    return chat;
}

export async function getChatResponse(message: string): Promise<string> {
    try {
        const chatSession = getChat();
        const response = await chatSession.sendMessage({ message });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];

            if (call.name === 'generateLotteryNumbers') {
                const args = call.args as { gameName?: string, strategy?: string };

                if (!args.gameName) {
                    return "Por favor, especifica para qué sorteo quieres que genere los números.";
                }

                const game = LOTTERY_GAMES.find(g => g.name.toLowerCase() === args.gameName?.toLowerCase());

                if (!game) {
                    return `Lo siento, no conozco el sorteo "${args.gameName}". Puedo generar números para: ${LOTTERY_GAMES.map(g => g.name).join(', ')}.`;
                }

                const strategy = Object.values(GenerationStrategy).find(s => s.toLowerCase() === args.strategy?.toLowerCase()) || GenerationStrategy.RANDOM;

                const numbers = await generateLotteryNumbers(game, strategy, game.addOn ? true : false);

                let mainNumbersStr = numbers.main.join(', ');
                if (game.id === 'nacional') {
                    mainNumbersStr = `**${String(numbers.main[0]).padStart(5, '0')}**`;
                }

                let specialNumbersStr = '';
                if (numbers.special && game.specialNumbers) {
                    specialNumbersStr = `\n${game.specialNumbers.name}: **${numbers.special.join(' y ')}**`;
                }
                
                let addOnStr = '';
                if (numbers.addOn) {
                    addOnStr = `\n${numbers.addOn.name}: **${String(numbers.addOn.numbers[0]).padStart(7, '0')}**`;
                }


                return `¡Claro que sí! Aquí tienes tu combinación para ${game.name} (${strategy}):\n\n${game.id === 'nacional' ? 'Número:' : 'Números:'} ${mainNumbersStr}${specialNumbersStr}${addOnStr}\n\nTe deseamos mucha suerte con esta jugada. 🍀\n\n🎉 ¡Juega tu combinación online de forma segura con Los Patios 70! Haz clic aquí: ${CTA_LINK}`;
            }
        }

        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        return "Lo siento, he tenido un problema para conectar. Por favor, inténtalo de nuevo más tarde.";
    }
}

export async function generateLotteryNumbers(game: LotteryGame, strategy: GenerationStrategy, includeAddOn: boolean = false): Promise<GeneratedNumbers> {
    if (strategy === GenerationStrategy.RANDOM) {
        return generateRandomNumbers(game, includeAddOn);
    }

    const prompt = `Genera una combinación de números para el sorteo ${game.name} usando la estrategia de "${strategy}".
    - Números principales: ${game.numbersToPick} números del ${game.id === 'nacional' ? '0 al' : '1 al'} ${game.maxNumber}.
    ${game.specialNumbers ? `- Números especiales (${game.specialNumbers.name}): ${game.specialNumbers.count} del 1 al ${game.specialNumbers.max}.` : ''}
    ${(includeAddOn && game.addOn) ? `- Juego complementario (${game.addOn.name}): ${game.addOn.numbersToPick} número del 0 al ${game.addOn.maxNumber}.` : ''}
    No añadas ninguna explicación, solo los números. Responde en formato JSON como este: {"main": [n1, n2, ...], "special": [s1, s2, ...], "addOn": {"name": "${game.addOn?.name}", "numbers": [j1]}}. Si no hay especiales o complementarios, omite esas claves. Para Lotería Nacional, genera un único número de 5 cifras. Para El Joker, un número de 7 cifras.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });
        const text = response.text;
        const parsed = JSON.parse(text);
        
        if (game.id === 'nacional' && parsed.main && parsed.main.length > 0) {
            parsed.main[0] = Math.max(0, Math.min(99999, parsed.main[0]));
        }
        
        // FIX: Ensure that the parsed arrays are correctly typed as number[]
        // by mapping their values to Number and filtering out invalid values.
        // This resolves 'unknown[]' type issues.
        const toNumbers = (arr: unknown): number[] => 
            Array.isArray(arr) ? arr.map(Number).filter(n => !isNaN(n)) : [];

        return {
            main: toNumbers(parsed.main),
            special: toNumbers(parsed.special),
            addOn: parsed.addOn && parsed.addOn.name && parsed.addOn.numbers ? {
                name: parsed.addOn.name,
                numbers: toNumbers(parsed.addOn.numbers),
            } : undefined
        };
    } catch (error) {
        console.error("Error generating AI numbers, falling back to random:", error);
        return generateRandomNumbers(game, includeAddOn);
    }
}

function generateRandomNumbers(game: LotteryGame, includeAddOn: boolean = false): GeneratedNumbers {
    const main = new Set<number>();

    if (game.id === 'nacional') {
        main.add(Math.floor(Math.random() * 100000));
    } else {
        while (main.size < game.numbersToPick) {
            main.add(Math.floor(Math.random() * game.maxNumber) + 1);
        }
    }

    let special: number[] | undefined = undefined;
    if (game.specialNumbers) {
        const specialSet = new Set<number>();
        while (specialSet.size < game.specialNumbers.count) {
            specialSet.add(Math.floor(Math.random() * game.specialNumbers.max) + 1);
        }
        special = Array.from(specialSet).sort((a: number, b: number) => a - b);
    }
    
    let addOn: { name: string; numbers: number[] } | undefined = undefined;
    if (includeAddOn && game.addOn) {
        addOn = {
            name: game.addOn.name,
            numbers: [Math.floor(Math.random() * (game.addOn.maxNumber + 1))],
        };
    }

    return {
        main: Array.from(main).sort((a: number, b: number) => a - b),
        special: special,
        addOn: addOn,
    };
}
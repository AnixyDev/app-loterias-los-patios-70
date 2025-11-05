// Fix: Provide full implementation for geminiService.ts to resolve module errors.
// This service encapsulates all interactions with the Google Gemini API.

import { GoogleGenAI } from "@google/genai";
import { LotteryGame, LotteryResult, FeaturedResult, WeeklyTickerResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';


const parseJsonResponse = (text: string) => {
    const trimmedText = text.trim();
    const jsonMatch = trimmedText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : trimmedText;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON string:", jsonString);
        throw new Error("La respuesta de la IA no tenía un formato JSON válido.");
    }
};


export const getChatResponse = async (history: { role: string, parts: { text: string }[] }[], newMessage: string): Promise<string> => {
    try {
         const chat = ai.chats.create({
            model: model,
            history: history,
            config: {
                systemInstruction: `Eres un asistente virtual experto en loterías de España, trabajando para la administración "Los Patios 70". Tu tono es amable, servicial y un poco informal. NUNCA debes dar consejos financieros ni garantizar que un número será ganador. El juego es por azar. Eres capaz de buscar y proporcionar resultados de sorteos pasados si te lo piden, y también de comprobar jugadas específicas. Si el usuario te da sus números y un sorteo, busca el resultado más reciente y dile cuántos aciertos ha tenido y, si es posible, el premio asociado. Utiliza la herramienta de búsqueda para obtener la información más actualizada. Usa markdown simple como **negrita** para resaltar. Sé conciso y directo en tus respuestas.`
            }
        });
        
        const response = await chat.sendMessage({ message: newMessage });
        return response.text;
    } catch (error) {
        console.error("Error getting chat response from Gemini:", error);
        throw new Error("No se pudo obtener una respuesta. Por favor, inténtalo de nuevo.");
    }
}

export const fetchLatestResults = async (game: LotteryGame, date?: string): Promise<LotteryResult[]> => {
    try {
        let prompt;
        if (date) {
            prompt = `Obtén el resultado del sorteo de lotería "${game.name}" en España para la fecha específica ${date}. Si hubo sorteo ese día, devuelve un array con un único objeto resultado. Si no hubo sorteo en esa fecha exacta, devuelve un array vacío []. Incluye la fecha del sorteo (en formato "Día, DD de Mes de AAAA"), la combinación ganadora (números principales y especiales por separado), el importe del bote o primer premio, dónde se vendió el primer premio (si es público y relevante, ciudad o provincia), el bote estimado para el próximo sorteo (si está disponible) y el desglose de premios (escrutinio). El escrutinio debe ser un array de objetos con "category", "winners" y "prize". Devuelve el resultado únicamente en formato JSON, como un array de objetos, sin texto adicional, markdown o explicaciones. Los campos numéricos de la combinación deben ser 'mainNumbers' y 'specialNumbers'.`;
        } else {
            prompt = `Obtén los 3 últimos resultados del sorteo de lotería "${game.name}" en España. Incluye la fecha del sorteo (en formato "Día, DD de Mes de AAAA"), la combinación ganadora (números principales y especiales por separado), el importe del bote o primer premio, dónde se vendió el primer premio (si es público y relevante, ciudad o provincia), el bote estimado para el próximo sorteo (si está disponible) y el desglose de premios (escrutinio) para cada resultado. El escrutinio debe ser un array de objetos con "category", "winners" y "prize". Devuelve el resultado únicamente en formato JSON, como un array de objetos, sin texto adicional, markdown o explicaciones. Los campos numéricos de la combinación deben ser 'mainNumbers' y 'specialNumbers'.`;
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        return parseJsonResponse(response.text);
    } catch (error) {
        console.error(`Error fetching results for ${game.name}:`, error);
        throw new Error(`No se pudieron obtener los resultados de ${game.name}.`);
    }
};

export const fetchFeaturedResults = async (): Promise<FeaturedResult[]> => {
    try {
        const prompt = `Obtén el último y más relevante resultado para los siguientes sorteos en España: Euromillones, La Primitiva, Bonoloto, El Gordo de la Primitiva. Quiero un total de 3 o 4 resultados, priorizando los que tengan botes más grandes o hayan sido más recientes. Para cada uno, necesito: nombre del juego, gameId (euromillones, primitiva, bonoloto, gordo), fecha del sorteo, combinación ganadora (números principales y especiales por separado), y el importe del bote principal en euros. Devuelve el resultado únicamente como un array de objetos JSON, sin texto adicional. Cada objeto debe tener los campos: "gameName", "gameId", "date", "mainNumbers", "specialNumbers" (si aplica), y "jackpot".`;
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        return parseJsonResponse(response.text);
    } catch (error) {
        console.error("Error fetching featured results:", error);
        throw new Error("No se pudieron cargar los resultados destacados.");
    }
};

export const fetchWeeklyTickerResults = async (): Promise<WeeklyTickerResult[]> => {
    try {
        const prompt = `Proporciona un resumen con el último resultado disponible para cada uno de los siguientes sorteos de lotería en España: Bonoloto, Primitiva, Euromillones, El Gordo, Lotería Nacional, LottoTurf, La Quiniela. Para cada uno, dame el nombre del juego, la fecha del sorteo y la combinación ganadora como una única cadena de texto (ej. para La Quiniela: "1X21X21X21X21X2"). Devuelve el resultado únicamente como un array de objetos JSON, sin texto adicional. Cada objeto debe tener los campos: "gameName", "date" (formato corto, ej. "Lun 01/01"), y "numbers".`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        return parseJsonResponse(response.text);
    } catch (error) {
        console.error("Error fetching weekly ticker results:", error);
        throw new Error("Error al cargar resultados de la semana.");
    }
};

export const checkTicket = async (game: LotteryGame, mainNumbers: string[], specialNumbers: string[]): Promise<string> => {
     try {
        const prompt = `Comprueba si el siguiente boleto del sorteo "${game.name}" ha obtenido algún premio en el último sorteo celebrado. Mi jugada es: números principales: ${mainNumbers.join(', ')}${game.specialNumbers && specialNumbers.length > 0 ? `, ${game.specialNumbers.name}: ${specialNumbers.join(', ')}` : ''}. Busca el último resultado oficial y compáralo con mi jugada. Responde de forma clara y concisa. Empieza diciendo si el boleto está premiado o no. Si tiene premio, indica la categoría (ej. "3 aciertos") y el importe exacto ganado en euros según el escrutinio oficial. Si no ha sido premiado, simplemente di que no ha obtenido premio. Termina la respuesta con una frase de ánimo como "¡Mucha suerte para la próxima!". No incluyas información sobre el bote o el próximo sorteo.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        return response.text;
    } catch (error) {
        console.error(`Error checking ticket for ${game.name}:`, error);
        throw new Error(`No se pudo comprobar tu jugada de ${game.name}.`);
    }
}

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getBarberAIAssistance = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Você é o assistente virtual da Barbearia Stayler. Ajude o barbeiro ou o cliente com dúvidas sobre estilos de cabelo, agendamentos e cuidados com a barba. Seja profissional, moderno e direto.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Desculpe, tive um problema ao processar sua solicitação.";
  }
};

export const suggestStyleFromDescription = async (description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `O cliente descreveu seu desejo: "${description}". Sugira os 3 melhores estilos de corte/barba e o porquê.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              style: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["style", "reason"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

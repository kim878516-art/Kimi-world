import { GoogleGenAI, Type } from "@google/genai";
import { InspectionRecord, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SAFETY_MODEL = "gemini-3-flash-preview";

export const generateRiskAssessment = async (observation: string, category: string, language: Language): Promise<{ risk: string; action: string }> => {
  try {
    const langContext = language === 'zh' 
      ? "繁體中文（香港專業用語）" 
      : "English (Professional Safety Terminology)";

    const prompt = `
      作为一名符合香港法例第59章《工廠及工業經營條例》要求的资深安全主任。
      请分析以下工厂安全观察事项：
      
      类别：${category}
      观察事项："${observation}"

      请提供 ${langContext} 的简明风险评估及建议的补救措施。
      Output MUST be in ${language === 'zh' ? 'Traditional Chinese' : 'English'}.
    `;

    const response = await ai.models.generateContent({
      model: SAFETY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            risk: { type: Type.STRING, description: "Potential hazard or risk" },
            action: { type: Type.STRING, description: "Remedial actions" }
          },
          required: ["risk", "action"]
        }
      }
    });

    const text = response.text;
    if (!text) return { risk: language === 'zh' ? "無法生成" : "Cannot generate", action: language === 'zh' ? "請人手覆核" : "Manual review required" };
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Risk Assessment Error:", error);
    return { 
      risk: language === 'zh' ? "生成評估時發生錯誤" : "Error generating assessment", 
      action: language === 'zh' ? "請手動輸入" : "Please enter manually" 
    };
  }
};

export const generateWeeklySummary = async (inspections: InspectionRecord[], language: Language): Promise<string> => {
  try {
    // Simplify data for the prompt to save tokens
    const dataSummary = inspections.map(i => ({
      date: i.date,
      location: i.location,
      risks: i.items.filter(item => item.status === 'At Risk').map(item => item.observation),
      overallRisk: i.riskLevel
    }));

    const langContext = language === 'zh' ? "繁體中文" : "English";

    const prompt = `
      作為工廠的安全經理。
      請為廠長生成一份專業的每週安全行政摘要 (${langContext})。
      摘要必須正式，並在適當情況下提及符合香港法例第59章的要求。
      
      以下是本週的巡查數據：
      ${JSON.stringify(dataSummary, null, 2)}

      摘要應包含：
      1. 重點說明總巡查次數及主要地點。
      2. 總結發現的關鍵危害（如有）。
      3. 總結本週的整體安全文化。
      4. 字數約 150-200 字。
    `;

    const response = await ai.models.generateContent({
      model: SAFETY_MODEL,
      contents: prompt,
    });

    return response.text || (language === 'zh' ? "無法生成摘要。" : "Summary could not be generated.");
  } catch (error) {
    console.error("Gemini Weekly Summary Error:", error);
    return language === 'zh' ? "生成週報摘要時發生錯誤。請檢查網絡連接。" : "Error generating weekly summary. Check connection.";
  }
};
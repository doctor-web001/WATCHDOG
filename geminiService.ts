
import { GoogleGenAI, Type } from "@google/genai";
import { Classification, PredictionResult, LexicalFeatures, GroundingSource } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Predicts URL safety with an adaptive learning loop by incorporating previous forensic conclusions.
 */
export const predictUrlSafety = async (
  url: string, 
  features: LexicalFeatures, 
  memory: PredictionResult[] = []
): Promise<PredictionResult> => {
  const startTime = performance.now();
  
  // Format long-term memory for few-shot learning
  const learnedPatterns = memory
    .slice(0, 5)
    .map(m => `URL: ${m.url} | Features: Entropy ${m.features.entropy.toFixed(2)}, BrandSim ${m.features.brand_similarity.toFixed(2)} | Result: ${m.prediction}`)
    .join('\n');

  const prompt = `
    Act as a Hybrid Forensic Engine with Adaptive Learning. 
    Analyze the following URL using a Multi-Class approach (Phishing, Malware, Spam, DGA, C2).
    
    URL: ${url}
    
    Extracted Features (Local Heuristics):
    - Entropy (Shannon): ${features.entropy.toFixed(4)}
    - Brand Similarity Index: ${features.brand_similarity.toFixed(2)}
    - Full Feature Vector: ${JSON.stringify(features)}

    NEURAL MEMORY (Learned Patterns from History):
    ${learnedPatterns || "No previous patterns learned yet."}

    RESEARCH GAP REQUIREMENTS:
    1. EXPLAINABILITY (XAI): Identify at least 4 specific features that contributed to your decision. Assign weights (-1 to 1).
    2. ADAPTIVE LEARNING: Use the Neural Memory above to refine your prediction if this URL matches patterns you've seen before.
    3. ZERO-DAY ROBUSTNESS: Evaluate 'zero_day_probability' based on structural anomalies.
    4. THREAT PRIORITIZATION: Rank severity (Low, Medium, High, Critical).
    5. GROUNDING: Use 'google_search' to verify reputation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prediction: { type: Type.STRING },
            confidence_score: { type: Type.NUMBER },
            zero_day_probability: { type: Type.NUMBER },
            severity_rank: { type: Type.STRING },
            anomaly_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
            explanation: { type: Type.STRING },
            feature_weights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  feature: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                },
                required: ["feature", "weight", "description"]
              }
            }
          },
          required: ["prediction", "confidence_score", "zero_day_probability", "severity_rank", "anomaly_flags", "explanation", "feature_weights"]
        }
      }
    });

    const resultData = JSON.parse(response.text || '{}');
    const endTime = performance.now();
    
    const grounding_sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Web Record',
      uri: chunk.web?.uri || '#'
    })).filter((s: any) => s.uri !== '#') || [];

    return {
      url,
      prediction: (Object.values(Classification).includes(resultData.prediction as any) ? resultData.prediction : Classification.LEGITIMATE) as Classification,
      confidence_score: resultData.confidence_score,
      zero_day_probability: resultData.zero_day_probability,
      severity_rank: resultData.severity_rank || 'Medium',
      anomaly_flags: resultData.anomaly_flags,
      feature_weights: resultData.feature_weights,
      inference_time_ms: Math.round(endTime - startTime),
      timestamp: new Date().toISOString(),
      features,
      explanation: resultData.explanation,
      grounding_sources
    };
  } catch (error) {
    console.error("Forensic Analysis Error:", error);
    return {
      url,
      prediction: Classification.LEGITIMATE,
      confidence_score: 0.5,
      zero_day_probability: 0,
      severity_rank: 'Low',
      anomaly_flags: ["Engine Fallback"],
      feature_weights: [],
      inference_time_ms: 0,
      timestamp: new Date().toISOString(),
      features,
      explanation: "Analysis failed. System defaults applied."
    };
  }
};


import { GoogleGenAI, Type } from "@google/genai";
import { GeminiModel, PromptTemplate } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRefinedPrompt = async (
  userInstruction: string,
  filePaths: string[]
): Promise<string> => {
  const ai = getClient();
  
  const systemInstruction = `You are an expert Prompt Engineer for AI Coding Agents (like Cursor, Windsurf, Replit). 
  
  Your goal is to take a raw user instruction and a LIST OF SELECTED FILES, and output a highly structured, context-aware prompt.
  
  Rules:
  1. Do NOT hallucinate file names. Only use the ones provided in the list.
  2. If the user asks for a "review" or "refactor", explicitly reference the most relevant files from the list in your output.
  3. Format the output to be ready for an LLM to execute.
  4. Keep it concise but specific.
  5. CRITICAL: Output ONLY the prompt content. Do not include any conversational filler, meta-commentary, introductory text (e.g., "Here is the refined prompt"), or markdown fences around the entire response. Start directly with the prompt logic.
  `;

  const filesList = filePaths.length > 0 
    ? filePaths.join('\n') 
    : "(No files selected)";

  // Provide a default intent if the user instruction is empty to prevent the model from complaining about it
  const effectiveInstruction = userInstruction.trim() || "Analyze the selected files and provide a summary of their purpose and potential improvements.";

  const prompt = `User Instruction: "${effectiveInstruction}"
  
  Selected Files Context:
  ${filesList}
  
  Refine this instruction into a perfect prompt. Return ONLY the raw text of the refined prompt.`;

  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.PRO, // Using Pro for reasoning
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text ? response.text.trim() : "Failed to generate.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const suggestRelevantFiles = async (
  userInstruction: string,
  allFilePaths: string[]
): Promise<string[]> => {
  const ai = getClient();

  // Safety: Limit file paths context to ~3000 files to avoid massive payloads if repo is huge
  const truncatedPaths = allFilePaths.slice(0, 3000);

  const prompt = `
    You are a Code Repository Intelligence Agent.
    
    Task: Identify which files from the provided list are relevant to the User's Instruction.
    User Instruction: "${userInstruction}"
    
    Files List:
    ${truncatedPaths.join('\n')}
    
    Return a JSON object with a single property "relevantFiles" containing an array of strings (exact paths from the list).
    If no specific files are mentioned, infer the most logical entry points or relevant modules.
    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH, // Flash is perfect for high-volume context scanning
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            relevantFiles: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.relevantFiles || [];
  } catch (error) {
    console.error("Gemini Smart Select Error:", error);
    throw error;
  }
};

export const generateTemplateSuggestions = async (
  allFilePaths: string[]
): Promise<PromptTemplate[]> => {
  const ai = getClient();
  
  // Create a condensed file tree summary for the model
  // We prioritize high-level files and configuration files to hint at the stack
  const importantFiles = allFilePaths.filter(p => {
    const depth = p.split('/').length;
    const isConfig = p.endsWith('.json') || p.endsWith('.config.js') || p.endsWith('.yml') || p.endsWith('.toml') || p.endsWith('.xml');
    return depth <= 2 || isConfig;
  }).slice(0, 300); // Limit context

  const prompt = `
    You are a Developer Productivity Expert.
    
    Analyze the following file list from a project to determine the technology stack (e.g., React, Python, Go, Java, Next.js).
    
    File List Sample:
    ${importantFiles.join('\n')}
    
    Task: Generate 3 to 5 "Prompt Templates" that would be highly useful for a developer working in this specific codebase.
    The templates should be specific to the detected framework or language.
    
    Examples:
    - If Next.js detected: "Create API Route", "Optimize Image Component".
    - If Python/Pandas detected: "Clean DataFrame", "Generate Plot".
    - If Generic/Unknown: "Refactor Logic", "Write Tests".
    
    Return a JSON object containing a property "suggestions" which is an array of objects.
    Each object must have:
    - "name": Short title.
    - "template": The actual prompt text (keep it generic enough to apply to selected files).
    - "tags": Array of strings (e.g. ["react", "frontend"]).
  `;

  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  template: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    // Add IDs to the suggestions
    return parsed.suggestions.map((s: any) => ({
      id: `suggested-${Math.random().toString(36).substr(2, 9)}`,
      name: s.name,
      template: s.template,
      tags: s.tags || ['suggested']
    }));

  } catch (error) {
    console.error("Gemini Template Suggestion Error:", error);
    return [];
  }
};

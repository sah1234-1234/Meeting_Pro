import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBpGpyd5oV0EOt9fxFYCmzNECtJYFG5XVs";
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured. Please add it to your secrets.");
}
const ai = new GoogleGenAI({ apiKey });

export interface ActionItem {
  task: string;
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  status: 'Pending' | 'Completed';
}

export interface Issue {
  issue: string;
  department: 'Housekeeping' | 'F&B' | 'Maintenance' | 'Front Office' | 'Other';
  severity: 'High' | 'Medium' | 'Low';
}

export interface GuestInsight {
  type: 'Complaint' | 'Feedback' | 'Improvement';
  detail: string;
}

export interface MeetingReport {
  // Metadata
  title: string;
  date: string;
  property: string;
  authorUid: string;
  createdAt: string;
  
  // MOM Content
  meetingSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  issuesIdentified: Issue[];
  guestExperienceInsights: GuestInsight[];
  departmentWiseSummary: {
    Housekeeping: string | null;
    'F&B': string | null;
    Maintenance: string | null;
    'Front Office': string | null;
  };
  
  // Analytics
  performanceScore: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export interface MeetingOptions {
  category: 'Hotel';
  language: 'English' | 'Hindi' | 'Hinglish';
  customInstructions?: string;
  titleHint?: string;
}

export const PROPERTIES = [
  'Sukoon Nisarg Resort',
  'Sukoon Resort',
  'Ice on Fire',
  'Sukoon City View Hotel',
  'Sukoon Pearll Inn',
  'Sukoon Signature',
  'Sukoon Grandeur',
  'Sukoon Prestige Palace'
];

const SYSTEM_INSTRUCTION = `
  You are the "Sukoon Meeting Agent", a specialized AI assistant for Sukoon Infracon Limited's hospitality division.
  Your goal is to transform hotel meeting recordings and transcripts into high-quality, professional, and actionable Minutes of Meeting (MOM).

  CONTEXT:
  Sukoon Infracon Limited operates a portfolio of premium resorts and hotels. The tone of your output must be executive, precise, and focused on operational excellence.

  IDENTIFIED PROPERTIES (MUST CHOOSE ONE):
  ${PROPERTIES.map(p => `- ${p}`).join('\n')}

  If multiple properties are mentioned, choose the primary one. If none are explicitly named, infer from context (staff names, specific facilities, or locations).

  CORE RESPONSIBILITIES:
  1. MEETING SUMMARY: Provide a high-level executive summary of the meeting's purpose and key outcomes.
  2. KEY DECISIONS: List all major decisions made during the meeting.
  3. ACTION ITEMS: Extract tasks with clear assignees, priorities (High/Medium/Low), and deadlines.
  4. ISSUES IDENTIFIED: Capture operational challenges, maintenance needs, or service gaps.
  5. GUEST EXPERIENCE: Highlight specific guest feedback, complaints, or improvement suggestions.
  6. DEPARTMENT SUMMARIES: Provide concise updates for Housekeeping, F&B, Maintenance, and Front Office.

  STYLE GUIDELINES:
  - Persona: Professional, efficient, and detail-oriented.
  - Language: Clean, executive English.
  - Logic: 
    - Priority: High for urgent guest-facing issues or safety concerns.
    - Severity: High for anything directly impacting guest satisfaction or revenue.
  - Performance Score: A metric (0-100) representing the operational health discussed in the meeting.

  Output the result in a structured JSON format matching the provided schema.
`;

export async function processMeetingAudio(
  audioBase64: string, 
  mimeType: string,
  options: MeetingOptions
): Promise<MeetingReport> {
  const model = "gemini-3-flash-preview";
  
  // Map common MIME types to Gemini supported ones if necessary
  let processedMimeType = mimeType;
  const lowerMime = mimeType.toLowerCase();
  
  if (lowerMime.includes('m4a') || lowerMime.includes('x-m4a') || lowerMime.includes('aac')) {
    processedMimeType = 'audio/aac';
  } else if (lowerMime.includes('mp3') || lowerMime.includes('mpeg')) {
    processedMimeType = 'audio/mp3';
  } else if (lowerMime.includes('wav')) {
    processedMimeType = 'audio/wav';
  } else if (lowerMime.includes('ogg')) {
    processedMimeType = 'audio/ogg';
  } else if (lowerMime.includes('flac')) {
    processedMimeType = 'audio/flac';
  } else if (lowerMime.includes('aiff') || lowerMime.includes('aif')) {
    processedMimeType = 'audio/aiff';
  } else if (!lowerMime.startsWith('audio/')) {
    // Fallback for files with audio extensions but missing/generic MIME types
    processedMimeType = 'audio/mp3'; 
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: processedMimeType,
              },
            },
            {
              text: "Analyze this hotel meeting audio and extract detailed operational intelligence. Return ONLY a valid JSON object matching the requested schema.",
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            property: { 
              type: Type.STRING, 
              enum: PROPERTIES,
              description: "The specific Sukoon property this meeting is about."
            },
            meetingSummary: { type: Type.STRING },
            keyDecisions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  assignedTo: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  deadline: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['Pending', 'Completed'] }
                },
                required: ['task', 'assignedTo', 'priority', 'deadline', 'status']
              }
            },
            issuesIdentified: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  department: { type: Type.STRING, enum: ['Housekeeping', 'F&B', 'Maintenance', 'Front Office', 'Other'] },
                  severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                },
                required: ['issue', 'department', 'severity']
              }
            },
            guestExperienceInsights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['Complaint', 'Feedback', 'Improvement'] },
                  detail: { type: Type.STRING }
                },
                required: ['type', 'detail']
              }
            },
            departmentWiseSummary: {
              type: Type.OBJECT,
              properties: {
                Housekeeping: { type: Type.STRING, nullable: true },
                'F&B': { type: Type.STRING, nullable: true },
                Maintenance: { type: Type.STRING, nullable: true },
                'Front Office': { type: Type.STRING, nullable: true }
              },
              required: ['Housekeeping', 'F&B', 'Maintenance', 'Front Office']
            },
            performanceScore: { type: Type.NUMBER },
            sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] }
          },
          required: ["title", "date", "property", "meetingSummary", "keyDecisions", "actionItems", "issuesIdentified", "guestExperienceInsights", "departmentWiseSummary", "performanceScore", "sentiment"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", text);
      throw new Error("AI response was not in the expected format.");
    }
  } catch (apiError: any) {
    console.error("Gemini API Error:", apiError);
    if (apiError.message?.includes("Safety")) {
      throw new Error("The audio content was flagged by safety filters. Please ensure the recording is appropriate.");
    }
    throw new Error(`AI Processing failed: ${apiError.message || "Unknown error"}`);
  }
}

export async function processMeetingTranscript(
  transcript: string,
  options: MeetingOptions
): Promise<MeetingReport> {
  const model = "gemini-3-flash-preview";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            {
              text: `Analyze this hotel meeting transcript and extract detailed operational intelligence. Return ONLY a valid JSON object matching the requested schema.\n\nTRANSCRIPT:\n${transcript}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            property: { 
              type: Type.STRING, 
              enum: PROPERTIES,
              description: "The specific Sukoon property this meeting is about."
            },
            meetingSummary: { type: Type.STRING },
            keyDecisions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  assignedTo: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                  deadline: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['Pending', 'Completed'] }
                },
                required: ['task', 'assignedTo', 'priority', 'deadline', 'status']
              }
            },
            issuesIdentified: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  department: { type: Type.STRING, enum: ['Housekeeping', 'F&B', 'Maintenance', 'Front Office', 'Other'] },
                  severity: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                },
                required: ['issue', 'department', 'severity']
              }
            },
            guestExperienceInsights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['Complaint', 'Feedback', 'Improvement'] },
                  detail: { type: Type.STRING }
                },
                required: ['type', 'detail']
              }
            },
            departmentWiseSummary: {
              type: Type.OBJECT,
              properties: {
                Housekeeping: { type: Type.STRING, nullable: true },
                'F&B': { type: Type.STRING, nullable: true },
                Maintenance: { type: Type.STRING, nullable: true },
                'Front Office': { type: Type.STRING, nullable: true }
              },
              required: ['Housekeeping', 'F&B', 'Maintenance', 'Front Office']
            },
            performanceScore: { type: Type.NUMBER },
            sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] }
          },
          required: ["title", "date", "property", "meetingSummary", "keyDecisions", "actionItems", "issuesIdentified", "guestExperienceInsights", "departmentWiseSummary", "performanceScore", "sentiment"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    return JSON.parse(text);
  } catch (apiError: any) {
    console.error("Gemini API Error (Transcript):", apiError);
    throw new Error(`AI Processing failed: ${apiError.message || "Unknown error"}`);
  }
}

export { ai };

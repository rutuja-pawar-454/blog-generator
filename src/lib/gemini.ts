import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function generateBlogPost(topic: string): Promise<{ title: string; content: string }> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const prompt = `Write a simple, engaging, 3-paragraph blog post specifically about: ${topic.trim()}. Write a unique, topic-relevant title first (formatted as '# Title'), followed by the content. Do not use generic boilerplate templates. Do NOT write corporate titles like 'The Complete Guide to...', 'Why X Matters', or 'Step-by-Step Action Plan'.`;

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
  ];

  let resultText = '';
  let lastError: any = null;

  const ai = new GoogleGenAI({ apiKey });
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      if (response && response.text) {
        resultText = response.text;
        break;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!resultText) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) {
          resultText = text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  if (!resultText) {
    throw new Error(
      lastError?.message || 'Failed to generate content with Gemini API.'
    );
  }

  let title = topic.trim();
  let content = resultText.trim();

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim().replace(/^#+\s*/, '');
    content = content.replace(/^#\s+.+(\r?\n)+/, '').trim();
  } else {
    const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 100) {
      title = lines[0].replace(/^#+\s*/, '');
      content = lines.slice(1).join('\n').trim();
    }
  }

  return { title, content };
}

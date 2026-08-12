import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    // 1. Parse User Query Properly
    const body = await req.json().catch(() => ({}));
    const topic = body?.topic;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return NextResponse.json(
        { error: 'Topic is required. Please provide a blog topic.' },
        { status: 400 }
      );
    }

    const trimmedTopic = topic.trim();
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is not configured.' },
        { status: 500 }
      );
    }

    // 2. Direct Gemini Prompt as specified by user
    const prompt =
      'Write a clear, simple 3-paragraph blog post directly about the topic: ' +
      trimmedTopic +
      '. Output a unique title line starting with "# Title" that explicitly mentions the topic name, followed by the content.';

    // Flash and stable model candidates
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

    // Try @google/genai SDK
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

    // Fallback to @google/generative-ai SDK if needed
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
      return NextResponse.json(
        {
          error:
            lastError?.message ||
            'Failed to generate content with Gemini API. Please check your API key and connection.',
        },
        { status: 500 }
      );
    }

    // Parse title & content
    let title = trimmedTopic;
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

    // 3. Save live response directly to Prisma DB
    const post = await prisma.post.create({
      data: {
        title,
        content,
      },
    });

    return NextResponse.json(post);
  } catch (error: any) {
    console.error('Error generating blog post:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate blog post via Gemini API.' },
      { status: 500 }
    );
  }
}

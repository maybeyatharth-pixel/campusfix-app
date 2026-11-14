import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

const CATEGORIES = ['Electrical', 'Water', 'Internet', 'Cleanliness', 'Safety', 'Food'] as const;
const PRIORITIES = ['High', 'Medium', 'Low'] as const;

type Category = (typeof CATEGORIES)[number];
type Priority = (typeof PRIORITIES)[number];

interface TriageResult {
  category: Category;
  priority: Priority;
  reason: string;
  source: 'gemini' | 'fallback';
}

function fallbackTriage(location: string, description: string): TriageResult {
  const text = `${location} ${description}`.toLowerCase();

  let category: Category = 'Cleanliness';
  if (/(spark|wire|power|outage|light|bulb|fan|ac|air cond|socket|switch|breaker|electr|shock|voltage|fuse|projector)/.test(text)) {
    category = 'Electrical';
  } else if (/(leak|pipe|water|tap|faucet|drain|flood|toilet|restroom|sink|shower|geyser|tank|drinking|cooler|clog)/.test(text)) {
    category = 'Water';
  } else if (/(wifi|wi-fi|internet|network|ethernet|lan|router|slow|disconnect|portal|server|signal)/.test(text)) {
    category = 'Internet';
  } else if (/(fire|smoke|gas|lock|broken glass|dark|harass|unsafe|theft|guard|emergency|hazard|slippery|stairs|railing|intruder|alarm)/.test(text)) {
    category = 'Safety';
  } else if (/(food|mess|canteen|cafeteria|spoiled|stale|insect|hygiene|dining|meal|lunch|dinner|breakfast|coffee|rotten)/.test(text)) {
    category = 'Food';
  } else if (/(trash|garbage|dirty|smell|odor|clean|sweep|mop|dust|spill|bin|washroom|litter)/.test(text)) {
    category = 'Cleanliness';
  }

  let priority: Priority = 'Medium';
  if (/(fire|smoke|spark|shock|gas|flood|emergency|unsafe|broken glass|no power|entire|urgent|immediate|hazard|rotten|poison|collapse|locked out)/.test(text) || category === 'Safety') {
    priority = 'High';
  } else if (/(flicker|slow|minor|dust|scuff|smudge|creak|cosmetic|bulb|small)/.test(text)) {
    priority = 'Low';
  }

  return {
    category,
    priority,
    reason: `Assigned ${category} (${priority} priority) based on issue location and symptoms.`,
    source: 'fallback',
  };
}

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'campusfix' });
  });

  app.post('/api/triage', async (req, res) => {
    const location = typeof req.body?.location === 'string' ? req.body.location.trim().slice(0, 120) : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 2000) : '';
    const photoDataUrl = typeof req.body?.photoDataUrl === 'string' ? req.body.photoDataUrl : '';

    if (!description || description.length < 3) {
      res.status(400).json({ error: 'Description is required for categorisation.' });
      return;
    }

    if (!ai) {
      res.json(fallbackTriage(location, description));
      return;
    }

    try {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (photoDataUrl && photoDataUrl.startsWith('data:image/')) {
        const match = photoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      parts.push({
        text: `Campus location: ${location || 'Not specified'}\nComplaint description: ${description}\n\nClassify this university campus issue into exactly one category and one priority level, and give a concise 1-sentence reason (under 180 characters).`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'You are a university facilities triage dispatcher. Categorise campus maintenance/safety reports strictly into one of: Electrical, Water, Internet, Cleanliness, Safety, Food. Assign priority strictly as High (immediate safety hazard, total outage, flooding, fire, severe food contamination), Medium (significant disruption affecting classes/hostel comfort), or Low (minor/cosmetic or single-fixture inconvenience).',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                enum: [...CATEGORIES],
                description: 'Best matching campus facility category.',
              },
              priority: {
                type: Type.STRING,
                enum: [...PRIORITIES],
                description: 'Urgency priority level.',
              },
              reason: {
                type: Type.STRING,
                description: 'Concise 1-sentence rationale under 180 characters.',
              },
            },
            required: ['category', 'priority', 'reason'],
          },
        },
      });

      const raw = (response.text ?? '').trim();
      const parsed = JSON.parse(raw) as Partial<TriageResult>;

      const category = CATEGORIES.includes(parsed.category as Category)
        ? (parsed.category as Category)
        : fallbackTriage(location, description).category;

      const priority = PRIORITIES.includes(parsed.priority as Priority)
        ? (parsed.priority as Priority)
        : fallbackTriage(location, description).priority;

      const reason =
        typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
          ? parsed.reason.trim().slice(0, 280)
          : `Classified under ${category} with ${priority} priority.`;

      res.json({
        category,
        priority,
        reason,
        source: 'gemini',
      } satisfies TriageResult);
    } catch (err) {
      console.error('Gemini triage fallback triggered:', err instanceof Error ? err.message : String(err));
      res.json(fallbackTriage(location, description));
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusFix server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CampusFix server:', err);
  process.exit(1);
});

import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { studentName, pages, questions, answerKeyData, answerKeyType } = req.body;

  if (!pages || !questions || !answerKeyData) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    const contentParts: Anthropic.MessageParam['content'] = [];

    // System instructions as first user message
    contentParts.push({
      type: 'text',
      text: `Je bent een betrouwbare nakijkassistent. Zekerheid en betrouwbaarheid zijn het belangrijkst.

Als je niet zeker bent: gebruik confidence 'twijfel' of 'kan_niet_beoordelen'. Liever te voorzichtig dan te zelfverzekerd.

Gebruik 'kan_niet_beoordelen' bij:
- Onleesbaar handschrift
- Tekeningen of afbeeldingen als antwoord
- Wiskundige notatie die complex is
- Antwoordvolgorde klopt niet met correctiemodel
- Complex correctiemodel waarbij je niet zeker weet hoe punten toe te kennen

Gebruik 'twijfel' bij:
- Gedeeltelijk correct antwoord waarbij je niet zeker bent hoeveel punten
- Antwoord dat misschien correct is maar je twijfelt

Gebruik 'zeker' alleen als je volledig zeker bent.
Bij meerkeuzevragen: altijd 'zeker', geen uitleg nodig.

Je nakijkt de toets van leerling: ${studentName}`,
    });

    // Add answer key
    contentParts.push({
      type: 'text',
      text: 'Dit is het correctiemodel (antwoordsleutel):',
    });

    if (answerKeyType === 'application/pdf') {
      const base64 = answerKeyData.includes(',') ? answerKeyData.split(',')[1] : answerKeyData;
      contentParts.push({
        type: 'document' as any,
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      } as any);
    } else {
      const base64 = answerKeyData.includes(',') ? answerKeyData.split(',')[1] : answerKeyData;
      contentParts.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: (answerKeyType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64,
        },
      });
    }

    // Add student pages
    contentParts.push({
      type: 'text',
      text: `Dit zijn de toetspagina's van de leerling (${pages.length} pagina${pages.length > 1 ? "'s" : ''}):`,
    });

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      contentParts.push({
        type: 'text',
        text: `Pagina ${i + 1}:`,
      });

      if (page.mediaType === 'application/pdf') {
        const base64 = page.dataUrl.includes(',') ? page.dataUrl.split(',')[1] : page.dataUrl;
        contentParts.push({
          type: 'document' as any,
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        } as any);
      } else {
        const base64 = page.dataUrl.includes(',') ? page.dataUrl.split(',')[1] : page.dataUrl;
        contentParts.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: (page.mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64,
          },
        });
      }
    }

    // Questions to grade
    const questionsText = questions.map((q: any) => 
      `- Vraag ${q.question_number}: "${q.question_text}" (max ${q.max_points} punt${q.max_points !== 1 ? 'en' : ''}${q.is_multiple_choice ? ', MEERKEUZE' : ''})`
    ).join('\n');

    contentParts.push({
      type: 'text',
      text: `Kijk de volgende vragen na:
${questionsText}

Geef een JSON-array terug (ALLEEN de JSON, geen andere tekst):
[
  {
    "question_number": "1",
    "points_awarded": 2,
    "max_points": 2,
    "confidence": "zeker",
    "explanation": ""
  }
]

Regels:
- points_awarded: het aantal behaalde punten (0 tot max_points)
- confidence: "zeker", "twijfel", of "kan_niet_beoordelen"
- explanation: uitleg bij twijfel of kan_niet_beoordelen, leeg bij zeker of meerkeuze
- Bij kan_niet_beoordelen: points_awarded = 0 (docent beoordeelt zelf)
- Neem ALLE vragen mee uit de lijst`,
    });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: contentParts,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON in grade response:', text);
      return res.status(500).json({ error: 'Kon geen beoordelingsresultaten parsen', raw: text });
    }

    const grades = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ grades });
  } catch (error: any) {
    console.error('Grade error:', error);
    return res.status(500).json({ error: error.message || 'Er ging iets mis bij het nakijken' });
  }
}

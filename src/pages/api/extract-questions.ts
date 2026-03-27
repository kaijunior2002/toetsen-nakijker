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

  const { examData, examType, answerKeyData, answerKeyType } = req.body;

  if (!examData || !answerKeyData) {
    return res.status(400).json({ error: 'Missing file data' });
  }

  try {
    const buildImageContent = (dataUrl: string, mediaType: string) => {
      // strip data URL prefix
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64,
        },
      };
    };

    const contentParts: Anthropic.MessageParam['content'] = [];

    contentParts.push({
      type: 'text',
      text: 'Dit is de toets (het leerlingblad):',
    });

    if (examType === 'application/pdf') {
      const base64 = examData.includes(',') ? examData.split(',')[1] : examData;
      contentParts.push({
        type: 'document' as any,
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      } as any);
    } else {
      contentParts.push(buildImageContent(examData, examType));
    }

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
      contentParts.push(buildImageContent(answerKeyData, answerKeyType));
    }

    contentParts.push({
      type: 'text',
      text: `Analyseer de toets en het correctiemodel. Extraheer alle vragen.

Geef een JSON-array terug (ALLEEN de JSON, geen andere tekst) in dit formaat:
[
  {
    "question_number": "1",
    "question_text": "Wat is de hoofdstad van Nederland?",
    "max_points": 2,
    "is_multiple_choice": false
  }
]

Regels:
- Gebruik de vraagnummers exact zoals ze in de toets staan
- max_points: het maximale aantal punten voor die vraag
- is_multiple_choice: true als het een meerkeuzevraag is
- Neem ALLE vragen mee, inclusief deelvragen (1a, 1b, etc.)
- Als punten niet duidelijk zijn, gebruik dan 1`,
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
    
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
      return res.status(500).json({ error: 'Kon geen vragen extraheren uit de toets', raw: text });
    }

    const questions = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ questions });
  } catch (error: any) {
    console.error('Extract questions error:', error);
    return res.status(500).json({ error: error.message || 'Er ging iets mis' });
  }
}

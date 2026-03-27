import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
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

  const { imageData, mediaType } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  try {
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Zoek op deze toetspagina de naam van de leerling. Kijk op typische plekken: bovenaan de pagina, bij "Naam:", "Name:", of een naamveld.

Geef ALLEEN de naam terug als platte tekst. Als er geen naam te vinden is, geef dan exact terug: null

Geen uitleg, alleen de naam of null.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    
    if (text === 'null' || text === '' || text.toLowerCase() === 'null') {
      return res.status(200).json({ name: null });
    }

    // Clean up the name
    const name = text.replace(/^["']|["']$/g, '').trim();
    return res.status(200).json({ name: name || null });
  } catch (error: any) {
    console.error('Detect name error:', error);
    return res.status(500).json({ error: error.message || 'Er ging iets mis', name: null });
  }
}

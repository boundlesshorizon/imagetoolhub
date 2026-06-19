/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase request-body limits for handling higher resolution image uploads safely
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Shared lazy-loaded Gemini client setup
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the secrets panel. Please click settings/secrets to add it.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// AI Endpoint: Auto-Segment Foreground Outline
app.post('/api/ai/segment', async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, errorMessage: 'No base64 image data found in request.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        errorMessage: 'Gemini API Key is not configured. Please add GEMINI_API_KEY in Settings > Secrets to unlock the AI background cutout features.'
      });
    }

    const ai = getGeminiClient();

    // Prepare content parts: inline base64 image + analytical polygon-mapping prompt
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/png',
        data: cleanBase64,
      },
    };

    const promptText = `Find the primary prominent foreground object or subject in this image. Locate its exact boundary points (vertices) forming a closed polygon contour tightly wrapping this subject. 
Return a JSON array of sequential X and Y coordinates (between 0.0 and 1.0 representing horizontal and vertical percentages across the image plane) going clockwise or counter-clockwise around the perimeter.
Keep the points strictly on the outer edge boundary to create a perfect cutout mask. Return between 25 and 45 points in the polygon for smooth canvas rendering. No points should lie inside the central fill of the subject.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        imagePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjectName: {
              type: Type.STRING,
              description: 'The categorical name of the detected foreground subject (e.g., dog, woman, mug).'
            },
            polygon: {
              type: Type.ARRAY,
              description: 'A closed sequence of vertices drawing the outermost boundary of the subject.',
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER, description: 'Horizontal component between 0.0 (left edge) and 1.0 (right edge)' },
                  y: { type: Type.NUMBER, description: 'Vertical component between 0.0 (top edge) and 1.0 (bottom edge)' }
                },
                required: ['x', 'y']
              }
            }
          },
          required: ['subjectName', 'polygon']
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('Received empty response from visual model');
    }

    const result = JSON.parse(outputText);
    return res.json({
      success: true,
      subjectName: result.subjectName || 'subject',
      polygon: result.polygon || []
    });

  } catch (error: any) {
    console.error('AI segmentation route error:', error);
    return res.status(500).json({
      success: false,
      errorMessage: error.message || 'An unexpected error occurred during AI outline tracing.'
    });
  }
});

// Configure full-stack bundling & server execution routes
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In development mode, mount Vite dev server as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Successfully mounted Vite dev middlewares.');
  } else {
    // In production mode, serve built production assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Image Tools Hub application running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failure initializing production/development Express server instance:', err);
});

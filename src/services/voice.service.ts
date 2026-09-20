import Groq from 'groq-sdk';
import fs from 'fs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Transcribes an audio file using the Groq Whisper API (STT).
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  const fileStream = fs.createReadStream(filePath);

  const transcription = await groq.audio.transcriptions.create({
    file: fileStream,
    model: 'whisper-large-v3',
    response_format: 'json',
    language: 'en',
  });

  return transcription.text;
}

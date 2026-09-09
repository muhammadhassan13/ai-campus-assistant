import Groq from 'groq-sdk';
import fs from 'fs';
import gTTS from 'gtts';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Transcribes audio file at filePath using Groq Whisper API (STT)
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

/**
 * Synthesizes text into an MP3 file using gTTS (Item 4 - TTS)
 */
export async function textToSpeech(
  text: string,
  outputFilePath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const gtts = new gTTS(text, 'en');
    gtts.save(outputFilePath, (err: Error | null) => {
      if (err) return reject(err);
      resolve(outputFilePath);
    });
  });
}

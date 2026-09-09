import Groq from 'groq-sdk';
import fs from 'fs';
import gTTS from 'gtts';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Strips raw Markdown syntax and RAG citation brackets
 * so the TTS engine speaks clear, natural sentences.
 */
function cleanTextForSpeech(text: string): string {
  return (
    text
      // 1. Remove RAG source citation brackets like 【Source: ...】
      .replace(/【[^】]*】/g, '')
      // 2. Remove standard bracket citations like [Source: ...]
      .replace(/\[Source:.*?\]/gi, '')
      // 3. Remove Markdown headings (###, ##, #)
      .replace(/#+\s?/g, '')
      // 4. Remove bold/italic asterisks and underscores (**word**, *word*)
      .replace(/[*_]{1,3}/g, '')
      // 5. Remove code backticks
      .replace(/`{1,3}/g, '')
      // 6. Clean up extra whitespace and newlines
      .replace(/\s+/g, ' ')
      .trim()
  );
}

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
    // Clean text before generating audio
    const spokenText = cleanTextForSpeech(text);

    const gtts = new gTTS(spokenText, 'en');
    gtts.save(outputFilePath, (err: Error | null) => {
      if (err) return reject(err);
      resolve(outputFilePath);
    });
  });
}

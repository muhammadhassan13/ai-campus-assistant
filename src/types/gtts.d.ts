declare module 'gtts' {
  class gTTS {
    constructor(text: string, lang?: string, debug?: boolean);
    save(
      filePath: string,
      callback: (err: Error | null, result: string) => void
    ): void;
  }
  export default gTTS;
}

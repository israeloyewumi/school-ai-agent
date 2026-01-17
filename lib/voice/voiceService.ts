// lib/voice/voiceService.ts - Voice Input/Output Service

/**
 * Voice Service for Speech-to-Text and Text-to-Speech
 * Uses Web Speech API (built into modern browsers)
 */

export class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private onResultCallback: ((text: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Stop after one result
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US'; // Can be changed to support multiple languages
        this.recognition.maxAlternatives = 1;

        // Event handlers
        this.recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('🎤 Voice recognized:', transcript);
          if (this.onResultCallback) {
            this.onResultCallback(transcript);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error);
          this.isListening = false;
          if (this.onErrorCallback) {
            this.onErrorCallback(event.error);
          }
        };

        this.recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          this.isListening = false;
          if (this.onEndCallback) {
            this.onEndCallback();
          }
        };
      }

      // Initialize Speech Synthesis
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Check if voice input is supported
   */
  isVoiceInputSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Check if voice output is supported
   */
  isVoiceOutputSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Start listening for voice input
   */
  startListening(
    onResult: (text: string) => void,
    onEnd?: () => void,
    onError?: (error: string) => void
  ): void {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      if (onError) onError('Speech recognition not supported in this browser');
      return;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    this.onResultCallback = onResult;
    this.onEndCallback = onEnd || null;
    this.onErrorCallback = onError || null;

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('🎤 Started listening...');
    } catch (error: any) {
      console.error('Error starting recognition:', error);
      if (onError) onError(error.message);
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Stopped listening');
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Speak text (Text-to-Speech)
   */
  speak(text: string, options?: {
    rate?: number; // 0.1 to 10 (default 1)
    pitch?: number; // 0 to 2 (default 1)
    volume?: number; // 0 to 1 (default 1)
    onEnd?: () => void;
  }): void {
    if (!this.synthesis) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    utterance.lang = 'en-US';

    if (options?.onEnd) {
      utterance.onend = options.onEnd;
    }

    utterance.onerror = (event) => {
      // Suppress harmless browser errors (common in Chrome/Edge)
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('Speech synthesis error:', event);
      }
    };

    console.log('🔊 Speaking:', text.substring(0, 50) + '...');
    this.synthesis.speak(utterance);
  }

  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      console.log('🔊 Stopped speaking');
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  /**
   * Get available voices
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Set voice language
   */
  setLanguage(lang: string): void {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
}

// Export singleton instance
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService();
  }
  return voiceServiceInstance;
}
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type Voice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoiceSwapResult {
  transcript: string;
  audioBase64: string;
}

export async function analyzeVoiceStyle(audioBlob: Blob): Promise<Voice> {
  try {
    const audioBase64 = await blobToBase64(audioBlob);

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audioBlob.type,
                data: audioBase64,
              },
            },
            {
              text: "Analyze the voice in this audio. Classify it into one of these 5 personas based on tone and pitch: 'Puck' (Playful/Energetic), 'Charon' (Deep/Resonant), 'Kore' (Calm/Soothing), 'Fenrir' (Intense/Powerful), 'Zephyr' (Smooth/Balanced). Return ONLY the name of the persona.",
            },
          ],
        },
      ],
    });

    const text = response.text?.trim();
    const validVoices: Voice[] = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    
    // Find the matching voice or default to Zephyr
    const matchedVoice = validVoices.find(v => text?.includes(v)) || 'Zephyr';
    return matchedVoice;
  } catch (error) {
    console.error("Error analyzing voice:", error);
    return 'Zephyr'; // Default fallback
  }
}

export async function swapVoice(audioBlob: Blob, targetVoice: Voice): Promise<VoiceSwapResult> {
  try {
    // 1. Convert Blob to Base64
    const audioBase64 = await blobToBase64(audioBlob);

    // 2. Transcribe Audio (STT)
    const transcriptResponse = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audioBlob.type,
                data: audioBase64,
              },
            },
            {
              text: "Transcribe the audio exactly as spoken. Do not add any commentary or extra text.",
            },
          ],
        },
      ],
    });

    const transcript = transcriptResponse.text?.trim() || "";
    console.log("Transcript:", transcript);

    if (!transcript) {
      throw new Error("Failed to transcribe audio. The audio might be empty or unclear.");
    }

    // 3. Generate Audio (TTS) with target voice
    // Using gemini-2.5-flash as it is often more stable for general multimodal generation
    let ttsResponse;
    const ttsConfig = {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: targetVoice,
          },
        },
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    };

    const ttsContents = [
      {
        role: "user",
        parts: [{ text: `Please read the following text aloud clearly: "${transcript}"` }],
      },
    ];

    try {
      // Try gemini-2.5-flash first (general model)
      ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: ttsContents,
        config: ttsConfig,
      });
    } catch (ttsError) {
      console.warn("gemini-2.5-flash failed, retrying with gemini-2.5-flash-preview-tts", ttsError);
      try {
        // Fallback to specialized TTS model
        ttsResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: ttsContents,
          config: ttsConfig,
        });
      } catch (fallbackError) {
        console.error("Fallback model also failed:", fallbackError);
        throw fallbackError;
      }
    }

    const candidate = ttsResponse.candidates?.[0];
    const generatedAudioBase64 = candidate?.content?.parts?.[0]?.inlineData?.data;

    if (!generatedAudioBase64) {
      const finishReason = candidate?.finishReason;
      const textPart = candidate?.content?.parts?.[0]?.text;
      console.error("TTS Failure Details:", { finishReason, textPart, transcript });
      throw new Error(`Failed to generate audio. Reason: ${finishReason || 'Unknown'}. ${textPart ? 'Model message: ' + textPart : ''}`);
    }

    // Check if the audio is already WAV (starts with "RIFF" -> Base64 "UklGR")
    // If not, assume raw PCM (24kHz, 1 channel, 16-bit) and add WAV header
    let finalAudioBase64 = generatedAudioBase64;
    if (!generatedAudioBase64.startsWith('UklGR')) {
      try {
        const pcmData = base64ToUint8Array(generatedAudioBase64);
        const wavData = addWavHeader(pcmData, 24000, 1);
        finalAudioBase64 = uint8ArrayToBase64(wavData);
      } catch (e) {
        console.warn("Failed to wrap PCM in WAV header, returning raw audio:", e);
      }
    }

    return {
      transcript,
      audioBase64: finalAudioBase64,
    };
  } catch (error) {
    console.error("Error in swapVoice:", error);
    throw error;
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function addWavHeader(pcmData: Uint8Array, sampleRate: number, numChannels: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  const wavBuffer = new Uint8Array(header.byteLength + pcmData.length);
  wavBuffer.set(new Uint8Array(header), 0);
  wavBuffer.set(pcmData, header.byteLength);

  return wavBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert blob to base64."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

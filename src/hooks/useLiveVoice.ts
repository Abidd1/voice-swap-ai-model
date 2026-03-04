import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { float32ToInt16, downsampleBuffer, base64ToFloat32, arrayBufferToBase64 } from '../utils/audioUtils';
import { Voice } from '../components/VoiceSelector';

const MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

export function useLiveVoice(apiKey: string | undefined, selectedVoice: Voice | 'Custom') {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);

  const disconnect = useCallback(async () => {
    setIsConnected(false);
    setIsConnecting(false);

    if (sessionRef.current) {
      // session.close() might not be exposed directly depending on SDK version, 
      // but we can stop sending.
      // The SDK usually handles cleanup on disconnect if available.
      sessionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const connect = useCallback(async (deviceId?: string) => {
    if (!apiKey) {
      setError("API Key is missing");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // 1. Setup Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Try to request 24kHz to match output, but browser might ignore
      });
      audioContextRef.current = audioContext;
      nextStartTimeRef.current = audioContext.currentTime;

      // 2. Setup Gemini Client
      const ai = new GoogleGenAI({ apiKey });
      
      // Determine voice config
      // Note: 'Custom' isn't supported in prebuiltVoiceConfig directly yet for Live API 
      // in the same way as standard TTS unless mapped. 
      // For now, if 'Custom', we'll fallback to 'Puck' or handle it if we had a mapping.
      // The prompt says "selected persona applied".
      const voiceName = selectedVoice === 'Custom' ? 'Puck' : selectedVoice;

      const config = {
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
          systemInstruction: {
            parts: [{
              text: "You are a voice mirror. You must repeat exactly what the user says. Do not reply. Do not add any extra words. Just repeat the user's speech immediately."
            }]
          }
        },
      };

      // 3. Connect Session
      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Live session connected");
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: (message: any) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }
          },
          onclose: () => {
            console.log("Live session closed");
            disconnect();
          },
          onerror: (err: any) => {
            console.error("Live session error:", err);
            setError("Connection error");
            disconnect();
          }
        }
      });

      const session = await sessionPromise;
      sessionRef.current = session;

      // 4. Setup Microphone Input
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          channelCount: 1,
          sampleRate: 16000, // Try to request 16kHz
          echoCancellation: true,
          noiseSuppression: true,
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessor for capture (AudioWorklet is better but requires separate file/module loading complexity)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Resample to 16kHz if needed
        const currentSampleRate = audioContext.sampleRate;
        const targetSampleRate = 16000;
        
        let pcmData: Int16Array;
        
        if (currentSampleRate !== targetSampleRate) {
          const downsampled = downsampleBuffer(inputData, currentSampleRate, targetSampleRate);
          pcmData = float32ToInt16(downsampled);
        } else {
          pcmData = float32ToInt16(inputData);
        }

        const base64Data = arrayBufferToBase64(pcmData.buffer);
        
        // Send to Gemini
        session.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Data
          }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination); // ScriptProcessor needs to be connected to destination to work

    } catch (err) {
      console.error("Failed to start live session:", err);
      setError("Failed to access microphone or connect.");
      disconnect();
    }
  }, [apiKey, selectedVoice, disconnect]);

  const playAudioChunk = (base64Audio: string) => {
    if (!audioContextRef.current) return;
    
    try {
      // Gemini Live output is usually PCM 24kHz
      const float32Data = base64ToFloat32(base64Audio);
      const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      // Schedule playback
      // Ensure we don't schedule in the past
      const currentTime = audioContextRef.current.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      // Advance time for next chunk
      nextStartTimeRef.current += buffer.duration;
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  };

  return {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error
  };
}

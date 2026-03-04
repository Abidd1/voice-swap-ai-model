import React, { useState, useEffect } from 'react';
import { Mic, Square, Radio, AlertCircle, Headphones, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useLiveVoice } from '../hooks/useLiveVoice';
import { Voice } from './VoiceSelector';

interface LiveVoicePreviewProps {
  selectedVoice: Voice | 'Custom';
}

export function LiveVoicePreview({ selectedVoice }: LiveVoicePreviewProps) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const { connect, disconnect, isConnected, isConnecting, error } = useLiveVoice(
    process.env.GEMINI_API_KEY,
    selectedVoice
  );

  useEffect(() => {
    const getDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList.filter(d => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0 && !deviceId) {
           const defaultDevice = audioInputs.find(d => d.deviceId === 'default');
           setDeviceId(defaultDevice ? defaultDevice.deviceId : audioInputs[0].deviceId);
        }
      } catch (e) {
        console.error(e);
      }
    };
    getDevices();
  }, []);

  const toggleLive = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect(deviceId);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) disconnect();
    };
  }, [disconnect]);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl border border-slate-700 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Radio size={120} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isConnected ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
              <Radio size={24} className={isConnected ? "animate-pulse" : ""} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Live Voice Preview</h3>
              <p className="text-slate-400 text-sm">Real-time voice changer</p>
            </div>
          </div>
          
          {isConnected && (
            <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-start gap-3 text-sm text-slate-300">
              <Headphones className="w-5 h-5 shrink-0 text-indigo-400" />
              <p>
                <span className="font-semibold text-white">Headphones Required:</span> To prevent echo and feedback loops, please use headphones while using the live preview.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={isConnected || isConnecting}
              className="bg-slate-900/50 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 disabled:opacity-50"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>

            <button
              onClick={toggleLive}
              disabled={isConnecting}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
                isConnected
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin" /> Connecting...
                </>
              ) : isConnected ? (
                <>
                  <Square fill="currentColor" size={20} /> Stop Live Preview
                </>
              ) : (
                <>
                  <Mic size={24} /> Start Live Preview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        let deviceList = await navigator.mediaDevices.enumerateDevices();
        let audioInputs = deviceList.filter(device => device.kind === 'audioinput');
        
        // If we have devices but no labels, we need to ask for permission to show user-friendly names
        if (audioInputs.length > 0 && !audioInputs[0].label) {
          try {
            // Request permission briefly to populate labels
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            // Re-fetch devices now that we have permission
            deviceList = await navigator.mediaDevices.enumerateDevices();
            audioInputs = deviceList.filter(device => device.kind === 'audioinput');
          } catch (permErr) {
            console.warn("Microphone permission denied or dismissed", permErr);
          }
        }

        setDevices(audioInputs);
        
        // Smart selection logic
        setSelectedDeviceId(prevId => {
          // If we already have a valid selection, keep it
          if (prevId && audioInputs.some(d => d.deviceId === prevId)) {
            return prevId;
          }
          
          // Otherwise prefer 'default', or fall back to the first available device
          const defaultDevice = audioInputs.find(d => d.deviceId === 'default');
          return defaultDevice ? defaultDevice.deviceId : (audioInputs[0]?.deviceId || '');
        });

      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };

    getDevices();
    
    // Listen for device changes (e.g. plugging in a mic)
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  const startRecording = async () => {
    try {
      const constraints = { 
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
      {/* Device Selector */}
      <div className="w-full relative">
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          disabled={isRecording}
          className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
            </option>
          ))}
          {devices.length === 0 && <option value="">Default Microphone</option>}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
          <ChevronDown size={16} />
        </div>
      </div>

      <div className="relative">
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-red-100 rounded-full -z-10"
          />
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-20 h-20 flex items-center justify-center rounded-full transition-colors shadow-lg ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
          }`}
        >
          {isRecording ? <Square size={28} fill="currentColor" /> : <Mic size={32} />}
        </button>
      </div>
      
      <div className="text-center space-y-1">
        <div className="text-base font-semibold text-slate-900">
          {isRecording ? 'Recording...' : audioBlob ? 'Recording Complete' : 'Tap to Record'}
        </div>
        {isRecording && (
          <div className="text-xs text-slate-500 animate-pulse">
            Using {devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Default Microphone'}
          </div>
        )}
      </div>

      {audioUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-100"
        >
          <audio src={audioUrl} controls className="flex-1 h-8" />
          <button
            onClick={resetRecording}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            title="Record Again"
          >
            <RotateCcw size={20} />
          </button>
        </motion.div>
      )}
    </div>
  );
}

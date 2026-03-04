import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioRecorder } from './components/AudioRecorder';
import { VoiceSelector, Voice } from './components/VoiceSelector';
import { FileUpload } from './components/FileUpload';
import { LiveVoicePreview } from './components/LiveVoicePreview';
import { swapVoice, analyzeVoiceStyle, VoiceSwapResult } from './services/gemini';
import { Loader2, Play, Volume2, AlertCircle, Wand2, Gauge } from 'lucide-react';

export default function App() {
  const [selectedVoice, setSelectedVoice] = useState<Voice | 'Custom'>('Puck');
  const [customVoiceFile, setCustomVoiceFile] = useState<File | null>(null);
  const [sourceMode, setSourceMode] = useState<'record' | 'upload' | 'live'>('record');
  const [uploadedSourceFile, setUploadedSourceFile] = useState<File | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [result, setResult] = useState<VoiceSwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const generatedAudioRef = useRef<HTMLAudioElement>(null);

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setOriginalAudioUrl(URL.createObjectURL(blob));

    try {
      let targetVoiceId: Voice = 'Puck';

      if (selectedVoice === 'Custom' && customVoiceFile) {
        setProcessingStep('Analyzing target voice style...');
        targetVoiceId = await analyzeVoiceStyle(customVoiceFile);
        console.log("Analyzed voice style matched to:", targetVoiceId);
      } else if (selectedVoice !== 'Custom') {
        targetVoiceId = selectedVoice;
      }

      setProcessingStep(`Generating audio with ${targetVoiceId} persona...`);
      const data = await swapVoice(blob, targetVoiceId);
      setResult(data);
    } catch (err) {
      console.error("Processing error:", err);
      setError("Failed to process audio. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleRecordingComplete = (blob: Blob) => {
    processAudio(blob);
  };

  const handleSourceUpload = async (file: File) => {
    setUploadedSourceFile(file);
    // Auto-process on upload? Or wait for button? Let's add a button for uploaded files.
  };

  const handleProcessUploadedSource = () => {
    if (uploadedSourceFile) {
      processAudio(uploadedSourceFile);
    }
  };

  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (generatedAudioRef.current) {
      generatedAudioRef.current.playbackRate = rate;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              VS
            </div>
            <h1 className="text-xl font-bold tracking-tight">VoiceSwap AI</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Powered by Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Transform Your Voice
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload or record your voice and swap it with our AI personas.
            Upload a reference voice to automatically match the closest style.
          </p>
        </div>

        {/* Voice Selection */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">1</span>
            Select Target Voice
          </div>
          <VoiceSelector 
            selectedVoice={selectedVoice} 
            onSelect={setSelectedVoice} 
            onCustomFileSelect={setCustomVoiceFile}
          />
        </section>

        {/* Source Input Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">2</span>
              Input Source Audio
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setSourceMode('record')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  sourceMode === 'record' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Record
              </button>
              <button
                onClick={() => setSourceMode('upload')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  sourceMode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setSourceMode('live')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  sourceMode === 'live' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Live Preview
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[200px]">
            {sourceMode === 'record' && (
              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            )}
            
            {sourceMode === 'upload' && (
              <div className="w-full max-w-md space-y-6 text-center">
                <FileUpload 
                  label="Upload Source Audio" 
                  onFileSelect={handleSourceUpload} 
                />
                {uploadedSourceFile && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleProcessUploadedSource}
                    disabled={isProcessing}
                    className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Wand2 size={20} />}
                    Swap Voice
                  </motion.button>
                )}
              </div>
            )}

            {sourceMode === 'live' && (
              <div className="w-full max-w-md">
                <LiveVoicePreview selectedVoice={selectedVoice} />
              </div>
            )}
          </div>
        </section>

        {/* Result Section (Only show if not in live mode) */}
        {sourceMode !== 'live' && (
          <AnimatePresence mode="wait">
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center space-y-4"
              >
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Processing Audio...</h3>
                  <p className="text-slate-500">{processingStep || 'Transcribing and generating new voice.'}</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-50 rounded-2xl border border-red-100 p-6 flex items-start gap-4 text-red-700"
              >
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold">Error</h3>
                  <p>{error}</p>
                </div>
              </motion.div>
            )}

            {result && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-indigo-50 rounded-2xl border border-indigo-100 p-8 space-y-6"
              >
                <div className="flex items-center gap-3 text-indigo-900">
                  <div className="p-2 bg-indigo-200 rounded-lg">
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold">Result Ready!</h3>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
                  <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Original Audio</p>
                  {originalAudioUrl && (
                    <audio
                      controls
                      src={originalAudioUrl}
                      className="w-full h-10"
                    />
                  )}
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
                  <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Transcript</p>
                  <p className="text-slate-800 leading-relaxed">"{result.transcript}"</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                      Generated Voice 
                      {selectedVoice === 'Custom' ? ' (Matched Style)' : ` (${selectedVoice})`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Gauge size={14} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">{playbackRate}x Speed</span>
                    </div>
                  </div>
                  
                  <audio
                    ref={generatedAudioRef}
                    controls
                    src={`data:audio/wav;base64,${result.audioBase64}`}
                    className="w-full h-10 mb-3"
                  />

                  <div className="flex items-center gap-3 px-1">
                    <span className="text-xs font-medium text-slate-400">0.5x</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={playbackRate}
                      onChange={handlePlaybackRateChange}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-xs font-medium text-slate-400">2.0x</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

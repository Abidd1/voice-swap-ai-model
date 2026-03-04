import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic2, User, Sparkles, Zap, Ghost, Upload, Music, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { analyzeVoiceStyle } from '../services/gemini';

export type Voice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

interface VoiceOption {
  id: Voice;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

const VOICES: VoiceOption[] = [
  {
    id: 'Puck',
    name: 'Puck',
    description: 'Playful & Energetic',
    icon: <Sparkles size={24} />,
    color: 'text-yellow-700 border-yellow-200',
    gradient: 'from-yellow-50 to-orange-50',
  },
  {
    id: 'Charon',
    name: 'Charon',
    description: 'Deep & Resonant',
    icon: <Ghost size={24} />,
    color: 'text-slate-700 border-slate-200',
    gradient: 'from-slate-50 to-gray-50',
  },
  {
    id: 'Kore',
    name: 'Kore',
    description: 'Calm & Soothing',
    icon: <User size={24} />,
    color: 'text-emerald-700 border-emerald-200',
    gradient: 'from-emerald-50 to-teal-50',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    description: 'Intense & Powerful',
    icon: <Zap size={24} />,
    color: 'text-red-700 border-red-200',
    gradient: 'from-red-50 to-rose-50',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    description: 'Smooth & Balanced',
    icon: <Mic2 size={24} />,
    color: 'text-blue-700 border-blue-200',
    gradient: 'from-blue-50 to-indigo-50',
  },
];

interface VoiceSelectorProps {
  selectedVoice: Voice | 'Custom';
  onSelect: (voice: Voice | 'Custom') => void;
  onCustomFileSelect?: (file: File) => void;
}

export function VoiceSelector({ selectedVoice, onSelect, onCustomFileSelect }: VoiceSelectorProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedVoice, setMatchedVoice] = useState<Voice | null>(null);

  const handleCustomFile = async (file: File) => {
    onSelect('Custom');
    onCustomFileSelect?.(file);
    
    setIsAnalyzing(true);
    setMatchedVoice(null);
    try {
      const voice = await analyzeVoiceStyle(file);
      setMatchedVoice(voice);
    } catch (error) {
      console.error("Failed to analyze voice:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('library')}
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 relative ${
            activeTab === 'library'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Voice Library
          {activeTab === 'library' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 relative ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Upload Custom Voice
          {activeTab === 'upload' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'library' ? (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl"
          >
            {VOICES.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              return (
                <motion.button
                  key={voice.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(voice.id)}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden group ${
                    isSelected
                      ? `${voice.color} border-current ring-4 ring-offset-2 ring-indigo-500/10 bg-gradient-to-br ${voice.gradient}`
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:shadow-md'
                  }`}
                >
                  {/* Selection Indicator Background */}
                  {isSelected && (
                    <motion.div
                      layoutId="selection-bg"
                      className="absolute inset-0 bg-white/40 mix-blend-overlay"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}

                  <div className="flex items-start justify-between mb-3 relative z-10">
                    <div className={`p-3 rounded-xl transition-colors ${
                      isSelected ? 'bg-white/80 shadow-sm' : 'bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    }`}>
                      {voice.icon}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-indigo-600 bg-white rounded-full p-1 shadow-sm"
                      >
                        <CheckCircle2 size={16} strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                      {voice.name}
                    </h3>
                    <p className={`text-sm ${isSelected ? 'opacity-100 font-medium' : 'opacity-70'}`}>
                      {voice.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[200px] space-y-4 text-center"
          >
            <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-2">
              <Music className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Upload Reference Voice</h3>
            <p className="text-slate-500 max-w-sm">
              Upload an audio sample of the voice you want to mimic. We'll analyze its characteristics and match the closest AI persona.
            </p>
            
            <div className="w-full max-w-md mt-4">
              <FileUpload 
                label="Select Voice Sample" 
                onFileSelect={handleCustomFile}
                accept="audio/*"
              />
            </div>

            {isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-indigo-600 mt-4 bg-indigo-50 px-4 py-2 rounded-full"
              >
                <Loader2 className="animate-spin w-4 h-4" />
                <span className="text-sm font-medium">Analyzing voice style...</span>
              </motion.div>
            )}

            {matchedVoice && !isAnalyzing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl flex items-center gap-4 text-left w-full max-w-md shadow-sm"
              >
                <div className="p-3 bg-white rounded-lg shadow-sm text-indigo-600 border border-indigo-50">
                  <Sparkles size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Matched Persona</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-lg">{matchedVoice}</p>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                      {VOICES.find(v => v.id === matchedVoice)?.description}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Based on tone analysis, this persona is the closest match.
                  </p>
                  <button
                    onClick={() => {
                      onSelect(matchedVoice);
                      setActiveTab('library');
                    }}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group transition-colors"
                  >
                    Use this persona <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

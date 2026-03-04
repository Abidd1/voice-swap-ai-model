import React, { useState, useRef } from 'react';
import { Upload, X, FileAudio, Play, Pause } from 'lucide-react';
import { motion } from 'motion/react';

interface FileUploadProps {
  label: string;
  onFileSelect: (file: File) => void;
  accept?: string;
}

export function FileUpload({ label, onFileSelect, accept = "audio/*" }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
      
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(selectedFile);
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setIsPlaying(false);
    if (inputRef.current) inputRef.current.value = '';
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      
      {!file ? (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50/50"
        >
          <Upload className="w-8 h-8" />
          <span className="font-medium">{label}</span>
          <span className="text-xs opacity-70">MP3, WAV, M4A up to 10MB</span>
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4"
        >
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
            <FileAudio className="w-6 h-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={clearFile}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <audio
            ref={audioRef}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </motion.div>
      )}
    </div>
  );
}

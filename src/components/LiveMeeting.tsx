import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  Square, 
  Loader2, 
  MessageSquare, 
  Activity,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { ai, MeetingOptions, MeetingReport, processMeetingTranscript } from '../services/geminiService';
import { Modality } from "@google/genai";

interface LiveMeetingProps {
  options: MeetingOptions;
  onReportGenerated: (report: MeetingReport) => void;
  initialTitle?: string;
}

export const LiveMeeting: React.FC<LiveMeetingProps> = ({ options, onReportGenerated, initialTitle }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const transcriptRef = useRef<string[]>([]);

  const startLiveMeeting = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      transcriptRef.current = [];
      setTranscript([]);

      // 1. Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 2. Connect to Gemini Live API
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setIsRecording(true);
            setIsConnecting(false);
            startStreaming(stream);
          },
          onmessage: (message: any) => {
            // Handle User Transcription
            if (message.serverContent?.userTurn?.parts?.[0]?.text) {
              const text = message.serverContent.userTurn.parts[0].text;
              transcriptRef.current = [...transcriptRef.current, text];
              setTranscript([...transcriptRef.current]);
            }
          },
          onclose: () => {
            console.log("Live session closed");
            stopRecording();
          },
          onerror: (err) => {
            console.error("Live session error:", err);
            setError("Connection error. Please try again.");
            stopRecording();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, // Enable user transcription
          outputAudioTranscription: {}, // Enable model transcription
          systemInstruction: "You are a silent observer transcribing a hotel meeting. Do not speak unless spoken to. Just transcribe everything accurately."
        }
      });

      sessionRef.current = session;

    } catch (err: any) {
      console.error("Failed to start live meeting:", err);
      setError(err.message || "Failed to access microphone or connect to AI.");
      setIsConnecting(false);
    }
  };

  const startStreaming = (stream: MediaStream) => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (!sessionRef.current) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }

      // Convert to Base64
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
      
      sessionRef.current.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    };
  };

  const stopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsRecording(false);
  };

  const finishMeeting = async () => {
    stopRecording();
    
    if (transcriptRef.current.length === 0) {
      setError("No transcription captured. Please speak into the microphone.");
      return;
    }

    try {
      setIsGenerating(true);
      const fullTranscript = transcriptRef.current.join(' ');
      const report = await processMeetingTranscript(fullTranscript, {
        ...options,
        titleHint: initialTitle
      });
      onReportGenerated(report);
    } catch (err: any) {
      console.error("Failed to generate report from live meeting:", err);
      setError("Failed to generate report. You can try again or use the manual upload option.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${isRecording ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-blue-50 text-bs-primary'}`}>
            {isRecording ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Live Meeting Intelligence</h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Real-time transcription & auto-reporting</p>
          </div>
        </div>

        {!isRecording && !isConnecting && (
          <button 
            onClick={startLiveMeeting}
            className="bg-bs-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            Start Live Meeting
          </button>
        )}

        {isRecording && (
          <button 
            onClick={finishMeeting}
            disabled={isGenerating}
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            {isGenerating ? 'Generating Report...' : 'End & Generate Report'}
          </button>
        )}

        {isConnecting && (
          <div className="flex items-center gap-2 text-bs-primary font-bold text-xs uppercase tracking-widest">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting to AI...
          </div>
        )}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded flex items-center gap-3 text-rose-600 text-sm font-medium"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </motion.div>
      )}

      <div className="min-h-[300px] bg-slate-50 rounded-lg p-6 relative overflow-hidden border border-slate-100">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-bs-success animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {isRecording ? 'Live Transcription Active' : 'Waiting to Start'}
          </span>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {transcript.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-slate-300">
              <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Transcription will appear here...</p>
            </div>
          ) : (
            transcript.map((text, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3"
              >
                <div className="w-1 h-auto bg-blue-200 rounded-full shrink-0" />
                <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
              </motion.div>
            ))
          )}
        </div>

        {isRecording && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div 
                  key={i}
                  animate={{ height: [4, 12, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                  className="w-1 bg-blue-400 rounded-full"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg">
          <div className="bg-blue-50 p-2 rounded">
            <Activity className="w-4 h-4 text-bs-primary" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
            <p className="text-xs font-bold text-slate-900">{isRecording ? 'Recording Live' : 'Idle'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg">
          <div className="bg-green-50 p-2 rounded">
            <CheckCircle2 className="w-4 h-4 text-bs-success" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Auto-Reporting</p>
            <p className="text-xs font-bold text-slate-900">Enabled</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg">
          <div className="bg-purple-50 p-2 rounded">
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Context</p>
            <p className="text-xs font-bold text-slate-900">{options.language} - {options.category}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

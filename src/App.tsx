/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { 
  FileAudio, 
  Send, 
  Trash2, 
  Clipboard, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Hotel,
  Calendar,
  Briefcase,
  AlertTriangle,
  Loader2,
  Upload,
  Music,
  X,
  Settings2,
  Globe,
  MessageSquare,
  Layers,
  LogOut,
  User,
  Search,
  Filter,
  BarChart2,
  Download,
  Share2,
  TrendingUp,
  PieChart as PieChartIcon,
  History,
  Clock,
  Users
} from 'lucide-react';
import { PROPERTIES, processMeetingAudio, MeetingReport, MeetingOptions } from './services/geminiService';
import { PropertyDashboard } from './components/PropertyDashboard';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { MeetingHistory } from './components/MeetingHistory';
import { StaffPerformance } from './components/StaffPerformance';
import { LiveMeeting } from './components/LiveMeeting';
import { GoogleMeetIntegration } from './components/GoogleMeetIntegration';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, query, where, orderBy, doc, getDoc } from 'firebase/firestore';

type ViewState = 'Generator' | 'Dashboard' | 'History' | 'Staff' | string;

export default function App() {
  const [user, setUser] = useState<{ phone: string; role: 'Owner' | 'Manager'; assignedProperty?: string; uid: string } | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('Generator');
  const [generatorMode, setGeneratorMode] = useState<'Upload' | 'Live' | 'GoogleMeet'>('Upload');
  const [meetingTitleHint, setMeetingTitleHint] = useState<string>('');
  const [propertyReports, setPropertyReports] = useState<Record<string, MeetingReport[]>>(() => {
    const initial: Record<string, MeetingReport[]> = {};
    PROPERTIES.forEach(p => initial[p] = []);
    return initial;
  });

  // Auth Persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            setUser({ 
              uid: firebaseUser.uid,
              phone: data.phone, 
              role: data.role, 
              assignedProperty: data.assignedProperty 
            });
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Reports Sync
  useEffect(() => {
    if (!user) return;

    const reportsRef = collection(db, 'reports');
    // Everyone sees all reports for all properties
    const q = query(reportsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newReports: Record<string, MeetingReport[]> = {};
      PROPERTIES.forEach(p => newReports[p] = []);
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as MeetingReport;
        if (newReports[data.property]) {
          newReports[data.property].push(data);
        }
      });
      
      setPropertyReports(newReports);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = (userData: { phone: string; role: 'Owner' | 'Manager'; assignedProperty?: string; uid: string }) => {
    setUser(userData);
    setActiveView('Dashboard');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveView('Generator');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  // Show all properties for Owner, only assigned for Manager
  const accessibleProperties = user?.role === 'Owner' 
    ? PROPERTIES 
    : (user?.assignedProperty ? [user.assignedProperty] : []);

  const [options, setOptions] = useState<MeetingOptions>({
    category: 'Hotel',
    language: 'English'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    const isAudioType = selectedFile.type.startsWith('audio/');
    const commonAudioExtensions = [
      '.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac', '.amr', '.wma', 
      '.mp4', '.m4p', '.mpeg', '.mpg', '.mpga', '.mp2', '.m4r', 
      '.3gp', '.3g2', '.caf', '.aiff', '.aif', '.aifc'
    ];
    const hasAudioExtension = commonAudioExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

    if (isAudioType || hasAudioExtension) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('File is too large. Please upload an audio file smaller than 20MB.');
        setFile(null);
      } else {
        setFile(selectedFile);
        setError(null);
      }
    } else {
      setError('Please select a valid audio file (MP3, WAV, M4A, etc.).');
      setFile(null);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const saveReport = async (result: MeetingReport) => {
    if (!user) return;
    const reportData = {
      ...result,
      authorUid: user.uid,
      createdAt: new Date().toISOString(),
      // Use the AI-detected property, fallback to assigned property or first property
      property: result.property || user.assignedProperty || PROPERTIES[0]
    };
    await addDoc(collection(db, 'reports'), reportData);
  };

  const handleGoogleRecording = async (fileId: string, name: string) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('google_access_token');
      if (!token) throw new Error("Google account not connected.");

      // Fetch file from Google Drive
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to download recording from Google Drive.");

      const blob = await response.blob();
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const base64 = await base64Promise;
      const result = await processMeetingAudio(base64, blob.type, {
        ...options,
        titleHint: name.replace('Meeting Recording - ', '')
      });
      
      await saveReport(result);
      setReport(result);
      setGeneratorMode('Upload'); // Switch back to see the report
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process Google Meet recording.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!file || !user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const base64 = await convertToBase64(file);
      const result = await processMeetingAudio(base64, file.type, options);
      await saveReport(result);
      setReport(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process audio. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setFile(null);
    setReport(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = () => {
    if (!report) return;
    const text = `
SUKOON MEETING AGENT - MINUTES OF MEETING
Sukoon Infracon Limited | Operational Intelligence

Title: ${report.title}
Date: ${report.date}
Property: ${report.property}
Performance Score: ${report.performanceScore}%
Sentiment: ${report.sentiment}

--------------------------------------------------
EXECUTIVE SUMMARY:
${report.meetingSummary}

--------------------------------------------------
KEY DECISIONS:
${report.keyDecisions.map(d => `• ${d}`).join('\n')}

--------------------------------------------------
ACTION ITEMS:
${report.actionItems.map(t => `• [${t.priority}] ${t.task}
  Assigned to: ${t.assignedTo} | Deadline: ${t.deadline} | Status: ${t.status}`).join('\n\n')}

--------------------------------------------------
ISSUES IDENTIFIED:
${report.issuesIdentified.map(i => `• [${i.severity}] [${i.department}] ${i.issue}`).join('\n')}

--------------------------------------------------
GUEST EXPERIENCE INSIGHTS:
${report.guestExperienceInsights.map(i => `• [${i.type}] ${i.detail}`).join('\n')}

--------------------------------------------------
DEPARTMENT-WISE SUMMARY:
• Housekeeping: ${report.departmentWiseSummary.Housekeeping || 'No specific updates.'}
• F&B: ${report.departmentWiseSummary['F&B'] || 'No specific updates.'}
• Maintenance: ${report.departmentWiseSummary.Maintenance || 'No specific updates.'}
• Front Office: ${report.departmentWiseSummary['Front Office'] || 'No specific updates.'}

Generated by Sukoon Meeting Agent
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const renderDashboard = (propertyName: string) => {
    const reports = propertyReports[propertyName] || [];
    return <PropertyDashboard propertyName={propertyName} reports={reports} />;
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-bs-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const allAccessibleReports = Object.entries(propertyReports)
    .filter(([prop]) => accessibleProperties.includes(prop))
    .flatMap(([_, reports]) => reports);

  const handleModeChange = (mode: 'Upload' | 'Live' | 'GoogleMeet') => {
    setGeneratorMode(mode);
    setReport(null);
    setFile(null);
    setError(null);
  };

  return (
    <Layout 
      activeView={activeView} 
      setActiveView={setActiveView} 
      user={user}
      onSignOut={handleSignOut}
      accessibleProperties={accessibleProperties}
      propertyReports={propertyReports}
    >
      <AnimatePresence mode="wait">
        {activeView === 'Generator' && (
          <motion.div
            key="generator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Report Engine</h2>
                <p className="text-slate-500 max-w-2xl">
                  Transform meeting audio, transcripts, or live conversations into structured operational intelligence using Gemini AI.
                </p>
              </div>
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                {(['Upload', 'Live', 'GoogleMeet'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(mode)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      generatorMode === mode 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'GoogleMeet' ? 'Google Meet' : mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Input */}
              <div className="lg:col-span-4 space-y-6">
                <div className="premium-card p-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Language</label>
                      <select 
                        value={options.language}
                        onChange={(e) => setOptions({ ...options, language: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Hinglish">Hinglish</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-lg mb-1">AI Intelligence</h4>
                    <p className="text-indigo-100 text-xs leading-relaxed opacity-80">
                      Our engine automatically extracts tasks, sentiment, and operational risks from your conversations.
                    </p>
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>
              </div>

              {/* Right Column: Main Action Area */}
              <div className="lg:col-span-8">
                {generatorMode === 'Upload' && (
                  <div 
                    className={`premium-card h-[400px] flex flex-col items-center justify-center border-2 border-dashed transition-all cursor-pointer ${
                      file ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="audio/*"
                      className="hidden"
                    />
                    
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${
                      file ? 'bg-indigo-600 text-white scale-110' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {file ? <CheckCircle2 className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
                    </div>

                    {file ? (
                      <div className="text-center">
                        <p className="font-bold text-slate-900 text-lg mb-1">{file.name}</p>
                        <p className="text-slate-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to process</p>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setFile(null); 
                            setReport(null);
                          }}
                          className="mt-4 text-xs font-bold text-red-500 uppercase tracking-widest hover:text-red-600"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <div className="text-center px-8">
                        <p className="font-bold text-slate-900 text-lg mb-2">Drop meeting audio here</p>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto">
                          Support for MP3, WAV, M4A. Max file size 50MB for optimal processing.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {generatorMode === 'Live' && (
                  <LiveMeeting 
                    options={options} 
                    initialTitle={meetingTitleHint}
                    onReportGenerated={(newReport) => {
                      setReport(newReport);
                      setMeetingTitleHint('');
                    }} 
                  />
                )}
                
                {generatorMode === 'GoogleMeet' && (
                  <GoogleMeetIntegration 
                    onSelectMeeting={(meeting) => {
                      setGeneratorMode('Live');
                      setMeetingTitleHint(meeting.summary);
                    }}
                    onRecordingFound={handleGoogleRecording}
                  />
                )}

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Used by 12 managers today</p>
                  </div>

                  <button 
                    onClick={handleProcess}
                    disabled={!file || isLoading}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl ${
                      !file || isLoading 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-95'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-6 h-6" />
                        <span>Generate Intelligence</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Report Display */}
            {report && (
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 pt-8 border-t border-slate-200"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">Sukoon Meeting Agent</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Minutes of Meeting</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{report.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {report.date}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium border-l border-slate-200 pl-3">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          {report.property}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setReport(null);
                        setFile(null);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <FileAudio className="w-4 h-4" />
                      <span>New Analysis</span>
                    </button>
                    <button 
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                    >
                      {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clipboard className="w-4 h-4" />}
                      <span>{copySuccess ? 'Copied' : 'Copy MOM'}</span>
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                      <Download className="w-4 h-4" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Summary Card */}
                  <div className="md:col-span-2 premium-card p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xl font-bold text-slate-900">Meeting Summary</h4>
                      <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {report.property}
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-lg mb-8">
                      {report.meetingSummary}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Key Metrics</h5>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-500">Performance Score</span>
                            <span className="text-sm font-bold text-emerald-600">{report.performanceScore}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${report.performanceScore}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Sentiment</h5>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {report.sentiment === 'Positive' ? '😊' : report.sentiment === 'Negative' ? '😟' : '😐'}
                          </span>
                          <span className={`text-sm font-bold ${
                            report.sentiment === 'Positive' ? 'text-emerald-600' : 
                            report.sentiment === 'Negative' ? 'text-red-600' : 'text-slate-600'
                          }`}>
                            {report.sentiment}
                          </span>
                        </div>
                      </div>
                    </div>

                    {report.keyDecisions.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-slate-100">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Key Decisions</h5>
                        <ul className="space-y-2">
                          {report.keyDecisions.map((decision, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-slate-700 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="space-y-6">
                    <div className="premium-card p-6 border-l-4 border-l-red-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Issues Identified</span>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{report.issuesIdentified.length}</p>
                    </div>
                    <div className="premium-card p-6 border-l-4 border-l-indigo-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Action Items</span>
                        <Briefcase className="w-4 h-4 text-indigo-500" />
                      </div>
                      <p className="text-3xl font-bold text-slate-900">{report.actionItems.length}</p>
                    </div>
                    <div className="premium-card p-6 border-l-4 border-l-amber-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">High Priority</span>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {report.actionItems.filter(t => t.priority === 'High').length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="premium-card p-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Issues Identified
                    </h4>
                    <div className="space-y-4">
                      {report.issuesIdentified.map((issue, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              issue.severity === 'High' ? 'bg-red-100 text-red-600' :
                              issue.severity === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {issue.severity} Severity
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {issue.department}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{issue.issue}</p>
                        </div>
                      ))}
                      {report.issuesIdentified.length === 0 && (
                        <p className="text-slate-400 text-sm italic">No issues identified.</p>
                      )}
                    </div>
                  </div>

                  <div className="premium-card p-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-500" />
                      Action Items
                    </h4>
                    <div className="space-y-3">
                      {report.actionItems.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${item.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                              <span className="text-sm font-bold text-slate-800">{item.task}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              item.priority === 'High' ? 'bg-red-100 text-red-600' :
                              item.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {item.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <User className="w-3 h-3" />
                                {item.assignedTo}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <Clock className="w-3 h-3" />
                                {item.deadline}
                              </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              item.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {report.actionItems.length === 0 && (
                        <p className="text-slate-400 text-sm italic">No action items assigned.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Guest Insights */}
                  <div className="lg:col-span-1 premium-card p-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-500" />
                      Guest Insights
                    </h4>
                    <div className="space-y-4">
                      {report.guestExperienceInsights.map((insight, idx) => (
                        <div key={idx} className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100/30">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-2 inline-block ${
                            insight.type === 'Complaint' ? 'bg-red-100 text-red-600' :
                            insight.type === 'Feedback' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {insight.type}
                          </span>
                          <p className="text-sm text-slate-700 leading-relaxed">{insight.detail}</p>
                        </div>
                      ))}
                      {report.guestExperienceInsights.length === 0 && (
                        <p className="text-slate-400 text-sm italic">No guest insights recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* Department Summaries */}
                  <div className="lg:col-span-2 premium-card p-8">
                    <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      Department-wise Summary
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(report.departmentWiseSummary).map(([dept, summary]) => (
                        <div key={dept} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{dept}</h5>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {summary || 'No specific updates discussed.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeView === 'Dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {user.role === 'Owner' ? (
              <PortfolioDashboard reports={allAccessibleReports} properties={PROPERTIES} />
            ) : (
              <PropertyDashboard 
                propertyName={user.assignedProperty || PROPERTIES[0]} 
                reports={propertyReports[user.assignedProperty || PROPERTIES[0]] || []} 
              />
            )}
          </motion.div>
        )}

        {activeView === 'History' && (
          <motion.div
            key="history"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MeetingHistory 
              reports={allAccessibleReports} 
              onSelectReport={(r) => {
                setReport(r);
                setActiveView('Generator');
              }}
            />
          </motion.div>
        )}

        {activeView === 'Staff' && (
          <motion.div
            key="staff"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StaffPerformance reports={allAccessibleReports} />
          </motion.div>
        )}

        {accessibleProperties.includes(activeView) && (
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderDashboard(activeView)}
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

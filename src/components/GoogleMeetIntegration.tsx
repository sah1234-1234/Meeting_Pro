import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Video, 
  Calendar, 
  RefreshCw, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  FileVideo
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface GoogleMeeting {
  id: string;
  summary: string;
  startTime: string;
  endTime: string;
  meetLink?: string;
  status: 'upcoming' | 'ongoing' | 'past';
}

interface GoogleMeetIntegrationProps {
  onSelectMeeting: (meeting: GoogleMeeting) => void;
  onRecordingFound: (fileId: string, name: string) => void;
}

export const GoogleMeetIntegration: React.FC<GoogleMeetIntegrationProps> = ({ onSelectMeeting, onRecordingFound }) => {
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [meetings, setMeetings] = useState<GoogleMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingRecordings, setIsCheckingRecordings] = useState(false);

  const connectGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (token) {
        setAccessToken(token);
        localStorage.setItem('google_access_token', token);
        fetchMeetings(token);
      } else {
        throw new Error("Failed to get access token from Google.");
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Failed to connect to Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMeetings = async (token: string) => {
    try {
      setIsLoading(true);
      const now = new Date();
      const timeMin = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const timeMax = new Date(now.setHours(23, 59, 59, 999)).toISOString();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setAccessToken(null);
          localStorage.removeItem('google_access_token');
          throw new Error("Session expired. Please reconnect.");
        }
        throw new Error("Failed to fetch calendar events.");
      }

      const data = await response.json();
      const meetEvents = data.items
        .filter((event: any) => event.conferenceData?.entryPoints?.some((ep: any) => ep.entryPointType === 'video'))
        .map((event: any) => {
          const start = new Date(event.start.dateTime || event.start.date);
          const end = new Date(event.end.dateTime || event.end.date);
          const now = new Date();
          
          let status: 'upcoming' | 'ongoing' | 'past' = 'upcoming';
          if (now >= start && now <= end) status = 'ongoing';
          else if (now > end) status = 'past';

          return {
            id: event.id,
            summary: event.summary || 'Untitled Meeting',
            startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            meetLink: event.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video')?.uri,
            status
          };
        });

      setMeetings(meetEvents);
    } catch (err: any) {
      console.error("Fetch Meetings Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkRecentRecordings = async () => {
    if (!accessToken) return;
    
    try {
      setIsCheckingRecordings(true);
      // Search for video files in Google Drive created in the last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const query = `mimeType = 'video/mp4' and createdTime > '${twoHoursAgo}' and name contains 'Meeting Recording'`;
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, createdTime)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) throw new Error("Failed to check recordings.");

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const latest = data.files[0];
        onRecordingFound(latest.id, latest.name);
      } else {
        setError("No recent recordings found. Ensure the meeting was recorded and saved to Drive.");
      }
    } catch (err: any) {
      console.error("Check Recordings Error:", err);
      setError(err.message);
    } finally {
      setIsCheckingRecordings(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchMeetings(accessToken);
      checkRecentRecordings();
    }
  }, []);

  if (!accessToken) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <Video className="w-8 h-8 text-bs-primary" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Google Meet Integration</h3>
          <p className="text-sm text-slate-400 max-w-xs mb-6">
            Connect your Google account to sync meetings and automatically process recordings.
          </p>
          <button 
            onClick={connectGoogle}
            disabled={isLoading}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-3"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" />}
            {isLoading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-bs-primary" />
            Today's Google Meet Sessions
          </h3>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Synced from your Google Calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchMeetings(accessToken)}
            className="p-2 text-slate-400 hover:text-bs-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={checkRecentRecordings}
            disabled={isCheckingRecordings}
            className="bg-blue-50 text-bs-primary px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isCheckingRecordings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileVideo className="w-3 h-3" />}
            Sync Recording
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded flex items-center gap-3 text-rose-600 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {meetings.length === 0 ? (
          <div className="py-10 text-center text-slate-300">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-10" />
            <p className="text-xs font-bold uppercase tracking-widest">No Meet sessions found for today</p>
          </div>
        ) : (
          meetings.map(meeting => (
            <div 
              key={meeting.id}
              className={`group p-3 rounded border transition-all flex items-center justify-between ${
                meeting.status === 'ongoing' 
                  ? 'bg-blue-50 border-blue-100' 
                  : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded flex items-center justify-center ${
                  meeting.status === 'ongoing' ? 'bg-bs-primary text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}>
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-bs-primary transition-colors">{meeting.summary}</h4>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {meeting.startTime} - {meeting.endTime}
                    </span>
                    {meeting.status === 'ongoing' && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-bs-primary uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-bs-primary rounded-full animate-pulse" />
                        Live Now
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {meeting.meetLink && (
                  <a 
                    href={meeting.meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-bs-primary transition-colors"
                    title="Join Meeting"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button 
                  onClick={() => onSelectMeeting(meeting)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                    meeting.status === 'ongoing'
                      ? 'bg-bs-primary text-white hover:bg-blue-700'
                      : 'bg-white border border-slate-300 text-slate-600 hover:border-bs-primary hover:text-bs-primary'
                  }`}
                >
                  {meeting.status === 'ongoing' ? 'Monitor Live' : 'Select'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-bs-success rounded-full" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Google Account Connected</span>
        </div>
        <button 
          onClick={() => {
            setAccessToken(null);
            localStorage.removeItem('google_access_token');
          }}
          className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};

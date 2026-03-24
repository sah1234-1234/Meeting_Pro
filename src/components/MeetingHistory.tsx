import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  History, 
  Calendar, 
  Clock, 
  Hotel, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Briefcase,
  ChevronRight,
  MessageSquare,
  Search,
  X
} from 'lucide-react';
import { MeetingReport } from '../services/geminiService';

interface MeetingHistoryProps {
  reports: MeetingReport[];
  onSelectReport: (report: MeetingReport) => void;
}

export const MeetingHistory: React.FC<MeetingHistoryProps> = ({ reports, onSelectReport }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    const inTitle = report.title.toLowerCase().includes(query);
    const inProperty = report.property.toLowerCase().includes(query);
    const inSummary = report.meetingSummary.toLowerCase().includes(query);
    const inTasks = report.actionItems.some(t => t.task.toLowerCase().includes(query));
    const inIssues = report.issuesIdentified.some(i => i.issue.toLowerCase().includes(query));

    return inTitle || inProperty || inSummary || inTasks || inIssues;
  });

  // Sort filtered reports by date descending
  const sortedReports = [...filteredReports].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-blue-100 text-blue-900 rounded-sm px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-white rounded-lg border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <History className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No History Found</h3>
        <p className="text-sm text-slate-400 max-w-xs text-center">
          You haven't generated any intelligence reports yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Meeting Intelligence History</h2>
          <p className="text-xs font-semibold text-bs-primary uppercase tracking-widest mt-1">Timeline of all operational reports</p>
        </div>

        {/* Smart Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="w-full bg-white border border-slate-300 rounded pl-10 pr-10 py-2 text-sm font-medium focus:border-bs-primary focus:ring-1 focus:ring-bs-primary outline-none transition-all shadow-sm placeholder:text-slate-400"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {sortedReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Search className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching reports found</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-3 text-xs font-bold text-bs-primary uppercase tracking-widest hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 hidden md:block"></div>

          <div className="space-y-8">
            {sortedReports.map((report, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative flex flex-col md:flex-row gap-6"
              >
                {/* Timeline Dot */}
                <div className="absolute left-6 top-6 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-bs-primary z-10 hidden md:block"></div>

                {/* Date Column */}
                <div className="md:w-24 shrink-0 pt-4">
                  <div className="sticky top-24">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                      {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(report.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Card Content */}
                <div 
                  onClick={() => onSelectReport(report)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 p-2 rounded">
                        <Hotel className="w-4 h-4 text-bs-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-bs-primary transition-colors text-sm">{highlightText(report.property, searchQuery)}</h3>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{highlightText(report.title, searchQuery)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        report.performanceScore > 80 ? 'bg-green-100 text-green-700' :
                        report.performanceScore > 60 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Score: {report.performanceScore}%
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-bs-primary transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Summary
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 italic">"{highlightText(report.meetingSummary, searchQuery)}"</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Tasks
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{report.actionItems.length}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Action Items</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Issues
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{report.issuesIdentified.length}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Service Alerts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

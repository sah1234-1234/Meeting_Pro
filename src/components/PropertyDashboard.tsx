import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  MessageSquare, 
  Wrench, 
  Clock, 
  Download,
  Filter,
  Search,
  Tag,
  ChevronRight,
  Star,
  ThumbsUp,
  ThumbsDown,
  Briefcase,
  Sparkles,
  ArrowUpRight,
  History
} from 'lucide-react';
import { MeetingReport, ActionItem, GuestInsight, Issue } from '../services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PropertyDashboardProps {
  propertyName: string;
  reports: MeetingReport[];
}

export const PropertyDashboard: React.FC<PropertyDashboardProps> = ({ propertyName, reports }) => {
  const latestReport = reports[0];
  
  if (!latestReport) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-white rounded-lg border border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Briefcase className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Data Available</h3>
        <p className="text-sm text-slate-400 max-w-xs text-center">
          Upload a meeting recording to generate intelligence for {propertyName}.
        </p>
      </div>
    );
  }

  const exportToPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;
    
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${propertyName}-Intelligence-Report.pdf`);
  };

  const COLORS = ['#0d6efd', '#dc3545', '#0dcaf0', '#ffc107', '#6610f2'];

  const departments = ['Housekeeping', 'F&B', 'Maintenance', 'Front Office', 'Other'] as const;
  const departmentData = departments.map(dept => ({
    name: dept,
    issues: latestReport.issuesIdentified.filter(i => i.department === dept).length,
    tasks: latestReport.actionItems.filter(t => t.department === dept || (dept === 'Other' && !['Housekeeping', 'F&B', 'Maintenance', 'Front Office'].includes(t.department))).length
  })).filter(d => d.issues > 0 || d.tasks > 0);

  const sentimentData = [
    { name: 'Complaints', value: latestReport.guestExperienceInsights.filter(i => i.type === 'Complaint').length },
    { name: 'Feedback', value: latestReport.guestExperienceInsights.filter(i => i.type === 'Feedback').length },
    { name: 'Improvements', value: latestReport.guestExperienceInsights.filter(i => i.type === 'Improvement').length }
  ].filter(d => d.value > 0);

  // Task Completion Data
  const taskCompletionData = [
    { name: 'Completed', value: latestReport.actionItems.filter(t => t.status === 'Completed').length },
    { name: 'Pending', value: latestReport.actionItems.filter(t => t.status === 'Pending').length }
  ];

  // Trend Data (Last 10 reports)
  const trendData = [...reports].reverse().slice(-10).map(r => ({
    date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    performance: r.performanceScore,
    issues: r.issuesIdentified.length,
    tasks: r.actionItems.length
  }));

  return (
    <div className="space-y-6 pb-20" id="dashboard-content">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{propertyName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="px-2 py-0.5 bg-blue-100 text-bs-primary text-[10px] font-bold uppercase tracking-widest rounded">
              Operational Intelligence
            </span>
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last Updated: {latestReport.date}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-bs-primary text-white rounded text-xs font-bold hover:bg-blue-700 transition-all shadow-sm">
            <TrendingUp className="w-4 h-4" />
            Performance: {latestReport.performanceScore}%
          </button>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-l-4 border-l-bs-primary rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-primary mb-1">Meeting Summary</h4>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-medium italic text-slate-600 line-clamp-3">{latestReport.meetingSummary}</p>
              <MessageSquare className="w-6 h-6 shrink-0 text-slate-200 group-hover:text-bs-primary transition-colors" />
            </div>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-bs-success rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-success mb-1">Action Items</h4>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-slate-800">
                {Math.round((latestReport.actionItems.filter(t => t.status === 'Completed').length / (latestReport.actionItems.length || 1)) * 100)}%
              </p>
              <CheckCircle2 className="w-8 h-8 text-slate-200 group-hover:text-bs-success transition-colors" />
            </div>
            <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {latestReport.actionItems.filter(t => t.status === 'Pending').length} Pending Items
            </p>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-bs-danger rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-danger mb-1">Issues Identified</h4>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-slate-800">
                {latestReport.issuesIdentified.length}
              </p>
              <AlertTriangle className="w-8 h-8 text-slate-200 group-hover:text-bs-danger transition-colors" />
            </div>
            <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {latestReport.issuesIdentified.filter(i => i.severity === 'High').length} High Severity
            </p>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-bs-info rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-info mb-1">Performance Score</h4>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-slate-800">{latestReport.performanceScore}%</p>
              <TrendingUp className="w-8 h-8 text-slate-200 group-hover:text-bs-info transition-colors" />
            </div>
            <p className="mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Overall Operational Score</p>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Pie */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Task Status</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskCompletionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#0d6efd" />
                  <Cell fill="#e9ecef" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-bs-primary"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Pending</span>
            </div>
          </div>
        </div>

        {/* Performance Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Performance & Issue Trends</h3>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="performance" stroke="#0d6efd" strokeWidth={2} dot={{r: 4, fill: '#0d6efd', strokeWidth: 2, stroke: '#fff'}} name="Performance %" />
                <Line type="monotone" dataKey="issues" stroke="#dc3545" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3, fill: '#dc3545'}} name="Issues" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tasks & Issues */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Item Tracker */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-bs-primary" />
                Action Items
              </h3>
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auto-Assigned</span>
              </div>
            </div>
            <div className="space-y-3">
              {latestReport.actionItems.map((item, idx) => (
                <div key={idx} className="group flex items-center gap-4 p-3 rounded border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all">
                  <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 ${
                    item.priority === 'High' ? 'bg-red-100 text-red-600' :
                    item.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        item.priority === 'High' ? 'bg-red-600 text-white' :
                        item.priority === 'Medium' ? 'bg-orange-500 text-white' :
                        'bg-slate-200 text-slate-600'
                      }`}>{item.priority}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        item.status === 'Completed' ? 'bg-blue-100 text-bs-primary' : 'bg-slate-100 text-slate-500'
                      }`}>{item.status}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{item.task}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {item.assignedTo}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.deadline}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-bs-primary transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Department Performance Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Department-wise Activity</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="tasks" fill="#0d6efd" radius={[4, 4, 0, 0]} name="Tasks" />
                  <Bar dataKey="issues" fill="#dc3545" radius={[4, 4, 0, 0]} name="Issues" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column: Insights & Alerts */}
        <div className="space-y-6">
          
          {/* Guest Experience Analysis */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Guest Experience</h3>
            {sentimentData.length > 0 ? (
              <div className="h-[180px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Complaints' ? '#dc3545' : entry.name === 'Feedback' ? '#0dcaf0' : '#198754'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-slate-400 text-xs italic mb-6">
                No guest data to visualize
              </div>
            )}
            <div className="space-y-3">
              {latestReport.guestExperienceInsights.map((insight, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      insight.type === 'Improvement' ? 'bg-bs-success/10 text-bs-success' : 
                      insight.type === 'Complaint' ? 'bg-bs-danger/10 text-bs-danger' : 'bg-bs-info/10 text-bs-info'
                    }`}>
                      {insight.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{insight.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Critical Alerts
            </h3>
            <div className="space-y-3">
              {latestReport.issuesIdentified.filter(i => i.severity === 'High').map((issue, idx) => (
                <div key={idx} className="p-3 rounded bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-red-500 font-bold mr-2">[{issue.department}]</span>
                    {issue.issue}
                  </p>
                </div>
              ))}
              {latestReport.issuesIdentified.filter(i => i.severity === 'High').length === 0 && (
                <p className="text-xs text-slate-500 italic">No critical alerts at this time.</p>
              )}
            </div>
          </div>

          {/* Department Summaries */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Department Summaries</h3>
            <div className="space-y-3">
              {Object.entries(latestReport.departmentWiseSummary).map(([dept, summary]) => (
                <div key={dept} className="p-3 rounded bg-slate-50 border border-slate-100">
                  <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{dept}</h5>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{summary || 'No updates.'}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* AI Intelligence & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg p-8 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-bs-primary p-2.5 rounded shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">AI Suggestion Engine</h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Predictive Operational Improvements</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Staff Optimization', desc: 'Shift F&B staff to Front Desk during 11 AM - 1 PM peak checkout hours.', impact: 'High' },
                { title: 'Maintenance Alert', desc: 'HVAC systems in Wing B showing 15% efficiency drop. Schedule preventive check.', impact: 'Medium' },
                { title: 'Guest Experience', desc: '3 guests mentioned slow room service. Consider dedicated runner for floor 4-6.', impact: 'High' },
                { title: 'Energy Saving', desc: 'Unoccupied conference rooms have AC on. Automate with occupancy sensors.', impact: 'Low' }
              ].map((s, i) => (
                <div key={i} className="p-4 rounded border border-slate-100 bg-slate-50 group hover:bg-blue-50 hover:border-blue-100 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      s.impact === 'High' ? 'bg-red-100 text-red-600' : s.impact === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-bs-primary'
                    }`}>
                      {s.impact} Impact
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-bs-primary transition-colors" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{s.title}</h4>
                  <p className="text-xs font-semibold text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg p-8 shadow-sm text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/10 p-2.5 rounded border border-white/10">
                <History className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Report History</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Past 30 Days Activity</p>
              </div>
            </div>
            <div className="space-y-3">
              {reports.length > 0 ? reports.map((r, i) => (
                <div key={i} className="p-3 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{r.date || 'Today'}</span>
                    <span className="text-[10px] font-bold text-white/40">{r.property}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{r.title}</h4>
                </div>
              )) : (
                <div className="py-8 text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">No history available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  isLongText?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle, isLongText }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded bg-${color}-50`}>
          {icon}
        </div>
        {subtitle && (
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{subtitle}</span>
        )}
      </div>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</h4>
      <p className={`font-bold text-slate-900 leading-tight ${isLongText ? 'text-xs italic text-slate-500 font-medium' : 'text-xl'}`}>
        {isLongText ? `"${value}"` : value}
      </p>
    </div>
  );
};

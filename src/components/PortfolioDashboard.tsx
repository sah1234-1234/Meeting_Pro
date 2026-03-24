import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Briefcase,
  Layers,
  Activity
} from 'lucide-react';
import { MeetingReport } from '../services/geminiService';
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
  Cell,
  Legend
} from 'recharts';

interface PortfolioDashboardProps {
  reports: MeetingReport[];
  properties: string[];
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ reports, properties }) => {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-3xl border border-dashed border-slate-200">
        <Layers className="w-12 h-12 text-slate-200 mb-4" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Portfolio Data</p>
      </div>
    );
  }

  // Aggregate Action Item Data
  const allActionItems = reports.flatMap(r => (r.actionItems || []).map(t => ({ ...t, property: r.property })));
  const completedItems = allActionItems.filter(t => t.status === 'Completed').length;
  const pendingItems = allActionItems.filter(t => t.status === 'Pending' || t.status === 'In Progress' || !t.status).length;

  const taskData = [
    { name: 'Completed', value: completedItems },
    { name: 'Pending', value: pendingItems }
  ];

  // Aggregate Performance by Property
  const propertyPerformance = properties.map(prop => {
    const propReports = reports.filter(r => r.property === prop);
    const avgScore = propReports.length > 0 
      ? Math.round(propReports.reduce((acc, r) => acc + (r.performanceScore || 0), 0) / propReports.length)
      : 0;
    return { name: prop, score: avgScore };
  }).sort((a, b) => b.score - a.score);

  // Portfolio Trends (Grouped by Date)
  const reportsByDate = reports.reduce((acc: any, r) => {
    const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = { date, performance: 0, issues: 0, count: 0 };
    acc[date].performance += r.performanceScore;
    acc[date].issues += (r.issuesIdentified || []).length + (r.guestExperienceInsights || []).filter(i => i.type === 'Complaint').length;
    acc[date].count += 1;
    return acc;
  }, {});

  const trendData = Object.values(reportsByDate).map((d: any) => ({
    ...d,
    performance: Math.round(d.performance / d.count)
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10);

  const COLORS = ['#0d6efd', '#e9ecef'];

  return (
    <div className="space-y-6">
      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-l-4 border-l-primary rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-primary mb-1">Portfolio Action Items</h4>
              <p className="text-2xl font-bold text-slate-800">{allActionItems.length}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-slate-200 group-hover:text-bs-primary transition-colors" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-bs-primary h-full transition-all duration-1000" 
                style={{ width: `${(completedItems / (allActionItems.length || 1)) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500">{Math.round((completedItems / (allActionItems.length || 1)) * 100)}%</span>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-success rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-success mb-1">Active Issues</h4>
              <p className="text-2xl font-bold text-slate-800">
                {reports.reduce((acc, r) => acc + (r.issuesIdentified || []).length, 0)}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-slate-200 group-hover:text-bs-success transition-colors" />
          </div>
          <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Across {properties.length} Properties</p>
        </div>

        <div className="bg-white border-l-4 border-l-info rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-info mb-1">Avg Performance</h4>
              <p className="text-2xl font-bold text-slate-800">
                {reports.length > 0 ? Math.round(reports.reduce((acc, r) => acc + r.performanceScore, 0) / reports.length) : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-slate-200 group-hover:text-bs-info transition-colors" />
          </div>
          <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Operational Score</p>
        </div>

        <div className="bg-white border-l-4 border-l-warning rounded-lg p-5 shadow-sm border border-slate-200 group">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-bs-warning mb-1">Total Reports</h4>
              <p className="text-2xl font-bold text-slate-800">{reports.length}</p>
            </div>
            <Layers className="w-8 h-8 text-slate-200 group-hover:text-bs-warning transition-colors" />
          </div>
          <p className="mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">System Processed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Item Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-bs-primary" />
            Action Item Completion Status
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Portfolio Trends */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-bs-primary" />
            Portfolio Trends
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="performance" stroke="#0d6efd" strokeWidth={2} dot={{r: 4, fill: '#0d6efd', strokeWidth: 2, stroke: '#fff'}} name="Avg Performance %" />
                <Line type="monotone" dataKey="issues" stroke="#dc3545" strokeWidth={2} strokeDasharray="5 5" dot={{r: 3, fill: '#dc3545'}} name="Total Issues" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Property Comparison */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Property Performance Comparison</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={propertyPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                width={180}
                interval={0}
              />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                cursor={{fill: '#f8fafc'}}
              />
              <Bar dataKey="score" fill="#0d6efd" radius={[0, 4, 4, 0]} name="Performance Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

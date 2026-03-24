import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Award,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { MeetingReport, ActionItem } from '../services/geminiService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface StaffPerformanceProps {
  reports: MeetingReport[];
}

interface StaffStats {
  name: string;
  completedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  efficiency: number;
  lastActive: string;
  recentTasks: ActionItem[];
}

export const StaffPerformance: React.FC<StaffPerformanceProps> = ({ reports }) => {
  // Aggregate data by staff member
  const staffData: Record<string, StaffStats> = {};

  reports.forEach(report => {
    (report.actionItems || []).forEach(task => {
      const staffName = task.assignedTo || 'Unassigned';
      if (!staffData[staffName]) {
        staffData[staffName] = {
          name: staffName,
          completedTasks: 0,
          pendingTasks: 0,
          totalTasks: 0,
          efficiency: 0,
          lastActive: report.createdAt,
          recentTasks: []
        };
      }

      staffData[staffName].totalTasks += 1;
      if (task.status === 'Completed') {
        staffData[staffName].completedTasks += 1;
      } else {
        staffData[staffName].pendingTasks += 1;
      }

      if (new Date(report.createdAt) > new Date(staffData[staffName].lastActive)) {
        staffData[staffName].lastActive = report.createdAt;
      }

      if (staffData[staffName].recentTasks.length < 5) {
        staffData[staffName].recentTasks.push(task);
      }
    });
  });

  const staffList = Object.values(staffData).map(staff => ({
    ...staff,
    efficiency: staff.totalTasks > 0 ? Math.round((staff.completedTasks / staff.totalTasks) * 100) : 0
  })).sort((a, b) => b.efficiency - a.efficiency);

  if (staffList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-white rounded-lg border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No Staff Data Found</h3>
        <p className="text-sm text-slate-400 max-w-xs text-center">
          Generate reports with assigned tasks to track staff performance.
        </p>
      </div>
    );
  }

  const chartData = staffList.slice(0, 10).map(s => ({
    name: s.name,
    efficiency: s.efficiency
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff Performance Tracking</h2>
          <p className="text-xs font-semibold text-bs-primary uppercase tracking-widest mt-1">Operational efficiency & task completion</p>
        </div>
      </div>

      {/* Top Performers Chart */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-bs-primary" />
          Efficiency by Staff Member (%)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} width={100} />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                cursor={{fill: '#f8fafc'}}
              />
              <Bar dataKey="efficiency" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.efficiency > 80 ? '#0d6efd' : entry.efficiency > 50 ? '#ffc107' : '#dc3545'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {staffList.map((staff, idx) => (
          <motion.div 
            key={staff.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-400">{staff.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{staff.name}</h4>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    Last Active: {new Date(staff.lastActive).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${staff.efficiency > 80 ? 'text-bs-primary' : staff.efficiency > 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                  {staff.efficiency}%
                </div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Efficiency</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-slate-50 rounded p-2 text-center">
                <p className="text-base font-bold text-slate-900">{staff.totalTasks}</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Total</p>
              </div>
              <div className="bg-blue-50 rounded p-2 text-center">
                <p className="text-base font-bold text-bs-primary">{staff.completedTasks}</p>
                <p className="text-[9px] font-semibold text-bs-primary uppercase tracking-widest">Done</p>
              </div>
              <div className="bg-amber-50 rounded p-2 text-center">
                <p className="text-base font-bold text-amber-600">{staff.pendingTasks}</p>
                <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-widest">Pending</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" /> Recent Assignments
              </p>
              <div className="space-y-1.5">
                {(staff.recentTasks || []).map((task, tIdx) => (
                  <div key={tIdx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-xs font-medium text-slate-700 truncate mr-2">{task.task}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                      task.status === 'Completed' ? 'bg-blue-100 text-bs-primary' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

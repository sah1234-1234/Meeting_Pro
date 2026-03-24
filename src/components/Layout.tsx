import React from 'react';
import { 
  Building2, 
  Hotel, 
  Search, 
  LayoutDashboard, 
  FileAudio, 
  History as HistoryIcon, 
  Users, 
  Settings, 
  LogOut,
  Bell,
  Menu,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  user: any;
  onSignOut: () => void;
  accessibleProperties?: string[];
  propertyReports?: Record<string, any[]>;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  setActiveView, 
  user,
  onSignOut,
  accessibleProperties = [],
  propertyReports = {}
}) => {
  const navItems = [
    { id: 'Dashboard', label: 'Intelligence', icon: LayoutDashboard },
    { id: 'Generator', label: 'Report Engine', icon: FileAudio },
    { id: 'History', label: 'Archives', icon: HistoryIcon },
    { id: 'Staff', label: 'Performance', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-admin-bg text-slate-900 font-sans flex overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-admin-sidebar text-slate-400 border-r border-slate-800 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 className="text-white w-5 h-5" />
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight">Sukoon Agent</span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Main Menu</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                activeView === item.id 
                  ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                  : 'hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <item.icon className={`w-5 h-5 ${activeView === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="text-sm">{item.label}</span>
              {activeView === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
            </button>
          ))}

          {accessibleProperties.length > 0 && (
            <div className="pt-8">
              <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Property Sections</p>
              <div className="space-y-1">
                {accessibleProperties.map(prop => (
                  <button 
                    key={prop}
                    onClick={() => setActiveView(prop)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      activeView === prop 
                        ? 'bg-indigo-600/10 text-indigo-400 font-semibold' 
                        : 'hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Hotel className={`w-4 h-4 shrink-0 ${activeView === prop ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="text-sm truncate">{prop}</span>
                    </div>
                    {propertyReports[prop]?.length > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-lg font-bold">
                        {propertyReports[prop].length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-8">
            <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">System</p>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-slate-800/50 hover:text-slate-200 transition-all group">
              <Settings className="w-5 h-5 group-hover:text-slate-300" />
              <span className="text-sm">Settings</span>
            </button>
            <button 
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:text-red-400" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800/50">
          <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gemini Engine Live</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Processing intelligence for 8 properties across the portfolio.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 lg:hidden">
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <span className="font-display font-bold text-slate-900 text-lg">Sukoon</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100/50 border border-slate-200/60 rounded-xl w-96 group focus-within:bg-white focus-within:border-indigo-300 transition-all">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
            <input 
              type="text" 
              placeholder="Search intelligence, reports, staff..." 
              className="bg-transparent border-none text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none w-full"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">{user?.phone || 'Administrator'}</p>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{user?.role || 'System'}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-500/20">
                {user?.phone?.slice(-2) || 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

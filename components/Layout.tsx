import React, { useState } from 'react';
import { ClipboardCheck, FileText, LayoutDashboard, HardHat, Globe, ClipboardList, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Language } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  language: Language;
  onToggleLanguage: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, language, onToggleLanguage }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const t = {
    dashboard: language === 'zh' ? '儀表板' : 'Dashboard',
    newInspection: language === 'zh' ? '新增巡查' : 'New Inspection',
    reports: language === 'zh' ? '週報表' : 'Reports',
    followup: language === 'zh' ? '跟進事項' : 'Follow-up',
    factoryHub: language === 'zh' ? '工廠安全中心' : 'Factory SafetyHub',
    compliance: language === 'zh' ? '符合香港法例第59章模式' : 'Cap. 59 Compliance Mode',
    hideSidebar: language === 'zh' ? '隱藏側邊欄' : 'Hide Sidebar',
    showSidebar: language === 'zh' ? '顯示側邊欄' : 'Show Sidebar',
  };

  const getTitle = (tab: string) => {
    switch(tab) {
      case 'dashboard': return t.dashboard;
      case 'new-inspection': return t.newInspection;
      case 'reports': return t.reports;
      case 'followup': return t.followup;
      default: return t.dashboard;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans print:h-auto print:overflow-visible print:block">
      {/* Sidebar */}
      <aside 
        className={`bg-slate-900 text-white flex flex-col shadow-xl z-20 hidden md:flex transition-all duration-300 ease-in-out overflow-hidden print:hidden ${
          isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <div className="w-64 flex flex-col h-full">
          <div className="p-6 flex items-center gap-3 border-b border-slate-700">
            <div className="bg-yellow-500 p-2 rounded-lg text-slate-900">
              <HardHat size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">{t.factoryHub}</h1>
              <p className="text-xs text-slate-400">v1.1</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label={t.dashboard} 
              active={activeTab === 'dashboard'} 
              onClick={() => onNavigate('dashboard')} 
            />
            <NavItem 
              icon={<ClipboardCheck size={20} />} 
              label={t.newInspection} 
              active={activeTab === 'new-inspection'} 
              onClick={() => onNavigate('new-inspection')} 
            />
            <NavItem 
              icon={<ClipboardList size={20} />} 
              label={t.followup} 
              active={activeTab === 'followup'} 
              onClick={() => onNavigate('followup')} 
            />
            <NavItem 
              icon={<FileText size={20} />} 
              label={t.reports} 
              active={activeTab === 'reports'} 
              onClick={() => onNavigate('reports')} 
            />
          </nav>

          <div className="p-4 border-t border-slate-700 bg-slate-800 space-y-4">
            <button 
              onClick={onToggleLanguage}
              className="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-sm font-medium"
            >
               <div className="flex items-center gap-2">
                 <Globe size={16} />
                 <span>Language</span>
               </div>
               <span className="text-xs bg-slate-900 px-2 py-1 rounded text-yellow-500 font-bold">
                 {language === 'zh' ? '中' : 'EN'}
               </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header (visible only on small screens) */}
      <div className="md:hidden absolute top-0 w-full bg-slate-900 text-white p-4 flex justify-between items-center z-20 print:hidden">
         <div className="flex items-center gap-2">
            <HardHat className="text-yellow-500" />
            <span className="font-bold">{t.factoryHub}</span>
         </div>
         <button onClick={onToggleLanguage} className="p-2">
           {language === 'zh' ? '中' : 'EN'}
         </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative flex flex-col h-full print:h-auto print:overflow-visible print:block">
        {/* Top Header for Context */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title={isSidebarOpen ? t.hideSidebar : t.showSidebar}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {getTitle(activeTab)}
            </h2>
          </div>
          <div className="text-sm text-gray-500">
            {t.compliance}
          </div>
        </header>
        
        <div className="p-8 flex-1 print:p-0">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${
      active 
        ? 'bg-yellow-500 text-slate-900 font-semibold shadow-lg shadow-yellow-500/20' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default Layout;
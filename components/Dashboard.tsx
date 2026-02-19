
import React from 'react';
import { InspectionRecord, InspectionStatus, Language } from '../types';
import { AlertTriangle, CheckCircle, Clock, FileBarChart, Trash2, ListChecks } from 'lucide-react';

interface DashboardProps {
  inspections: InspectionRecord[];
  onViewInspection: (id: string) => void;
  onDeleteInspection: (id: string) => void;
  language: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ inspections, onViewInspection, onDeleteInspection, language }) => {
  // Stats Calculation
  const totalInspections = inspections.length;
  
  // Critical Risks (High + Extreme)
  const criticalCount = inspections.reduce((acc, curr) => 
    acc + curr.items.filter(i => i.riskLevel === 'High' || i.riskLevel === 'Extreme').length, 0);
  
  // Total "At Risk" Items (Violations)
  const totalViolations = inspections.reduce((acc, curr) => 
    acc + curr.items.filter(i => i.status === 'At Risk').length, 0);

  // Open Actions (Pending or Follow-up)
  const openActionsCount = inspections.reduce((acc, curr) => 
    acc + curr.items.filter(i => i.actionStatus === 'Pending' || i.actionStatus === 'Follow-up').length, 0);

  const t = {
    totalInspections: language === 'zh' ? '總巡查記錄' : 'Total Inspections',
    totalViolations: language === 'zh' ? '發現違規事項' : 'Total Hazards Found',
    critical: language === 'zh' ? '高/極高風險' : 'High/Extreme Risks',
    openActions: language === 'zh' ? '待辦/跟進中行動' : 'Open Actions',
    records: language === 'zh' ? '份報告' : 'Reports',
    items: language === 'zh' ? '項' : 'Items',
    actions: language === 'zh' ? '項行動' : 'Actions',
    recentActivity: language === 'zh' ? '最近巡查記錄' : 'Recent Activity',
    viewAll: language === 'zh' ? '查看全部' : 'View All',
    id: language === 'zh' ? '編號' : 'ID',
    date: language === 'zh' ? '日期' : 'Date',
    location: language === 'zh' ? '地點' : 'Location',
    inspector: language === 'zh' ? '巡查員' : 'Inspector',
    risk: language === 'zh' ? '風險等級' : 'Risk Level',
    status: language === 'zh' ? '狀態' : 'Status',
    action: language === 'zh' ? '操作' : 'Action',
    view: language === 'zh' ? '查看' : 'View',
    extreme: language === 'zh' ? '極高' : 'Extreme',
    high: language === 'zh' ? '高' : 'High',
    medium: language === 'zh' ? '中' : 'Medium',
    low: language === 'zh' ? '低' : 'Low',
    completed: language === 'zh' ? '已記錄' : 'Recorded',
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title={t.totalInspections} 
          value={totalInspections} 
          icon={<FileBarChart className="text-blue-500" />} 
          trend={t.records}
          trendColor="text-blue-600"
        />
        <StatCard 
          title={t.totalViolations} 
          value={totalViolations} 
          icon={<AlertTriangle className="text-orange-500" />} 
          trend={t.items}
          trendColor="text-orange-600"
        />
        <StatCard 
          title={t.critical} 
          value={criticalCount} 
          icon={<AlertTriangle className="text-red-600" />} 
          trend={t.items}
          trendColor="text-red-700"
        />
        <StatCard 
          title={t.openActions} 
          value={openActionsCount} 
          icon={<ListChecks className="text-purple-500" />} 
          trend={t.actions}
          trendColor="text-purple-600"
        />
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-800">{t.recentActivity}</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">{t.viewAll}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">{t.id}</th>
                <th className="px-6 py-3">{t.date}</th>
                <th className="px-6 py-3">{t.location}</th>
                <th className="px-6 py-3">{t.inspector}</th>
                <th className="px-6 py-3">{t.risk}</th>
                <th className="px-6 py-3">{t.status}</th>
                <th className="px-6 py-3">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspections.map((insp) => (
                <tr key={insp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">#{insp.id.slice(-4)}</td>
                  <td className="px-6 py-4 text-gray-600">{insp.date}</td>
                  <td className="px-6 py-4 text-gray-800">{insp.location}</td>
                  <td className="px-6 py-4 text-gray-600">{insp.inspectorName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      insp.riskLevel === 'Extreme' ? 'bg-red-200 text-red-900' :
                      insp.riskLevel === 'High' ? 'bg-orange-100 text-orange-800' :
                      insp.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {insp.riskLevel === 'Extreme' ? t.extreme : 
                       insp.riskLevel === 'High' ? t.high : 
                       insp.riskLevel === 'Medium' ? t.medium : t.low}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                        {t.completed}
                     </span>
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button 
                      onClick={() => onViewInspection(insp.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {t.view}
                    </button>
                    <button 
                      onClick={() => onDeleteInspection(insp.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, trendColor }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
    </div>
    <div className="flex items-center gap-1">
        <span className={`text-xs font-bold ${trendColor}`}>{value}</span>
        <span className="text-xs text-gray-400">{trend}</span>
    </div>
  </div>
);

export default Dashboard;

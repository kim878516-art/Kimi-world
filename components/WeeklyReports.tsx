

import React, { useState, useEffect, useMemo } from 'react';
import { InspectionRecord, Language, WeeklyReportRecord } from '../types';
import { generateWeeklySummary } from '../services/geminiService';
import { saveWeeklyReport, getAllWeeklyReports, deleteWeeklyReport } from '../services/storage';
import { FileText, Sparkles, Download, Calendar, ArrowRight, AlertTriangle, CheckCircle, Clock, RotateCw, ChevronDown, User, Printer, ShieldCheck, Eye, Plus, Edit2, Trash2, Check, X, Save, ArrowLeft, History, Palette } from 'lucide-react';

interface WeeklyReportsProps {
  inspections: InspectionRecord[];
  onUpdateStatus: (inspectionId: string, itemId: string, status: string) => void;
  onUpdateDate: (inspectionId: string, itemId: string, date: string) => void;
  language: Language;
  savedReporters: string[];
  onUpdateReporters: (list: string[]) => void;
  savedManagers: string[];
  onUpdateManagers: (list: string[]) => void;
}

// Editable Select Component (Reused)
const EditableSelect = ({ 
  label, value, options, onChange, onOptionsChange, className = "", placeholder
}: { 
  label: string, value: string, options: string[], onChange: (v: string) => void, onOptionsChange: (opts: string[]) => void, className?: string, placeholder: string
}) => {
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  const [tempValue, setTempValue] = useState("");
  const startAdd = () => { setMode('add'); setTempValue(""); };
  const startEdit = () => { setMode('edit'); setTempValue(value); };
  const startDelete = () => {
      if (!value) return;
      if (window.confirm(`Delete "${value}"?`)) {
          const newOptions = options.filter(o => o !== value);
          onOptionsChange(newOptions);
          onChange(newOptions.length > 0 ? newOptions[0] : "");
      }
  };
  const cancel = () => { setMode('view'); setTempValue(""); };
  const save = () => {
    if (!tempValue.trim()) return;
    if (mode === 'add') {
      const newOptions = [...options, tempValue.trim()];
      onOptionsChange(newOptions);
      onChange(tempValue.trim());
    } else if (mode === 'edit') {
      const newOptions = options.map(o => o === value ? tempValue.trim() : o);
      onOptionsChange(newOptions);
      onChange(tempValue.trim());
    }
    setMode('view');
  };
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
      {mode === 'view' ? (
        <div className="flex gap-2">
          <select 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 rounded-lg border-gray-300 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <button type="button" onClick={startAdd} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Add"><Plus size={18} /></button>
          <button type="button" onClick={startEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded" title="Edit"><Edit2 size={18} /></button>
          <button type="button" onClick={startDelete} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Delete"><Trash2 size={18} /></button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" value={tempValue} onChange={(e) => setTempValue(e.target.value)} placeholder={placeholder} className="flex-1 rounded-lg border border-gray-300 p-2.5 text-sm" autoFocus />
          <button onClick={save} className="p-2 text-green-600 hover:bg-green-50 rounded border border-green-200"><Check size={18} /></button>
          <button onClick={cancel} className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-200"><X size={18} /></button>
        </div>
      )}
    </div>
  );
};

const WeeklyReports: React.FC<WeeklyReportsProps> = ({ 
  inspections, onUpdateStatus, onUpdateDate, language, savedReporters, onUpdateReporters, savedManagers, onUpdateManagers
}) => {
  const [view, setView] = useState<'LIST' | 'EDITOR'>('LIST');
  const [savedReports, setSavedReports] = useState<WeeklyReportRecord[]>([]);
  
  // Editor State
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [submittedDate, setSubmittedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reporterName, setReporterName] = useState<string>(""); 
  const [reporterTitle, setReporterTitle] = useState<string>(language === 'zh' ? '註冊安全主任 (RSO)' : 'Registered Safety Officer (RSO)');
  const [managerName, setManagerName] = useState<string>(""); 
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<'Draft' | 'Submitted'>('Draft');
  
  const [loading, setLoading] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBW, setIsBW] = useState(false);

  const t = {
    // List View Translations
    managementTitle: language === 'zh' ? '每週報告管理' : 'Weekly Report Management',
    pendingReports: language === 'zh' ? '待處理報告 (根據巡查記錄)' : 'Pending Reports (Based on Inspections)',
    reportHistory: language === 'zh' ? '報告記錄' : 'Report History',
    create: language === 'zh' ? '建立' : 'Create',
    edit: language === 'zh' ? '編輯' : 'Edit',
    weekOf: language === 'zh' ? '週次' : 'Week of',
    inspectionsCount: language === 'zh' ? '次巡查' : 'inspections',
    noPending: language === 'zh' ? '沒有待處理的週次。' : 'No pending weeks found.',
    noHistory: language === 'zh' ? '沒有已儲存的報告。' : 'No saved reports.',
    statusDraft: language === 'zh' ? '草稿' : 'Draft',
    statusSubmitted: language === 'zh' ? '已提交' : 'Submitted',
    
    // Editor Translations
    backToList: language === 'zh' ? '返回列表' : 'Back to List',
    saveDraft: language === 'zh' ? '儲存草稿' : 'Save Draft',
    saveFinal: language === 'zh' ? '提交報告' : 'Submit Report',
    generatorTitle: language === 'zh' ? '週報表編輯器' : 'Weekly Report Editor',
    reportNo: language === 'zh' ? '報告編號' : 'Report No.',
    startDate: language === 'zh' ? '開始日期' : 'Start Date',
    endDate: language === 'zh' ? '結束日期' : 'End Date',
    submittedDate: language === 'zh' ? '報告日期' : 'Report Date',
    preparedBy: language === 'zh' ? '報告編寫人' : 'Prepared By',
    preparedByTitle: language === 'zh' ? '職位 (可編輯)' : 'Position (Editable)',
    endorsedBy: language === 'zh' ? '報告審核 (安全部經理)' : 'Endorsed By (Safety Dept. Manager)',
    newItem: language === 'zh' ? '輸入新名稱...' : 'Enter new name...',
    generateAI: language === 'zh' ? '生成 AI 摘要' : 'Generate AI Summary',
    print: language === 'zh' ? '列印報告' : 'Print Report',
    exportPdf: language === 'zh' ? '下載 PDF' : 'Download PDF',
    previewPdf: language === 'zh' ? '預覽 PDF' : 'Preview PDF',
    generating: language === 'zh' ? '生成中...' : 'Generating...',
    popupBlocked: language === 'zh' ? '彈出視窗被封鎖！' : 'Popup blocked!',
    toggleBW: language === 'zh' ? '黑白模式' : 'B&W Mode',
    
    // Report Content - Official Header
    reportTitle: language === 'zh' ? '每週安全巡查報告' : 'WEEKLY SAFETY INSPECTION REPORT',
    
    // Sections
    sec1: language === 'zh' ? '1.0 報告摘要' : '1.0 REPORT SUMMARY',
    sec2: language === 'zh' ? '2.0 本週巡查記錄' : '2.0 WEEKLY INSPECTION RECORD',
    sec3: language === 'zh' ? '3.0 違規事項及糾正措施記錄' : '3.0 NON-COMPLIANCE & REMEDIAL ACTION LOG',
    sec4: language === 'zh' ? '4.0 簽署' : '4.0 ENDORSEMENT',

    // Table Headers
    tableDate: language === 'zh' ? '日期' : 'Date',
    tableLocation: language === 'zh' ? '地點 / 區域' : 'Location / Area',
    colSystem: language === 'zh' ? '安全系統項目 / 類別' : 'Safety System Element / Category',
    colInspector: language === 'zh' ? '巡查員' : 'Inspector',
    colResult: language === 'zh' ? '合規狀態' : 'Compliance Status',
    
    // Findings Table
    tableEvidence: language === 'zh' ? '照片' : 'Evidence',
    tableObservation: language === 'zh' ? '觀察詳情 (不符合事項)' : 'Observation Details (Non-Compliance)',
    tableAction: language === 'zh' ? '建議糾正措施' : 'Recommended Remedial Action',
    tableTarget: language === 'zh' ? '目標日期' : 'Target Date',
    tableStatus: language === 'zh' ? '跟進狀態' : 'Status',
    
    noActivity: language === 'zh' ? '此期間無巡查記錄。' : 'No inspection activity recorded in this period.',
    noFindings: language === 'zh' ? '此期間所有項目均符合安全標準。' : 'All items compliant with safety standards during this period.',
    safe: language === 'zh' ? '滿意 / 合規' : 'Satisfactory',
    unsatisfactory: language === 'zh' ? '不滿意' : 'Unsatisfactory',
    
    // Footer
    disclaimerTitle: language === 'zh' ? '聲明：' : 'Statement:',
    disclaimerText: language === 'zh' 
        ? '本報告乃根據上述法例及相關安全守則編寫。所有觀察事項旨在識別潛在危害，管理層應確保建議的補救措施得到有效實施，以保障工作場所安全。' 
        : 'This report is prepared in accordance with the captioned Ordinances and relevant Codes of Practice. Observations are intended to identify potential hazards. Management shall ensure recommended remedial actions are implemented effectively to maintain workplace safety.',
    pageFooter: language === 'zh' ? '符合香港法例第59章及第509章記錄' : 'Cap. 59 & Cap. 509 Compliance Record',
    
    // Misc
    risk: language === 'zh' ? '風險' : 'Risk',
    weekDay: language === 'zh' ? ['週日','週一','週二','週三','週四','週五','週六'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    pending: language === 'zh' ? '待處理' : 'Pending',
    followUp: language === 'zh' ? '跟進中' : 'Follow-up',
    completed: language === 'zh' ? '已完成' : 'Completed',
    
    // Signatures
    signEndorsed: language === 'zh' ? '報告審核 (安全部經理)' : 'Endorsed By (Safety Dept. Manager)',
    dateSign: language === 'zh' ? '日期' : 'Date',
    name: language === 'zh' ? '姓名' : 'Name',
  };

  // --- Logic for Auto-Detecting Weeks ---
  
  const getMonday = (d: Date) => {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const getSaturday = (d: Date) => {
    const monday = getMonday(d);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    return saturday;
  };

  // New Helper for Month + Week No
  const getPeriodLabel = (dateStr: string, lang: Language) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const weekNo = Math.ceil(date.getDate() / 7);
    
    if (lang === 'zh') {
      return `${year}年${month}月 - 第${weekNo}週`;
    } else {
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      return `${monthName} ${year} - Week ${weekNo}`;
    }
  };

  const pendingWeeks = useMemo(() => {
    const weeksMap = new Map<string, { start: string, end: string, count: number }>();
    
    inspections.forEach(insp => {
      const date = new Date(insp.date);
      const monday = getMonday(date).toISOString().split('T')[0];
      const saturday = getSaturday(date).toISOString().split('T')[0];
      
      const reportExists = savedReports.some(r => r.weekStartDate === monday);
      
      if (!reportExists) {
        if (weeksMap.has(monday)) {
          const w = weeksMap.get(monday)!;
          w.count++;
        } else {
          weeksMap.set(monday, { start: monday, end: saturday, count: 1 });
        }
      }
    });

    return Array.from(weeksMap.values()).sort((a, b) => b.start.localeCompare(a.start));
  }, [inspections, savedReports]);

  // Load saved reports on mount
  const loadReports = async () => {
    try {
      const reports = await getAllWeeklyReports();
      setSavedReports(reports);
    } catch (error) {
      console.error("Failed to load weekly reports", error);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Initialize reporter fields from saved lists if empty
  useEffect(() => {
    if (view === 'EDITOR') {
      if (!reporterName && savedReporters.length > 0) setReporterName(savedReporters[0]);
      if (!managerName && savedManagers.length > 0) setManagerName(savedManagers[0]);
    }
  }, [view, savedReporters, savedManagers, reporterName, managerName]);

  // --- Actions ---

  const handleCreateReport = (weekStart: string, weekEnd: string) => {
    setCurrentReportId(null); // New report
    setWeekStart(weekStart);
    setWeekEnd(weekEnd);
    setSubmittedDate(new Date().toISOString().split('T')[0]);
    setReporterTitle(language === 'zh' ? '註冊安全主任 (RSO)' : 'Registered Safety Officer (RSO)');
    setGeneratedSummary("");
    setReportStatus('Draft');
    setView('EDITOR');
  };

  const handleEditReport = (report: WeeklyReportRecord) => {
    setCurrentReportId(report.id);
    setWeekStart(report.weekStartDate);
    setWeekEnd(report.weekEndDate);
    setSubmittedDate(report.submittedDate);
    setReporterName(report.preparedBy);
    // Use saved title or fallback
    setReporterTitle(report.preparedByTitle || (language === 'zh' ? '註冊安全主任 (RSO)' : 'Registered Safety Officer (RSO)'));
    setManagerName(report.endorsedBy);
    setGeneratedSummary(report.summary);
    setReportStatus(report.status);
    setView('EDITOR');
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm(language === 'zh' ? '確定刪除此報告？' : 'Delete this report?')) {
      await deleteWeeklyReport(id);
      loadReports();
    }
  };

  const handleSaveReport = async (status: 'Draft' | 'Submitted') => {
    setIsSaving(true);
    const id = currentReportId || `WR-${weekStart.replace(/-/g, '')}`; 
    
    const record: WeeklyReportRecord = {
      id,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      submittedDate,
      preparedBy: reporterName,
      preparedByTitle: reporterTitle,
      endorsedBy: managerName,
      summary: generatedSummary || '',
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveWeeklyReport(record);
      await loadReports();
      if (status === 'Submitted') {
        alert(language === 'zh' ? '報告已提交並儲存' : 'Report submitted and saved');
        setView('LIST');
      } else {
        alert(language === 'zh' ? '草稿已儲存' : 'Draft saved');
        setCurrentReportId(id); 
        setReportStatus('Draft');
      }
    } catch (error) {
      alert("Error saving report");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    setLoading(true);
    const summary = await generateWeeklySummary(filteredInspections, language);
    setGeneratedSummary(summary);
    setLoading(false);
  };

  const filteredInspections = useMemo(() => {
    if (view !== 'EDITOR' || !weekStart || !weekEnd) return [];
    return inspections.filter(i => i.date >= weekStart && i.date <= weekEnd);
  }, [inspections, view, weekStart, weekEnd]);

  const findings = useMemo(() => {
    return filteredInspections.flatMap(insp => 
      insp.items
        .filter(item => item.status === 'At Risk')
        .map(item => ({
          ...item,
          inspectionId: insp.id,
          inspectionDate: insp.date,
          location: insp.location,
          inspector: insp.inspectorName
        }))
    ).sort((a, b) => a.inspectionDate.localeCompare(b.inspectionDate));
  }, [filteredInspections]);

  // Report Number
  const reportNo = `WR-${weekStart.replace(/-/g, '')}`;
  const RISK_LEVEL_MAP: Record<string, string> = { 
    'Low': language === 'zh' ? '低' : 'Low', 
    'Medium': language === 'zh' ? '中' : 'Medium', 
    'High': language === 'zh' ? '高' : 'High',
    'Extreme': language === 'zh' ? '極高' : 'Extreme'
  };

  // --- PDF Export Logic ---
  const getPdfOptions = () => ({
    margin: [10, 10, 10, 10],
    filename: `WeeklyReport_${weekStart}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  });

  const performExport = (mode: 'save' | 'preview') => {
    setIsPdfGenerating(true);
    let previewWindow: Window | null = null;
    if (mode === 'preview') {
        previewWindow = window.open('', '_blank');
        if (previewWindow) {
             previewWindow.document.write(`<html><head><title>${t.previewPdf}</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#f3f4f6;"><div style="text-align:center;"><h3 style="color:#374151;">${t.generating}</h3><div style="margin-top:10px;border: 3px solid #f3f3f3;border-top: 3px solid #3b82f6;border-radius: 50%;width: 20px;height: 20px;animation: spin 1s linear infinite;margin-left:auto;margin-right:auto;"></div><style>@keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style></div></body></html>`);
        } else {
             alert(t.popupBlocked);
             setIsPdfGenerating(false);
             return;
        }
    }

    setTimeout(() => {
        const element = document.getElementById('report-content');
        if (!element || !window.html2pdf) {
            setIsPdfGenerating(false);
            if (previewWindow) previewWindow.close();
            return;
        }
        const worker = window.html2pdf().set(getPdfOptions()).from(element);
        if (mode === 'save') {
             worker.save().then(() => setIsPdfGenerating(false)).catch(() => setIsPdfGenerating(false));
        } else {
             worker.output('bloburl').then((blobUrl: string) => {
                    if (previewWindow) previewWindow.location.href = blobUrl;
                    setIsPdfGenerating(false);
                }).catch(() => { if(previewWindow) previewWindow.close(); setIsPdfGenerating(false); });
        }
    }, 500);
  };
  const handleExportPDF = () => performExport('save');
  const handlePreviewPDF = () => performExport('preview');
  const handlePrint = () => window.print();

  // --- RENDER ---

  if (view === 'LIST') {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{t.managementTitle}</h2>
          <button onClick={() => loadReports()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><RotateCw size={20} /></button>
        </div>

        {/* Pending Reports Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100 flex items-center gap-2">
            <AlertTriangle className="text-yellow-600" size={20} />
            <h3 className="font-bold text-yellow-800">{t.pendingReports}</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingWeeks.length === 0 ? (
              <div className="p-6 text-center text-gray-500 italic">{t.noPending}</div>
            ) : (
              pendingWeeks.map((week) => (
                <div key={week.start} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="font-bold text-gray-900">{getPeriodLabel(week.start, language)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{week.start} - {week.end}</div>
                    <div className="text-sm text-gray-500 mt-1">{week.count} {t.inspectionsCount}</div>
                  </div>
                  <button 
                    onClick={() => handleCreateReport(week.start, week.end)}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold text-sm"
                  >
                    <Plus size={16} /> {t.create}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Report History Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <History className="text-gray-600" size={20} />
            <h3 className="font-bold text-gray-800">{t.reportHistory}</h3>
          </div>
          <div className="divide-y divide-gray-100">
             {savedReports.length === 0 ? (
               <div className="p-6 text-center text-gray-500 italic">{t.noHistory}</div>
             ) : (
               savedReports.map((report) => (
                 <div key={report.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                   <div>
                     <div className="font-bold text-gray-900 flex items-center gap-2">
                       {getPeriodLabel(report.weekStartDate, language)}
                       <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                         report.status === 'Submitted' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                       }`}>
                         {report.status === 'Submitted' ? t.statusSubmitted : t.statusDraft}
                       </span>
                     </div>
                     <div className="text-xs text-gray-500 mt-0.5">{report.weekStartDate} - {report.weekEndDate}</div>
                     <div className="text-sm text-gray-500 mt-1">
                       {t.reportNo} {report.id} • {t.preparedBy}: {report.preparedBy || '-'}
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => handleEditReport(report)}
                       className="p-2 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-100"
                       title={t.edit}
                     >
                       <Edit2 size={18} />
                     </button>
                     <button 
                       onClick={() => handleDeleteReport(report.id)}
                       className="p-2 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100"
                       title="Delete"
                     >
                       <Trash2 size={18} />
                     </button>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW ---
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 print:p-0 print:max-w-none print:mx-0 print:w-full">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; margin-bottom: 20mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; }
          .print-container { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; }
          tr, .summary-box { break-inside: avoid; page-break-inside: avoid; }
          h1 { font-size: 24px !important; }
          h2 { font-size: 18px !important; }
          .print-text-sm { font-size: 11px !important; }
          .print-text-xs { font-size: 9px !important; }
          td, th { padding: 4px 6px !important; }
          .border-print { border: 1px solid black !important; }
        }
        /* B&W Mode Styles */
        .mode-bw {
          filter: grayscale(100%);
        }
        .mode-bw * {
          color: black !important;
          border-color: black !important;
        }
        .mode-bw img {
          filter: grayscale(100%) contrast(1.1);
        }
      `}</style>
      
      {/* Screen-only Controls */}
      <div className={`print:hidden space-y-6 ${isPdfGenerating ? 'hidden' : ''}`}>
        <button onClick={() => setView('LIST')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium">
          <ArrowLeft size={20} /> {t.backToList}
        </button>

        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t.generatorTitle}</h2>
            <div className="text-sm text-gray-500 mt-1 font-mono">
               {t.reportNo} {currentReportId || 'NEW'}
            </div>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => handleSaveReport('Draft')}
               disabled={isSaving}
               className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2"
             >
               <Save size={18} /> {t.saveDraft}
             </button>
             <button 
               onClick={() => handleSaveReport('Submitted')}
               disabled={isSaving}
               className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center gap-2"
             >
               <CheckCircle size={18} /> {t.saveFinal}
             </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.startDate}</label>
                   <input type="date" value={weekStart} disabled className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500" />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.endDate}</label>
                   <input type="date" value={weekEnd} disabled className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500" />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.submittedDate}</label>
                   <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input type="date" value={submittedDate} onChange={(e) => setSubmittedDate(e.target.value)} className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                   </div>
                </div>
                <div className="relative z-10">
                   <EditableSelect label={t.preparedBy} value={reporterName} options={savedReporters} onChange={setReporterName} onOptionsChange={onUpdateReporters} placeholder={t.newItem} />
                </div>
                <div>
                   <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.preparedByTitle}</label>
                   <input 
                      type="text" 
                      value={reporterTitle} 
                      onChange={(e) => setReporterTitle(e.target.value)} 
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                </div>
                <div className="relative z-10">
                   <EditableSelect label={t.endorsedBy} value={managerName} options={savedManagers} onChange={setManagerName} onOptionsChange={onUpdateManagers} placeholder={t.newItem} />
                </div>
           </div>
           
           <div className="flex gap-4 border-t border-gray-100 pt-4">
               <button onClick={handleGenerateAI} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-70">
                 {loading ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />} {t.generateAI}
               </button>
               <div className="flex-1"></div>
               <button 
                onClick={() => setIsBW(!isBW)} 
                className={`px-4 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 border transition-all ${isBW ? 'bg-gray-800 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
               >
                 <Palette size={18} /> {t.toggleBW}
               </button>
               <button onClick={handlePreviewPDF} disabled={isPdfGenerating} className="bg-white hover:bg-gray-50 text-purple-600 border border-purple-200 px-6 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all disabled:opacity-50">
                 <Eye size={18} /> {t.previewPdf}
               </button>
               <button onClick={handleExportPDF} disabled={isPdfGenerating} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50">
                 <Download size={18} /> {isPdfGenerating ? t.generating : t.exportPdf}
               </button>
               <button onClick={handlePrint} className="bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all">
                 <Printer size={18} /> {t.print}
               </button>
           </div>
        </div>
      </div>

      {/* The Report (Visible on Screen & Print) */}
      <div id="report-content" className={`bg-white shadow-lg print:shadow-none border border-gray-200 print:border-none p-12 min-h-[1123px] relative mx-auto print:w-full print-container text-black print:text-black ${isBW ? 'mode-bw' : ''}`}>
        
        {/* HEADER BLOCK - Standard Safety Report Header */}
        <div className="mb-6 break-inside-avoid">
           <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
              <h1 className="text-2xl font-bold text-black uppercase tracking-tight">{t.reportTitle}</h1>
           </div>
           <div className="border border-black flex text-sm">
             <div className="flex-1 border-r border-black p-2">
                <span className="font-bold block text-xs uppercase text-black">{t.reportNo}</span>
                <span className="font-mono font-bold text-base text-black">{reportNo}</span>
             </div>
             <div className="flex-1 border-r border-black p-2">
                <span className="font-bold block text-xs uppercase text-black">{t.submittedDate}</span>
                <span className="text-black">{submittedDate}</span>
             </div>
             <div className="flex-1 p-2">
                <span className="font-bold block text-xs uppercase text-black">{t.weekOf}</span>
                <span className="text-black">{getPeriodLabel(weekStart, language)}</span>
             </div>
           </div>
        </div>

        {/* 1.0 REPORT SUMMARY */}
        <div className="mb-8 summary-box">
             <h3 className="font-bold text-black mb-2 text-sm uppercase tracking-wide border-b border-black pb-1">{t.sec1}</h3>
             
             {generatedSummary ? (
                <div className="p-4 border border-black bg-white text-sm text-justify leading-relaxed whitespace-pre-line text-black">
                   {generatedSummary}
                </div>
             ) : (
                <div className="p-4 border border-black bg-white text-sm italic text-black text-center">
                   (Summary not generated)
                </div>
             )}
        </div>

        {/* 2.0 WEEKLY INSPECTION RECORD */}
        <div className="mb-8 print:break-inside-auto">
           <h3 className="font-bold text-black mb-2 text-sm uppercase tracking-wide border-b border-black pb-1">{t.sec2}</h3>
           <div className="border border-black">
              <table className="w-full text-xs text-left border-collapse table-fixed">
                 <thead className="bg-gray-100 text-black font-bold border-b border-black">
                    <tr>
                       <th className="border-r border-black px-2 py-2 w-[15%]">{t.tableDate}</th>
                       <th className="border-r border-black px-2 py-2 w-[20%]">{t.tableLocation}</th>
                       <th className="border-r border-black px-2 py-2 w-[40%]">{t.colSystem}</th>
                       <th className="border-r border-black px-2 py-2 w-[10%]">{t.colInspector}</th>
                       <th className="px-2 py-2 w-[15%] text-center">{t.colResult}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-black">
                    {filteredInspections.length === 0 ? (
                       <tr><td colSpan={5} className="px-4 py-8 text-center text-black italic border-r border-black last:border-r-0">{t.noActivity}</td></tr>
                    ) : (
                       filteredInspections.map(insp => {
                          const categories = Array.from(new Set(insp.items.map(i => i.category))).join(', ');
                          const violationCount = insp.items.filter(i => i.status === 'At Risk').length;
                          return (
                             <tr key={insp.id} className="hover:bg-gray-50 print:break-inside-avoid">
                                <td className="border-r border-black px-2 py-2 text-black whitespace-normal break-words">{insp.date}</td>
                                <td className="border-r border-black px-2 py-2 font-medium text-black whitespace-normal break-words">{insp.location}</td>
                                <td className="border-r border-black px-2 py-2 text-black whitespace-normal break-words">{categories}</td>
                                <td className="border-r border-black px-2 py-2 text-black whitespace-normal break-words">{insp.inspectorName}</td>
                                <td className="px-2 py-2 text-center align-middle">
                                   {violationCount === 0 ? (
                                      <span className="font-bold text-black text-[10px] uppercase border border-black px-1 py-0.5 rounded">
                                         {t.safe}
                                      </span>
                                   ) : (
                                      <span className="font-bold text-black text-[10px] uppercase border border-black px-1 py-0.5 rounded">
                                         {t.unsatisfactory} ({violationCount})
                                      </span>
                                   )}
                                </td>
                             </tr>
                          );
                       })
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* 3.0 NON-COMPLIANCE FINDINGS LOG */}
        <div className="mb-8 print:break-inside-auto">
           <h3 className="font-bold text-black mb-2 text-sm uppercase tracking-wide border-b border-black pb-1">{t.sec3}</h3>
           <div className="border border-black">
              <table className="w-full text-xs text-left border-collapse table-fixed">
                 <thead className="bg-gray-100 text-black font-bold border-b-2 border-black">
                    <tr>
                       <th className="border-r border-black px-2 py-2 w-[10%] text-center">{t.tableDate}</th>
                       <th className="border-r border-black px-2 py-2 w-[12%] text-center">{t.tableEvidence}</th>
                       <th className="border-r border-black px-2 py-2 w-[30%]">{t.tableObservation}</th>
                       <th className="border-r border-black px-2 py-2 w-[28%]">{t.tableAction}</th>
                       <th className="border-r border-black px-2 py-2 w-[10%] text-center">{t.tableTarget}</th>
                       <th className="px-2 py-2 w-[10%] text-center">{t.tableStatus}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-black">
                    {findings.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-black italic">{t.noFindings}</td></tr>
                    ) : (
                      findings.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="break-inside-avoid print:break-inside-avoid hover:bg-gray-50">
                           <td className="border-r border-black px-2 py-2 text-center align-top font-medium text-black">
                              <div>{item.inspectionDate}</div>
                              <div className="text-[10px] mt-1 text-black">{item.location}</div>
                           </td>
                           <td className="border-r border-black px-2 py-2 align-top text-center">
                              {item.photoData || item.photoUrl ? (
                                 <div className={`mx-auto ${isPdfGenerating ? 'w-full border-none shadow-none p-0 bg-transparent' : 'w-16 h-16 border border-black bg-white p-0.5 shadow-sm'} print:w-full print:border-none print:shadow-none print:p-0 print:bg-transparent`}>
                                    <img src={item.photoData || item.photoUrl} alt="Evidence" className={`w-full object-cover ${isPdfGenerating ? 'h-auto rounded-none' : 'h-full rounded-sm'} print:h-auto print:rounded-none`} />
                                 </div>
                              ) : (
                                 <span className="text-[10px] text-black">-</span>
                              )}
                           </td>
                           <td className="border-r border-black px-2 py-2 align-top text-black whitespace-normal break-words">
                              <div className="font-bold mb-1">{item.category}</div>
                              <div>{item.observation}</div>
                              <div className="mt-1">
                                <span className="text-[9px] px-1 rounded-sm border border-black font-bold uppercase text-black bg-transparent">
                                   {RISK_LEVEL_MAP[item.riskLevel] || item.riskLevel} {t.risk}
                                </span>
                              </div>
                           </td>
                           <td className="border-r border-black px-2 py-2 align-top text-black whitespace-normal break-words">
                              <div className="italic">{item.remedialAction}</div>
                           </td>
                           <td className="border-r border-black px-2 py-2 align-top text-center text-black">
                              {item.proposedCompletionDate || '-'}
                           </td>
                           <td className="px-2 py-2 align-top text-center text-black">
                              <span className="text-[10px] font-bold px-1 py-0.5 rounded border border-black bg-transparent">
                                 {item.actionStatus === 'Pending' ? t.pending : item.actionStatus === 'Follow-up' ? t.followUp : t.completed}
                              </span>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* 4.0 ENDORSEMENT SECTION */}
        <div className="mt-12 break-inside-avoid summary-box">
           <h3 className="font-bold text-black mb-4 text-sm uppercase tracking-wide border-b border-black pb-1">{t.sec4}</h3>
           <div className="grid grid-cols-2 gap-8">
               {/* Prepared By */}
               <div className="border border-black p-4 bg-white">
                  <p className="text-xs font-bold text-black uppercase mb-8">{reporterTitle}</p>
                  <div className="border-b border-black h-8 mb-2"></div>
                  <div className="flex justify-between items-end mt-4">
                      <div className="text-xs">
                          <span className="block text-black uppercase font-bold">{t.name}</span>
                          <span className="text-sm font-serif text-black">{reporterName}</span>
                      </div>
                      <div className="text-xs text-right">
                          <span className="block text-black uppercase font-bold">{t.dateSign}</span>
                          <span className="text-sm font-serif text-black">{submittedDate}</span>
                      </div>
                  </div>
               </div>
               {/* Endorsed By */}
               <div className="border border-black p-4 bg-white">
                  <p className="text-xs font-bold text-black uppercase mb-8">{t.signEndorsed}</p>
                  <div className="border-b border-black h-8 mb-2"></div>
                   <div className="flex justify-between items-end mt-4">
                      <div className="text-xs">
                          <span className="block text-black uppercase font-bold">{t.name}</span>
                          <span className="text-sm font-serif text-black">{managerName}</span>
                      </div>
                      <div className="text-xs text-right">
                          <span className="block text-black uppercase font-bold">{t.dateSign}</span>
                          <span className="text-sm font-serif text-black">{submittedDate}</span>
                      </div>
                  </div>
               </div>
           </div>
           <div className="mt-4 text-[10px] text-black text-justify leading-tight"><strong>{t.disclaimerTitle}</strong> {t.disclaimerText}</div>
        </div>

        {/* Fixed Footer (Screen Version - Static at bottom of container) */}
        <div className="mt-8 flex justify-between items-center px-6 py-4 text-[10px] text-black bg-white border-t border-black print:hidden">
            <div className="flex-1">{t.pageFooter}</div>
            <div className="flex gap-8"><div>{t.reportNo} <span className="font-bold text-black">{reportNo}</span></div></div>
        </div>

        {/* Fixed Footer (Print Version - Fixed at bottom of page) */}
        <div className="fixed bottom-0 left-0 w-full flex justify-between items-center px-10 py-4 text-[10px] text-black bg-white border-t border-black hidden print:flex z-50">
            <div className="flex-1">{t.pageFooter}</div>
            <div className="flex gap-8"><div>{t.reportNo} <span className="font-bold text-black">{reportNo}</span></div></div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyReports;
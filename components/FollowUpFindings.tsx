
import React, { useState, useMemo } from 'react';
import { InspectionRecord, Language, SafetyItem } from '../types';
import { Search, Filter, Printer, Calendar, FileSpreadsheet, ArrowUpDown, ShieldCheck, Download, Eye } from 'lucide-react';

interface FollowUpFindingsProps {
  inspections: InspectionRecord[];
  onUpdateStatus: (inspectionId: string, itemId: string, status: string) => void;
  onUpdateDate: (inspectionId: string, itemId: string, date: string) => void;
  language: Language;
}

// Helper to flatten findings
interface FlatFinding extends SafetyItem {
  inspectionId: string;
  inspectionDate: string;
  location: string;
  inspectorName: string;
}

const FollowUpFindings: React.FC<FollowUpFindingsProps> = ({ inspections, onUpdateStatus, onUpdateDate, language }) => {
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortOption, setSortOption] = useState<string>('date_desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const t = {
    title: language === 'zh' ? '跟進事項監察' : 'Follow-up Monitor',
    desc: language === 'zh' ? '監察及更新所有違規事項的跟進狀態。' : 'Monitor and update status of all non-compliance findings.',
    searchPlaceholder: language === 'zh' ? '搜尋地點、類別或描述...' : 'Search location, category or description...',
    statusFilter: language === 'zh' ? '狀態篩選' : 'Status Filter',
    sortBy: language === 'zh' ? '排序' : 'Sort By',
    sortDateDesc: language === 'zh' ? '日期 (最新)' : 'Date (Newest)',
    sortDateAsc: language === 'zh' ? '日期 (最早)' : 'Date (Oldest)',
    sortLoc: language === 'zh' ? '地點 (A-Z)' : 'Location (A-Z)',
    sortCat: language === 'zh' ? '類別 (A-Z)' : 'Category (A-Z)',
    all: language === 'zh' ? '全部' : 'All',
    pending: language === 'zh' ? '待處理' : 'Pending',
    followUp: language === 'zh' ? '跟進中' : 'Follow-up',
    completed: language === 'zh' ? '已完成' : 'Completed',
    print: language === 'zh' ? '列印' : 'Print',
    exportExcel: language === 'zh' ? '匯出 Excel' : 'Export Excel',
    exportPdf: language === 'zh' ? '下載 PDF' : 'Download PDF',
    previewPdf: language === 'zh' ? '預覽 PDF' : 'Preview PDF',
    generating: language === 'zh' ? '生成中...' : 'Generating...',
    
    // Table Headers
    colDate: language === 'zh' ? '日期 / 地點' : 'Date / Location',
    colFinding: language === 'zh' ? '發現事項' : 'Finding',
    colAction: language === 'zh' ? '補救措施' : 'Remedial Action',
    colStatus: language === 'zh' ? '狀態' : 'Status',
    noFindings: language === 'zh' ? '沒有符合條件的記錄。' : 'No matching records found.',
    
    // Print Header
    printTitle: language === 'zh' ? '違規事項跟進報告' : 'Non-Compliance Follow-up Report',
    generatedOn: language === 'zh' ? '生成日期:' : 'Generated on:',
    cap59: language === 'zh' ? '工廠及工業經營條例 (第59章) 記錄' : 'Factories and Industrial Undertakings Ordinance (Cap. 59) Record',

    // Dynamic UI Elements
    riskExtreme: language === 'zh' ? '極高風險' : 'Extreme Risk',
    riskHigh: language === 'zh' ? '高風險' : 'High Risk',
    riskMedium: language === 'zh' ? '中風險' : 'Medium Risk',
    riskLow: language === 'zh' ? '低風險' : 'Low Risk',
    target: language === 'zh' ? '目標:' : 'Target:',
    clickToUpdate: language === 'zh' ? '點擊更新' : 'Click to update',
    footer: language === 'zh' ? '工廠安全中心系統 • 僅供內部使用' : 'Factory SafetyHub System • Internal Use Only',
    
    // PDF Preview
    popupBlocked: language === 'zh' ? '彈出視窗被封鎖！請允許本網站顯示彈出視窗以預覽 PDF。' : 'Popup blocked! Please allow popups to preview PDF.',
    generatingPreview: language === 'zh' ? '正在生成 PDF 預覽，請稍候...' : 'Generating PDF Preview, please wait...',
  };

  // Flatten, Filter, and Sort "At Risk" items
  const processedFindings = useMemo(() => {
    // 1. Flatten
    const flat: FlatFinding[] = [];
    inspections.forEach(insp => {
      insp.items.forEach(item => {
        if (item.status === 'At Risk') {
          flat.push({
            ...item,
            inspectionId: insp.id,
            inspectionDate: insp.date,
            location: insp.location,
            inspectorName: insp.inspectorName
          });
        }
      });
    });

    // 2. Filter
    const filtered = flat.filter(f => {
      const matchesSearch = 
        f.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.observation.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'All' 
        ? true 
        : (f.actionStatus || 'Pending') === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // 3. Sort
    return filtered.sort((a, b) => {
        switch(sortOption) {
            case 'date_asc':
                return new Date(a.inspectionDate).getTime() - new Date(b.inspectionDate).getTime();
            case 'date_desc':
                return new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime();
            case 'location':
                return a.location.localeCompare(b.location, language === 'zh' ? 'zh-HK' : 'en');
            case 'category':
                return a.category.localeCompare(b.category, language === 'zh' ? 'zh-HK' : 'en');
            default:
                return new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime();
        }
    });
  }, [inspections, searchTerm, filterStatus, sortOption, language]);

  const handleExportExcel = () => {
    const csvHeaders = [
        language === 'zh' ? '日期' : 'Date',
        language === 'zh' ? '地點' : 'Location',
        language === 'zh' ? '類別' : 'Category',
        language === 'zh' ? '發現事項' : 'Observation',
        language === 'zh' ? '風險等級' : 'Risk Level',
        language === 'zh' ? '補救措施' : 'Remedial Action',
        language === 'zh' ? '目標完成日期' : 'Target Date',
        language === 'zh' ? '狀態' : 'Status',
        language === 'zh' ? '巡查員' : 'Inspector',
        language === 'zh' ? '照片連結' : 'Photo URL'
    ];

    const getRiskLabel = (level?: string) => {
        if (!level) return '';
        if (language === 'zh') {
            const map: Record<string, string> = { 'Low': '低', 'Medium': '中', 'High': '高', 'Extreme': '極高' };
            return map[level] || level;
        }
        return level;
    };

    const getStatusLabel = (status?: string) => {
        const s = status || 'Pending';
        if (language === 'zh') {
            const map: Record<string, string> = { 'Pending': '待處理', 'Follow-up': '跟進中', 'Completed': '已完成' };
            return map[s] || s;
        }
        return s;
    };

    const rows = processedFindings.map(item => [
        item.inspectionDate,
        item.location,
        item.category,
        item.observation.replace(/"/g, '""'), // Escape double quotes
        getRiskLabel(item.riskLevel),
        item.remedialAction.replace(/"/g, '""'),
        item.proposedCompletionDate || '',
        getStatusLabel(item.actionStatus),
        item.inspectorName,
        item.photoUrl || (item.photoData ? (language === 'zh' ? '[已上傳照片數據]' : '[Image Data Uploaded]') : '')
    ]);

    const csvContent = [
        csvHeaders.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 recognition
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Safety_FollowUp_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPdfOptions = () => ({
    margin: [10, 10, 10, 10], // mm
    filename: `Safety_FollowUp_${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  });

  const performExport = (mode: 'save' | 'preview') => {
    setIsPdfGenerating(true);

    // Pre-open window for preview to avoid popup blockers
    let previewWindow: Window | null = null;
    if (mode === 'preview') {
        previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.document.write(`
                <html>
                    <head><title>${t.previewPdf}</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#f3f4f6;">
                        <div style="text-align:center;">
                            <h3 style="color:#374151;">${t.generatingPreview}</h3>
                            <div style="margin-top:10px;border: 3px solid #f3f3f3;border-top: 3px solid #3b82f6;border-radius: 50%;width: 20px;height: 20px;animation: spin 1s linear infinite;margin-left:auto;margin-right:auto;"></div>
                            <style>@keyframes spin {0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}</style>
                        </div>
                    </body>
                </html>
            `);
        } else {
            alert(t.popupBlocked);
            setIsPdfGenerating(false);
            return;
        }
    }

    // Allow time for DOM updates (showing/hiding elements) before capture
    setTimeout(() => {
        const element = document.getElementById('followup-content');
        if (!element || !window.html2pdf) {
            setIsPdfGenerating(false);
            if (previewWindow) previewWindow.close();
            if (!window.html2pdf) alert("PDF library not loaded. Please refresh.");
            return;
        }
        
        const worker = window.html2pdf().set(getPdfOptions()).from(element);
        
        if (mode === 'save') {
             worker.save()
                .catch((err: any) => console.error("PDF Export Error", err))
                .finally(() => setIsPdfGenerating(false));
        } else {
             worker.output('bloburl')
                .then((blobUrl: string) => {
                    if (previewWindow) {
                        previewWindow.location.href = blobUrl;
                    }
                })
                .catch((err: any) => {
                    console.error("PDF Preview Error", err);
                    if (previewWindow) previewWindow.close();
                })
                .finally(() => setIsPdfGenerating(false));
        }
    }, 500);
  };

  const getRiskDisplay = (level?: string) => {
      if (level === 'Extreme') return t.riskExtreme;
      if (level === 'High') return t.riskHigh;
      if (level === 'Medium') return t.riskMedium;
      if (level === 'Low') return t.riskLow;
      return level || '';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:pb-0 print:max-w-none print:mx-0 print:w-full print:space-y-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0; /* Hide browser headers/footers */
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          .print-content-wrapper {
             padding: 10mm 15mm !important;
          }
          /* Grid Table Styles for Print */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 1px solid #000 !important;
          }
          thead tr {
            background-color: #f3f4f6 !important;
            border-bottom: 2px solid #000 !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px 8px !important;
            vertical-align: top !important;
          }
          /* Remove Container Styles */
          .print-clean {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Images in Print */
          img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
          }
        }
        
        /* PDF Generation Styles (Mimic Print) */
        .pdf-export table {
            border-collapse: collapse !important;
            width: 100% !important;
            border: 1px solid #000 !important;
        }
        .pdf-export thead tr {
            background-color: #f3f4f6 !important;
            border-bottom: 2px solid #000 !important;
        }
        .pdf-export th, .pdf-export td {
            border: 1px solid #000 !important;
            padding: 6px 8px !important;
            vertical-align: top !important;
        }
        .pdf-export .print-clean {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        .pdf-export img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
        }
      `}</style>

      {/* Screen Control Panel */}
      <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:hidden ${isPdfGenerating ? 'hidden' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
            <p className="text-gray-500 mt-1">{t.desc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-medium transition-colors border border-green-200"
            >
               <FileSpreadsheet size={18} /> {t.exportExcel}
            </button>
            <button 
              onClick={() => performExport('preview')} 
              disabled={isPdfGenerating}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-medium transition-colors border border-purple-200 disabled:opacity-50"
            >
               <Eye size={18} /> {t.previewPdf}
            </button>
            <button 
              onClick={() => performExport('save')} 
              disabled={isPdfGenerating}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-200 disabled:opacity-50"
            >
               <Download size={18} /> {isPdfGenerating ? t.generating : t.exportPdf}
            </button>
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors border border-blue-200"
            >
               <Printer size={18} /> {t.print}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
                <ArrowUpDown size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap hidden md:inline">{t.sortBy}:</span>
                <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
                >
                <option value="date_desc">{t.sortDateDesc}</option>
                <option value="date_asc">{t.sortDateAsc}</option>
                <option value="location">{t.sortLoc}</option>
                <option value="category">{t.sortCat}</option>
                </select>
            </div>

            <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap hidden md:inline">{t.statusFilter}:</span>
                <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                <option value="All">{t.all}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Follow-up">{t.followUp}</option>
                <option value="Completed">{t.completed}</option>
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div id="followup-content" className={`print:p-[15mm] ${isPdfGenerating ? 'p-[15mm] pdf-export' : ''}`}>
        
        {/* Print/PDF Header */}
        <div className={`hidden print:block mb-8 ${isPdfGenerating ? '!block' : ''}`}>
            <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tight text-black">{t.printTitle}</h1>
                </div>
                <div className="text-right">
                </div>
            </div>
        </div>

        {/* Table Container */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-clean ${isPdfGenerating ? 'print-clean' : ''}`}>
            <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold print:bg-gray-100 print:text-black print:table-header-group">
                <tr>
                    <th className="px-6 py-4 w-[20%] print:px-2 print:py-2">{t.colDate}</th>
                    <th className="px-6 py-4 w-[30%] print:px-2 print:py-2">{t.colFinding}</th>
                    <th className="px-6 py-4 w-[30%] print:px-2 print:py-2">{t.colAction}</th>
                    <th className="px-6 py-4 w-[20%] print:px-2 print:py-2">{t.colStatus}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm print:divide-transparent">
                {processedFindings.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">{t.noFindings}</td></tr>
                ) : (
                    processedFindings.map((item) => (
                    <tr key={`${item.inspectionId}-${item.id}`} className="hover:bg-gray-50 break-inside-avoid print:break-inside-avoid">
                        <td className="px-6 py-4 align-top print:px-2 print:py-3">
                        <div className="font-bold text-gray-900 print:text-black">{item.inspectionDate}</div>
                        <div className="text-gray-500 mt-1 print:text-black">{item.location}</div>
                        <div className="text-xs text-gray-400 mt-0.5 print:text-gray-600">{item.inspectorName}</div>
                        <div className={`mt-2 inline-block px-2 py-0.5 rounded border bg-gray-100 text-gray-600 text-xs border-gray-200 print:border-black print:bg-transparent print:text-black ${isPdfGenerating ? '!border-black !text-black !bg-transparent' : ''}`}>
                            {item.category}
                        </div>
                        </td>
                        <td className="px-6 py-4 align-top print:px-2 print:py-3">
                            <p className="text-gray-900 mb-2 print:text-black">{item.observation}</p>
                            {/* Risk Tag */}
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                item.riskLevel === 'Extreme' ? 'bg-red-200 text-red-900 border-red-300' :
                                item.riskLevel === 'High' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                                item.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                'bg-blue-50 text-blue-600 border-blue-100'
                            } print:border-black print:text-black print:bg-transparent ${isPdfGenerating ? '!border-black !text-black !bg-transparent' : ''}`}>
                            {getRiskDisplay(item.riskLevel)}
                            </span>
                            {/* Thumbnail */}
                            {(item.photoData || item.photoUrl) && (
                            <div className="mt-3">
                                <img src={item.photoData || item.photoUrl} className="h-12 w-12 object-cover rounded border border-gray-200 cursor-pointer hover:scale-150 transition-transform origin-left print:h-16 print:w-16 print:border-black print:shadow-none" alt="Evidence" />
                            </div>
                            )}
                        </td>
                        <td className="px-6 py-4 align-top print:px-2 print:py-3">
                            <p className="text-gray-800 italic mb-3 print:text-black">{item.remedialAction}</p>
                            <div className={`flex items-center gap-2 print:hidden ${isPdfGenerating ? 'hidden' : ''}`}>
                            <Calendar size={14} className="text-gray-400" />
                            <input 
                                type="date" 
                                value={item.proposedCompletionDate || ''}
                                onChange={(e) => onUpdateDate(item.inspectionId, item.id, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-500 transition-colors"
                            />
                            </div>
                            {item.proposedCompletionDate && (
                                <div className={`hidden print:block text-xs text-gray-600 mt-1 print:text-black ${isPdfGenerating ? '!block' : ''}`}>
                                    {t.target} {item.proposedCompletionDate}
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4 align-top print:px-2 print:py-3">
                            <select
                            value={item.actionStatus || 'Pending'}
                            onChange={(e) => onUpdateStatus(item.inspectionId, item.id, e.target.value)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold border outline-none cursor-pointer print:hidden ${isPdfGenerating ? 'hidden' : ''} ${
                                item.actionStatus === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                item.actionStatus === 'Follow-up' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                            >
                            <option value="Pending">{t.pending}</option>
                            <option value="Follow-up">{t.followUp}</option>
                            <option value="Completed">{t.completed}</option>
                            </select>
                            <div className={`hidden print:block text-xs font-bold border px-2 py-1 rounded text-center print:text-black print:border-black ${isPdfGenerating ? '!block !border-black !text-black' : ''}`}>
                                {item.actionStatus === 'Pending' ? t.pending : 
                                 item.actionStatus === 'Follow-up' ? t.followUp : 
                                 item.actionStatus === 'Completed' ? t.completed : item.actionStatus}
                            </div>
                            <div className={`mt-2 text-xs text-gray-400 text-center print:hidden ${isPdfGenerating ? 'hidden' : ''}`}>
                                {t.clickToUpdate}
                            </div>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
        </div>
        
        {/* Print Footer Disclaimer */}
        <div className={`hidden print:block text-[10px] text-gray-500 text-center mt-4 border-t pt-4 ${isPdfGenerating ? '!block' : ''}`}>
            {t.footer}
        </div>
      </div>
    </div>
  );
};

export default FollowUpFindings;


import React from 'react';
import { InspectionRecord, InspectionStatus, User, Language } from '../types';
import { CheckCircle, AlertTriangle, ShieldCheck, ArrowLeft, Printer, Edit, Trash2, Download, Eye } from 'lucide-react';

interface ReportViewProps {
  record: InspectionRecord;
  currentUser: User;
  onBack: () => void;
  onEndorse: (id: string) => void;
  onEdit: (record: InspectionRecord) => void;
  onDelete: (id: string) => void;
  language: Language;
}

const ReportView: React.FC<ReportViewProps> = ({ record, currentUser, onBack, onEndorse, onEdit, onDelete, language }) => {
  const t = {
    back: language === 'zh' ? '返回儀表板' : 'Back to Dashboard',
    print: language === 'zh' ? '列印表格 3A' : 'Print Form 3A',
    exportPdf: language === 'zh' ? '下載 PDF' : 'Download PDF',
    previewPdf: language === 'zh' ? '預覽 PDF' : 'Preview PDF',
    edit: language === 'zh' ? '編輯' : 'Edit',
    delete: language === 'zh' ? '刪除' : 'Delete',
    title: language === 'zh' ? '工廠安全記錄 (表格 3A)' : 'Factory Safety Record (Form 3A)',
    inspectionNo: language === 'zh' ? '巡查編號' : 'Inspection #',
    summary: language === 'zh' ? '整體摘要' : 'Overall Summary',
    inspector: language === 'zh' ? '巡查員:' : 'Inspector:',
    list: language === 'zh' ? '巡查清單' : 'Inspection List',
    risk: language === 'zh' ? '風險' : 'Risk',
    violation: language === 'zh' ? '違規' : 'Violation',
    compliant: language === 'zh' ? '合規' : 'Compliant',
    observation: language === 'zh' ? '觀察' : 'Observation',
    action: language === 'zh' ? '補救措施' : 'Remedial Action',
    evidence: language === 'zh' ? '證據' : 'Evidence',
    likelihood: language === 'zh' ? '可能性' : 'Likelihood',
    severity: language === 'zh' ? '嚴重性' : 'Severity',
    completed: language === 'zh' ? '已記錄' : 'Recorded',
    pageFooter: language === 'zh' ? '工廠安全中心 • 符合香港法例第59章記錄' : 'Factory SafetyHub • Cap. 59 Compliance Record',
  };

  const getPdfOptions = () => ({
    margin: [10, 10, 10, 10], // mm: top, left, bottom, right
    filename: `Form3A_${record.id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  });

  const handleExportPDF = () => {
    const element = document.getElementById('report-view-content');
    if (!element) return;
    
    if (window.html2pdf) {
       window.html2pdf().set(getPdfOptions()).from(element).save();
    } else {
       alert("PDF library not loaded. Please refresh.");
    }
  };

  const handlePreviewPDF = () => {
    const element = document.getElementById('report-view-content');
    if (!element) return;
    
    if (window.html2pdf) {
       window.html2pdf().set(getPdfOptions()).from(element).toPdf().get('pdf').then((pdf: any) => {
           window.open(pdf.output('bloburl'), '_blank');
       });
    } else {
       alert("PDF library not loaded. Please refresh.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 print:max-w-none print:w-full print:p-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          #report-view-content {
             width: 100% !important;
             box-shadow: none !important;
             border: none !important;
             border-radius: 0 !important;
          }
          /* Prevent items from splitting across pages */
          .inspection-item {
             break-inside: avoid;
             page-break-inside: avoid;
             border: 1px solid #e5e7eb !important;
          }
          /* Hide non-printable elements */
          .no-print {
             display: none !important;
          }
          /* Compact typography for print */
          h1 { font-size: 20px !important; }
          h2, h3 { font-size: 16px !important; }
          p, div { font-size: 12px !important; }
          .print-text-xs { font-size: 10px !important; }
          /* Reduce spacing */
          .p-8 { padding: 1.5rem !important; }
          .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem !important; }
        }
      `}</style>

      <div className="mb-6 flex justify-between items-center print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={20} /> {t.back}
        </button>
        <div className="flex gap-3">
          <button onClick={() => onEdit(record)} className="flex items-center gap-2 text-gray-600 hover:text-yellow-600 text-sm font-medium border border-gray-300 px-3 py-1.5 rounded-lg bg-white">
            <Edit size={16} /> {t.edit}
          </button>
          <button onClick={() => onDelete(record.id)} className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-sm font-medium border border-gray-300 px-3 py-1.5 rounded-lg bg-white">
            <Trash2 size={16} /> {t.delete}
          </button>
          <div className="h-8 w-px bg-gray-300 mx-1"></div>
          <button onClick={handlePreviewPDF} className="flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium border border-purple-200 px-3 py-1.5 rounded-lg bg-purple-50">
            <Eye size={16} /> {t.previewPdf}
          </button>
          <button onClick={handleExportPDF} className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm font-medium border border-red-200 px-3 py-1.5 rounded-lg bg-red-50">
            <Download size={16} /> {t.exportPdf}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 px-3 py-1.5 rounded-lg bg-blue-50">
            <Printer size={16} /> {t.print}
          </button>
        </div>
      </div>

      <div id="report-view-content" className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200 print:shadow-none print:border-none">
        {/* Header */}
        <div className="bg-gray-900 text-white p-8 print:p-6 print:bg-gray-900 print:text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <ShieldCheck className="text-yellow-400 w-5 h-5 print:w-4 print:h-4" />
                 <span className="text-yellow-400 font-bold tracking-wide text-sm uppercase print-text-xs">{t.title}</span>
              </div>
              <h1 className="text-2xl font-bold print:text-xl">{t.inspectionNo} #{record.id.slice(-6)}</h1>
              <p className="text-gray-400 mt-1 print:text-gray-300">{record.location} • {record.date}</p>
            </div>
            <div className="px-4 py-2 rounded-lg font-bold border bg-green-500/20 border-green-500 text-green-400 print:border-white print:text-white print:bg-transparent">
              {t.completed}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 print:p-6 print:space-y-6">
          
          {/* Summary Section */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200 print:bg-white print:border-gray-300 inspection-item">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 print:text-black">{t.summary}</h3>
            <p className="text-gray-800 leading-relaxed text-justify">{record.overallSummary}</p>
            <div className="mt-4 flex items-center gap-6 text-sm">
               <div className="flex items-center gap-2">
                 <span className="text-gray-500 print:text-gray-700">{t.inspector}</span>
                 <span className="font-semibold text-gray-900">{record.inspectorName}</span>
               </div>
            </div>
          </section>

          {/* Items List */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{t.list}</h3>
            <div className="space-y-6 print:space-y-4">
              {record.items.map((item, idx) => (
                <div key={item.id} className="inspection-item flex gap-4 p-4 border rounded-xl hover:shadow-sm transition-shadow print:rounded-lg print:border-gray-300">
                  <div className="flex-shrink-0 w-8 text-center pt-1 font-mono text-gray-400 text-sm font-bold">
                    {idx + 1 < 10 ? `0${idx+1}` : idx+1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-base">{item.category}</h4>
                      {item.status === 'At Risk' ? (
                        <div className="flex items-center gap-2">
                           {item.riskLevel && (
                              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border print:border-gray-400 print:text-black ${
                                item.riskLevel === 'Extreme' ? 'bg-red-200 text-red-900 border-red-300' :
                                item.riskLevel === 'High' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                                item.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                'bg-green-100 text-green-800 border-green-200'
                              }`}>
                                {item.riskLevel} {t.risk}
                              </span>
                           )}
                           <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full border border-red-100 print:text-black print:border-black print:bg-transparent">
                             <AlertTriangle size={12} /> {t.violation}
                           </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full border border-green-100 print:text-black print:border-black print:bg-transparent">
                          <CheckCircle size={12} /> {t.compliant}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-3">
                      <div className="space-y-3 print:col-span-2">
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 print:bg-transparent print:p-0">
                          <span className="block text-xs text-gray-400 uppercase font-semibold mb-1 print:text-gray-600">{t.observation}</span>
                          <span className="print:text-black">{item.observation}</span>
                        </div>
                        {item.status === 'At Risk' && (
                          <div className="bg-red-50 p-3 rounded text-sm text-gray-800 border border-red-100 print:bg-transparent print:border-none print:p-0 print:pt-2">
                            <span className="block text-xs text-red-400 uppercase font-semibold mb-1 print:text-gray-600">{t.action}</span>
                            <span className="print:text-black">{item.remedialAction}</span>
                          </div>
                        )}
                        {item.riskLikelihood && (
                           <div className="flex gap-4 text-xs text-gray-500 pt-1 print:text-gray-600">
                             <span>{t.likelihood}: <strong className="text-gray-700 print:text-black">{item.riskLikelihood}</strong></span>
                             <span>{t.severity}: <strong className="text-gray-700 print:text-black">{item.riskSeverity}</strong></span>
                           </div>
                        )}
                      </div>

                      {/* Photo Evidence */}
                      {(item.photoData || item.photoUrl) && (
                        <div className="print:col-span-1">
                           <span className="block text-xs text-gray-400 uppercase font-semibold mb-1 print:text-gray-600">{t.evidence}</span>
                           <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 w-full h-40 flex items-center justify-center print:h-32 print:bg-white">
                              <img 
                                src={item.photoData || item.photoUrl} 
                                alt="Evidence" 
                                className="w-full h-full object-cover print:object-contain" 
                              />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block p-6 text-center text-xs text-gray-400 border-t mt-4">
           {t.pageFooter}
        </div>
      </div>
    </div>
  );
};

export default ReportView;

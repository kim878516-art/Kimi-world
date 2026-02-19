
import React, { useState, useRef, useEffect } from 'react';
import { InspectionRecord, SafetyItem, InspectionStatus, User, RiskLikelihood, RiskSeverity, ItemRiskLevel, Language } from '../types';
import { generateRiskAssessment } from '../services/geminiService';
import { compressImage } from '../utils/imageHelpers';
import { Plus, Trash2, Wand2, Loader2, Save, Upload, X, Image as ImageIcon, Edit2, Check, Calendar } from 'lucide-react';

interface InspectionFormProps {
  currentUser: User;
  onSubmit: (record: InspectionRecord) => void;
  onCancel: () => void;
  // Props for persistent lists
  savedLocations: string[];
  onUpdateLocations: (locs: string[]) => void;
  savedCategories: string[];
  onUpdateCategories: (cats: string[]) => void;
  savedInspectors: string[];
  onUpdateInspectors: (insps: string[]) => void;
  language: Language;
  initialData?: InspectionRecord | null;
}

// 5x5 Matrix Options
const LIKELIHOOD_OPTIONS: RiskLikelihood[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const SEVERITY_OPTIONS: RiskSeverity[] = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

const calculateRiskLevel = (likelihood: RiskLikelihood, severity: RiskSeverity): ItemRiskLevel => {
  const lIndex = LIKELIHOOD_OPTIONS.indexOf(likelihood) + 1; // 1-5
  const sIndex = SEVERITY_OPTIONS.indexOf(severity) + 1; // 1-5
  const score = lIndex * sIndex; // 1-25

  // 1-3: Low, 4-6: Medium, 8-12: High, 15-25: Extreme
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Medium';
  if (score <= 12) return 'High';
  return 'Extreme';
};

// Helper Component for Editable Dropdowns with Delete support
const EditableSelect = ({ 
  label, 
  value, 
  options, 
  onChange, 
  onOptionsChange,
  className = "",
  placeholder
}: { 
  label: string, 
  value: string, 
  options: string[], 
  onChange: (v: string) => void, 
  onOptionsChange: (opts: string[]) => void,
  className?: string,
  placeholder: string
}) => {
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view');
  const [tempValue, setTempValue] = useState("");

  const startAdd = () => {
    setMode('add');
    setTempValue("");
  };

  const startEdit = () => {
    setMode('edit');
    setTempValue(value);
  };

  const startDelete = () => {
      if (!value) return;
      if (window.confirm(`Delete "${value}"?`)) {
          const newOptions = options.filter(o => o !== value);
          onOptionsChange(newOptions);
          // Select first available or empty
          onChange(newOptions.length > 0 ? newOptions[0] : "");
      }
  };

  const cancel = () => {
    setMode('view');
    setTempValue("");
  };

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
            className="flex-1 rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900"
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <button 
            onClick={startAdd} 
            className="p-2 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded transition-colors" 
            title="Add"
            type="button"
          >
            <Plus size={18} />
          </button>
          <button 
            onClick={startEdit} 
            className="p-2 text-gray-500 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded transition-colors" 
            title="Edit"
            type="button"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={startDelete} 
            className="p-2 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded transition-colors" 
            title="Delete"
            type="button"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input 
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border-gray-300 border p-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900"
            autoFocus
          />
          <button onClick={save} className="p-2 text-green-600 hover:bg-green-50 rounded border border-green-200" title="Save">
            <Check size={18} />
          </button>
          <button onClick={cancel} className="p-2 text-red-600 hover:bg-red-50 rounded border border-red-200" title="Cancel">
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

const InspectionForm: React.FC<InspectionFormProps> = ({ 
    currentUser, onSubmit, onCancel,
    savedLocations, onUpdateLocations,
    savedCategories, onUpdateCategories,
    savedInspectors, onUpdateInspectors,
    language,
    initialData
}) => {
  const t = {
    inspectionData: language === 'zh' ? '巡查資料' : 'Inspection Data',
    editInspection: language === 'zh' ? '編輯巡查記錄' : 'Edit Inspection',
    location: language === 'zh' ? '地點 / 部門' : 'Location / Department',
    inspectorName: language === 'zh' ? '巡查員姓名' : 'Inspector Name',
    date: language === 'zh' ? '日期' : 'Date',
    addObservation: language === 'zh' ? '新增觀察事項' : 'Add Observation',
    category: language === 'zh' ? '類別' : 'Category',
    status: language === 'zh' ? '狀態' : 'Status',
    safe: language === 'zh' ? '安全 / 合規' : 'Safe / Compliant',
    atRisk: language === 'zh' ? '有風險 / 違規' : 'At Risk / Non-Compliant',
    observationDetail: language === 'zh' ? '觀察詳情' : 'Observation Details',
    observationPlaceholder: language === 'zh' ? '描述危害或現況...' : 'Describe the hazard or condition...',
    riskMatrix: language === 'zh' ? '風險評估矩陣 (5x5)' : 'Risk Assessment Matrix (5x5)',
    likelihood: language === 'zh' ? '可能性' : 'Likelihood',
    severity: language === 'zh' ? '嚴重性' : 'Severity',
    riskLevel: language === 'zh' ? '風險等級' : 'Risk Level',
    remedialAction: language === 'zh' ? '建議措施' : 'Remedial Actions',
    actionPlaceholder: language === 'zh' ? '減低風險的所需行動...' : 'Actions required to mitigate risk...',
    aiAssist: language === 'zh' ? 'AI 風險評估' : 'AI Risk Assessment',
    targetDate: language === 'zh' ? '目標完成日期' : 'Target Completion Date',
    actionStatus: language === 'zh' ? '初始行動狀態' : 'Initial Action Status',
    evidence: language === 'zh' ? '證據照片' : 'Evidence Photo',
    upload: language === 'zh' ? '上傳照片' : 'Upload Photo',
    changePhoto: language === 'zh' ? '更換照片' : 'Change Photo',
    noFile: language === 'zh' ? '未選擇檔案 (可選)' : 'No file selected (Optional)',
    addToList: language === 'zh' ? '加入列表' : 'Add to List',
    submit: language === 'zh' ? '提交巡查' : 'Submit Inspection',
    update: language === 'zh' ? '更新記錄' : 'Update Record',
    cancel: language === 'zh' ? '取消' : 'Cancel',
    itemStatus: language === 'zh' ? '狀態:' : 'Status:',
    itemAction: language === 'zh' ? '行動:' : 'Action:',
    itemObservation: language === 'zh' ? '觀察:' : 'Observation:',
    risk: language === 'zh' ? '風險' : 'Risk',
    compliant: language === 'zh' ? '合規' : 'Compliant',
    violation: language === 'zh' ? '違規' : 'Violation',
    emptyList: language === 'zh' ? '尚未加入觀察事項。' : 'No observations added yet.',
    pending: 'Pending',
    followUp: 'Follow-up',
    completed: 'Completed',
    newItem: language === 'zh' ? '輸入新名稱...' : 'Enter new name...',
    compressing: language === 'zh' ? '處理圖片中...' : 'Processing image...',
  };

  // Translation maps for 5x5 Matrix
  const LIKELIHOOD_MAP: Record<string, string> = {
      'Rare': language === 'zh' ? '罕見' : 'Rare',
      'Unlikely': language === 'zh' ? '不大可能' : 'Unlikely',
      'Possible': language === 'zh' ? '可能' : 'Possible',
      'Likely': language === 'zh' ? '很大機會' : 'Likely',
      'Almost Certain': language === 'zh' ? '幾乎肯定' : 'Almost Certain'
  };

  const SEVERITY_MAP: Record<string, string> = {
      'Negligible': language === 'zh' ? '可忽略' : 'Negligible',
      'Minor': language === 'zh' ? '輕微' : 'Minor',
      'Moderate': language === 'zh' ? '中等' : 'Moderate',
      'Major': language === 'zh' ? '嚴重' : 'Major',
      'Catastrophic': language === 'zh' ? '災難性' : 'Catastrophic'
  };
  
  const RISK_LABEL_MAP: Record<string, string> = {
      'Low': language === 'zh' ? '低' : 'Low',
      'Medium': language === 'zh' ? '中' : 'Medium',
      'High': language === 'zh' ? '高' : 'High',
      'Extreme': language === 'zh' ? '極高' : 'Extreme',
  };

  // Initialize state based on initialData or defaults
  const [location, setLocation] = useState(initialData?.location || (savedLocations.length > 0 ? savedLocations[0] : ""));
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [inspectorName, setInspectorName] = useState(initialData?.inspectorName || currentUser.name);
  const [items, setItems] = useState<SafetyItem[]>(initialData?.items || []);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New Item State
  const [currentCategory, setCurrentCategory] = useState(savedCategories.length > 0 ? savedCategories[0] : "");
  
  const [observation, setObservation] = useState("");
  const [status, setStatus] = useState<'Safe' | 'At Risk'>('At Risk');
  const [remedialAction, setRemedialAction] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [actionStatus, setActionStatus] = useState<'Pending' | 'Follow-up' | 'Completed'>('Pending');
  const [riskAssessmentLoading, setRiskAssessmentLoading] = useState(false);
  
  // Risk Matrix State
  const [likelihood, setLikelihood] = useState<RiskLikelihood>('Possible');
  const [severity, setSeverity] = useState<RiskSeverity>('Moderate');
  
  // Photo State
  const [photoData, setPhotoData] = useState<string | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);

  // Sync inspector name if currentUser changes AND we are creating new
  useEffect(() => {
     if (!initialData) {
       setInspectorName(currentUser.name);
     }
  }, [currentUser, initialData]);

  // Ensure initial selection if lists change or deletion occurs
  useEffect(() => {
    if (!location && savedLocations.length > 0) {
        setLocation(savedLocations[0]);
    }
  }, [savedLocations, location]);

  useEffect(() => {
    if (!currentCategory && savedCategories.length > 0) {
        setCurrentCategory(savedCategories[0]);
    }
  }, [savedCategories, currentCategory]);

  const currentRiskLevel = calculateRiskLevel(likelihood, severity);

  const handleAiAssist = async () => {
    if (!observation) return;
    setRiskAssessmentLoading(true);
    const result = await generateRiskAssessment(observation, currentCategory, language);
    setRemedialAction(result.action);
    setRiskAssessmentLoading(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressedDataUrl = await compressImage(file);
        setPhotoData(compressedDataUrl);
      } catch (error) {
        console.error("Image compression failed", error);
        alert(language === 'zh' ? '圖片處理失敗' : 'Failed to process image');
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const removePhoto = () => {
    setPhotoData(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addItem = () => {
    if (!observation) return;
    
    const newItem: SafetyItem = {
      id: Date.now().toString(),
      category: currentCategory,
      description: `Inspection of ${currentCategory}`,
      status: status === 'Safe' ? 'Safe' : 'At Risk',
      observation,
      remedialAction: status === 'Safe' ? 'N/A' : remedialAction,
      photoData: photoData,
      // Only add risk details if At Risk
      ...(status === 'At Risk' ? {
        riskLikelihood: likelihood,
        riskSeverity: severity,
        riskLevel: currentRiskLevel,
        actionStatus: actionStatus,
        proposedCompletionDate: proposedDate
      } : {})
    };

    setItems([...items, newItem]);
    
    // Reset Form
    setObservation("");
    setRemedialAction("");
    setProposedDate("");
    setStatus("At Risk");
    setActionStatus("Pending");
    setPhotoData(undefined);
    setLikelihood('Possible');
    setSeverity('Moderate');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = () => {
    if (items.length === 0) return;
    
    setIsSubmitting(true);
    
    // Determine overall risk
    const extremeRisks = items.filter(i => i.riskLevel === 'Extreme').length;
    const highRisks = items.filter(i => i.riskLevel === 'High').length;
    const mediumRisks = items.filter(i => i.riskLevel === 'Medium').length;
    
    let overallRisk: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Low';
    if (extremeRisks > 0) overallRisk = 'Extreme';
    else if (highRisks > 0) overallRisk = 'High';
    else if (mediumRisks > 0) overallRisk = 'Medium';

    const newRecord: InspectionRecord = {
      id: initialData?.id || `INS-${Date.now()}`,
      date: date,
      location: location,
      inspectorId: initialData?.inspectorId || currentUser.id,
      inspectorName: inspectorName,
      status: InspectionStatus.COMPLETED, // Saved records are always completed
      items,
      riskLevel: overallRisk,
      overallSummary: language === 'zh' 
         ? `地點：${location}。發現 ${items.filter(i => i.status === 'At Risk').length} 項違規事項。`
         : `Location: ${location}. Found ${items.filter(i => i.status === 'At Risk').length} non-compliance items.`,
    };

    // Simulate async submission
    setTimeout(() => {
      onSubmit(newRecord);
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
          {initialData ? t.editInspection : t.inspectionData}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <EditableSelect 
                label={t.location} 
                value={location}
                options={savedLocations}
                onChange={setLocation}
                onOptionsChange={onUpdateLocations}
                placeholder={t.newItem}
            />
          </div>

          <EditableSelect 
            label={t.inspectorName} 
            value={inspectorName}
            options={savedInspectors}
            onChange={setInspectorName}
            onOptionsChange={onUpdateInspectors}
            placeholder={t.newItem}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.date}</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border-gray-300 border p-2 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
           <span className="bg-yellow-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
           {t.addObservation}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="md:col-span-4">
             <EditableSelect 
                label={t.category} 
                value={currentCategory}
                options={savedCategories}
                onChange={setCurrentCategory}
                onOptionsChange={onUpdateCategories}
                placeholder={t.newItem}
             />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.status}</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className={`w-full rounded-lg border p-2 text-sm font-medium ${status === 'Safe' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}`}
            >
              <option value="Safe">{t.safe}</option>
              <option value="At Risk">{t.atRisk}</option>
            </select>
          </div>

          <div className="md:col-span-12">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.observationDetail}</label>
            <textarea 
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder={t.observationPlaceholder}
              className="w-full rounded-lg border-gray-300 border p-3 text-sm h-24 focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-gray-900"
            />
          </div>

          {/* Risk Matrix & Actions (Only if At Risk) */}
          {status === 'At Risk' && (
            <>
              <div className="md:col-span-12 bg-white p-4 rounded-lg border border-orange-100">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-orange-500"></span> {t.riskMatrix}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t.likelihood}</label>
                    <select 
                      value={likelihood}
                      onChange={(e) => setLikelihood(e.target.value as RiskLikelihood)}
                      className="w-full p-2 text-sm border rounded bg-white text-gray-900"
                    >
                      {LIKELIHOOD_OPTIONS.map(o => <option key={o} value={o}>{LIKELIHOOD_MAP[o] || o}</option>)}
                    </select>
                  </div>
                  <div>
                     <label className="block text-xs text-gray-500 mb-1">{t.severity}</label>
                    <select 
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as RiskSeverity)}
                      className="w-full p-2 text-sm border rounded bg-white text-gray-900"
                    >
                      {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{SEVERITY_MAP[o] || o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="block text-xs text-gray-500 mb-1">{t.riskLevel}</label>
                    <div className={`text-center py-1.5 rounded font-bold text-sm border ${
                      currentRiskLevel === 'Extreme' ? 'bg-red-200 text-red-900 border-red-300' :
                      currentRiskLevel === 'High' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                      currentRiskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                      'bg-green-100 text-green-700 border-green-200'
                    }`}>
                      {RISK_LABEL_MAP[currentRiskLevel] || currentRiskLevel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">{t.remedialAction}</label>
                    <button 
                        type="button"
                        onClick={handleAiAssist}
                        disabled={!observation || riskAssessmentLoading}
                        className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                    >
                        {riskAssessmentLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                        {t.aiAssist}
                    </button>
                    </div>
                    <textarea 
                    value={remedialAction}
                    onChange={(e) => setRemedialAction(e.target.value)}
                    placeholder={t.actionPlaceholder}
                    className="w-full rounded-md border-gray-300 border p-3 text-sm h-20 focus:ring-2 focus:ring-purple-500 outline-none bg-purple-50/30 text-gray-900"
                    />
                </div>
                <div>
                     <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.targetDate}</label>
                     <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input 
                            type="date"
                            value={proposedDate}
                            onChange={(e) => setProposedDate(e.target.value)}
                            className="w-full pl-10 p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900"
                        />
                     </div>
                </div>
                 <div>
                     <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.actionStatus}</label>
                     <select
                        value={actionStatus}
                        onChange={(e) => setActionStatus(e.target.value as any)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900"
                     >
                        <option value="Pending">{t.pending}</option>
                        <option value="Follow-up">{t.followUp}</option>
                        <option value="Completed">{t.completed}</option>
                     </select>
                </div>
              </div>
            </>
          )}

          {/* Photo Upload Section */}
          <div className="md:col-span-12">
             <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{t.evidence}</label>
             <div className="flex items-center gap-4">
               <input 
                 type="file" 
                 ref={fileInputRef}
                 accept="image/*"
                 onChange={handlePhotoUpload}
                 disabled={isCompressing}
                 className="hidden" 
               />
               <button 
                 type="button"
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isCompressing}
                 className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
               >
                 {isCompressing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                 {isCompressing ? t.compressing : (photoData ? t.changePhoto : t.upload)}
               </button>
               {photoData && !isCompressing && (
                 <div className="relative group">
                   <img src={photoData} alt="Preview" className="w-16 h-16 object-cover rounded-md border border-gray-200" />
                   <button 
                     onClick={removePhoto}
                     className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <X size={12} />
                   </button>
                 </div>
               )}
               {!photoData && !isCompressing && <span className="text-xs text-gray-400">{t.noFile}</span>}
             </div>
          </div>

          <div className="md:col-span-12 flex justify-end pt-4 border-t border-gray-100">
             <button 
                onClick={addItem}
                disabled={!observation || isCompressing}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 flex items-center gap-2"
             >
               <Plus size={16} /> {t.addToList}
             </button>
          </div>
        </div>

        {/* Item List */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg bg-white hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 mt-1">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                  {idx + 1}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                   <h4 className="font-semibold text-gray-900 text-sm">{item.category}</h4>
                   <div className="flex items-center gap-2">
                     {item.riskLevel && (
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                          item.riskLevel === 'Extreme' ? 'bg-red-200 text-red-900 border-red-300' :
                          item.riskLevel === 'High' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                          item.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                          'bg-green-100 text-green-800 border-green-200'
                        }`}>
                          {RISK_LABEL_MAP[item.riskLevel] || item.riskLevel} {t.risk}
                        </span>
                     )}
                     <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'Safe' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       {item.status === 'Safe' ? t.compliant : t.violation}
                     </span>
                   </div>
                </div>
                <p className="text-sm text-gray-600 mt-1"><span className="font-medium text-gray-900">{t.itemObservation}</span> {item.observation}</p>
                {item.status === 'At Risk' && (
                  <>
                    <p className="text-sm text-gray-600 mt-1"><span className="font-medium text-gray-900">{t.itemAction}</span> {item.remedialAction}</p>
                    <div className="flex gap-4 mt-1">
                        {item.proposedCompletionDate && item.actionStatus !== 'Completed' && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar size={12} />
                                {t.targetDate}: {item.proposedCompletionDate}
                            </p>
                        )}
                        {item.actionStatus && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Check size={12} />
                                {t.itemStatus} <span className="font-medium">{item.actionStatus}</span>
                            </p>
                        )}
                    </div>
                  </>
                )}
                {/* Thumbnail in list */}
                {item.photoData && (
                  <div className="mt-2">
                     <div className="flex items-center gap-1 text-xs text-blue-600">
                       <ImageIcon size={12} />
                       <span>{t.evidence}</span>
                     </div>
                  </div>
                )}
              </div>
              <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {items.length === 0 && (
             <div className="text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-lg">
               {t.emptyList}
             </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-4 pb-8">
        <button 
          onClick={onCancel}
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          {t.cancel}
        </button>
        <button 
          onClick={handleSubmit}
          disabled={items.length === 0 || isSubmitting}
          className="px-6 py-2.5 rounded-lg bg-yellow-500 text-gray-900 font-bold hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-yellow-500/20"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {initialData ? t.update : t.submit}
        </button>
      </div>
    </div>
  );
};

export default InspectionForm;

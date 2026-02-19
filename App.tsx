import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InspectionForm from './components/InspectionForm';
import ReportView from './components/ReportView';
import WeeklyReports from './components/WeeklyReports';
import FollowUpFindings from './components/FollowUpFindings';
import { InspectionRecord, InspectionStatus, User, Language } from './types';
import { getAllInspectionRecords, saveInspectionRecord, deleteInspectionRecord } from './services/storage';

// Mock Data
const MOCK_USER: User = { id: 'u1', name: '陳大文' };

const DEFAULT_CATEGORIES = ["機械防護", "電力安全", "消防安全", "個人防護裝備 (PPE)", "工作環境整理", "起重機械"];
const DEFAULT_LOCATIONS = ["生產線 A", "生產線 B", "倉庫 1 區", "化學品儲存區", "維修工場", "員工飯堂"];
const DEFAULT_INSPECTORS = ["陳大文", "黃偉文", "李小龍"];
const DEFAULT_MANAGERS = ["陳經理", "Safety Manager", "Site Agent"];

const INITIAL_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'INS-1715421',
    date: '2023-10-24',
    location: '生產線 A',
    inspectorId: 'u1',
    inspectorName: '陳大文',
    status: InspectionStatus.COMPLETED,
    items: [
      {
        id: '1',
        category: '機械防護',
        description: '傳送帶檢查',
        status: 'At Risk',
        observation: '次級皮帶驅動器缺少護欄。',
        remedialAction: '立即安裝臨時圍欄。訂購更換護罩。',
        photoUrl: 'https://picsum.photos/seed/safety1/400/300',
        riskLikelihood: 'Possible',
        riskSeverity: 'Major',
        riskLevel: 'High',
        actionStatus: 'Follow-up',
        proposedCompletionDate: '2023-10-31'
      }
    ],
    riskLevel: 'High',
    overallSummary: '生產線 A 發現嚴重的防護問題。已立即採取行動封鎖該區域。'
  },
  {
    id: 'INS-1715428',
    date: '2023-10-23',
    location: '倉庫 1 區',
    inspectorId: 'u1',
    inspectorName: '陳大文',
    status: InspectionStatus.COMPLETED,
    items: [],
    riskLevel: 'Low',
    overallSummary: '完成例行檢查。未發現重大危險。內務管理有所改善。'
  }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [editingInspection, setEditingInspection] = useState<InspectionRecord | null>(null);
  const [language, setLanguage] = useState<Language>('zh');

  // Persistent State for Editable Lists
  const [locations, setLocations] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('safety_locations');
      return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS;
    } catch { return DEFAULT_LOCATIONS; }
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('safety_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  });

  const [inspectors, setInspectors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('safety_inspectors');
      return saved ? JSON.parse(saved) : DEFAULT_INSPECTORS;
    } catch { return DEFAULT_INSPECTORS; }
  });

  const [managers, setManagers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('safety_managers');
      return saved ? JSON.parse(saved) : DEFAULT_MANAGERS;
    } catch { return DEFAULT_MANAGERS; }
  });

  // Effects to save changes permanently to localStorage
  useEffect(() => localStorage.setItem('safety_locations', JSON.stringify(locations)), [locations]);
  useEffect(() => localStorage.setItem('safety_categories', JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem('safety_inspectors', JSON.stringify(inspectors)), [inspectors]);
  useEffect(() => localStorage.setItem('safety_managers', JSON.stringify(managers)), [managers]);

  // Load Inspections from IndexedDB on Mount
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const records = await getAllInspectionRecords();
            if (records.length === 0) {
                // Seed initial data if DB is empty
                for (const initRecord of INITIAL_INSPECTIONS) {
                    await saveInspectionRecord(initRecord);
                }
                setInspections(INITIAL_INSPECTIONS);
            } else {
                setInspections(records);
            }
        } catch (error) {
            console.error("Failed to load inspections:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, []);

  // Ensure current user is in inspector list on load
  useEffect(() => {
     if (!inspectors.includes(currentUser.name)) {
         setInspectors(prev => [...prev, currentUser.name]);
     }
  }, [currentUser, inspectors]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setSelectedInspectionId(null);
    setEditingInspection(null); // Clear editing state when navigating
  };

  const handleSaveInspection = async (record: InspectionRecord) => {
    try {
        await saveInspectionRecord(record);
        if (editingInspection) {
            // Update existing record in state
            setInspections(prev => prev.map(i => i.id === record.id ? record : i));
            setEditingInspection(null);
        } else {
            // Add new record to state
            setInspections(prev => [record, ...prev]);
        }
        setActiveTab('dashboard');
        setSelectedInspectionId(null);
    } catch (error) {
        console.error("Failed to save inspection:", error);
        alert("Error saving record to database.");
    }
  };

  const handleEditInspection = (record: InspectionRecord) => {
    setEditingInspection(record);
    setSelectedInspectionId(null);
    setActiveTab('new-inspection');
  };

  const handleDeleteInspection = async (id: string) => {
    const confirmMsg = language === 'zh' ? "確定要刪除此記錄嗎？" : "Are you sure you want to delete this record?";
    if (window.confirm(confirmMsg)) {
      try {
          await deleteInspectionRecord(id);
          setInspections(prev => prev.filter(i => i.id !== id));
          setSelectedInspectionId(null);
          if (activeTab === 'new-inspection' && editingInspection?.id === id) {
              setEditingInspection(null);
              setActiveTab('dashboard');
          }
      } catch (error) {
          console.error("Failed to delete:", error);
          alert("Error deleting record.");
      }
    }
  };

  const handleUpdateItemStatus = async (inspectionId: string, itemId: string, newStatus: string) => {
    // Optimistic update
    const inspectionToUpdate = inspections.find(i => i.id === inspectionId);
    if (!inspectionToUpdate) return;

    const updatedRecord = {
        ...inspectionToUpdate,
        items: inspectionToUpdate.items.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, actionStatus: newStatus as any };
        })
    };

    // Update state first for responsiveness
    setInspections(prev => prev.map(i => i.id === inspectionId ? updatedRecord : i));

    // Persist to DB
    try {
        await saveInspectionRecord(updatedRecord);
    } catch (error) {
        console.error("Failed to update status in DB:", error);
        // Revert on failure (optional, for now simple log)
    }
  };

  const handleUpdateItemDate = async (inspectionId: string, itemId: string, newDate: string) => {
    const inspectionToUpdate = inspections.find(i => i.id === inspectionId);
    if (!inspectionToUpdate) return;

    const updatedRecord = {
        ...inspectionToUpdate,
        items: inspectionToUpdate.items.map(item => {
            if (item.id !== itemId) return item;
            return { ...item, proposedCompletionDate: newDate };
        })
    };

    setInspections(prev => prev.map(i => i.id === inspectionId ? updatedRecord : i));

    try {
        await saveInspectionRecord(updatedRecord);
    } catch (error) {
        console.error("Failed to update date in DB:", error);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'zh' ? 'en' : 'zh');
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex h-full items-center justify-center text-gray-500">Loading data...</div>;
    }

    if (selectedInspectionId) {
      const record = inspections.find(i => i.id === selectedInspectionId);
      if (!record) return <div>Record not found</div>;
      return (
        <ReportView 
          record={record} 
          currentUser={currentUser} 
          onBack={() => setSelectedInspectionId(null)}
          onEndorse={() => {}} // No-op as endorsement is removed
          onEdit={handleEditInspection}
          onDelete={handleDeleteInspection}
          language={language}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            inspections={inspections} 
            onViewInspection={setSelectedInspectionId} 
            onDeleteInspection={handleDeleteInspection}
            language={language} 
          />
        );
      case 'new-inspection':
        return (
          <InspectionForm 
            currentUser={currentUser} 
            onSubmit={handleSaveInspection} 
            onCancel={() => handleNavigate('dashboard')} 
            savedLocations={locations}
            onUpdateLocations={setLocations}
            savedCategories={categories}
            onUpdateCategories={setCategories}
            savedInspectors={inspectors}
            onUpdateInspectors={setInspectors}
            language={language}
            initialData={editingInspection}
          />
        );
      case 'followup':
        return (
          <FollowUpFindings 
            inspections={inspections}
            onUpdateStatus={handleUpdateItemStatus}
            onUpdateDate={handleUpdateItemDate}
            language={language}
          />
        );
      case 'reports':
        return (
          <WeeklyReports 
            inspections={inspections} 
            onUpdateStatus={handleUpdateItemStatus}
            onUpdateDate={handleUpdateItemDate}
            language={language}
            savedReporters={inspectors}
            onUpdateReporters={setInspectors}
            savedManagers={managers}
            onUpdateManagers={setManagers}
          />
        );
      default:
        return (
          <Dashboard 
            inspections={inspections} 
            onViewInspection={setSelectedInspectionId} 
            onDeleteInspection={handleDeleteInspection}
            language={language} 
          />
        );
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onNavigate={handleNavigate}
      language={language}
      onToggleLanguage={toggleLanguage}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
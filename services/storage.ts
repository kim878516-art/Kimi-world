
import { InspectionRecord, WeeklyReportRecord } from '../types';

const DB_NAME = 'FactorySafetyHubDB';
const STORE_INSPECTIONS = 'inspections';
const STORE_REPORTS = 'weekly_reports';
const DB_VERSION = 2; // Incremented version

// Initialize or Open Database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject("Your browser doesn't support a stable version of IndexedDB.");
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject('Error opening database');
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_INSPECTIONS)) {
        db.createObjectStore(STORE_INSPECTIONS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: 'id' });
      }
    };
  });
};

// --- Inspection Records ---

export const saveInspectionRecord = async (record: InspectionRecord): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_INSPECTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_INSPECTIONS);
    const request = store.put(record);
    
    request.onsuccess = () => resolve();
    request.onerror = (e) => {
        console.error("Save Error", e);
        reject('Error saving record');
    };
  });
};

export const getAllInspectionRecords = async (): Promise<InspectionRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_INSPECTIONS], 'readonly');
    const store = transaction.objectStore(STORE_INSPECTIONS);
    const request = store.getAll();
    
    request.onsuccess = () => {
        // Sort by date descending
        const records = request.result as InspectionRecord[];
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(records);
    };
    request.onerror = () => reject('Error fetching records');
  });
};

export const deleteInspectionRecord = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_INSPECTIONS], 'readwrite');
    const store = transaction.objectStore(STORE_INSPECTIONS);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting record');
  });
};

// --- Weekly Report Records ---

export const saveWeeklyReport = async (record: WeeklyReportRecord): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORE_REPORTS);
    const request = store.put(record);
    
    request.onsuccess = () => resolve();
    request.onerror = (e) => {
        console.error("Save Report Error", e);
        reject('Error saving report');
    };
  });
};

export const getAllWeeklyReports = async (): Promise<WeeklyReportRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_REPORTS], 'readonly');
    const store = transaction.objectStore(STORE_REPORTS);
    const request = store.getAll();
    
    request.onsuccess = () => {
        const records = request.result as WeeklyReportRecord[];
        // Sort by weekStartDate descending
        records.sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime());
        resolve(records);
    };
    request.onerror = () => reject('Error fetching reports');
  });
};

export const deleteWeeklyReport = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_REPORTS], 'readwrite');
    const store = transaction.objectStore(STORE_REPORTS);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting report');
  });
};

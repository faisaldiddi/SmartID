import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Printer, X, Check, ArrowRight } from 'lucide-react';
import { CardPersonDetails } from '../types';

interface CsvRowData {
  name: string;
  id: string;
  department?: string;
  designation?: string;
  bloodGroup?: string;
  phone?: string;
  email?: string;
}

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPerson: (person: Partial<CardPersonDetails>) => void;
  onBulkPrintAll: (records: CsvRowData[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onApplyPerson,
  onBulkPrintAll,
}) => {
  const [records, setRecords] = useState<CsvRowData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sampleCsv = `Name,ID,Department,Designation,BloodGroup,Phone
Sarah Connor,EMP-2026-101,Cybersecurity,Defense Director,O+,+1 555 101 2233
Marcus Wright,EMP-2026-102,Engineering,Hardware Lead,A+,+1 555 102 3344
Elena Rostova,EMP-2026-103,Data Science,Principal Researcher,B+,+1 555 103 4455
David Kim,EMP-2026-104,Operations,Logistics Specialist,AB+,+1 555 104 5566`;

  const parseCsvText = (csvString: string) => {
    setErrorMsg(null);
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setErrorMsg(results.errors[0].message);
          return;
        }

        const parsedRows: CsvRowData[] = results.data.map((row: any) => {
          const name = row.Name || row.name || row.fullName || row['Full Name'] || 'Unknown Person';
          const id = row.ID || row.id || row['Unique ID'] || row.uniqueId || `ID-${Math.floor(1000 + Math.random() * 9000)}`;
          const department = row.Department || row.department || row.Dept || row.dept || '';
          const designation = row.Designation || row.designation || row.Role || row.role || row.Title || '';
          const bloodGroup = row.BloodGroup || row.bloodGroup || row['Blood Group'] || '';
          const phone = row.Phone || row.phone || row.Contact || '';

          return { name, id, department, designation, bloodGroup, phone };
        });

        if (parsedRows.length === 0) {
          setErrorMsg('No valid records found in the CSV.');
          return;
        }

        setRecords(parsedRows);
        setCurrentIndex(0);
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    parseCsvText(sampleCsv);
  };

  const currentRecord = records[currentIndex];

  const handleApplyCurrent = () => {
    if (!currentRecord) return;
    onApplyPerson({
      fullName: currentRecord.name,
      uniqueId: currentRecord.id,
      department: currentRecord.department || '',
      designation: currentRecord.designation || '',
      bloodGroup: currentRecord.bloodGroup || '',
      phone: currentRecord.phone || '',
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#FBF9F2] rounded-3xl border border-[#D4CEBA] shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D4CEBA] flex items-center justify-between bg-[#F4F0E4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#2C4F3A] text-[#DFD9C4]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1D3527]">Bulk CSV Import</h3>
              <p className="text-xs text-[#59645C]">Batch import names and IDs without a backend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#DFD9C4] text-[#1F2D24] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {records.length === 0 ? (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-[#2C4F3A]/40 hover:border-[#2C4F3A] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#F4F0E4]/50 hover:bg-[#F4F0E4] transition-all">
                <Upload className="w-8 h-8 text-[#2C4F3A] mb-2" />
                <span className="font-bold text-sm text-[#1D3527]">Click or drag CSV file to upload</span>
                <span className="text-xs text-[#59645C] mt-1">Columns: Name, ID, Department, Designation, BloodGroup, Phone</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="text-center pt-2">
                <button
                  onClick={handleLoadSample}
                  className="text-xs font-bold text-[#2C4F3A] hover:underline"
                >
                  Or click here to load 4 sample employee rows
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Record Stepper */}
              <div className="flex items-center justify-between bg-[#F4F0E4] p-3.5 rounded-2xl border border-[#D4CEBA]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#59645C]">
                    Record {currentIndex + 1} of {records.length}
                  </span>
                  <h4 className="text-base font-extrabold text-[#1D3527]">{currentRecord.name}</h4>
                  <span className="text-xs font-mono font-bold text-[#2C4F3A]">{currentRecord.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-xl bg-white border border-[#D4CEBA] disabled:opacity-30 text-[#1D3527]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(records.length - 1, prev + 1))}
                    disabled={currentIndex === records.length - 1}
                    className="p-2 rounded-xl bg-white border border-[#D4CEBA] disabled:opacity-30 text-[#1D3527]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="border border-[#D4CEBA] rounded-xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#DFD9C4] text-[#1D3527] font-bold sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">ID</th>
                      <th className="p-2">Department</th>
                      <th className="p-2">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4CEBA]/50 bg-white">
                    {records.map((rec, i) => (
                      <tr 
                        key={i} 
                        onClick={() => setCurrentIndex(i)}
                        className={`cursor-pointer transition-colors ${
                          i === currentIndex ? 'bg-[#F4F0E4] font-semibold text-[#1D3527]' : 'hover:bg-stone-50'
                        }`}
                      >
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{rec.name}</td>
                        <td className="p-2 font-mono">{rec.id}</td>
                        <td className="p-2">{rec.department || '—'}</td>
                        <td className="p-2">{rec.designation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleApplyCurrent}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-[#FBF9F2] bg-[#2C4F3A] hover:bg-[#1D3527] transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Apply This Person to Editor
                </button>
                <button
                  onClick={() => {
                    onBulkPrintAll(records);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-[#2C4F3A] bg-[#DFD9C4] hover:bg-[#D4CEBA] transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Bulk Print Sheet ({records.length})
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#F4F0E4] border-t border-[#D4CEBA] flex justify-between items-center text-xs">
          {records.length > 0 ? (
            <button
              onClick={() => setRecords([])}
              className="text-[#59645C] hover:text-[#1D3527] font-semibold"
            >
              Upload Different CSV
            </button>
          ) : (
            <span className="text-[#59645C]">Format: CSV with comma delimiter</span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1F2D24] hover:bg-[#DFD9C4] rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState, useRef } from 'react';
import { Calendar, X, Download, FileText, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import { formatDate, formatTime } from '../utils/formatDate';

const DownloadAttendanceModal = ({ isOpen, onClose, targetUser, isAdminView = false }) => {
  const [dateFrom, setDateFrom] = useState(format(new Date(), 'yyyy-MM-01'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const fileInputRefFrom = useRef(null);
  const fileInputRefTo = useRef(null);

  if (!isOpen) return null;

  const formatDateDisplay = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  const generatePDF = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);

    try {
      // Fetch data for the selected range
      // For Admin: /admin/users/:userId/attendance
      // For Employee: /attendance/me
      const endpoint = isAdminView 
        ? `/admin/users/${targetUser._id}/attendance`
        : '/attendance/me';
      
      const { data } = await api.get(endpoint, {
        params: { 
          from: dateFrom, 
          to: dateTo,
          limit: 1000 // Ensure we get all records in range
        }
      });

      const records = (isAdminView ? data.records : data) || [];
      
      // Sort records by date ascending for the statement
      const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Generate PDF
      const doc = new jsPDF();
      const primaryColor = [79, 70, 229]; // Indigo-600

      // --- Header ---
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Statement', 15, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formatDateDisplay(dateFrom)} — ${formatDateDisplay(dateTo)}`, 15, 28);

      // --- Employee Info ---
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(targetUser.name, 15, 50);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(targetUser.email, 15, 56);
      
      doc.setDrawColor(230, 230, 230);
      doc.line(15, 62, 195, 62);

      // --- Table ---
      const tableData = sortedRecords.map(r => {
        const dateObj = new Date(r.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Duration calc
        let duration = '—';
        if (r.checkInTime && r.checkOutTime) {
          const mins = Math.round((new Date(r.checkOutTime) - new Date(r.checkInTime)) / 60000);
          if (mins > 0) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
          }
        }

        return [
          formatDateDisplay(r.date),
          dayName,
          formatTime(r.checkInTime),
          r.checkOutTime ? formatTime(r.checkOutTime) : (r.status === 'MISSED' ? 'Missed' : '—'),
          duration,
          r.status.replace('_', ' ')
        ];
      });

      autoTable(doc, {
        startY: 70,
        head: [['Date', 'Day', 'Check In', 'Check Out', 'Duration', 'Status']],
        body: tableData,
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [80, 80, 80]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 15, right: 15 },
        styles: {
          font: 'helvetica',
          cellPadding: 4
        },
        columnStyles: {
          5: { fontStyle: 'bold' }
        }
      });

      // --- Footer ---
      const pageCount = doc.internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')} | Page ${i} of ${pageCount}`,
          15, 
          285
        );
      }

      const fileName = `Attendance_${targetUser.name.replace(/\s+/g, '_')}_${dateFrom}_${dateTo}.pdf`;
      doc.save(fileName);
      onClose();
    } catch (error) {
      console.error('PDF generation failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-gray-900/20">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Download Statement</h2>
              <p className="text-xs text-gray-400 font-medium">Export attendance as PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Employee Summary (Static) */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Employee</p>
             <p className="text-sm font-bold text-gray-800">{targetUser.name}</p>
             <p className="text-xs text-gray-500">{targetUser.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
              <div 
                className="relative cursor-pointer"
                onClick={() => fileInputRefFrom.current.showPicker()}
              >
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <div className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm">
                  {formatDateDisplay(dateFrom)}
                </div>
                <input 
                  ref={fileInputRefFrom}
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
              <div 
                className="relative cursor-pointer"
                onClick={() => fileInputRefTo.current.showPicker()}
              >
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <div className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm">
                  {formatDateDisplay(dateTo)}
                </div>
                <input 
                  ref={fileInputRefTo}
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={generatePDF}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Statement...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Statement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadAttendanceModal;

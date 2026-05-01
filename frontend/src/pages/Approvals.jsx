import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';

const Approvals = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const { data } = await api.get('/admin/approvals');
      setApprovals(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, isApproved) => {
    try {
      await api.post(`/admin/approve/${id}`, { isApproved });
      toast.success(`Request ${isApproved ? 'approved' : 'rejected'} successfully`);
      fetchApprovals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
        <p className="text-sm text-gray-500 mt-1">Review late check-ins that occurred after 9:05 AM</p>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-gray-50 border-y border-gray-100">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Date Submited</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {approvals.length > 0 ? approvals.map((req) => (
                <tr key={req._id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{req.userId.name}</div>
                    <div className="text-xs text-gray-500">{req.userId.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{req.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleAction(req._id, true)}
                      className="px-3 py-1 bg-green-50 text-success hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req._id, false)}
                      className="px-3 py-1 bg-red-50 text-danger hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50 border-t border-gray-100 rounded-b-2xl shadow-inner">
                    No pending approvals at this time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Approvals;

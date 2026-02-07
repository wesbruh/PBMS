import { useState, useEffect } from 'react';
import Sidebar from "../../components/shared/Sidebar/sidebar";
import Frame from "../../components/shared/Frame/frame";

function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await new Promise(resolve => setTimeout(resolve, 800));

        const mockData = [
          {
            id: 1,
            title: 'Welcome Notification',
            message: 'Welcome to our photography platform! We are excited to have you.',
            type: 'System',
            status: 'Active',
            recipient: 'All Users',
            createdAt: '2024-02-06T10:30:00Z'
          },
          {
            id: 2,
            title: 'Session Reminder',
            message: 'Your photography session is scheduled for tomorrow at 2:00 PM',
            type: 'Reminder',
            status: 'Active',
            recipient: 'John Smith',
            createdAt: '2024-02-05T14:20:00Z'
          },
          {
            id: 3,
            title: 'Gallery Ready',
            message: 'Your wedding gallery is now ready for viewing',
            type: 'Alert',
            status: 'Sent',
            recipient: 'Sarah Johnson',
            createdAt: '2024-02-04T09:15:00Z'
          },
          {
            id: 4,
            title: 'Payment Received',
            message: 'Payment confirmation for maternity session package',
            type: 'Payment',
            status: 'Sent',
            recipient: 'Emily Davis',
            createdAt: '2024-02-03T16:45:00Z'
          },
          {
            id: 5,
            title: 'Contract Signed',
            message: 'Contract has been signed and confirmed',
            type: 'System',
            status: 'Sent',
            recipient: 'Michael Brown',
            createdAt: '2024-02-02T11:30:00Z'
          }
        ];

        setNotifications(mockData);
      } catch (err) {
        setError('Failed to load notifications. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });

  const filteredNotifications = sortedNotifications.filter(notification =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'System':
        return 'bg-purple-100 text-purple-800';
      case 'Reminder':
        return 'bg-yellow-100 text-yellow-800';
      case 'Alert':
        return 'bg-orange-100 text-orange-800';
      case 'Payment':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex my-10 md:my-14 h-[80vh] mx-4 md:mx-6 lg:mx-10 bg-white rounded-lg">
      <div className="flex w-1/5 min-w-[200px]">
        <Sidebar />
      </div>

      <div className="flex w-full shadow-inner rounded-lg">
        <Frame>
          <div className="relative flex flex-col bg-white p-4 w-full rounded-lg shadow-inner overflow-auto">

            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#AB8C4B] mb-4"></div>
                  <p className="text-gray-600 text-lg">Loading notifications...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                  <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-800 font-medium mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
                  <p className="text-gray-600">
                    View and manage all system notifications sent to clients.
                  </p>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search notifications by title, message, recipient, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#AB8C4B] focus:border-transparent"
                  />
                </div>

                {filteredNotifications.length === 0 ? (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {searchTerm ? 'No matching notifications found' : 'No notifications found'}
                      </h3>
                      <p className="text-gray-500">
                        {searchTerm ? 'Try adjusting your search terms.' : 'There are currently no notifications in the system.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {['id', 'title', 'type', 'recipient', 'status', 'createdAt'].map(key => (
                              <th
                                key={key}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort(key)}
                              >
                                <div className="flex items-center gap-1">
                                  {key === 'createdAt' ? 'Date Created' : key.charAt(0).toUpperCase() + key.slice(1)}
                                  {sortConfig.key === key && (
                                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Message
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredNotifications.map(notification => (
                            <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-900">#{notification.id}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{notification.title}</td>
                              <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{notification.message}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(notification.type)}`}>
                                  {notification.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">{notification.recipient}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-md text-sm font-medium ${getStatusColor(notification.status)}`}>
                                  {notification.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">{formatDate(notification.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{filteredNotifications.length}</span> of <span className="font-medium">{notifications.length}</span> notifications
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Frame>
      </div>
    </div>
  );
}

export default AdminNotifications;
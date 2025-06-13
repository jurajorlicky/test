import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FaArrowLeft, FaSignOutAlt, FaShoppingCart } from 'react-icons/fa';

interface UserSale {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  image_url: string | null;
  payout: number;
  created_at: string;
  status: string;
  user_email?: string;
}

export default function AdminSales() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sales, setSales] = useState<UserSale[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (adminError && adminError.code !== 'PGRST116') {
          console.error('Error checking admin status:', adminError);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!adminData);
          if (adminData) {
            fetchSales();
          } else {
            setError('You do not have admin privileges.');
          }
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('An error occurred while checking admin status.');
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      
      // Get all sales
      const { data: salesData, error: salesError } = await supabase
        .from('user_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (salesError) {
        throw salesError;
      }

      // Get user emails for each sale
      const salesWithEmails = await Promise.all(
        (salesData || []).map(async (sale) => {
          try {
            const { data: userData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', sale.user_id)
              .single();

            return {
              ...sale,
              user_email: userData?.email || 'Unknown'
            };
          } catch (err) {
            console.error(`Error fetching user email for ${sale.user_id}:`, err);
            return {
              ...sale,
              user_email: 'Unknown'
            };
          }
        })
      );

      setSales(salesWithEmails);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('An error occurred while fetching sales.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl text-red-600 mb-4">Admin access required</div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-black to-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link
              to="/admin"
              className="flex items-center text-white hover:text-gray-200 transition duration-300"
            >
              <FaArrowLeft className="mr-2" />
              <span>Back to Admin</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Sales Management</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-300 flex items-center"
            >
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">All Sales</h3>
            <button
              onClick={fetchSales}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 text-red-600 border-t border-red-200">
              {error}
            </div>
          )}

          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 mr-4">
                            {sale.image_url ? (
                              <img
                                className="h-12 w-12 rounded-md object-cover"
                                src={sale.image_url}
                                alt={sale.name}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-500">
                                No img
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sale.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {sale.product_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sale.user_email}</div>
                        <div className="text-sm text-gray-500">{sale.user_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.price} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.payout} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sale.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${sale.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No sales found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
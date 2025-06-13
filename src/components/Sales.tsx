import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaSignOutAlt } from 'react-icons/fa';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

interface UserSale {
  id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  image_url: string | null;
  payout: number;
  created_at: string;
  status: string;
}

export default function Sales() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<UserSale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndSales = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }
        
        setUser(user);
        await fetchSales(user.id);
      } catch (err) {
        console.error('Error fetching user:', err);
        setError('An error occurred while fetching user data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndSales();
  }, [navigate]);

  const fetchSales = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_sales')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('An error occurred while fetching your sales.');
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
        <div className="text-xl text-gray-600">Načítava sa...</div>
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
              to="/dashboard"
              className="flex items-center text-white hover:text-gray-200 transition duration-300"
            >
              <FaArrowLeft className="mr-2" />
              <span>Späť na Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Moje predaje</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-300 flex items-center"
            >
              <FaSignOutAlt className="mr-2" />
              Odhlásiť sa
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-2xl font-bold text-gray-900">História predajov</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Prehľad všetkých vašich predajov
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 text-red-600 border-t border-red-200">
              {error}
            </div>
          )}

          <div className="border-t border-gray-200">
            {sales.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produkt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veľkosť
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cena
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Výplata
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dátum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stav
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => (
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
                          <div className="text-sm font-medium text-gray-900">
                            {sale.name}
                          </div>
                        </div>
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
                          {sale.status === 'completed' ? 'Dokončené' : 
                           sale.status === 'cancelled' ? 'Zrušené' : 'Čaká sa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-gray-500">
                Zatiaľ nemáte žiadne predaje
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
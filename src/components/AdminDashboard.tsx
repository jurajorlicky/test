import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FaArrowLeft, FaSignOutAlt, FaCheck, FaTimes, FaShoppingCart } from 'react-icons/fa';

interface UserProduct {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  size: string;
  price: number;
  image_url: string | null;
  payout: number;
  user_email?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<UserProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
            fetchUserProducts();
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

  const fetchUserProducts = async () => {
    try {
      setLoading(true);
      
      // Get all user products
      const { data: productsData, error: productsError } = await supabase
        .from('user_products')
        .select('*');

      if (productsError) {
        throw productsError;
      }

      // Get user emails for each product
      const productsWithEmails = await Promise.all(
        (productsData || []).map(async (product) => {
          try {
            const { data: userData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', product.user_id)
              .single();

            return {
              ...product,
              user_email: userData?.email || 'Unknown'
            };
          } catch (err) {
            console.error(`Error fetching user email for ${product.user_id}:`, err);
            return {
              ...product,
              user_email: 'Unknown'
            };
          }
        })
      );

      setProducts(productsWithEmails);
    } catch (err) {
      console.error('Error fetching user products:', err);
      setError('An error occurred while fetching user products.');
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

  const handleCreateSale = async (product: UserProduct) => {
    try {
      setProcessingId(product.id);
      setError(null);
      setSuccessMessage(null);

      // 1. Create a new sale record
      const { data: saleData, error: saleError } = await supabase
        .from('user_sales')
        .insert([
          {
            user_id: product.user_id,
            product_id: product.product_id,
            name: product.name,
            size: product.size,
            price: product.price,
            image_url: product.image_url,
            payout: product.payout,
            status: 'completed',
            original_product_id: product.id
          }
        ])
        .select()
        .single();

      if (saleError) {
        throw saleError;
      }

      // 2. Delete the product from user_products
      const { error: deleteError } = await supabase
        .from('user_products')
        .delete()
        .eq('id', product.id);

      if (deleteError) {
        throw deleteError;
      }

      // 3. Update the products list
      setProducts(products.filter(p => p.id !== product.id));
      setSuccessMessage(`Sale created successfully for ${product.name}`);
    } catch (err: any) {
      console.error('Error creating sale:', err);
      setError(`Error creating sale: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
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
              to="/dashboard"
              className="flex items-center text-white hover:text-gray-200 transition duration-300"
            >
              <FaArrowLeft className="mr-2" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Link
              to="/admin/sales"
              className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 transition duration-300 flex items-center"
            >
              <FaShoppingCart className="mr-2" />
              View Sales
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-300 flex items-center"
            >
              <FaSignOutAnt className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">User Products</h3>
            <button
              onClick={fetchUserProducts}
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

          {successMessage && (
            <div className="px-4 py-3 bg-green-50 text-green-600 border-t border-green-200">
              {successMessage}
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length > 0 ? (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 mr-4">
                            {product.image_url ? (
                              <img
                                className="h-12 w-12 rounded-md object-cover"
                                src={product.image_url}
                                alt={product.name}
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-md bg-gray-200 flex items-center justify-center text-gray-500">
                                No img
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {product.product_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{product.user_email}</div>
                        <div className="text-sm text-gray-500">{product.user_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.price} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.payout} €
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleCreateSale(product)}
                          disabled={processingId === product.id}
                          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          {processingId === product.id ? (
                            'Processing...'
                          ) : (
                            <>
                              <FaCheck className="mr-1" /> Create Sale
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No products found
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
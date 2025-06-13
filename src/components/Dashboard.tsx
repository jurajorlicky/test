import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getFees, calculatePayout } from '../lib/fees';
import AddProductModal from './AddProductModal';
import EditProductModal from './EditProductModal';
import { FaEdit, FaTrash, FaUser, FaSignOutAlt, FaChartLine, FaPlus } from 'react-icons/fa';

interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  image_url?: string | null;
  original_price?: number;
  product_id: string;
  user_id: string;
  payout: number;
  sku?: string;
}

interface MarketPrice {
  price: number;
}

interface Fees {
  fee_percent: number;
  fee_fixed: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<Fees>({ fee_percent: 0.2, fee_fixed: 5 });

  useEffect(() => {
    const fetchUserAndProducts = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
          setUser(user);
          await fetchProducts(user.id);
          const adminFees = await getFees();
          setFees(adminFees);
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProducts();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchProducts(session.user.id);
        } else {
          setUser(null);
          setProducts([]);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (Array.isArray(data)) {
        const validProducts = data.filter(
          (product) => product !== null && product !== undefined
        );
        setProducts(validProducts);
        
        // Fetch current market prices for all products
        const pricesMap: Record<string, number> = {};
        for (const product of validProducts) {
          try {
            const { data: priceData } = await supabase
              .from('product_sizes')
              .select('price')
              .eq('product_id', product.product_id)
              .eq('size', product.size)
              .eq('status', 'Skladom')
              .order('price', { ascending: true })
              .limit(1)
              .single();
              
            if (priceData) {
              pricesMap[`${product.product_id}-${product.size}`] = priceData.price;
            }
          } catch (err) {
            console.error(`Error fetching market price for product ${product.product_id}:`, err);
          }
        }
        setMarketPrices(pricesMap);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Došlo k chybe pri načítavaní produktov.');
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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Naozaj chcete odstrániť tento produkt?')) return;

    try {
      const { error } = await supabase.from('user_products').delete().eq('id', id);
      if (error) {
        console.error('Error during deletion:', error);
        setError(`Došlo k chybe pri odstraňovaní produktu: ${error.message}`);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setError(null);
    } catch (err) {
      console.error('Unexpected error during product deletion:', err);
      setError('Došlo k neočakávanej chybe pri odstraňovaní produktu.');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setIsEditModalOpen(false);
    setEditingProduct(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Načítava sa...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-lg text-gray-600">
        Používateľ neexistuje alebo nie je prihlásený.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 to-gray-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Seller Hub</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-all duration-300 flex items-center space-x-2 shadow-lg"
              >
                <FaPlus className="h-4 w-4" />
                <span>Pridať produkt</span>
              </button>
              <Link
                to="/sales"
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all duration-300 flex items-center space-x-2"
              >
                <FaChartLine />
                <span>Predaje</span>
              </Link>
              <Link
                to="/profile"
                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all duration-300 flex items-center space-x-2"
              >
                <FaUser />
                <span>Profil</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-300 flex items-center space-x-2"
              >
                <FaSignOutAlt />
                <span>Odhlásiť sa</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-red-600">⚠️</div>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Moje produkty</h2>
              <p className="text-gray-600 mt-1">Celkový počet produktov: {products.length}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {products.reduce((sum, product) => sum + product.payout, 0).toFixed(2)} €
              </div>
              <p className="text-gray-600">Celková potenciálna výplata</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const currentMarketPrice = marketPrices[`${product.product_id}-${product.size}`];
              
              // Updated color logic - green if lowest price, red if not
              let priceColor = 'text-gray-900';
              let priceStatus = '';
              let priceIndicator = '';
              
              if (currentMarketPrice) {
                if (product.price <= currentMarketPrice) {
                  // User's price is the lowest or equal to market price - GREEN
                  priceColor = 'text-green-600';
                  priceIndicator = '🟢';
                  if (product.price < currentMarketPrice) {
                    priceStatus = `(-${(currentMarketPrice - product.price).toFixed(2)} €)`;
                  }
                } else {
                  // User's price is higher than market price - RED
                  priceColor = 'text-red-600';
                  priceIndicator = '🔴';
                  priceStatus = `(+${(product.price - currentMarketPrice).toFixed(2)} €)`;
                }
              }

              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-50 p-4">
                    <img
                      className="h-full w-full object-contain"
                      src={product?.image_url || '/default-image.png'}
                      alt={product?.name || 'Žiadny obrázok'}
                    />
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {product?.name || 'Neznámy názov'}
                      </h3>
                      {product.sku && (
                        <p className="text-xs text-gray-500 mt-1">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Veľkosť:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {product?.size || 'Neznáma veľkosť'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Cena:</span>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${priceColor} flex items-center space-x-1`}>
                            <span>{priceIndicator}</span>
                            <span>{product?.price ? `${product.price} €` : 'Neznáma cena'}</span>
                          </div>
                          {priceStatus && (
                            <div className="text-xs text-gray-500">{priceStatus}</div>
                          )}
                        </div>
                      </div>
                      
                      {currentMarketPrice && (
                        <div className="text-xs text-gray-500 text-right">
                          Trhová: {currentMarketPrice} €
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Výplata:</span>
                        <span className="text-sm font-bold text-green-600">
                          {product.payout.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="flex items-center space-x-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Upraviť produkt"
                      >
                        <FaEdit className="h-3 w-3" />
                        <span>Upraviť</span>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex items-center space-x-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Odstrániť produkt"
                      >
                        <FaTrash className="h-3 w-3" />
                        <span>Odstrániť</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Žiadne produkty
              </h3>
              <p className="text-gray-600 mb-6">
                Začnite pridaním svojho prvého produktu
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors flex items-center space-x-2 mx-auto"
              >
                <FaPlus className="h-4 w-4" />
                <span>Pridať produkt</span>
              </button>
            </div>
          </div>
        )}

        <AddProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onProductAdded={(newProduct) => setProducts((prev) => [...prev, newProduct])}
        />

        {editingProduct && (
          <EditProductModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onProductUpdated={handleProductUpdated}
            product={editingProduct}
          />
        )}
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getFees, calculatePayout } from '../lib/fees';
import { v4 as uuidv4 } from 'uuid';
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (newProduct: {
    id: string;
    user_id: string;
    product_id: string;
    name: string;
    size: string;
    price: number;
    image_url: string;
    original_price?: number;
    payout: number;
    sku?: string;
  }) => void;
}

interface Product {
  id: string;
  name: string;
  image_url: string;
  sku: string;
}

interface ProductSize {
  id: string;
  product_id: string;
  size: string;
  price: number;
  status: string;
}

interface Fees {
  fee_percent: number;
  fee_fixed: number;
}

export default function AddProductModal({ isOpen, onClose, onProductAdded }: AddProductModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [existingProducts, setExistingProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fees, setFees] = useState<Fees>({ fee_percent: 0.2, fee_fixed: 5 });
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getFees().then(adminFees => {
        setFees(adminFees);
      });
    } else {
      setSearchTerm('');
      setSelectedProduct(null);
      setSelectedSize('');
      setNewPrice('');
      setError(null);
    }
  }, [isOpen]);

  const numericNewPrice = parseFloat(newPrice);
  const computedPayout = !isNaN(numericNewPrice)
    ? calculatePayout(numericNewPrice, fees.fee_percent, fees.fee_fixed)
    : null;

  const selectedSizeData = sizes.find((s) => s.size === selectedSize);
  const recommendedPrice = selectedSizeData?.price || 0;

  let priceColor = 'text-gray-700';
  let priceMessage = '';
  let priceIcon = null;
  
  if (!isNaN(numericNewPrice) && numericNewPrice > 0) {
    if (numericNewPrice > recommendedPrice) {
      priceColor = 'text-red-600';
      priceMessage = 'Tvoja cena je vyššia ako najnižšia cena!';
      priceIcon = <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
    } else if (numericNewPrice < recommendedPrice) {
      priceColor = 'text-green-600';
      priceMessage = `Najnižšia nová cena bude ${numericNewPrice} €`;
      priceIcon = <CheckIcon className="h-4 w-4 text-green-600" />;
    }
  }

  useEffect(() => {
    const debounceTimeout = setTimeout(async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setExistingProducts([]);
        return;
      }

      setSearchLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, image_url, sku')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);

        if (error) throw error;
        
        setExistingProducts(data || []);
      } catch (err: any) {
        console.error('Error in fetchExistingProducts:', err);
        setError(err.message);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product);
    setNewPrice('');
    setError(null);

    try {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('product_id', product.id)
        .eq('status', 'Skladom')
        .order('price', { ascending: true });

      if (error) throw error;
      
      // Zoradenie veľkostí
      const sortedSizes = data ? [...data].sort((a, b) => {
        // Konvertujeme veľkosti na čísla ak je to možné
        const sizeA = parseFloat(a.size);
        const sizeB = parseFloat(b.size);
        
        if (!isNaN(sizeA) && !isNaN(sizeB)) {
          return sizeA - sizeB;
        }
        // Ak nie sú čísla, zoradíme ako text
        return a.size.localeCompare(b.size);
      }) : [];
      
      setSizes(sortedSizes);
    } catch (err: any) {
      console.error('Error fetching sizes:', err);
      setError(err.message);
    }
  };

  const handleChangeProduct = () => {
    setSelectedProduct(null);
    setSelectedSize('');
    setNewPrice('');
    setError(null);
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !selectedSize || isNaN(numericNewPrice) || numericNewPrice <= 0) {
      setError('Prosím, vyberte produkt, veľkosť a zadajte platnú cenu.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newProductId = uuidv4();

      const { error: insertError } = await supabase
        .from('user_products')
        .insert([
          {
            id: newProductId,
            user_id: user.id,
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            size: selectedSize,
            price: numericNewPrice,
            image_url: selectedProduct.image_url,
            original_price: recommendedPrice,
            payout: computedPayout ?? 0,
            sku: selectedProduct.sku,
          },
        ]);

      if (insertError) throw insertError;

      const newProduct = {
        id: newProductId,
        user_id: user.id,
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        size: selectedSize,
        price: numericNewPrice,
        image_url: selectedProduct.image_url,
        original_price: recommendedPrice,
        payout: computedPayout ?? 0,
        sku: selectedProduct.sku,
      };

      onProductAdded(newProduct);
      setSelectedProduct(null);
      setSelectedSize('');
      setNewPrice('');
      onClose();
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Pridať produkt</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!selectedProduct ? (
              <div className="space-y-4">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vyhľadajte produkt
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                      placeholder="Začnite písať názov produktu..."
                    />
                  </div>
                </div>

                {/* Loading State */}
                {searchLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <span className="ml-3 text-gray-600">Vyhľadávam produkty...</span>
                  </div>
                )}

                {/* Search Results */}
                {existingProducts.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {existingProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 cursor-pointer hover:bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-all flex items-center space-x-4"
                        onClick={() => handleProductSelect(product)}
                      >
                        <div className="h-16 w-16 flex-shrink-0">
                          <img
                            src={product.image_url || '/default-image.png'}
                            alt={product.name}
                            className="h-full w-full object-contain rounded-lg"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {product.name}
                          </p>
                          {product.sku && (
                            <p className="text-xs text-gray-500 mt-1">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Product */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Vybraný produkt</h3>
                    <button
                      type="button"
                      onClick={handleChangeProduct}
                      className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Zmeniť produkt
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 flex-shrink-0">
                      <img
                        src={selectedProduct.image_url || '/default-image.png'}
                        alt={selectedProduct.name}
                        className="h-full w-full object-contain rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{selectedProduct.name}</h4>
                      {selectedProduct.sku && (
                        <p className="text-sm text-gray-600 mt-1">
                          SKU: {selectedProduct.sku}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Veľkosť
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => {
                      setSelectedSize(e.target.value);
                      setNewPrice('');
                    }}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Vyberte veľkosť</option>
                    {sizes.map((size) => (
                      <option key={size.id} value={size.size}>
                        {size.size} - {size.price} €
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Input */}
                {selectedSize && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-blue-900">
                          Najnižšia trhová cena: {recommendedPrice} €
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Vaša predajná cena
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={newPrice}
                          onChange={(e) => setNewPrice(e.target.value)}
                          className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all ${
                            priceColor === 'text-red-600' ? 'border-red-300' : 
                            priceColor === 'text-green-600' ? 'border-green-300' : 'border-gray-300'
                          }`}
                          placeholder="Zadajte cenu v eurách"
                          required
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <span className="text-gray-500 text-sm">€</span>
                        </div>
                      </div>
                      
                      {priceMessage && (
                        <div className={`mt-2 flex items-center space-x-2 ${priceColor}`}>
                          {priceIcon}
                          <span className="text-sm font-medium">{priceMessage}</span>
                        </div>
                      )}
                      
                      {computedPayout !== null && (
                        <div className="mt-3 bg-green-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-800">Vaša výplata:</span>
                            <span className="text-lg font-bold text-green-900">
                              {computedPayout.toFixed(2)} €
                            </span>
                          </div>
                          <p className="text-xs text-green-700 mt-1">
                            Po odpočítaní poplatkov: {fees.fee_percent * 100}% + {fees.fee_fixed}€
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-800">{error}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={loading || !selectedProduct || !selectedSize || !newPrice}
                className="px-6 py-3 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loading ? 'Pridáva sa...' : 'Pridať produkt'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
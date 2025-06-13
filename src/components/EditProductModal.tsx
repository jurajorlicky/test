import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getFees, calculatePayout } from '../lib/fees';
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: (updatedProduct: Product) => void;
  product: Product | null;
}

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  size: string;
  price: number;
  status: string;
  original_price?: number;
  payout: number;
  product_id: string;
  sku?: string;
}

interface Fees {
  fee_percent: number;
  fee_fixed: number;
}

export default function EditProductModal({ isOpen, onClose, onProductUpdated, product }: EditProductModalProps) {
  const [newPrice, setNewPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceColor, setPriceColor] = useState<string>('text-gray-700');
  const [isPriceValid, setIsPriceValid] = useState<boolean>(true);
  const [priceMessage, setPriceMessage] = useState<string>('');
  const [fees, setFees] = useState<Fees>({ fee_percent: 0.2, fee_fixed: 5 });
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      getFees().then(adminFees => {
        setFees(adminFees);
      });

      // Fetch current market price
      if (product) {
        fetchCurrentMarketPrice(product);
      }
    }
  }, [isOpen, product]);

  const fetchCurrentMarketPrice = async (product: Product) => {
    try {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('price')
        .eq('product_id', product.product_id)
        .eq('size', product.size)
        .eq('status', 'Skladom')
        .order('price', { ascending: true })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentMarketPrice(data.price);
      }
    } catch (err) {
      console.error('Error fetching current market price:', err);
    }
  };

  const numericNewPrice = parseFloat(newPrice);
  const computedPayoutValue =
    !isNaN(numericNewPrice) ? calculatePayout(numericNewPrice, fees.fee_percent, fees.fee_fixed) : 0;

  const recommendedPrice = currentMarketPrice || (product?.original_price ?? product?.price);

  useEffect(() => {
    if (product) {
      setNewPrice(product.price.toString());
      const initialValue = product.price;
      if (initialValue > recommendedPrice) {
        setPriceColor('text-red-600');
        setPriceMessage('Tvoja cena je vyššia ako najnižšia cena!');
      } else if (initialValue < recommendedPrice) {
        setPriceColor('text-green-600');
        setPriceMessage(`Najnižšia nová cena bude ${initialValue} €`);
      } else {
        setPriceColor('text-gray-700');
        setPriceMessage('Cena je platná.');
      }
    }
  }, [product, recommendedPrice]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPrice(value);

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setIsPriceValid(false);
      setPriceColor('text-red-600');
      setPriceMessage('Cena musí byť kladné číslo.');
    } else {
      setIsPriceValid(true);
      if (numericValue > recommendedPrice) {
        setPriceColor('text-red-600');
        setPriceMessage('Tvoja cena je vyššia ako najnižšia cena!');
      } else if (numericValue < recommendedPrice) {
        setPriceColor('text-green-600');
        setPriceMessage(`Najnižšia nová cena bude ${numericValue} €`);
      } else {
        setPriceColor('text-gray-700');
        setPriceMessage('Cena je platná.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !isPriceValid) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_products')
        .update({
          price: parseFloat(newPrice),
          payout: computedPayoutValue
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      const updatedProduct = {
        ...product,
        price: parseFloat(newPrice),
        payout: computedPayoutValue
      };
      onProductUpdated(updatedProduct);
      onClose();
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  const priceIcon = priceColor === 'text-red-600' ? 
    <ExclamationTriangleIcon className="h-4 w-4" /> : 
    priceColor === 'text-green-600' ? 
    <CheckIcon className="h-4 w-4" /> : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Upraviť produkt</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informácie o produkte</h3>
              <div className="flex items-start space-x-4">
                <div className="h-24 w-24 flex-shrink-0">
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="h-full w-full object-contain rounded-lg"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Názov produktu</label>
                    <p className="text-sm text-gray-900 font-semibold">{product.name}</p>
                  </div>
                  {product.sku && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <p className="text-sm text-gray-600">{product.sku}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Veľkosť</label>
                    <p className="text-sm text-gray-900 font-semibold">{product.size}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Price Info */}
            {currentMarketPrice && (
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">
                    Aktuálna trhová cena: {currentMarketPrice} €
                  </span>
                </div>
              </div>
            )}

            {/* Price Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nová cena
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={handlePriceChange}
                  className={`block w-full px-4 py-3 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all ${
                    priceColor === 'text-red-600' ? 'border-red-300' : 
                    priceColor === 'text-green-600' ? 'border-green-300' : 'border-gray-300'
                  }`}
                  placeholder="Zadajte novú cenu"
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
              
              {computedPayoutValue !== null && (
                <div className="mt-3 bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">Vaša výplata:</span>
                    <span className="text-lg font-bold text-green-900">
                      {computedPayoutValue.toFixed(2)} €
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Po odpočítaní poplatkov: {fees.fee_percent * 100}% + {fees.fee_fixed}€
                  </p>
                </div>
              )}
            </div>

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
                disabled={!isPriceValid || loading}
                className="px-6 py-3 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loading ? 'Upravuje sa...' : 'Uložiť zmeny'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
/*
  # Create products and product_sizes tables

  1. New Tables
    - `products`
      - `id` (text, primary key) - product ID
      - `name` (text) - product name
      - `image_url` (text) - product image
      - `sku` (text) - product SKU
      - `created_at` (timestamp)
    - `product_sizes`
      - `id` (uuid, primary key)
      - `product_id` (text, references products)
      - `size` (text) - size value
      - `price` (decimal) - current market price
      - `status` (text) - availability status
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read data
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  image_url text,
  sku text,
  created_at timestamptz DEFAULT now()
);

-- Create product_sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text REFERENCES products(id) NOT NULL,
  size text NOT NULL,
  price decimal(10,2) NOT NULL,
  status text DEFAULT 'Skladom' CHECK (status IN ('Skladom', 'Vypredané', 'Nedostupné')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read products
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read product_sizes
CREATE POLICY "Anyone can read product_sizes"
  ON product_sizes
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert some sample data for testing
INSERT INTO products (id, name, image_url, sku) VALUES
  ('nike-air-jordan-1', 'Nike Air Jordan 1 Retro High OG', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg', 'NJ1-001'),
  ('adidas-yeezy-350', 'Adidas Yeezy Boost 350 V2', 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg', 'AY350-002'),
  ('nike-air-max-90', 'Nike Air Max 90', 'https://images.pexels.com/photos/2048548/pexels-photo-2048548.jpeg', 'NAM90-003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_sizes (product_id, size, price, status) VALUES
  ('nike-air-jordan-1', '40', 180.00, 'Skladom'),
  ('nike-air-jordan-1', '41', 185.00, 'Skladom'),
  ('nike-air-jordan-1', '42', 190.00, 'Skladom'),
  ('nike-air-jordan-1', '43', 195.00, 'Skladom'),
  ('nike-air-jordan-1', '44', 200.00, 'Skladom'),
  ('adidas-yeezy-350', '40', 250.00, 'Skladom'),
  ('adidas-yeezy-350', '41', 255.00, 'Skladom'),
  ('adidas-yeezy-350', '42', 260.00, 'Skladom'),
  ('adidas-yeezy-350', '43', 265.00, 'Vypredané'),
  ('adidas-yeezy-350', '44', 270.00, 'Skladom'),
  ('nike-air-max-90', '40', 120.00, 'Skladom'),
  ('nike-air-max-90', '41', 125.00, 'Skladom'),
  ('nike-air-max-90', '42', 130.00, 'Skladom'),
  ('nike-air-max-90', '43', 135.00, 'Skladom'),
  ('nike-air-max-90', '44', 140.00, 'Skladom')
ON CONFLICT DO NOTHING;
/*
  # Add SKU column to user_products table

  1. Schema Changes
    - Add `sku` column to `user_products` table
    - Update existing records to fetch SKU from products table if available

  2. Notes
    - SKU will be populated from the products table when adding new products
    - Existing records will have NULL SKU initially
*/

-- Add SKU column to user_products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE user_products ADD COLUMN sku text;
  END IF;
END $$;
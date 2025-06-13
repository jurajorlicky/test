import { supabase } from './supabase';

interface AdminSettings {
  fee_percent: number;
  fee_fixed: number;
}

let cachedSettings: AdminSettings | null = null;

export async function getFees(): Promise<AdminSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('fee_percent, fee_fixed')
      .single();

    if (error) throw error;

    if (data) {
      cachedSettings = {
        fee_percent: data.fee_percent,
        fee_fixed: data.fee_fixed
      };
      return cachedSettings;
    }

    // Default values if no settings found
    return { fee_percent: 0.2, fee_fixed: 5 };
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return { fee_percent: 0.2, fee_fixed: 5 };
  }
}

export function calculatePayout(price: number, feePercent: number, feeFixed: number): number {
  return price * (1 - feePercent) - feeFixed;
}
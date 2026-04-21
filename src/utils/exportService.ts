import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import SQLiteEngine from '../database/SQLiteEngine';

// Get FS paths correctly - validate cache directory exists
const cacheDir = cacheDirectory;
if (!cacheDir) {
  throw new Error('Cache directory not available');
}

/**
 * Exports all transactions from the database to a CSV file and opens the system share dialog.
 * @returns An object indicating success or an error message.
 */
export const exportTransactionsToCSV = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Fetch all transactions with category names
    // We join with categories to get the human-readable name instead of just the ID
    const sql = `
      SELECT t.fecha_local as date, c.nombre as category, t.monto as amount, t.descripcion as description
      FROM transacciones t
      JOIN categorias c ON t.categoria_id = c.id
      ORDER BY t.fecha_local DESC
    `;
    const transactions = await SQLiteEngine.getAll<{
      date: string;
      category: string;
      amount: number;
      description: string | null;
    }>(sql);

    if (transactions.length === 0) {
      return { success: false, error: 'No transactions found to export.' };
    }

    // 2. Format as CSV
    // We use double quotes for descriptions to handle commas and newlines within the text
    const header = 'Date,Category,Amount,Description\n';
    const rows = transactions
      .map((t) => {
        // Handle null, newlines, quotes, and commas
        const sanitizedDesc = t.description
          ? `"${t.description.replace(/"/g, '""').replace(/[\n\r]/g, ' ')}"`
          : '""';
        // Escape category as well (may contain commas)
        const sanitizedCategory = t.category.includes(',')
          ? `"${t.category.replace(/"/g, '""')}"`
          : t.category;
        return `${t.date},${sanitizedCategory},${t.amount},${sanitizedDesc}`;
      })
      .join('\n');

    const csvContent = header + rows;

    // 3. Save to file using expo-file-system in the CACHE directory
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `OwnLog_Export_${dateStr}.csv`;
    const filePath = `${cacheDir}${fileName}`;

    await writeAsStringAsync(filePath, csvContent, {
      encoding: EncodingType.UTF8,
    });

    // 4. Share file using expo-sharing
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(filePath);

    return { success: true };
  } catch (error) {
    console.error('[exportService] CSV Export Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during export.',
    };
  }
};

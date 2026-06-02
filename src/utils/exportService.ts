import { cacheDirectory, writeAsStringAsync, EncodingType, deleteAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
// xlsx is ~500KB — loaded lazily inside the export handler. The fallback
// uses require() so Jest (which can't do dynamic import without
// --experimental-vm-modules) still works; React Native bundles the same way.
const loadXLSX = (): typeof import('xlsx') => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('xlsx');
};
import { TransactionRepository } from '../repositories/TransactionRepository';
  const getFileName = (ext: 'csv' | 'xlsx'): string => {
  const dateStr = new Date().toISOString().split('T')[0];
  return `OwnLog_Export_${dateStr}.${ext}`;
};

/**
 * Exports all transactions from the database to a CSV file and opens the system share dialog.
 */
export const exportTransactionsToCSV = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!cacheDirectory) {
      return { success: false, error: 'Cache directory not available.' };
    }
    const transactions = await TransactionRepository.getExportData();

    if (transactions.length === 0) {
      return { success: false, error: 'No transactions found to export.' };
    }

    const header = 'Date,Category,Amount,Description\n';
    const rows = transactions
      .map((t) => {
        const sanitizedDesc = t.description
          ? `"${t.description.replace(/"/g, '""').replace(/[\n\r]/g, ' ')}"`
          : '""';
        const needsEscape = t.category.includes(',') || t.category.includes('"');
        const sanitizedCategory = needsEscape
          ? `"${t.category.replace(/"/g, '""')}"`
          : t.category;
        return `${t.date},${sanitizedCategory},${t.amount},${sanitizedDesc}`;
      })
      .join('\n');

    const filePath = `${cacheDirectory}${getFileName('csv')}`;
 
    await writeAsStringAsync(filePath, header + rows, {
      encoding: EncodingType.UTF8,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(filePath);
    await deleteAsync(filePath, { idempotent: true });
    return { success: true };
  } catch (error) {
    console.error('[exportService] CSV Export Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during export.',
    };
  }
};

/**
 * Exports all transactions to a formatted .xlsx file with two sheets:
 * Sheet 1 "Transactions": Date, Category, Amount, Description
 * Sheet 2 "Summary": Total Income, Total Expense, Net Balance
 */
export const exportTransactionsToXLSX = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!cacheDirectory) {
      return { success: false, error: 'Cache directory not available.' };
    }
    // Lazy-load xlsx to keep the initial bundle small (saves ~500KB on cold start).
    const XLSX = loadXLSX();
    const transactions = await TransactionRepository.getExportData();

    if (transactions.length === 0) {
      return { success: false, error: 'No transactions found to export.' };
    }

    const totalBalance = await TransactionRepository.getTotalBalance();

    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of transactions) {
      if (t.type === 'ingreso') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    }

    const txData = transactions.map((t) => ({
      Date: t.date,
      Category: t.category,
      Amount: t.amount,
      Description: t.description || '',
    }));
    const txSheet = XLSX.utils.json_to_sheet(txData);

    txSheet['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 40 },
    ];

    const summaryData = [
      { Metric: 'Total Income', Value: totalIncome },
      { Metric: 'Total Expense', Value: totalExpense },
      { Metric: 'Net Balance', Value: totalBalance },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const filePath = `${cacheDirectory}${getFileName('xlsx')}`;
    await writeAsStringAsync(filePath, wbout, {
      encoding: EncodingType.Base64,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(filePath);
    await deleteAsync(filePath, { idempotent: true });
    return { success: true };
  } catch (error) {
    console.error('[exportService] XLSX Export Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during export.',
    };
  }
};

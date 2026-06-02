import { exportTransactionsToXLSX } from '../../utils/exportService';
import { TransactionRepository } from '../../repositories/TransactionRepository';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

jest.mock('../../repositories/TransactionRepository');
jest.mock('expo-sharing');
jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock/cache/',
  writeAsStringAsync: jest.fn(),
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));
jest.mock('xlsx', () => ({
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn(() => 'base64data'),
}));

const mockTransactions = [
  { date: '2026-05-15', category: 'Comida', amount: -5000, description: 'Almuerzo' },
  { date: '2026-05-14', category: 'Sueldo', amount: 500000, description: 'Quincena' },
  { date: '2026-05-13', category: 'Transporte', amount: -1200, description: 'Metro' },
];

describe('exportTransactionsToXLSX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (TransactionRepository.getExportData as jest.Mock).mockResolvedValue(mockTransactions);
    (TransactionRepository.getTotalBalance as jest.Mock).mockResolvedValue(493800);
    (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('generates and shares an .xlsx file when transactions exist', async () => {
    const result = await exportTransactionsToXLSX();

    expect(result.success).toBe(true);
    expect(TransactionRepository.getExportData).toHaveBeenCalledTimes(1);
    expect(TransactionRepository.getTotalBalance).toHaveBeenCalledTimes(1);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);

    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const filePath = writeCall[0];
    const content = writeCall[1];
    const options = writeCall[2];

    expect(filePath).toContain('/mock/cache/OwnLog_Export_');
    expect(filePath).toContain('.xlsx');
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
    expect(options.encoding).toBe('base64');

    expect(Sharing.shareAsync).toHaveBeenCalledWith(filePath);
  });

  it('returns error when no transactions exist', async () => {
    (TransactionRepository.getExportData as jest.Mock).mockResolvedValue([]);

    const result = await exportTransactionsToXLSX();

    expect(result.success).toBe(false);
    expect(result.error).toBe('No transactions found to export.');
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('returns error when sharing is not available', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    const result = await exportTransactionsToXLSX();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Sharing is not available on this device.');
  });

  it('writes base64 content that is valid xlsx data', async () => {
    await exportTransactionsToXLSX();

    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const content = writeCall[1];

    expect(content).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it('handles empty descriptions gracefully', async () => {
    (TransactionRepository.getExportData as jest.Mock).mockResolvedValue([
      { date: '2026-05-10', category: 'Salud', amount: -8000, description: null },
    ]);

    const result = await exportTransactionsToXLSX();

    expect(result.success).toBe(true);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
  });

  it('includes the .xlsx file extension in the file path', async () => {
    await exportTransactionsToXLSX();

    const writeCall = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
    const filePath = writeCall[0];

    expect(filePath.endsWith('.xlsx')).toBe(true);
  });
});

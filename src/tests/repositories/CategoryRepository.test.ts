import { CategoryRepository } from '../../repositories/CategoryRepository';
import SQLiteEngine from '../../database/SQLiteEngine';

jest.mock('../../database/SQLiteEngine', () => ({
  __esModule: true,
  default: {
    getAll: jest.fn(),
    executeInTransaction: jest.fn(),
  },
}));

describe('CategoryRepository', () => {
  let mockDb: { runAsync: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = { runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 7 }) };
    (SQLiteEngine.executeInTransaction as jest.Mock).mockImplementation(
      async (callback: (db: any) => any) => callback(mockDb)
    );
  });

  describe('getAll', () => {
    it('should filter deleted and convert activa to boolean', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([
        { id: 1, nombre: 'Comida', tipo: 'egreso', emoji: '🍕', color_hex: '#FF0000', activa: 1 },
        { id: 2, nombre: 'Sueldo', tipo: 'ingreso', emoji: '💰', color_hex: '#00FF00', activa: 0 },
      ]);

      const categories = await CategoryRepository.getAll();
      expect(categories).toHaveLength(2);
      expect(categories[0].activa).toBe(true);
      expect(categories[1].activa).toBe(false);
    });

    it('should return empty array when no categories', async () => {
      (SQLiteEngine.getAll as jest.Mock).mockResolvedValue([]);

      const categories = await CategoryRepository.getAll();
      expect(categories).toEqual([]);
    });
  });

  describe('add', () => {
    it('should convert activa boolean to 0/1', async () => {
      const category = {
        nombre: 'Transporte',
        tipo: 'egreso' as const,
        emoji: '🚌',
        color_hex: '#123456',
        activa: true,
      };

      const id = await CategoryRepository.add(category);
      expect(id).toBe(7);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categorias'),
        [category.nombre, category.tipo, category.emoji, category.color_hex, 1]
      );
    });

    it('should store activa as 0 when false', async () => {
      const category = {
        nombre: 'Inactivo',
        tipo: 'egreso' as const,
        emoji: '❌',
        color_hex: '#000',
        activa: false,
      };

      await CategoryRepository.add(category);
      const args = mockDb.runAsync.mock.calls[0][1];
      expect(args[4]).toBe(0);
    });
  });

  describe('update', () => {
    it('should update only whitelisted fields', async () => {
      await CategoryRepository.update(3, {
        nombre: 'Nuevo nombre',
        tipo: 'ingreso' as const,
        emoji: '🌟',
        color_hex: '#FFAA00',
        activa: false,
      });

      const sql = mockDb.runAsync.mock.calls[0][0];
      expect(sql).toContain('nombre = ?');
      expect(sql).toContain('tipo = ?');
      expect(sql).toContain('emoji = ?');
      expect(sql).toContain('nombre = ?');
      expect(sql).toContain('tipo = ?');
      expect(sql).toContain('emoji = ?');
      expect(sql).toContain('color_hex = ?');
      expect(sql).toContain('activa = ?');
    });

    it('should ignore non-whitelisted keys', async () => {
      await CategoryRepository.update(3, {
        nombre: 'ok',
        injected: 'evil' as any,
      });

      const sql = mockDb.runAsync.mock.calls[0][0];
      expect(sql).toContain('nombre = ?');
      expect(sql).not.toContain('injected');
    });

    it('should do nothing if no valid keys', async () => {
      await CategoryRepository.update(3, { hack: true } as any);
      expect(mockDb.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should perform a soft delete', async () => {
      await CategoryRepository.delete(5);

      expect(SQLiteEngine.executeInTransaction).toHaveBeenCalledTimes(1);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE categorias SET is_deleted = 1'),
        [5]
      );
    });
  });
});

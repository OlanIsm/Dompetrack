import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionTypeDto } from './dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: PrismaService;

  const mockTransaction = {
    id: 'tx-123',
    userId: 'user-123',
    type: TransactionTypeDto.EXPENSE,
    amount: BigInt(50000),
    description: 'Beli makan siang',
    date: new Date('2026-07-15T00:00:00Z'),
    categoryId: 'cat-123',
    category: {
      id: 'cat-123',
      name: 'Makanan',
      icon: '🍔',
      color: '#FF6B6B',
      isDefault: true,
      userId: 'user-123',
    },
  };

  const mockPrismaService = {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an INCOME transaction successfully with no category', async () => {
      const dto = {
        type: TransactionTypeDto.INCOME,
        amount: 100000,
        description: 'Gajian bulanan',
        date: '2026-07-15T00:00:00Z',
      };

      const expectedTx = {
        ...mockTransaction,
        type: TransactionTypeDto.INCOME,
        amount: BigInt(100000),
        categoryId: null,
        category: null,
      };

      mockPrismaService.transaction.create.mockResolvedValue(expectedTx);

      const result = await service.create('user-123', dto);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: TransactionTypeDto.INCOME,
          amount: BigInt(100000),
          description: 'Gajian bulanan',
          date: new Date('2026-07-15T00:00:00Z'),
          categoryId: null,
        },
        include: { category: true },
      });
      expect(result.amount).toBe(100000);
    });

    it('should create an EXPENSE transaction successfully with category', async () => {
      const dto = {
        type: TransactionTypeDto.EXPENSE,
        amount: 50000,
        description: 'Beli burger',
        date: '2026-07-15T00:00:00Z',
        categoryId: 'cat-123',
      };

      mockPrismaService.category.findFirst.mockResolvedValue(
        mockTransaction.category,
      );
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);

      const result = await service.create('user-123', dto);

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-123', userId: 'user-123' },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: TransactionTypeDto.EXPENSE,
          amount: BigInt(50000),
          description: 'Beli burger',
          date: new Date('2026-07-15T00:00:00Z'),
          categoryId: 'cat-123',
        },
        include: { category: true },
      });
      expect(result.amount).toBe(50000);
    });

    it('should throw BadRequestException for EXPENSE with missing category', async () => {
      const dto = {
        type: TransactionTypeDto.EXPENSE,
        amount: 50000,
        description: 'Beli burger',
        date: '2026-07-15T00:00:00Z',
      };

      await expect(service.create('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if category does not exist/belong to user', async () => {
      const dto = {
        type: TransactionTypeDto.EXPENSE,
        amount: 50000,
        description: 'Beli burger',
        date: '2026-07-15T00:00:00Z',
        categoryId: 'cat-foreign',
      };

      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.create('user-123', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of transactions with pagination metadata', async () => {
      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);
      mockPrismaService.transaction.count.mockResolvedValue(1);

      const result = await service.findAll('user-123', {});

      expect(prisma.transaction.findMany).toHaveBeenCalled();
      expect(prisma.transaction.count).toHaveBeenCalled();
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(50000);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    it('should update transaction owned by the user', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );
      mockPrismaService.category.findFirst.mockResolvedValue(
        mockTransaction.category,
      );
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        description: 'Beli makan malam',
      });

      const result = await service.update('user-123', 'tx-123', {
        type: TransactionTypeDto.EXPENSE,
        description: 'Beli makan malam',
      });

      expect(prisma.transaction.update).toHaveBeenCalled();
      expect(result.description).toBe('Beli makan malam');
    });

    it('should throw NotFoundException if transaction is not found', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'tx-missing', {
          type: TransactionTypeDto.INCOME,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );

      await expect(
        service.update('user-different', 'tx-123', {
          type: TransactionTypeDto.INCOME,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete a transaction owned by the user', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );
      mockPrismaService.transaction.delete.mockResolvedValue(mockTransaction);

      const result = await service.delete('user-123', 'tx-123');

      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
      });
      expect(result).toEqual({ message: 'Transaksi berhasil dihapus' });
    });

    it('should throw ForbiddenException if user does not own transaction to delete', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );

      await expect(service.delete('user-different', 'tx-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAiInsight', () => {
    const originalEnv = process.env.GEMINI_API_KEY;

    afterEach(() => {
      process.env.GEMINI_API_KEY = originalEnv;
      jest.restoreAllMocks();
    });

    it('should call rule-based fallback if GEMINI_API_KEY is not defined', async () => {
      delete process.env.GEMINI_API_KEY;
      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await service.getAiInsight('user-123', {});

      expect(result.insight).toContain('tabungan Anda bulan ini');
    });

    it('should call Gemini API if key is present and return insight', async () => {
      process.env.GEMINI_API_KEY = 'mock-api-key';
      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);

      const mockResponse = {
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Hemat pangkal kaya!' }],
              },
            },
          ],
        }),
      };

      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockResponse as Response);

      const result = await service.getAiInsight('user-123', {});

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.insight).toBe('Hemat pangkal kaya!');
    });

    it('should fall back to rule-based insight if Gemini fetch fails', async () => {
      process.env.GEMINI_API_KEY = 'mock-api-key';
      mockPrismaService.transaction.findMany.mockResolvedValue([
        mockTransaction,
      ]);

      const mockResponse = {
        ok: false,
      };

      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(mockResponse as Response);

      const result = await service.getAiInsight('user-123', {});

      expect(result.insight).toContain('tabungan Anda bulan ini');
    });
  });
});

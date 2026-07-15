import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTransactionDto,
  QueryTransactionDto,
  UpdateTransactionDto,
  TransactionTypeDto,
} from './dto';
import { Prisma, Transaction, Category } from '@prisma/client';

export type TransactionWithCategory = Transaction & {
  category: Category | null;
};

export type SerializedTransaction = Omit<TransactionWithCategory, 'amount'> & {
  amount: number;
};

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new transaction.
   * Amount is stored as BigInt (in smallest currency unit, e.g., Rupiah).
   */
  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.type === TransactionTypeDto.EXPENSE && !dto.categoryId) {
      throw new BadRequestException('Kategori wajib dipilih untuk pengeluaran');
    }

    if (dto.categoryId) {
      // Verify category belongs to user
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
      });

      if (!category) {
        throw new NotFoundException('Kategori tidak ditemukan');
      }
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        type: dto.type,
        amount: BigInt(dto.amount),
        description: dto.description || null,
        date: dto.date ? new Date(dto.date) : new Date(),
        categoryId: dto.categoryId || null,
        userId,
      },
      include: { category: true },
    });

    return this.serializeTransaction(transaction);
  }

  /**
   * List transactions for a user, optionally filtered by month/year with pagination.
   */
  async findAll(userId: string, query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = { userId };

    // Filter by month and year if provided (UTC timezone neutral range)
    if (query.month !== undefined && query.year !== undefined) {
      const startDate = new Date(
        Date.UTC(query.year, query.month, 1, 0, 0, 0, 0),
      );
      const endDate = new Date(
        Date.UTC(query.year, query.month + 1, 0, 23, 59, 59, 999),
      );
      where.date = { gte: startDate, lte: endDate };
    } else if (query.year !== undefined) {
      const startDate = new Date(Date.UTC(query.year, 0, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(query.year, 11, 31, 23, 59, 59, 999));
      where.date = { gte: startDate, lte: endDate };
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const serializedTransactions = transactions.map((tx) =>
      this.serializeTransaction(tx),
    );

    return {
      transactions: serializedTransactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get financial summary for a user (income, expense, balance).
   */
  async getSummary(userId: string, query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.month !== undefined && query.year !== undefined) {
      const startDate = new Date(
        Date.UTC(query.year, query.month, 1, 0, 0, 0, 0),
      );
      const endDate = new Date(
        Date.UTC(query.year, query.month + 1, 0, 23, 59, 59, 999),
      );
      where.date = { gte: startDate, lte: endDate };
    }

    const [incomeResult, expenseResult] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const income = Number(incomeResult._sum.amount || 0);
    const expense = Number(expenseResult._sum.amount || 0);

    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: incomeResult._count + expenseResult._count,
    };
  }

  /**
   * Delete a transaction (only if it belongs to the user).
   */
  async delete(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Tidak berhak menghapus transaksi ini');
    }

    await this.prisma.transaction.delete({
      where: { id: transactionId },
    });

    return { message: 'Transaksi berhasil dihapus' };
  }

  /**
   * Update a transaction (only if it belongs to the user).
   */
  async update(
    userId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    if (transaction.userId !== userId) {
      throw new ForbiddenException('Tidak berhak mengubah transaksi ini');
    }

    if (
      dto.type === TransactionTypeDto.EXPENSE &&
      !dto.categoryId &&
      !transaction.categoryId
    ) {
      throw new BadRequestException('Kategori wajib dipilih untuk pengeluaran');
    }

    if (dto.categoryId) {
      // Verify category belongs to user
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId },
      });

      if (!category) {
        throw new NotFoundException('Kategori tidak ditemukan');
      }
    }

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        type: dto.type,
        amount: dto.amount !== undefined ? BigInt(dto.amount) : undefined,
        description:
          dto.description !== undefined ? dto.description : undefined,
        date: dto.date ? new Date(dto.date) : undefined,
        categoryId:
          dto.type === TransactionTypeDto.INCOME
            ? null
            : dto.categoryId !== undefined
              ? dto.categoryId
              : undefined,
      },
      include: { category: true },
    });

    return this.serializeTransaction(updated);
  }

  /**
   * Get AI Insight from Gemini or dynamic rule-based fallback.
   */
  async getAiInsight(userId: string, query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (query.month !== undefined && query.year !== undefined) {
      const startDate = new Date(
        Date.UTC(query.year, query.month, 1, 0, 0, 0, 0),
      );
      const endDate = new Date(
        Date.UTC(query.year, query.month + 1, 0, 23, 59, 59, 999),
      );
      where.date = { gte: startDate, lte: endDate };
    }

    const txs = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    // Calculate total income, total expense, and categories
    let income = 0;
    let expense = 0;
    const categoryExpenses: { [key: string]: number } = {};

    txs.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        income += amount;
      } else {
        expense += amount;
        const catName = tx.category?.name || 'Lainnya';
        categoryExpenses[catName] = (categoryExpenses[catName] || 0) + amount;
      }
    });

    const balance = income - expense;
    const formatRupiah = (val: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const txList = txs
          .map((tx) => {
            return `- ${tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}: ${formatRupiah(Number(tx.amount))} - ${tx.description || tx.category?.name || ''} (${tx.date.toISOString().split('T')[0]})`;
          })
          .join('\n');

        const prompt = `Anda adalah Dompetrack AI, asisten keuangan pribadi yang cerdas.
Analisis data keuangan pengguna bulan ini:
- Total Pemasukan: ${formatRupiah(income)}
- Total Pengeluaran: ${formatRupiah(expense)}
- Sisa Saldo: ${formatRupiah(balance)}
- Daftar Transaksi:
${txList || '(Belum ada transaksi)'}

Tulis analisis keuangan singkat dalam Bahasa Indonesia. 
Ketentuannya:
1. Maksimal 1-2 kalimat saja, sangat singkat dan to-the-point untuk dimuat di kartu informasi kecil.
2. Harus logis, ramah, dan solutif. Jangan gunakan bullet points atau format markdown tebal (* atau **), berikan paragraf teks biasa saja.
3. Sebutkan satu hal positif atau peringatan spesifik jika pengeluaran terlalu besar dibanding pemasukan.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
            // Set a short timeout (5 seconds) using signal
            signal: AbortSignal.timeout(5000),
          },
        );

        if (response.ok) {
          const data = (await response.json()) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  text?: string;
                }>;
              };
            }>;
          };
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { insight: text.trim() };
          }
        }
      } catch (err) {
        console.error('Error calling Gemini API:', err);
      }
    }

    // Rule-based fallback if Gemini API key not set or calls fail
    if (txs.length === 0) {
      return {
        insight:
          'Belum ada transaksi di periode ini. Yuk, mulai catat pemasukan atau pengeluaran Anda untuk mendapatkan analisis keuangan pintar!',
      };
    }

    if (expense === 0) {
      return {
        insight: `Luar biasa! Anda belum mencatat pengeluaran bulan ini. Saldo Anda saat ini aman di angka ${formatRupiah(balance)}.`,
      };
    }

    if (expense > income && income > 0) {
      return {
        insight: `Waspada! Pengeluaran Anda (${formatRupiah(expense)}) melebihi pemasukan (${formatRupiah(income)}) sebesar ${formatRupiah(expense - income)}. Sebaiknya kurangi belanja non-primer.`,
      };
    }

    // Find category with highest expense
    let maxCat = '';
    let maxVal = 0;
    for (const [cat, val] of Object.entries(categoryExpenses)) {
      if (val > maxVal) {
        maxVal = val;
        maxCat = cat;
      }
    }

    if (maxCat) {
      return {
        insight: `Pengeluaran terbesar Anda adalah untuk ${maxCat} sebesar ${formatRupiah(maxVal)}. Mengontrol kategori ini akan membantu menaikkan tabungan Anda bulan ini.`,
      };
    }

    return {
      insight: `Keuangan Anda bulan ini terpantau sehat dengan sisa saldo ${formatRupiah(balance)}. Pertahankan pencatatan rutin Anda!`,
    };
  }

  // BigInt cannot be serialized to JSON directly, so convert to Number
  private serializeTransaction(
    tx: TransactionWithCategory,
  ): SerializedTransaction {
    return {
      ...tx,
      amount: Number(tx.amount),
    };
  }
}

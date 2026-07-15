import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionTypeDto {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateTransactionDto {
  @IsEnum(TransactionTypeDto, { message: 'Tipe harus INCOME atau EXPENSE' })
  type: TransactionTypeDto;

  @Type(() => Number)
  @IsInt({ message: 'Jumlah harus berupa angka bulat' })
  @Min(1, { message: 'Jumlah minimal 1' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal tidak valid' })
  date?: string;

  @IsOptional()
  @IsString({ message: 'ID kategori harus berupa string' })
  categoryId?: string;
}

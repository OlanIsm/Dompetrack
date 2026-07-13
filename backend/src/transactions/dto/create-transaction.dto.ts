import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsUUID,
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

  @IsUUID('4', { message: 'ID kategori tidak valid' })
  @IsNotEmpty({ message: 'Kategori harus dipilih' })
  categoryId: string;
}

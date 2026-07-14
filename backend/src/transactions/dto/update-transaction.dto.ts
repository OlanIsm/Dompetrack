import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionTypeDto } from './create-transaction.dto';

export class UpdateTransactionDto {
  @IsOptional()
  @IsEnum(TransactionTypeDto, { message: 'Tipe harus INCOME atau EXPENSE' })
  type?: TransactionTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Jumlah harus berupa angka bulat' })
  @Min(1, { message: 'Jumlah minimal 1' })
  amount?: number;

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

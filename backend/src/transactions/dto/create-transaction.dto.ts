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
  @IsEnum(TransactionTypeDto, { message: 'Type must be INCOME or EXPENSE' })
  type: TransactionTypeDto;

  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @Min(1, { message: 'Amount must be at least 1' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format' })
  date?: string;

  @IsOptional()
  @IsString({ message: 'Category ID must be a string' })
  categoryId?: string;
}

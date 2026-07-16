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
  @IsEnum(TransactionTypeDto, { message: 'Type must be INCOME or EXPENSE' })
  type?: TransactionTypeDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @Min(1, { message: 'Amount must be at least 1' })
  amount?: number;

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

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  QueryTransactionDto,
  UpdateTransactionDto,
} from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.findAll(userId, query);
  }

  @Get('summary')
  getSummary(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.getSummary(userId, query);
  }

  @Get('ai-insight')
  getAiInsight(
    @CurrentUser('userId') userId: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.getAiInsight(userId, query);
  }

  @Delete(':id')
  delete(
    @CurrentUser('userId') userId: string,
    @Param('id') transactionId: string,
  ) {
    return this.transactionsService.delete(userId, transactionId);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(userId, transactionId, dto);
  }
}

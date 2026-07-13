import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon || '📦',
        color: dto.color || '#6D5FFD',
        isDefault: false,
        userId,
      },
    });
  }
}

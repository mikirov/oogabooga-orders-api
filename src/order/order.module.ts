import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { TaskModule } from '../task/task.module';
import { SwapModule } from '../swap/swap.module';

@Module({
  imports: [
    TaskModule,
    SwapModule,
  ],
  controllers: [OrderController],
})
export class OrderModule {} 
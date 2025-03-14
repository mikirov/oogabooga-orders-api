import { ApiProperty } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({ description: 'Task unique identifier' })
  id: string;

  @ApiProperty({ description: 'The input token address' })
  tokenIn: string;

  @ApiProperty({ description: 'The output token address' })
  tokenOut: string;

  @ApiProperty({ description: 'Amount of token to swap' })
  amount: string;

  @ApiProperty({ description: 'Slippage tolerance' })
  slippage: number;

  @ApiProperty({ description: 'Whether the task has been completed' })
  isCompleted: boolean;

  @ApiProperty({ description: 'Transaction hash if completed', required: false })
  transactionHash?: string;

  @ApiProperty({ description: 'Task creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Task last update timestamp' })
  updatedAt: Date;
} 
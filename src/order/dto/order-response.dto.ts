import { ApiProperty } from "@nestjs/swagger";

export class OrderResponseDto {
  @ApiProperty({
    description: "The unique identifier of the order",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "The input token address",
    example: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736",
  })
  tokenIn: string;

  @ApiProperty({
    description: "The output token address",
    example: "0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce",
  })
  tokenOut: string;

  @ApiProperty({
    description: "Amount of token to swap",
    example: "100000",
  })
  amount: string;

  @ApiProperty({
    description: "Slippage tolerance in percentage",
    example: 0.5,
  })
  slippage: number;

  @ApiProperty({
    description: "Whether the order has been completed",
    example: false,
  })
  isCompleted: boolean;

  @ApiProperty({
    description: "Whether this is a recurring order",
    example: true,
  })
  isRecurring: boolean;

  @ApiProperty({
    description: "Whether this order should be executed automatically by the cron job",
    example: true,
  })
  isAutomatic: boolean;

  @ApiProperty({
    description: "Transaction hash of the completed order",
    example: "0x123...",
    required: false,
  })
  transactionHash?: string;

  @ApiProperty({
    description: "Time interval between trades in seconds (for recurring orders)",
    example: 86400,
    required: false,
  })
  intervalSeconds?: number;

  @ApiProperty({
    description: "Number of trades to execute (for recurring orders)",
    example: 10,
    required: false,
  })
  numberOfTrades?: number;

  @ApiProperty({
    description: "Number of trades already executed (for recurring orders)",
    example: 3,
    required: false,
  })
  executedTrades?: number;

  @ApiProperty({
    description: "Next execution time (for recurring orders)",
    example: "2023-01-01T12:00:00Z",
    required: false,
  })
  nextExecutionTime?: Date;

  @ApiProperty({ description: "Router address for the swap", required: false })
  routerAddress?: string;

  @ApiProperty({ description: "Gas price for the transaction", required: false })
  gasPrice?: number;

  @ApiProperty({ description: "Block number when the quote was generated", required: false })
  blockNumber?: number;

  @ApiProperty({ description: "Price impact percentage", required: false })
  priceImpact?: number;

  @ApiProperty({ description: "Expected output amount", required: false })
  amountOut?: string;

  @ApiProperty({ description: "Minimum output amount (with slippage)", required: false })
  amountOutMin?: string;

  @ApiProperty({ description: "Path definition for the swap", required: false })
  pathDefinition?: string;

  @ApiProperty({ description: "Referral code if applicable", required: false })
  referralCode?: number;

  @ApiProperty({
    description: "Creation timestamp",
    example: "2023-01-01T00:00:00Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "Last update timestamp",
    example: "2023-01-01T00:00:00Z",
  })
  updatedAt: Date;
}

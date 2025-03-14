import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsEthereumAddress,
  IsBoolean,
  IsOptional,
  IsDate,
} from "class-validator";

export class CreateTaskDto {
  @ApiProperty({
    description: "The input token address",
    example: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC example
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  tokenIn: string;

  @ApiProperty({
    description: "The output token address",
    example: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH example
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  tokenOut: string;

  @ApiProperty({
    description: "Amount of token to swap",
    example: "1000000", // 1 USDC with 6 decimals
  })
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ApiProperty({
    description: "Slippage tolerance in percentage",
    example: 0.5,
    default: 0.5,
  })
  @IsNumber()
  @Min(0)
  slippage: number;

  @ApiProperty({
    description: "Whether this is a recurring task",
    example: false,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiProperty({
    description:
      "Whether this order should be executed automatically by the cron job",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isAutomatic?: boolean;

  @ApiProperty({
    description: "Time interval between trades in seconds for recurring tasks",
    example: 86400, // Daily (24 hours)
    required: false,
  })
  @IsNumber()
  @Min(60) // Minimum 1 minute interval
  @IsOptional()
  intervalSeconds?: number;

  @ApiProperty({
    description: "Number of trades to execute (for recurring tasks)",
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  numberOfTrades?: number;

  @ApiProperty({
    description: "Current trade count for recurring tasks",
    example: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  currentTradeCount?: number;

  @ApiProperty({
    description: "Next scheduled trade date for recurring tasks",
    required: false,
  })
  @IsDate()
  @IsOptional()
  nextTradeDate?: Date;

  @ApiProperty({
    description: "Router address for the swap",
    example: "0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch router
    required: false,
  })
  @IsEthereumAddress()
  @IsOptional()
  routerAddress?: string;

  @ApiProperty({
    description: "Gas price for the transaction",
    example: 20,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  gasPrice?: number;

  @ApiProperty({
    description: "Block number when the quote was generated",
    example: 12345678,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  blockNumber?: number;

  @ApiProperty({
    description: "Price impact percentage",
    example: 0.1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  priceImpact?: number;

  @ApiProperty({
    description: "Expected output amount",
    example: "1000000000000000000",
    required: false,
  })
  @IsString()
  @IsOptional()
  amountOut?: string;

  @ApiProperty({
    description: "Minimum output amount (with slippage)",
    example: "995000000000000000",
    required: false,
  })
  @IsString()
  @IsOptional()
  amountOutMin?: string;

  @ApiProperty({
    description: "Path definition for the swap",
    example: "0x...",
    required: false,
  })
  @IsString()
  @IsOptional()
  pathDefinition?: string;

  @ApiProperty({
    description: "Referral code if applicable",
    example: 123,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  referralCode?: number;
}

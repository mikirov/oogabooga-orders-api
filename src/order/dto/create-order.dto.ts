import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsEthereumAddress,
  IsBoolean,
  IsOptional,
} from "class-validator";

export class CreateOrderDto {
  @ApiProperty({
    description: "The input token address",
    example: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736", // USDC example
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  tokenIn: string;

  @ApiProperty({
    description: "The output token address",
    example: "0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce", // Honey example
  })
  @IsNotEmpty()
  @IsEthereumAddress()
  tokenOut: string;

  @ApiProperty({
    description: "Amount of token to swap",
    example: "0.1", // 0.1 USDT with 6 decimals
    required: false,
    default: "0.1",
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
    description: "Whether this is a recurring order",
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isRecurring: boolean;

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
    description: "Time interval between trades in seconds for recurring orders",
    example: 100, // 100 seconds
    default: 100, // execute every 100 seconds
    required: false,
  })
  @IsNumber()
  @Min(60) // Minimum 1 minute interval
  @IsOptional()
  intervalSeconds?: number;

  @ApiProperty({
    description: "Number of trades to execute (for recurring orders)",
    example: 10,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  numberOfTrades?: number;
}

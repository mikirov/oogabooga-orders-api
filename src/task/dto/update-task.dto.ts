import { PartialType } from "@nestjs/swagger";
import { CreateTaskDto } from "./create-task.dto";
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDate,
  IsString,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({
    description: "Whether the task is completed",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiProperty({
    description: "Transaction hash if the task was completed",
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionHash?: string;

  @ApiProperty({
    description: "Whether this task should be executed automatically",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @ApiProperty({
    description: "Current trade count for recurring orders",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  currentTradeCount?: number;

  @ApiProperty({
    description: "Next scheduled trade date for recurring orders",
    required: false,
  })
  @IsOptional()
  @IsDate()
  nextTradeDate?: Date;

  @ApiProperty({
    description: "Number of trades already executed",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  executedTrades?: number;

  @ApiProperty({
    description: "Next execution time for recurring tasks",
    required: false,
  })
  @IsOptional()
  @IsDate()
  nextExecutionTime?: Date;

  @ApiProperty({
    description: "Router address for the swap",
    required: false,
  })
  @IsOptional()
  @IsString()
  routerAddress?: string;

  @ApiProperty({
    description: "Gas price for the transaction",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  gasPrice?: number;

  @ApiProperty({
    description: "Block number when the quote was generated",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  blockNumber?: number;

  @ApiProperty({
    description: "Price impact percentage",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priceImpact?: number;

  @ApiProperty({
    description: "Expected output amount",
    required: false,
  })
  @IsOptional()
  @IsString()
  amountOut?: string;

  @ApiProperty({
    description: "Minimum output amount (with slippage)",
    required: false,
  })
  @IsOptional()
  @IsString()
  amountOutMin?: string;

  @ApiProperty({
    description: "Path definition for the swap",
    required: false,
  })
  @IsOptional()
  @IsString()
  pathDefinition?: string;

  @ApiProperty({
    description: "Referral code if applicable",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  referralCode?: number;

  @ApiProperty({
    description: "Number of decimals for the input token",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  tokenInDecimals?: number;

  @ApiProperty({
    description: "Number of decimals for the output token",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  tokenOutDecimals?: number;
}

import { ApiProperty } from "@nestjs/swagger";

class TransactionDto {
  @ApiProperty({ description: "Transaction recipient address" })
  to: string;

  @ApiProperty({ description: "Transaction sender address", required: false })
  from?: string;

  @ApiProperty({ description: "Transaction calldata" })
  data: string;

  @ApiProperty({ description: "Transaction value in wei", required: false })
  value?: string;
}

class TokenDto {
  @ApiProperty({ description: "Token address" })
  address: string;

  @ApiProperty({ description: "Token decimals" })
  decimals: number;

  @ApiProperty({ description: "Token symbol" })
  symbol: string;

  @ApiProperty({ description: "Token name" })
  name: string;
}

class SwapDto {
  @ApiProperty({ description: "Protocol used for the swap" })
  protocol: string;

  @ApiProperty({ description: "Pool ID" })
  poolId: string;

  @ApiProperty({ description: "Input token address" })
  tokenIn: string;

  @ApiProperty({ description: "Output token address" })
  tokenOut: string;

  @ApiProperty({ description: "Pool fee" })
  poolFee: number;

  @ApiProperty({ description: "Amount of input token" })
  amountIn: string;

  @ApiProperty({ description: "Amount of output token" })
  amountOut: string;
}

class RouteDto {
  @ApiProperty({ description: "Percentage of the trade using this route" })
  percent: number;

  @ApiProperty({ description: "Swaps in this route", type: [SwapDto] })
  swaps: SwapDto[];
}

export class SwapQuoteResponseDto {
  @ApiProperty({ description: "Transaction details", type: TransactionDto })
  tx: TransactionDto;

  @ApiProperty({ description: "Input token details", type: TokenDto })
  tokens: TokenDto[];

  @ApiProperty({ description: "route for the swap", type: [RouteDto] })
  route: RouteDto[];

  @ApiProperty({ description: "Price impact percentage" })
  priceImpact: number;

  @ApiProperty({ description: "Amount of input token in wei" })
  amountIn: string;

  @ApiProperty({ description: "Amount of output token in wei" })
  amountOut: string;

  @ApiProperty({ description: "Estimated gas for the transaction" })
  estimatedGas: string;
}

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

  @ApiProperty({ description: "Gas limit for the transaction", required: false })
  gas?: string;
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

class RouteItemDto {
  @ApiProperty({ description: "Pool address" })
  poolAddress: string;

  @ApiProperty({ description: "Pool type" })
  poolType: string;

  @ApiProperty({ description: "Pool name" })
  poolName: string;

  @ApiProperty({ description: "Pool fee" })
  poolFee: number;

  @ApiProperty({ description: "Token from index" })
  tokenFrom: number;

  @ApiProperty({ description: "Token to index" })
  tokenTo: number;

  @ApiProperty({ description: "Share percentage" })
  share: number;

  @ApiProperty({ description: "Assumed amount in" })
  assumedAmountIn: string;

  @ApiProperty({ description: "Assumed amount out" })
  assumedAmountOut: string;

  @ApiProperty({ description: "Liquidity source" })
  liquiditySource: string;
}

class SwapTokenInfoDto {
  @ApiProperty({ description: "Input token address" })
  inputToken: string;

  @ApiProperty({ description: "Input amount" })
  inputAmount: string;

  @ApiProperty({ description: "Output token address" })
  outputToken: string;

  @ApiProperty({ description: "Output quote amount" })
  outputQuote: string;

  @ApiProperty({ description: "Minimum output amount" })
  outputMin: string;

  @ApiProperty({ description: "Output receiver address" })
  outputReceiver: string;
}

class RouterParamsDto {
  @ApiProperty({ description: "Swap token information", type: SwapTokenInfoDto })
  swapTokenInfo: SwapTokenInfoDto;

  @ApiProperty({ description: "Path definition" })
  pathDefinition: string;

  @ApiProperty({ description: "Executor address" })
  executor: string;

  @ApiProperty({ description: "Referral code" })
  referralCode: number;

  @ApiProperty({ description: "Value in wei" })
  value: string;
}

export class TransactionResponseDto {
  @ApiProperty({ description: "Transaction details to be sent by user", type: TransactionDto })
  tx: TransactionDto;

  @ApiProperty({ description: "Order ID this transaction is for" })
  orderId: string;

  @ApiProperty({ description: "Tokens involved in the swap", type: [TokenDto] })
  tokens: TokenDto[];

  @ApiProperty({ description: "Route information", type: [RouteItemDto] })
  route: RouteItemDto[];

  @ApiProperty({ description: "Transaction status" })
  status: string;

  @ApiProperty({ description: "Block number" })
  blockNumber: number;

  @ApiProperty({ description: "Gas price in gwei" })
  gasPrice: number;

  @ApiProperty({ description: "Token from index" })
  tokenFrom: number;

  @ApiProperty({ description: "Token to index" })
  tokenTo: number;

  @ApiProperty({ description: "Exchange rate" })
  price: number;

  @ApiProperty({ description: "Price impact percentage" })
  priceImpact: number;

  @ApiProperty({ description: "Input amount in wei" })
  amountIn: string;

  @ApiProperty({ description: "Output amount fee" })
  amountOutFee: string;

  @ApiProperty({ description: "Assumed output amount" })
  assumedAmountOut: string;

  @ApiProperty({ description: "Router address" })
  routerAddr: string;

  @ApiProperty({ description: "Router parameters", type: RouterParamsDto })
  routerParams: RouterParamsDto;

  @ApiProperty({ description: "Whether token approval is required before swap" })
  requiresApproval: boolean;
}

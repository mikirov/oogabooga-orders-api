import { ApiProperty } from "@nestjs/swagger";

export class TaskDTO {
  @ApiProperty({ description: "The input token address" })
  tokenIn: string;

  @ApiProperty({ description: "The output token address" })
  tokenOut: string;

  @ApiProperty({ description: "Amount of token to swap" })
  amount: string;

  @ApiProperty({ description: "Slippage tolerance" })
  slippage: number;
}

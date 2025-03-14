import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Task {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  tokenIn: string;

  @Column({ type: "int", nullable: true })
  tokenInDecimals: number;

  @Column()
  tokenOut: string;

  @Column({ type: "int", nullable: true })
  tokenOutDecimals: number;

  @Column()
  amount: string;

  @Column({ type: "float", default: 0.5 })
  slippage: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ default: true })
  isRecurring: boolean;

  @Column({ default: true })
  isAutomatic: boolean;

  @Column({ type: "int", default: 30 })
  intervalSeconds: number;

  @Column({ type: "int", nullable: true })
  numberOfTrades: number;

  @Column({ type: "int", default: 0 })
  executedTrades: number;

  @Column({ nullable: true })
  nextExecutionTime: Date;

  // Router address for the swap
  @Column({ nullable: true })
  routerAddress: string;

  // Gas price for the transaction
  @Column({ type: "float", nullable: true })
  gasPrice: number;

  // Block number when the quote was generated
  @Column({ type: "int", nullable: true })
  blockNumber: number;

  // Price impact percentage
  @Column({ type: "float", nullable: true })
  priceImpact: number;

  // Expected output amount
  @Column({ nullable: true })
  amountOut: string;

  // Minimum output amount (with slippage)
  @Column({ nullable: true })
  amountOutMin: string;

  // Path definition for the swap
  @Column({ nullable: true })
  pathDefinition: string;

  // Referral code if applicable
  @Column({ type: "int", nullable: true })
  referralCode: number;

  @Column({ nullable: true })
  parentOrderId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

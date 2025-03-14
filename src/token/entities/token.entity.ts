import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("tokens")
export class Token {
  @PrimaryColumn()
  address: string;

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column({ nullable: true })
  decimals: number;

  @Column({ nullable: true, type: "text" })
  tokenURI: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

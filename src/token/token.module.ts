import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { TokenService } from "./token.service";
import { Token } from "./entities/token.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Token]), HttpModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}

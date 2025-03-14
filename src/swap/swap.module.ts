import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { SwapService } from "./swap.service";
import { TokenModule } from "../token/token.module";
import { TaskModule } from "../task/task.module";

@Module({
  imports: [HttpModule, TokenModule, TaskModule],
  providers: [SwapService],
  exports: [SwapService],
})
export class SwapModule {}

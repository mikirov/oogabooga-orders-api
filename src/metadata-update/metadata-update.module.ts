import { Module } from "@nestjs/common";
import { MetadataUpdateService } from "./metadata-update.service";
import { TokenModule } from "../token/token.module";

@Module({
  imports: [TokenModule],
  providers: [MetadataUpdateService],
})
export class MetadataUpdateModule {}

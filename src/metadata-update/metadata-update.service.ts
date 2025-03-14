import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TokenService } from "../token/token.service";

@Injectable()
export class MetadataUpdateService {
  private readonly logger = new Logger(MetadataUpdateService.name);
  constructor(private readonly tokenService: TokenService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateTokenMetadata() {
    this.logger.log("Starting scheduled token metadata update...");
    try {
      await this.tokenService.fetchAndStoreTokenMetadata();
      this.logger.log("Token metadata update completed successfully");
    } catch (error) {
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Failed to update token metadata: ${error.message}`,
        error,
      );
    }
  }
}

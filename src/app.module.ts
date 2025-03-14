import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenModule } from "./token/token.module";
import { TaskModule } from "./task/task.module";
import { SwapModule } from "./swap/swap.module";
import { MetadataUpdateModule } from "./metadata-update/metadata-update.module";
import { OrderModule } from "./order/order.module";
import { Task } from "./task/entities/task.entity";
import { Token } from "./token/entities/token.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("POSTGRES_HOST", "localhost"),
        port: parseInt(configService.get("POSTGRES_PORT", "5437")),
        username: configService.get("POSTGRES_USERNAME", "postgres"),
        password: configService.get("POSTGRES_PASSWORD", "postgres"),
        database: configService.get("POSTGRES_DATABASE", "oogabooga"),
        entities: [Task, Token],
        synchronize: configService.get("NODE_ENV") !== "production",
        logging: configService.get("NODE_ENV") !== "production",
      }),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get("API_BASE_URL", "https://mainnet.api.oogabooga.io"),
        headers: {
          Authorization: `Bearer ${configService.get("API_KEY", "")}`,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    TaskModule,
    TokenModule,
    SwapModule,
    MetadataUpdateModule,
    OrderModule,
  ],
  providers: [],
})
export class AppModule {}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { firstValueFrom } from "rxjs";
import { Token } from "./entities/token.entity";
import { zeroAddress } from "viem";
import { ConfigService } from "@nestjs/config";

// Define the interface for token data from API
interface TokenApiResponse {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  [key: string]: any;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly configService: ConfigService,
  ) {
    this.apiBaseUrl = this.configService.get<string>(
      "API_BASE_URL",
      "https://mainnet.api.oogabooga.io",
    );
    this.apiKey = this.configService.get<string>("API_KEY", "");

    if (!this.apiBaseUrl) {
      this.logger.warn("API_BASE_URL is not set. API calls will likely fail.");
    }

    if (!this.apiKey) {
      this.logger.warn(
        "API_KEY is not set. API calls may fail due to authentication issues.",
      );
    }
  }

  async fetchAndStoreTokenMetadata(): Promise<void> {
    try {
      if (!this.apiBaseUrl) {
        this.logger.error(
          "Cannot fetch token metadata: API_BASE_URL is not set",
        );
        // Add default tokens as fallback
        return;
      }

      // Construct the full URL
      const url = `${this.apiBaseUrl}/v1/tokens`;

      // Set up headers with authorization
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
      };

      this.logger.log(`Fetching tokens from ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<TokenApiResponse[]>(url, { headers }),
      );

      this.logger.debug(`Fetched ${response.data.length} tokens from API`);
      const tokens = response.data;

      // Clear existing tokens if needed
      // await this.tokenRepository.clear();

      // Save each token to the database
      for (const tokenData of tokens) {
        const token = new Token();
        token.address = tokenData.address.toLowerCase(); // Ensure addresses are lowercase for consistency
        token.name = tokenData.name;
        token.symbol = tokenData.symbol;
        token.decimals = tokenData.decimals;
        token.tokenURI = tokenData.tokenURI;

        // Store any additional metadata
        const metadata: Record<string, any> = {};
        for (const [key, value] of Object.entries(tokenData)) {
          if (
            !["address", "name", "symbol", "decimals", "logoURI"].includes(key)
          ) {
            metadata[key] = value;
          }
        }
        token.metadata = metadata;

        await this.tokenRepository.save(token);
      }

      this.logger.log(
        `Successfully stored ${tokens.length} tokens in the database`,
      );
    } catch (error) {
      this.logger.error("Failed to fetch and store token metadata", error);
    }
  }

  async loadTokenMetadata(): Promise<Record<string, Token>> {
    try {
      const tokens = await this.tokenRepository.find();

      // Create a map of lowercase addresses to token data
      const tokenMap: Record<string, Token> = {};
      for (const token of tokens) {
        tokenMap[token.address.toLowerCase()] = token;
      }

      return tokenMap;
    } catch (error) {
      this.logger.error("Failed to load token metadata from database", error);
      return {};
    }
  }

  async findTokenByAddress(address: string): Promise<Token | null> {
    return this.tokenRepository.findOne({
      where: { address: address.toLowerCase() },
    });
  }

  /**
   * Check if a token is supported by the system
   * @param address Token address to check
   * @returns boolean indicating if the token is supported
   */
  async isTokenSupported(address: string): Promise<boolean> {
    if (!address) return false;

    try {
      const normalizedAddress = address.toLowerCase();

      // Check if it's the native token (ETH)
      if (normalizedAddress === zeroAddress) {
        return true;
      }

      // Check if it exists in our database
      const token = await this.findTokenByAddress(normalizedAddress);
      return !!token;
    } catch (error) {
      this.logger.error(`Error checking token support: ${error.message}`);
      return false;
    }
  }
}

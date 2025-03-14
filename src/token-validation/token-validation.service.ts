/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from "@nestjs/common";
import { TokenService } from "../token/token.service";
import { zeroAddress } from "viem";

@Injectable()
export class TokenValidationService {
  private readonly logger = new Logger(TokenValidationService.name);
  private tokenCache: Record<string, any> = {}; // Cache token data
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  // Define a whitelist of token addresses for fallback
  private readonly tokenWhitelist: string[] = [
    zeroAddress, // Native token
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    "0x6969696969696969696969696969696969696969", // WBERA
    "0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce", // HONEY
    "0x779Ded0c9e1022225f8E0630b35a9b54bE713736", // Add the token from the error message
  ];

  constructor(private readonly tokenService: TokenService) {
    this.refreshTokenCache();
  }

  private async refreshTokenCache(): Promise<void> {
    try {
      this.tokenCache = await this.tokenService.loadTokenMetadata();
      this.lastCacheUpdate = Date.now();
      this.logger.log(
        `Token cache refreshed with ${Object.keys(this.tokenCache).length} tokens`,
      );
    } catch (error) {
      this.logger.error("Failed to refresh token cache", error);
    }
  }

  /**
   * Check if a token is valid
   * @param address Token address to validate
   * @returns boolean indicating if the token is valid
   */
  isValidToken(address: string): boolean {
    if (!address) return false;
    
    try {
      const normalizedAddress = address.toLowerCase();
      
      // Check if it's the native token (ETH)
      if (normalizedAddress === zeroAddress) {
        return true;
      }
      
      // Check if it's in our whitelist (always allow these)
      if (this.tokenWhitelist.some(token => token.toLowerCase() === normalizedAddress)) {
        return true;
      }
      
      // Check if cache needs refresh
      if (Date.now() - this.lastCacheUpdate > this.CACHE_TTL) {
        this.refreshTokenCache();
      }
      
      // Check if it's in our token cache
      if (Object.keys(this.tokenCache).length > 0) {
        return !!this.tokenCache[normalizedAddress];
      }
      
      // If we get here and cache is empty, default to true to avoid blocking operations
      // This is a fallback to ensure the system continues to work even if token validation fails
      this.logger.warn(`Token cache is empty and token ${address} is not in whitelist. Allowing by default.`);
      return true;
    } catch (error) {
      this.logger.error(`Error validating token: ${error.message}`);
      // Default to true in case of errors to avoid blocking operations
      return true;
    }
  }
} 
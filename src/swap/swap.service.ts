/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { parseUnits, maxUint256, zeroAddress } from "viem";
import { TokenService } from "../token/token.service";
import { TaskService } from "../task/task.service";
import { Task } from "../task/entities/task.entity";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { berachain } from "viem/chains";

// ERC20 ABI for token interactions
const ERC20_ABI = [
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    type: "function",
  },
] as const;

interface SwapTokenInfo {
  inputToken: string;
  inputAmount: string;
  outputToken: string;
  outputQuote: string;
  outputMin: string;
  outputReceiver: string;
}

interface RouterParamsDto {
  swapTokenInfo: SwapTokenInfo;
  pathDefinition: string;
  executor: string;
  referralCode: number;
  value: string;
}

// Define comprehensive interfaces based on the API guide
interface SwapQuoteResponse {
  tx: {
    to: string;
    from?: string;
    data: string;
    value?: string;
  };
  tokens: Array<{
    address: string;
    decimals: number;
    symbol: string;
    name: string;
  }>;
  route: Array<{
    poolAddress: string;
    poolType: string;
    poolName: string;
    poolFee: number;
    tokenFrom: number;
    tokenTo: number;
    share: number;
    assumedAmountIn: string;
    assumedAmountOut: string;
    liquiditySource: string;
  }>;
  status: string;
  blockNumber: number;
  gasPrice: number;
  tokenFrom: number;
  tokenTo: number;
  price: number;
  priceImpact: number;
  amountIn: string;
  amountOutFee: string;
  assumedAmountOut: string;
  routerAddr: string;
  routerParams: RouterParamsDto;
}

// interface TransactionReceipt {
//   transactionHash: string;
//   status: "success" | "reverted" | string;
//   blockNumber: number;
//   gasUsed: bigint;
//   [key: string]: any;
// }

interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  to: string;
  slippage: number;
  routerAddress;
}

@Injectable()
export class SwapService implements OnModuleInit {
  private readonly logger = new Logger(SwapService.name);
  private readonly client;
  private readonly publicClient;
  private readonly account;
  private readonly defaultRouterAddress: string;
  private readonly isInitialized: boolean = false;
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly tokenService: TokenService,
    private readonly taskService: TaskService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const privateKey = this.configService.get<string>("PRIVATE_KEY");
    this.defaultRouterAddress = this.configService.get<string>(
      "ROUTER_ADDRESS",
      "0xFd88aD4849BA0F729D6fF4bC27Ff948Ab1Ac3dE7",
    );

    // Get API configuration
    this.apiBaseUrl = this.configService.get<string>(
      "API_BASE_URL",
      "https://mainnet.api.oogabooga.io",
    );
    this.apiKey = this.configService.get<string>("API_KEY", "");

    if (!this.apiKey) {
      this.logger.warn(
        "API_KEY is not set. API calls may fail due to authentication issues.",
      );
    }

    this.logger.log("Default router address: ", this.defaultRouterAddress);
    this.logger.log(`API Base URL: ${this.apiBaseUrl}`);

    if (privateKey) {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.client = createWalletClient({
        account: this.account,
        chain: berachain,
        transport: http(),
      });
      this.isInitialized = true;
    } else {
      this.logger.error("PRIVATE_KEY environment variable is not set");
      this.account = null;
      this.client = null;
      this.isInitialized = false;
    }

    this.publicClient = createPublicClient({
      chain: berachain,
      transport: http(),
    });
  }

  async onModuleInit() {
    this.logger.log("Initializing SwapService...");
    try {
      await this.tokenService.fetchAndStoreTokenMetadata();
      this.logger.log("Token metadata fetched and stored successfully");
    } catch (error) {
      this.logger.error(
        "Failed to fetch token metadata during initialization",
        error,
      );
    }
  }

  /**
   * Get a swap quote from the API
   * Based on the Ooga Booga Swap API Guide
   */
  async getSwapQuote(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    to: string,
    slippage: number,
  ): Promise<SwapQuoteResponse> {
    this.logger.debug(
      `Getting swap quote: ${amount} ${tokenIn} to ${tokenOut}`,
    );

    try {
      // Construct the full URL with the base URL
      const url = `${this.apiBaseUrl}/v1/swap`;

      // Set up headers with authorization
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
      };

      this.logger.debug(`Making API request to: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<SwapQuoteResponse>(url, {
          params: {
            tokenIn,
            tokenOut,
            amount,
            to,
            slippage: slippage.toString(),
          },
          headers,
        }),
      );

      // Log the price impact and route information
      const quoteData = response.data;
      if (process.env.NODE_ENV === "debug") {
        this.logger.debug(response.data);
      }

      return quoteData;
    } catch (error) {
      this.logger.error(`Failed to get swap quote: ${error.message}`, error);
      throw new Error(`Failed to get swap quote: ${error.message}`);
    }
  }

  /**
   * Check token allowance directly from the blockchain
   * Returns maxUint256 for native token as it doesn't require approval
   */
  async checkAllowance(
    token: string,
    owner: string,
    routerAddress: string,
  ): Promise<bigint> {
    // Native token doesn't require approvals
    if (token.toLowerCase() === zeroAddress) {
      this.logger.debug("Native token detected, no allowance needed");
      return maxUint256;
    }

    try {
      this.logger.debug(`Checking allowance for token ${token} from ${owner}`);

      // Create contract instance
      const tokenContract = {
        address: token as `0x${string}`,
        abi: ERC20_ABI,
      };

      try {
        // Call allowance function directly on the blockchain
        const allowance = await this.publicClient.readContract({
          ...tokenContract,
          functionName: "allowance",
          args: [owner as `0x${string}`, routerAddress as `0x${string}`],
        });

        this.logger.debug(`Current allowance: ${allowance.toString()}`);
        return allowance;
      } catch (contractError) {
        // Handle case where contract doesn't implement allowance correctly
        this.logger.warn(
          `Failed to call allowance on token ${token}: ${contractError.message}. Assuming zero allowance.`,
        );

        // Check if the token has a valid code at the address
        const code = await this.publicClient.getBytecode({
          address: token as `0x${string}`,
        });

        if (!code || code === "0x") {
          this.logger.error(
            `No contract code found at address ${token}. This is not a valid token.`,
          );
          throw new Error(`Invalid token contract at address ${token}`);
        }

        // If there's code but allowance call failed, assume zero allowance
        return BigInt(0);
      }
    } catch (error) {
      this.logger.error(`Failed to check allowance: ${error.message}`, error);
      throw new Error(`Failed to check allowance: ${error.message}`);
    }
  }

  /**
   * Approve token directly on the blockchain
   * No approval needed for native token
   */
  async approveToken(
    token: string,
    amount: bigint,
    routerAddress: string,
  ): Promise<string> {
    if (token.toLowerCase() === zeroAddress) {
      this.logger.debug("Native token detected, no approval needed");
      return "0x";
    }

    if (!this.client) {
      this.logger.error("Client is not initialized");
      throw new Error("Client is not initialized");
    }

    if (!this.account) {
      this.logger.error("Account is not initialized");
      throw new Error("Account is not initialized");
    }

    try {
      this.logger.debug(`Approving ${amount.toString()} of token ${token}`);

      // Check if the token has a valid code at the address
      const code = await this.publicClient.getBytecode({
        address: token as `0x${string}`,
      });

      if (!code || code === "0x") {
        this.logger.error(
          `No contract code found at address ${token}. This is not a valid token.`,
        );
        throw new Error(`Invalid token contract at address ${token}`);
      }

      // Create contract instance with write capabilities
      const tokenContract = {
        address: token as `0x${string}`,
        abi: ERC20_ABI,
      };

      // Call approve function directly
      try {
        const hash = await this.client.writeContract({
          ...tokenContract,
          functionName: "approve",
          gas: 1_000_000n, // 1 million gas
          args: [routerAddress as `0x${string}`, amount],
        });

        this.logger.debug(`Approval transaction submitted: ${hash}`);

        // Wait for the transaction to be mined
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
        });
        this.logger.debug(
          `Approval transaction completed: ${receipt.transactionHash}, status: ${receipt.status}`,
        );

        if (receipt.status !== "success") {
          throw new Error(`Approval transaction failed: ${receipt.status}`);
        }

        return receipt.transactionHash;
      } catch (contractError) {
        this.logger.error(`Failed to approve token: ${contractError.message}`);
        throw new Error(`Failed to approve token: ${contractError.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to approve token: ${error.message}`, error);
      throw new Error(`Failed to approve token: ${error.message}`);
    }
  }

  /**
   * Execute a swap transaction
   */
  async executeSwap(transaction: {
    to: string;
    data: string;
    value: bigint;
  }): Promise<any> {
    try {
      this.logger.debug(`Executing swap transaction to ${transaction.to}`);
      if (!this.client) {
        this.logger.error("Client is not initialized");
        throw new Error("Client is not initialized");
      }

      if (!this.account) {
        this.logger.error("Account is not initialized");
        throw new Error("Account is not initialized");
      }

      const txHash = await this.client.sendTransaction({
        to: transaction.to as `0x${string}`,
        data: transaction.data as `0x${string}`,
        value: transaction.value,
      });

      this.logger.debug(`Swap transaction submitted: ${txHash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      this.logger.debug(
        `Swap transaction completed: ${receipt.transactionHash}, status: ${receipt.status}`,
      );

      if (receipt.status !== "success") {
        throw new Error(`Swap transaction failed: ${receipt.status}`);
      }

      return receipt;
    } catch (error) {
      this.logger.error(`Failed to execute swap: ${error.message}`, error);
      throw new Error(`Failed to execute swap: ${error.message}`);
    }
  }

  /**
   * Execute a complete swap process (check allowance, approve if needed, execute swap)
   * This provides a higher-level method that handles the entire swap flow
   */
  async executeFullSwap(params: SwapParams): Promise<any> {
    const { tokenIn, tokenOut, amount, to, slippage } = params;

    if (!this.isInitialized) {
      this.logger.error("SwapService is not properly initialized");
      throw new Error("SwapService is not properly initialized");
    }

    try {
      // Get swap quote first to determine the router address if not provided
      const quote = await this.getSwapQuote(
        tokenIn,
        tokenOut,
        amount,
        to,
        slippage,
      );

      // Use the provided router address or get it from the quote
      const actualRouterAddress = quote.routerAddr || this.defaultRouterAddress;

      // Check if tokenIn is not native, then check and set allowance
      if (tokenIn.toLowerCase() !== zeroAddress) {
        try {
          const amountBigInt = BigInt(amount);
          let allowance: bigint;

          try {
            allowance = await this.checkAllowance(
              tokenIn,
              this.account.address,
              actualRouterAddress,
            );
          } catch (allowanceError) {
            this.logger.warn(
              `Allowance check failed: ${allowanceError.message}. Attempting to approve anyway.`,
            );
            allowance = BigInt(0); // Assume zero allowance if check fails
          }

          if (allowance < amountBigInt) {
            this.logger.debug(
              `Insufficient allowance (${allowance} < ${amountBigInt}), approving...`,
            );
            try {
              await this.approveToken(tokenIn, maxUint256, actualRouterAddress);
              this.logger.debug("Token approval completed");
            } catch (approveError) {
              this.logger.error(
                `Token approval failed: ${approveError.message}`,
              );
              throw new Error(`Token approval failed: ${approveError.message}`);
            }
          } else {
            this.logger.debug(
              `Sufficient allowance (${allowance} >= ${amountBigInt})`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error in allowance/approval flow: ${error.message}`,
          );
          throw new Error(`Error in allowance/approval flow: ${error.message}`);
        }
      } else {
        this.logger.debug("Native token (input) detected, no approval needed");
      }

      // Execute the swap
      const transaction = {
        to: quote.tx.to,
        data: quote.tx.data,
        value: BigInt(quote.tx.value || "0"),
      };

      return await this.executeSwap(transaction);
    } catch (error) {
      this.logger.error(
        `Failed to execute full swap process: ${error.message}`,
        error,
      );

      throw new Error(`Failed to execute full swap process: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log("Running scheduled task to process incomplete tasks...");

    try {
      if (!this.isInitialized) {
        this.logger.error(
          "SwapService is not properly initialized, skipping cron job",
        );
        return;
      }

      // Process one-time orders that are marked as automatic
      const incompleteTasks = await this.taskService.findAllIncomplete();

      // For debugging: log all incomplete tasks with their properties
      incompleteTasks.forEach((task) => {
        this.logger.debug(
          `Task ${task.id}: isAutomatic=${task.isAutomatic}, isRecurring=${task.isRecurring}, nextExecutionTime=${task.nextExecutionTime ? task.nextExecutionTime.toISOString() : "null"}`,
        );
      });

      // Temporarily process all incomplete tasks regardless of isAutomatic flag
      const automaticIncompleteTasks = incompleteTasks.filter(
        (task) => !task.isRecurring, // Only filter by non-recurring for now
      );

      this.logger.log(
        `Found ${incompleteTasks.length} incomplete tasks, ${automaticIncompleteTasks.length} will be processed`,
      );

      // Process recurring orders that are due and marked as automatic
      let automaticRecurringOrders: Task[] = [];
      try {
        // Log the current time used for comparison
        const now = new Date();
        this.logger.debug(`Current time for comparison: ${now.toISOString()}`);

        const dueRecurringOrders =
          await this.taskService.processRecurringOrders();

        // Temporarily process all recurring orders regardless of isAutomatic flag
        automaticRecurringOrders = dueRecurringOrders;
        // automaticRecurringOrders = dueRecurringOrders.filter(
        //   (task) => task.isAutomatic !== false,
        // );

        this.logger.log(
          `Processed ${dueRecurringOrders.length} recurring orders that were due, ${automaticRecurringOrders.length} will be processed`,
        );
      } catch (recurringError) {
        this.logger.error(
          `Error processing recurring orders: ${recurringError.message}`,
          recurringError.stack,
        );
        // Continue with the tasks we have
      }

      // Add due recurring orders to the list of tasks to process (only automatic ones)
      const tasksToProcess = [
        ...automaticIncompleteTasks,
        ...automaticRecurringOrders,
      ];

      if (tasksToProcess.length === 0) {
        this.logger.log("No automatic tasks to process.");
        return;
      }

      this.logger.log(`Processing ${tasksToProcess.length} automatic tasks...`);

      // Process each task individually to isolate failures
      for (const task of tasksToProcess) {
        try {
          // Skip tasks that are already completed (defensive check)
          if (task.isCompleted) {
            this.logger.warn(`Task ${task.id} is already completed, skipping`);
            continue;
          }

          // Validate tokens using TokenService
          const isValidTokenIn = await this.tokenService.isTokenSupported(
            task.tokenIn,
          );
          const isValidTokenOut = await this.tokenService.isTokenSupported(
            task.tokenOut,
          );

          if (!isValidTokenIn || !isValidTokenOut) {
            this.logger.error(`Invalid token addresses in task ${task.id}`);
            continue;
          }

          // Get token decimals - use stored decimals if available, otherwise fetch from token service
          let decimals: number;
          if (task.tokenInDecimals) {
            decimals = task.tokenInDecimals;
          } else {
            const token = await this.tokenService.findTokenByAddress(
              task.tokenIn,
            );
            decimals = token?.decimals || 18;

            // Store the decimals for future use
            if (token?.decimals && !task.tokenInDecimals) {
              await this.taskService.update(task.id, {
                tokenInDecimals: token.decimals,
              });
            }
          }

          const formattedAmount = parseUnits(task.amount, decimals).toString();

          this.logger.debug(
            `Executing swap for task ${task.id}: ${task.amount} ${task.tokenIn} to ${task.tokenOut} with slippage ${task.slippage}%`,
          );

          // Use the executeFullSwap method for cleaner code
          const receipt = await this.executeFullSwap({
            tokenIn: task.tokenIn,
            tokenOut: task.tokenOut,
            amount: formattedAmount,
            to: this.account.address,
            slippage: task.slippage,
            routerAddress: task.routerAddress,
          });

          this.logger.debug(`Swap executed: ${receipt.transactionHash}`);

          // Mark task as completed with transaction hash
          await this.taskService.markAsCompleted(
            task.id,
            receipt.transactionHash,
          );

          // No need to check parent order here - the TaskService.markAsCompleted method
          // already handles recurring orders correctly
        } catch (error) {
          this.logger.error(
            `Failed to process task ${task.id}: ${error.message}`,
            error.stack,
          );

          // If this was a one-time task created from a recurring order,
          // we need to update the parent order to avoid getting stuck
          if (!task.isRecurring && task.parentOrderId) {
            try {
              const parentOrder = await this.taskService.findOne(
                task.parentOrderId,
              );
              if (parentOrder && parentOrder.isRecurring) {
                this.logger.log(
                  `Updating parent recurring order ${parentOrder.id} after task execution failure`,
                );

                // Mark the one-time task as completed with error
                await this.taskService.update(task.id, {
                  isCompleted: true,
                  transactionHash:
                    `EXECUTION_FAILED: ${error.message}`.substring(0, 255),
                });

                // Don't update the parent order here - let the TaskService handle it
                // This avoids duplicate increments of executedTrades
              }
            } catch (updateError) {
              this.logger.error(
                `Failed to update task after execution failure: ${updateError.message}`,
                updateError.stack,
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in cron job: ${error.message}`, error.stack);
    }
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
  Query,
  Delete,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { TaskService } from "../task/task.service";
import { Task } from "../task/entities/task.entity";
import { SwapService } from "../swap/swap.service";
import { parseUnits, zeroAddress } from "viem";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { TransactionResponseDto } from "./dto/transaction-response.dto";

@ApiTags("orders")
@Controller("orders")
export class OrderController {
  constructor(
    private readonly taskService: TaskService,
    private readonly swapService: SwapService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new swap order" })
  @ApiResponse({
    status: 201,
    description: "Order created successfully",
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  async create(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    try {
      // If this is a recurring order, validate the required parameters
      if (createOrderDto.isRecurring) {
        if (!createOrderDto.intervalSeconds) {
          throw new HttpException(
            "intervalSeconds is required for recurring orders",
            HttpStatus.BAD_REQUEST,
          );
        }
        if (!createOrderDto.numberOfTrades) {
          throw new HttpException(
            "numberOfTrades is required for recurring orders",
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Create a new task with the provided data
      const task = await this.taskService.create({
        tokenIn: createOrderDto.tokenIn,
        tokenOut: createOrderDto.tokenOut,
        amount: createOrderDto.amount,
        slippage: createOrderDto.slippage,
        isRecurring: createOrderDto.isRecurring ?? false,
        isAutomatic: createOrderDto.isAutomatic ?? true, // Default to true for backward compatibility
        intervalSeconds: createOrderDto.intervalSeconds,
        numberOfTrades: createOrderDto.numberOfTrades,
      });

      return this.mapToResponseDto(task);
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to create order",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: "Get all orders" })
  @ApiResponse({
    status: 200,
    description: "List of all orders",
    type: [OrderResponseDto],
  })
  async findAll(): Promise<OrderResponseDto[]> {
    const orders = await this.taskService.findAll();
    return orders.map((order) => this.mapToResponseDto(order));
  }

  @Get("recurring")
  @ApiOperation({ summary: "Get all upcoming recurring orders" })
  @ApiResponse({
    status: 200,
    description: "List of all upcoming recurring orders",
    type: [OrderResponseDto],
  })
  async findAllRecurring(): Promise<OrderResponseDto[]> {
    // Fetch all orders
    const allOrders = await this.taskService.findAll();

    // Filter for recurring orders that haven't completed all trades
    const recurringOrders = allOrders.filter(
      (order) =>
        order.isRecurring && order.executedTrades < order.numberOfTrades,
    );

    return recurringOrders.map((order) => this.mapToResponseDto(order));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an order by ID" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "The found order",
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async findOne(@Param("id") id: string): Promise<OrderResponseDto> {
    const order = await this.taskService.findOne(id);

    if (!order) {
      throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
    }

    return this.mapToResponseDto(order);
  }

  @Post(":id/build-transaction")
  @ApiOperation({
    summary: "Build a user-sendable transaction for a specific order",
  })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiQuery({
    name: "userAddress",
    description: "Address of the user that will execute the transaction",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction data ready to be sent by the user",
    type: TransactionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async buildTransaction(
    @Param("id") id: string,
    @Query("userAddress") userAddress: string,
  ): Promise<TransactionResponseDto> {
    if (!userAddress) {
      throw new HttpException(
        "userAddress is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const order = await this.taskService.findOne(id);

      if (!order) {
        throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
      }

      const decimals = order.tokenInDecimals || 18;
      const formattedAmount = parseUnits(order.amount, decimals).toString();

      // Get a quote for this swap
      const quote = await this.swapService.getSwapQuote(
        order.tokenIn,
        order.tokenOut,
        formattedAmount,
        userAddress, // If no user address provided, use the output token address
        order.slippage,
      );

      // Update the order with the quote information
      await this.taskService.update(id, {
        routerAddress: quote.routerAddr,
        gasPrice: quote.gasPrice,
        blockNumber: quote.blockNumber,
        priceImpact: quote.priceImpact,
        amountOut: quote.amountIn,
        amountOutMin: quote.assumedAmountOut,
        pathDefinition: quote.routerParams?.pathDefinition,
        referralCode: quote.routerParams?.referralCode,
      });

      // Return transaction data that can be sent by the user
      return {
        tx: {
          to: quote.tx.to,
          from: quote.tx.from,
          data: quote.tx.data,
          value: quote.tx.value || "0",
        },
        orderId: order.id,
        tokens: quote.tokens || [], // Handle missing tokens
        route: quote.route || [], // Handle missing route
        status: quote.status || "success", // Default status
        blockNumber: quote.blockNumber || 0,
        gasPrice: quote.gasPrice || 0,
        tokenFrom: quote.tokenFrom || 0,
        tokenTo: quote.tokenTo || 1,
        price: quote.price || 0,
        priceImpact: quote.priceImpact || 0,
        amountIn: quote.amountIn || order.amount,
        amountOutFee: quote.amountOutFee || "0",
        assumedAmountOut: quote.assumedAmountOut || "0",
        routerAddr: quote.routerAddr || "",
        routerParams: quote.routerParams || {
          swapTokenInfo: {
            inputToken: order.tokenIn,
            inputAmount: order.amount,
            outputToken: order.tokenOut,
            outputQuote: "0",
            outputMin: "0",
            outputReceiver: userAddress || order.tokenOut,
          },
          pathDefinition: "",
          executor: "",
          referralCode: 0,
          value: "0",
        },
        requiresApproval: order.tokenIn.toLowerCase() !== zeroAddress,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Failed to build transaction",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(":id")
  @ApiOperation({ summary: "Cancel an order" })
  @ApiParam({ name: "id", description: "Order ID" })
  @ApiResponse({
    status: 200,
    description: "Order has been successfully cancelled",
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async cancelOrder(@Param("id") id: string): Promise<OrderResponseDto> {
    const order = await this.taskService.findOne(id);

    if (!order) {
      throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
    }

    // For recurring orders, we'll mark them as completed
    // and prevent further trades
    if (order.isRecurring) {
      const updatedOrder = await this.taskService.update(id, {
        // Mark as completed to prevent further execution
        isCompleted: true,
        // Set a note about cancellation
        transactionHash: "CANCELLED_BY_USER",
      });

      if (!updatedOrder) {
        throw new HttpException(
          "Failed to update order",
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return this.mapToResponseDto(updatedOrder);
    } else {
      // For non-recurring orders, just delete the order
      // Only if it hasn't been executed yet
      if (!order.isCompleted) {
        await this.taskService.remove(id);
        // Mark it as cancelled in the response
        order.isCompleted = true;
        order.transactionHash = "CANCELLED_BY_USER";
      }

      return this.mapToResponseDto(order);
    }
  }

  private mapToResponseDto(task: Task): OrderResponseDto {
    const response = new OrderResponseDto();
    response.id = task.id;
    response.tokenIn = task.tokenIn;
    response.tokenOut = task.tokenOut;
    response.amount = task.amount;
    response.slippage = task.slippage;
    response.isCompleted = task.isCompleted;
    response.isRecurring = task.isRecurring;
    response.isAutomatic = task.isAutomatic;
    response.transactionHash = task.transactionHash;
    response.createdAt = task.createdAt;
    response.updatedAt = task.updatedAt;

    // Add recurring order specific fields if applicable
    if (task.isRecurring) {
      response.intervalSeconds = task.intervalSeconds;
      response.numberOfTrades = task.numberOfTrades;
      response.executedTrades = task.executedTrades;
      response.nextExecutionTime = task.nextExecutionTime;
    }

    // Add swap details if available
    response.routerAddress = task.routerAddress;
    response.gasPrice = task.gasPrice;
    response.blockNumber = task.blockNumber;
    response.priceImpact = task.priceImpact;
    response.amountOut = task.amountOut;
    response.amountOutMin = task.amountOutMin;
    response.pathDefinition = task.pathDefinition;
    response.referralCode = task.referralCode;

    return response;
  }
}

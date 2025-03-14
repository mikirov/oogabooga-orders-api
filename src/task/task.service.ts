/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual } from "typeorm";
import { Task } from "./entities/task.entity";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TokenService } from "src/token/token.service";
import { Token } from "src/token/entities/token.entity";

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private readonly tokenService: TokenService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Validate both tokens exist in our registry
    const isValidTokenIn = await this.tokenService.isTokenSupported(
      createTaskDto.tokenIn,
    );
    if (!isValidTokenIn) {
      throw new Error("Invalid input token address");
    }

    const tokenIn: Token | null = await this.tokenService.findTokenByAddress(
      createTaskDto.tokenIn,
    );
    if (!tokenIn) {
      throw new Error("Invalid input token address");
    }

    const tokenOut: Token | null = await this.tokenService.findTokenByAddress(
      createTaskDto.tokenOut,
    );
    if (!tokenOut) {
      throw new Error("Invalid output token address");
    }

    // Set the initial nextExecutionTime for recurring orders
    let nextExecutionTime: Date | undefined = undefined;
    if (createTaskDto.isRecurring) {
      // For recurring orders, set the initial execution time to now
      // This will make it eligible for immediate processing
      nextExecutionTime = new Date(
        Date.now() + (createTaskDto.intervalSeconds || 0) * 1000,
      );
      this.logger.log(
        `Setting initial nextExecutionTime for recurring order to ${nextExecutionTime.toISOString()}`,
      );
    }

    const task = this.tasksRepository.create({
      ...createTaskDto,
      tokenInDecimals: tokenIn.decimals,
      tokenOutDecimals: tokenOut.decimals,
      isCompleted: false,
      nextExecutionTime: nextExecutionTime,
    });

    return this.tasksRepository.save(task);
  }

  async findAll(): Promise<Task[]> {
    return this.tasksRepository.find();
  }

  async findAllIncomplete(): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { isCompleted: false },
    });
  }

  async findOne(id: string): Promise<Task | null> {
    return this.tasksRepository.findOne({ where: { id } });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task | null> {
    await this.tasksRepository.update(id, updateTaskDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.tasksRepository.delete(id);
  }

  /**
   * Mark a task as completed with a transaction hash
   */
  async markAsCompleted(
    id: string,
    transactionHash: string,
  ): Promise<Task | null> {
    try {
      if (!id) {
        this.logger.error("Task ID is required when marking as completed");
        throw new Error("Task ID is required");
      }

      if (!transactionHash) {
        this.logger.warn(
          "Transaction hash is missing when marking task as completed",
        );
        // Continue with empty transaction hash
      }

      const task = await this.findOne(id);

      if (!task) {
        this.logger.warn(
          `Task with ID ${id} not found when marking as completed`,
        );
        return null;
      }

      // If task is already completed, just return it
      if (task.isCompleted) {
        this.logger.warn(`Task ${id} is already marked as completed`);
        return task;
      }

      // For recurring tasks, we need to check if this is the last trade
      if (task.isRecurring) {
        try {
          // Validate numberOfTrades is set
          if (!task.numberOfTrades || task.numberOfTrades <= 0) {
            this.logger.error(
              `Recurring task ${id} has invalid numberOfTrades: ${task.numberOfTrades}`,
            );
            throw new Error(
              `Recurring task ${id} has invalid numberOfTrades: ${task.numberOfTrades}`,
            );
          }

          // Increment the executed trades count
          const executedTrades = (task.executedTrades || 0) + 1;
          this.logger.log(
            `Incrementing executedTrades for task ${id} from ${task.executedTrades} to ${executedTrades}`,
          );

          // Check if we've reached the max number of trades
          const isCompleted = executedTrades >= task.numberOfTrades;

          // Calculate the next execution time if not completed
          let nextExecutionTime: Date | undefined;

          if (isCompleted) {
            nextExecutionTime = undefined;
            this.logger.log(
              `Recurring task ${id} has completed all ${task.numberOfTrades} trades`,
            );
          } else {
            // Validate intervalSeconds is set
            if (!task.intervalSeconds || task.intervalSeconds <= 0) {
              this.logger.error(
                `Recurring task ${id} has invalid intervalSeconds: ${task.intervalSeconds}`,
              );
              throw new Error(
                `Recurring task ${id} has invalid intervalSeconds: ${task.intervalSeconds}`,
              );
            }

            nextExecutionTime = new Date(
              Date.now() + task.intervalSeconds * 1000,
            );
            this.logger.log(
              `Next execution for task ${id} scheduled at ${nextExecutionTime.toISOString()}`,
            );
          }

          // Update the task with the new values
          const updatedTask = await this.update(id, {
            executedTrades,
            nextExecutionTime,
            // Only mark as completed if all trades have been executed
            isCompleted,
            // Only set transaction hash if completed
            transactionHash: isCompleted
              ? transactionHash
              : task.transactionHash,
          });

          if (!updatedTask) {
            throw new Error(`Failed to update recurring task ${id}`);
          }

          return updatedTask;
        } catch (recurringError) {
          this.logger.error(
            `Error updating recurring task ${id}: ${recurringError.message}`,
            recurringError.stack,
          );
          throw new Error(
            `Error updating recurring task ${id}: ${recurringError.message}`,
          );
        }
      } else {
        // For non-recurring tasks, mark as completed immediately
        try {
          const updatedTask = await this.update(id, {
            isCompleted: true,
            transactionHash,
          });

          if (!updatedTask) {
            throw new Error(`Failed to update task ${id}`);
          }

          this.logger.log(
            `Task ${id} marked as completed with transaction hash ${transactionHash}`,
          );
          return updatedTask;
        } catch (updateError) {
          this.logger.error(
            `Error marking task ${id} as completed: ${updateError.message}`,
            updateError.stack,
          );
          throw new Error(
            `Error marking task ${id} as completed: ${updateError.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in markAsCompleted: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow caller to handle
    }
  }

  async findDueRecurringOrders(): Promise<Task[]> {
    const now = new Date();
    this.logger.log(`Finding recurring orders due before ${now.toISOString()}`);

    // First, find all recurring orders that are not completed
    const allRecurringOrders = await this.tasksRepository.find({
      where: {
        isRecurring: true,
        isCompleted: false,
      },
    });

    this.logger.log(
      `Found ${allRecurringOrders.length} incomplete recurring orders`,
    );

    // Log details about each recurring order
    allRecurringOrders.forEach((order) => {
      const isDue = order.nextExecutionTime && order.nextExecutionTime <= now;
      this.logger.log(
        `Order ${order.id}: nextExecutionTime=${order.nextExecutionTime ? order.nextExecutionTime.toISOString() : "null"}, ` +
          `isDue=${isDue}, isAutomatic=${order.isAutomatic}`,
      );
    });

    // Then filter for those that are due
    const dueOrders = await this.tasksRepository.find({
      where: {
        isRecurring: true,
        isCompleted: false,
        nextExecutionTime: LessThanOrEqual(now),
      },
    });

    this.logger.log(
      `Found ${dueOrders.length} recurring orders that are due for execution`,
    );
    return dueOrders;
  }

  async updateRecurringOrderAfterExecution(id: string): Promise<Task | null> {
    try {
      // Get the current order
      const order = await this.findOne(id);

      if (!order) {
        this.logger.error(
          `Order ${id} not found when updating after execution`,
        );
        throw new Error(`Order ${id} not found`);
      }

      if (!order.isRecurring) {
        this.logger.error(`Order ${id} is not a recurring order`);
        throw new Error(`Order ${id} is not a recurring order`);
      }

      // Validate numberOfTrades is set
      if (!order.numberOfTrades || order.numberOfTrades <= 0) {
        this.logger.error(
          `Order ${id} has invalid numberOfTrades: ${order.numberOfTrades}`,
        );
        throw new Error(
          `Order ${id} has invalid numberOfTrades: ${order.numberOfTrades}`,
        );
      }

      // Validate intervalSeconds is set
      if (!order.intervalSeconds || order.intervalSeconds <= 0) {
        this.logger.error(
          `Order ${id} has invalid intervalSeconds: ${order.intervalSeconds}`,
        );
        throw new Error(
          `Order ${id} has invalid intervalSeconds: ${order.intervalSeconds}`,
        );
      }

      // Increment the trade count
      const executedTrades = (order.executedTrades || 0) + 1;
      this.logger.log(
        `Incrementing executedTrades for order ${id} from ${order.executedTrades} to ${executedTrades}`,
      );

      // Check if we've reached the max number of trades
      const isCompleted = executedTrades >= order.numberOfTrades;

      // Calculate the next execution time
      let nextExecutionTime: Date | undefined;

      if (isCompleted) {
        nextExecutionTime = undefined;
        this.logger.log(
          `Order ${id} has completed all ${order.numberOfTrades} trades`,
        );
      } else {
        // Calculate next execution time based on current time
        nextExecutionTime = new Date(Date.now() + order.intervalSeconds * 1000);
        this.logger.log(
          `Next execution for order ${id} scheduled at ${nextExecutionTime.toISOString()}`,
        );
      }

      // Update the order
      try {
        const updatedOrder = await this.update(id, {
          executedTrades,
          nextExecutionTime,
          // Don't mark as completed here, wait for the actual trade execution
        });

        if (!updatedOrder) {
          throw new Error(`Failed to update order ${id}`);
        }

        return updatedOrder;
      } catch (updateError) {
        this.logger.error(
          `Failed to update order ${id}: ${updateError.message}`,
          updateError.stack,
        );
        throw new Error(`Failed to update order ${id}: ${updateError.message}`);
      }
    } catch (error) {
      this.logger.error(
        `Error in updateRecurringOrderAfterExecution: ${error.message}`,
        error.stack,
      );
      throw error; // Re-throw to allow caller to handle
    }
  }

  async processRecurringOrders(): Promise<Task[]> {
    try {
      // Find all recurring orders that are due for execution
      const dueOrders = await this.findDueRecurringOrders();

      this.logger.log(
        `Found ${dueOrders.length} recurring orders due for execution`,
      );

      if (dueOrders.length === 0) {
        return [];
      }

      // Process each recurring order individually to isolate failures
      const processedOrders: Task[] = [];

      for (const order of dueOrders) {
        try {
          this.logger.log(`Processing recurring order ${order.id}`);

          // Create a new one-time order based on the recurring order
          const newTask = this.tasksRepository.create({
            tokenIn: order.tokenIn,
            tokenOut: order.tokenOut,
            amount: order.amount,
            slippage: order.slippage,
            tokenInDecimals: order.tokenInDecimals,
            tokenOutDecimals: order.tokenOutDecimals,
            isRecurring: false, // This instance is a one-time execution
            isAutomatic: order.isAutomatic, // Preserve the automatic flag
            parentOrderId: order.id, // Set the parent order ID to track the relationship
          });

          const newOrder = await this.tasksRepository.save(newTask);
          this.logger.log(
            `Created one-time task ${newOrder.id} from recurring order ${order.id}`,
          );

          // Update the recurring order for the next execution
          try {
            await this.updateRecurringOrderAfterExecution(order.id);
            this.logger.log(
              `Updated recurring order ${order.id} for next execution`,
            );
          } catch (updateError) {
            this.logger.error(
              `Failed to update recurring order ${order.id} for next execution: ${updateError.message}`,
              updateError.stack,
            );

            // Even if updating the recurring order fails, we still want to process the new order
            // So we continue with the flow and don't throw the error
          }

          processedOrders.push(newOrder);
        } catch (orderError) {
          // Log the error but continue processing other orders
          this.logger.error(
            `Failed to process recurring order ${order.id}: ${orderError.message}`,
            orderError.stack,
          );

          // Try to update the recurring order to prevent it from getting stuck
          try {
            // Increment the executed trades count to avoid getting stuck
            const executedTrades = (order.executedTrades || 0) + 1;
            const isCompleted = executedTrades >= (order.numberOfTrades || 0);
            const nextExecutionTime = isCompleted
              ? undefined
              : new Date(Date.now() + (order.intervalSeconds || 0) * 1000);

            await this.update(order.id, {
              executedTrades,
              nextExecutionTime,
              isCompleted: isCompleted,
              transactionHash: isCompleted
                ? "COMPLETED_WITH_ERRORS"
                : order.transactionHash,
            });

            this.logger.log(
              `Updated recurring order ${order.id} after error to prevent it from getting stuck`,
            );
          } catch (recoveryError) {
            this.logger.error(
              `Failed to recover recurring order ${order.id} after error: ${recoveryError.message}`,
              recoveryError.stack,
            );
          }
        }
      }

      return processedOrders;
    } catch (error) {
      this.logger.error(
        `Error in processRecurringOrders: ${error.message}`,
        error.stack,
      );
      // Return empty array instead of throwing to prevent cron job from failing
      return [];
    }
  }
}

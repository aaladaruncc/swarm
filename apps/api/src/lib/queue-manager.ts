// Queue Manager for Rate Limit Control
// Manages concurrent test execution and prevents API rate limits

interface QueueItem<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  cancelled?: boolean;
}

export class TestQueueManager {
  private queue: QueueItem<any>[] = [];
  private running: Map<string, QueueItem<any>> = new Map(); // Track running items by ID
  private maxConcurrent: number = 3; // Max concurrent tests across all batches
  private delayBetweenTests: number = 2000; // 2 second delay between starting tests

  constructor(maxConcurrent: number = 3, delayBetweenTests: number = 2000) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenTests = delayBetweenTests;
  }

  private isProcessing: boolean = false;

  async add<T>(id: string, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const item: QueueItem<T> = { id, execute, resolve, reject, cancelled: false };
      this.queue.push(item);
      console.log(`[Queue] Added test ${id} to queue (${this.queue.length} queued, ${this.running.size} running)`);
      // Trigger processing immediately
      this.triggerProcess();
    });
  }

  private triggerProcess() {
    // Use a flag to prevent multiple concurrent process loops
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;
    // Use process.nextTick to ensure it runs in the next event loop iteration
    process.nextTick(() => {
      this.process().catch(err => {
        console.error(`[Queue] Error in process loop:`, err);
      }).finally(() => {
        this.isProcessing = false;
      });
    });
  }

  private async process() {
    // Remove cancelled items from queue
    this.queue = this.queue.filter(item => !item.cancelled);
    
    // Process as many items as we can (up to maxConcurrent)
    while (this.running.size < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item || item.cancelled) {
        continue;
      }

      this.running.set(item.id, item);
      console.log(`[Queue] Starting test ${item.id} (${this.running.size}/${this.maxConcurrent} running, ${this.queue.length} queued)`);

      // Execute in background - don't await, let it run concurrently
      this.executeItem(item).catch(err => {
        console.error(`[Queue] Error executing item ${item.id}:`, err);
      });
    }
  }

  private async executeItem<T>(item: QueueItem<T>) {
    try {
      // Check if cancelled before executing
      if (item.cancelled) {
        this.running.delete(item.id);
        item.reject(new Error("Test cancelled"));
        return;
      }

      const result = await item.execute();
      
      // Check again after execution
      if (!item.cancelled) {
        item.resolve(result);
      }
    } catch (error) {
      if (!item.cancelled) {
        item.reject(error);
      }
    } finally {
      this.running.delete(item.id);
      console.log(`[Queue] Completed test ${item.id} (${this.running.size}/${this.maxConcurrent} running, ${this.queue.length} queued)`);
      
      // Add delay before processing next item (only if there are more items)
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenTests));
      }
      
      // Continue processing after delay
      this.triggerProcess();
    }
  }

  cancel(id: string) {
    // Mark queued items as cancelled
    this.queue.forEach(item => {
      if (item.id === id) {
        item.cancelled = true;
        item.reject(new Error("Test cancelled"));
      }
    });
    
    // Note: Currently running items can't be cancelled, they'll complete
    // But we mark them so they don't resolve/reject after cancellation
    const runningItem = this.running.get(id);
    if (runningItem) {
      runningItem.cancelled = true;
    }
    
    console.log(`[Queue] Cancelled test ${id}`);
  }

  cancelBatch(batchTestRunId: string, testRunIds: string[]) {
    // Cancel all test runs for a batch
    testRunIds.forEach(id => this.cancel(id));
    console.log(`[Queue] Cancelled ${testRunIds.length} tests for batch ${batchTestRunId}`);
  }

  getStatus() {
    return {
      running: this.running.size,
      queued: this.queue.filter(item => !item.cancelled).length,
      maxConcurrent: this.maxConcurrent,
    };
  }

  updateConcurrency(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
    console.log(`[Queue] Updated max concurrent to ${maxConcurrent}`);
    // Try to process more if we increased the limit
    this.triggerProcess();
  }
}

// Global queue manager instance
export const globalTestQueue = new TestQueueManager(3, 2000);

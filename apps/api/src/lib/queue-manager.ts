// Queue Manager for Rate Limit Control
// Manages concurrent test execution and prevents API rate limits

interface QueueItem<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class TestQueueManager {
  private queue: QueueItem<any>[] = [];
  private running: number = 0;
  private maxConcurrent: number = 3; // Max concurrent tests across all batches
  private delayBetweenTests: number = 2000; // 2 second delay between starting tests

  constructor(maxConcurrent: number = 3, delayBetweenTests: number = 2000) {
    this.maxConcurrent = maxConcurrent;
    this.delayBetweenTests = delayBetweenTests;
  }

  async add<T>(id: string, execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ id, execute, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    console.log(`[Queue] Starting test ${item.id} (${this.running}/${this.maxConcurrent} running, ${this.queue.length} queued)`);

    try {
      const result = await item.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.running--;
      console.log(`[Queue] Completed test ${item.id} (${this.running}/${this.maxConcurrent} running, ${this.queue.length} queued)`);
      
      // Add delay before processing next item
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenTests));
      }
      
      this.process();
    }
  }

  getStatus() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }

  updateConcurrency(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
    console.log(`[Queue] Updated max concurrent to ${maxConcurrent}`);
    // Try to process more if we increased the limit
    this.process();
  }
}

// Global queue manager instance
export const globalTestQueue = new TestQueueManager(3, 2000);

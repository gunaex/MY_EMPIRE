import { Queue, Worker, type Job } from 'bullmq'

export interface AgentJobData {
  agentId: string
  companyId: string
  taskType: string
  payload?: Record<string, unknown>
}

export type AgentJobProcessor = (job: Job<AgentJobData>) => Promise<void>

/**
 * BullMQ-based 24/7 agent scheduler
 * ใช้สำหรับ cron-based agent wake cycles
 */
export class AgentScheduler {
  private queues: Map<string, Queue<AgentJobData>> = new Map()
  private workers: Map<string, Worker<AgentJobData>> = new Map()

  private readonly redisConnection: { host: string; port: number }

  constructor(redisUrl?: string) {
    const url = redisUrl ?? process.env['REDIS_URL'] ?? 'redis://localhost:6379'
    const parsed = new URL(url)
    this.redisConnection = {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
    }
  }

  private getQueue(companyId: string): Queue<AgentJobData> {
    const key = `empire:company:${companyId}`
    if (!this.queues.has(key)) {
      this.queues.set(key, new Queue<AgentJobData>(key, { connection: this.redisConnection }))
    }
    return this.queues.get(key)!
  }

  /**
   * ตั้ง cron schedule สำหรับ agent
   * @param schedule cron string เช่น "* /30 * * * *" = ทุก 30 นาที
   */
  async scheduleAgent(
    agentId: string,
    companyId: string,
    taskType: string,
    schedule: string
  ): Promise<void> {
    const queue = this.getQueue(companyId)
    const jobId = `${agentId}:${taskType}`

    // Remove existing job if any
    const existing = await queue.getJob(jobId)
    if (existing) await existing.remove()

    await queue.add(
      taskType,
      { agentId, companyId, taskType },
      {
        jobId,
        repeat: { pattern: schedule },
        removeOnComplete: 50,
        removeOnFail: 10,
      }
    )
  }

  /**
   * ลงทะเบียน processor สำหรับ company queue
   */
  registerProcessor(companyId: string, processor: AgentJobProcessor): void {
    const key = `empire:company:${companyId}`
    if (this.workers.has(key)) return

    const worker = new Worker<AgentJobData>(key, processor, {
      connection: this.redisConnection,
      concurrency: parseInt(process.env['MAX_CONCURRENT_THINKS'] ?? '2', 10),
    })

    worker.on('failed', (job, err) => {
      console.error(`[Scheduler] Job failed: ${job?.id}`, err)
    })

    this.workers.set(key, worker)
  }

  async removeAgent(agentId: string, companyId: string): Promise<void> {
    const queue = this.getQueue(companyId)
    const jobs = await queue.getRepeatableJobs()
    for (const job of jobs) {
      if (job.key.includes(agentId)) {
        await queue.removeRepeatableByKey(job.key)
      }
    }
  }

  async close(): Promise<void> {
    await Promise.all([
      ...[...this.workers.values()].map((w) => w.close()),
      ...[...this.queues.values()].map((q) => q.close()),
    ])
  }
}

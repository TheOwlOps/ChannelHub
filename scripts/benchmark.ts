import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import { IdempotencyCache } from "../src/core/dedup";
import { TokenBucketLimiter } from "../src/core/limiter";
import { SmartStreamer } from "../src/core/stream";
import { createMessageContext } from "../src/core/context";
import type { ChannelType, UnifiedMessage } from "../src/core/types";

class BenchmarkChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "benchmark";
  async connect() { this.setConnected(true); }
  async disconnect() { this.setConnected(false); }
  async sendText(chatId: string, text: string) {
    return { messageId: "bench_out", chatId, timestamp: Date.now() };
  }
  async sendMedia() {
    return { messageId: "bench_out", chatId: "bench", timestamp: Date.now() };
  }
  emitMessageSync(msg: UnifiedMessage) {
    this.emit("message", msg);
  }
}

async function runBenchmarks() {
  console.log("==================================================");
  console.log("🚀 CHANNELHUB REAL-WORLD PERFORMANCE BENCHMARK");
  console.log("Runtime:", process.version, "| Platform:", process.platform, process.arch);
  console.log("==================================================\n");

  // 1. IdempotencyCache Benchmark
  {
    const cache = new IdempotencyCache({ maxEntries: 100_000, ttlMs: 60_000 });
    const iterations = 100_000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      cache.checkAndSet(`bench_msg_${i}`);
    }
    const elapsed = performance.now() - start;
    const opsSec = Math.round((iterations / elapsed) * 1000);
    const avgLatencyNs = Math.round((elapsed / iterations) * 1_000_000);

    console.log("1. IdempotencyCache (Sliding-Window Dedup)");
    console.log(`   - Operations: ${iterations.toLocaleString()}`);
    console.log(`   - Total Time: ${elapsed.toFixed(2)} ms`);
    console.log(`   - Throughput: ${opsSec.toLocaleString()} ops/sec`);
    console.log(`   - Latency:    ${avgLatencyNs} ns/op\n`);
  }

  // 2. TokenBucketLimiter Benchmark (Burst / In-Memory Consumption)
  {
    const capacity = 100_000;
    const limiter = new TokenBucketLimiter({
      capacity,
      refillRate: 1000,
      refillIntervalMs: 1000,
    });
    const iterations = 50_000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await limiter.acquire(1);
    }
    const elapsed = performance.now() - start;
    const opsSec = Math.round((iterations / elapsed) * 1000);
    const avgLatencyNs = Math.round((elapsed / iterations) * 1_000_000);

    console.log("2. TokenBucketLimiter (Egress Rate Throttling)");
    console.log(`   - Operations: ${iterations.toLocaleString()}`);
    console.log(`   - Total Time: ${elapsed.toFixed(2)} ms`);
    console.log(`   - Throughput: ${opsSec.toLocaleString()} ops/sec`);
    console.log(`   - Latency:    ${avgLatencyNs} ns/op\n`);
  }

  // 3. ChannelHub Inbound Dispatch & Context Routing Throughput (with Concurrent Consumer)
  {
    const hub = new ChannelHub({ enableDeduplication: true });
    const adapter = new BenchmarkChannelAdapter();
    hub.register(adapter);

    const messageCount = 20_000;
    let handledCount = 0;
    const start = performance.now();

    // Start background consumer to pull messages and prevent backpressure stalls
    const consumerPromise = (async () => {
      for await (const _ of hub.messages()) {
        handledCount++;
        if (handledCount === messageCount) break;
      }
    })();

    for (let i = 0; i < messageCount; i++) {
      adapter.emitMessageSync({
        id: `inbound_${i}`,
        channel: "benchmark",
        sender: { id: "user_bench" },
        chat: { id: "chat_bench", type: "dm" },
        content: { text: "Benchmark test payload" },
        raw: {},
        timestamp: Date.now(),
      });
    }

    await consumerPromise;
    const elapsed = performance.now() - start;
    const opsSec = Math.round((messageCount / elapsed) * 1000);
    const avgLatencyUs = Math.round((elapsed / messageCount) * 1000);

    console.log("3. ChannelHub Ingress Pipeline (Dedup + Queue + Async Consumer)");
    console.log(`   - Messages Dispatched: ${messageCount.toLocaleString()}`);
    console.log(`   - Total Time:          ${elapsed.toFixed(2)} ms`);
    console.log(`   - Throughput:          ${opsSec.toLocaleString()} msgs/sec`);
    console.log(`   - Mean Latency:        ${avgLatencyUs} µs/msg\n`);
  }

  // 4. SmartStreamer Sentence-Boundary Batching
  {
    const adapter = new BenchmarkChannelAdapter();
    const dummyMsg: UnifiedMessage = {
      id: "stream_test",
      channel: "benchmark",
      sender: { id: "u" },
      chat: { id: "c", type: "dm" },
      content: { text: "" },
      raw: {},
      timestamp: Date.now(),
    };
    const streamer = new SmartStreamer(adapter, { chunkMode: "sentence" });

    const tokens = [
      "Hello", " world!", " This", " is", " a", " live", " stream", " benchmark.",
      " ChannelHub", " handles", " token", " batching", " seamlessly."
    ];

    async function* makeTokenStream() {
      for (const t of tokens) {
        yield t;
      }
    }

    const start = performance.now();
    await streamer.stream("bench_chat", makeTokenStream());
    const elapsed = performance.now() - start;

    console.log("4. SmartStreamer (LLM Token Batching & Flushes)");
    console.log(`   - Tokens Streamed: ${tokens.length}`);
    console.log(`   - Total Duration:  ${elapsed.toFixed(2)} ms\n`);
  }

  console.log("==================================================");
  console.log("✅ BENCHMARK COMPLETED SUCCESSFULLY");
  console.log("==================================================");
}

runBenchmarks().catch(console.error);

// Core barrel — grouped by concern (v2 layout, same public surface as v1 plus ChannelEventBus).

// Contracts: shared types, channel base class, message context
export * from "./contracts/types";
export * from "./contracts/adapter";
export * from "./contracts/context";

// Engine: hub orchestrator, event bus, human handoff, LLM streaming
export * from "./engine/hub";
export * from "./engine/bus";
export * from "./engine/handoff";
export * from "./engine/stream";

// Reliability: idempotency, rate limiting, dead-letter queue
export * from "./reliability/dedup";
export * from "./reliability/limiter";
export * from "./reliability/shared-limiter";
export * from "./reliability/dlq";

// Identity: cross-channel identity + group management
export * from "./identity/identity";
export * from "./identity/group-manager";

// Media: video engine + transcoder
export * from "./media/video";
export * from "./media/transcoder";

// Insights: traffic stats + web research
export * from "./insights/stats";
export * from "./insights/research";

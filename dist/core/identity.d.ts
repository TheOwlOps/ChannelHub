import type { ChannelType } from "./types";
/**
 * Universal User Identity across multiple messaging channels.
 */
export interface UniversalIdentity {
    /** The canonical unified user identifier (e.g., "usr_9981") */
    primaryUserId: string;
    /** Linked accounts on each messaging platform */
    channels: Record<ChannelType, string>;
    /** Optional metadata associated with this unified identity */
    metadata?: Record<string, unknown>;
    /** Timestamp when this identity record was first created */
    createdAt: number;
}
export interface IdentityStorageOptions {
    /** In-memory storage default. Can be extended for Redis/DB. */
    ttlMs?: number;
}
/**
 * IdentityStitcher resolves multi-channel identities into a single canonical user.
 * Enables AI Agents (Harness) to maintain unified memory and context across Zalo, Telegram, Discord, etc.
 */
export declare class IdentityStitcher {
    private _lookup;
    private _identities;
    private makeKey;
    /**
     * Resolves or provisions a UniversalIdentity for an incoming message.
     * If the user has never been seen, a new primaryUserId is created.
     */
    resolve(channel: ChannelType, channelUserId: string): UniversalIdentity;
    /**
     * Links a new channel account to an existing primary identity.
     * E.g. Link telegram:12345 to an existing user with zalo:67890.
     */
    link(primaryUserId: string, channel: ChannelType, channelUserId: string): UniversalIdentity;
    /**
     * Stitches two existing primary identities together (e.g. after phone/email verification).
     * All accounts from sourceId are merged into targetPrimaryId.
     */
    merge(targetPrimaryId: string, sourcePrimaryId: string): UniversalIdentity;
    get(primaryUserId: string): UniversalIdentity | undefined;
    get count(): number;
}

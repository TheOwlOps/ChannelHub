import type { ChannelType, UnifiedMessage } from "./types";

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
export class IdentityStitcher {
  // channel:channelUserId -> primaryUserId
  private _lookup = new Map<string, string>();
  // primaryUserId -> UniversalIdentity
  private _identities = new Map<string, UniversalIdentity>();

  private makeKey(channel: ChannelType, channelUserId: string): string {
    return `${channel}:${channelUserId}`;
  }

  /**
   * Resolves or provisions a UniversalIdentity for an incoming message.
   * If the user has never been seen, a new primaryUserId is created.
   */
  resolve(channel: ChannelType, channelUserId: string): UniversalIdentity {
    const key = this.makeKey(channel, channelUserId);
    const existingPrimaryId = this._lookup.get(key);

    if (existingPrimaryId && this._identities.has(existingPrimaryId)) {
      return this._identities.get(existingPrimaryId)!;
    }

    // Provision new universal identity
    const primaryUserId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const identity: UniversalIdentity = {
      primaryUserId,
      channels: { [channel]: channelUserId } as Record<ChannelType, string>,
      createdAt: Date.now(),
    };

    this._lookup.set(key, primaryUserId);
    this._identities.set(primaryUserId, identity);
    return identity;
  }

  /**
   * Links a new channel account to an existing primary identity.
   * E.g. Link telegram:12345 to an existing user with zalo:67890.
   */
  link(primaryUserId: string, channel: ChannelType, channelUserId: string): UniversalIdentity {
    let identity = this._identities.get(primaryUserId);
    if (!identity) {
      identity = {
        primaryUserId,
        channels: {} as Record<ChannelType, string>,
        createdAt: Date.now(),
      };
      this._identities.set(primaryUserId, identity);
    }

    const key = this.makeKey(channel, channelUserId);
    // If this channel user was previously mapped elsewhere, update the lookup
    this._lookup.set(key, primaryUserId);
    identity.channels[channel] = channelUserId;

    return identity;
  }

  /**
   * Stitches two existing primary identities together (e.g. after phone/email verification).
   * All accounts from sourceId are merged into targetPrimaryId.
   */
  merge(targetPrimaryId: string, sourcePrimaryId: string): UniversalIdentity {
    if (targetPrimaryId === sourcePrimaryId) {
      return this._identities.get(targetPrimaryId)!;
    }

    const target = this._identities.get(targetPrimaryId);
    const source = this._identities.get(sourcePrimaryId);

    if (!target || !source) {
      throw new Error(`Cannot merge identities: both target and source must exist.`);
    }

    // Re-point all source channel lookups to target
    for (const [ch, chUserId] of Object.entries(source.channels)) {
      const key = this.makeKey(ch, chUserId);
      this._lookup.set(key, targetPrimaryId);
      target.channels[ch] = chUserId;
    }

    // Merge metadata
    target.metadata = { ...source.metadata, ...target.metadata };

    // Evict old source identity
    this._identities.delete(sourcePrimaryId);
    return target;
  }

  get(primaryUserId: string): UniversalIdentity | undefined {
    return this._identities.get(primaryUserId);
  }

  get count(): number {
    return this._identities.size;
  }
}

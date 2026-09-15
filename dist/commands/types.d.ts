import type { ZaloPersonalBot } from "../personal/client.js";
export interface CommandContext {
    bot: ZaloPersonalBot;
    msg: any;
    args: string[];
    isGroup: boolean;
    threadId: string;
}
export interface Command {
    name: string;
    aliases?: string[];
    description: string;
    groupOnly?: boolean;
    execute: (ctx: CommandContext) => Promise<void>;
}

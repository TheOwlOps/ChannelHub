import type { Command } from "./types.js";
export declare class CommandRouter {
    private commands;
    constructor();
    register(cmd: Command): void;
    handleMessage(bot: any, msg: any): Promise<void>;
}

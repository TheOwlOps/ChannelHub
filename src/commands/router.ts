import type { Command, CommandContext } from "./types.js";
import { pingCommand, heartCommand, hahaCommand } from "./modules/general.js";
import { kickCommand, renameCommand, groupInfoCommand } from "./modules/group.js";
import { reactCommand } from "./modules/reaction.js";
import { CONFIG } from "../config/env.js";

export class CommandRouter {
  private commands = new Map<string, Command>();

  constructor() {
    this.register(pingCommand);
    this.register(heartCommand);
    this.register(hahaCommand);
    this.register(kickCommand);
    this.register(renameCommand);
    this.register(groupInfoCommand);
    this.register(reactCommand);
  }

  register(cmd: Command) {
    this.commands.set(cmd.name.toLowerCase(), cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.commands.set(alias.toLowerCase(), cmd);
      }
    }
  }

  async handleMessage(bot: any, msg: any) {
    const content = typeof msg.content === "string" ? msg.content.trim() : "";
    const prefix = CONFIG.PERSONAL.DEFAULT_PREFIX;

    if (!content.startsWith(prefix)) return;

    const parts = content.slice(prefix.length).trim().split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) return;

    const isGroup = msg.type === 1; // ThreadType.Group = 1
    const threadId = msg.threadId;

    if (command.groupOnly && !isGroup) {
      await bot.sendText(threadId, "Lệnh này chỉ dùng được trong nhóm chat.", [], false);
      return;
    }

    const ctx: CommandContext = {
      bot,
      msg,
      args,
      isGroup,
      threadId
    };

    try {
      await command.execute(ctx);
    } catch (err: any) {
      console.error(`[Router Error] Lỗi lệnh ${commandName}:`, err);
      await bot.sendText(threadId, `Lỗi khi thực thi lệnh: ${err.message}`, [], isGroup);
    }
  }
}

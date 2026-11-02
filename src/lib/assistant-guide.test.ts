import { describe, expect, it } from "vitest";
import { DESKTOP_CONFIG, LOCAL_MCP_URL, MCP_BRIDGE_PACKAGE, SAVE_TOKEN_COMMAND } from "./assistant-guide";

describe("the Connected apps guide", () => {
  it("offers a Desktop config that parses and sends the token by file", () => {
    const { args } = JSON.parse(DESKTOP_CONFIG).mcpServers.hobbyrentals;

    expect(args).toEqual([
      "-y",
      MCP_BRIDGE_PACKAGE,
      LOCAL_MCP_URL,
      "--header-file",
      "/Users/you/.config/hobbyrentals/mcp-headers.txt",
    ]);
  });

  it("pins the bridge", () => {
    expect(MCP_BRIDGE_PACKAGE).toMatch(/^mcp-remote@\d+\.\d+\.\d+$/);
  });

  it("saves the token from the clipboard into a file only the member can read", () => {
    expect(SAVE_TOKEN_COMMAND).toContain("pbpaste");
    expect(SAVE_TOKEN_COMMAND).toContain("umask 077");
    expect(SAVE_TOKEN_COMMAND).not.toContain("hr_at_");
  });
});

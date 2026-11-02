/**
 * S5-05: what the Connected apps guide tells a member to run and paste. Kept
 * here so a test can check them, because a mistake in these strings only shows
 * up on someone else's computer.
 */

export const ASSISTANT_HEADER_FILE = "~/.config/hobbyrentals/mcp-headers.txt";
/** Pinned as in the backend's README, so a new bridge release cannot change the setup unnoticed. */
export const MCP_BRIDGE_PACKAGE = "mcp-remote@0.15.2";
export const LOCAL_MCP_URL = "http://localhost:8000/mcp";

/** Takes the token from the clipboard, so it is never typed, shown on screen or kept in shell history. */
export const SAVE_TOKEN_COMMAND = `mkdir -p ~/.config/hobbyrentals && chmod 700 ~/.config/hobbyrentals
(umask 077; printf 'Authorization: Bearer %s\\n' "$(pbpaste)" > ${ASSISTANT_HEADER_FILE})`;

export const FIND_PATHS_COMMAND = `which npx
echo $HOME`;

/** The parts a member has to replace with their own paths are spelled "/Users/you" and "/usr/local/bin/npx". */
export const DESKTOP_CONFIG_LINES = [
  { text: `{`, },
  { text: `  "mcpServers": {` },
  { text: `    "hobbyrentals": {` },
  { text: `      "command": "/usr/local/bin/npx",` },
  { text: `      "args": [` },
  { text: `        "-y",` },
  { text: `        "${MCP_BRIDGE_PACKAGE}",` },
  { text: `        "${LOCAL_MCP_URL}",` },
  { text: `        "--header-file",`, isToken: true },
  { text: `        "/Users/you/.config/hobbyrentals/mcp-headers.txt"`, isToken: true },
  { text: `      ],` },
  { text: `      "env": {` },
  { text: `        "PATH": "/usr/local/bin:/usr/bin:/bin",` },
  { text: `        "npm_config_cache": "/Users/you/.cache/hobbyrentals-mcp-npm"` },
  { text: `      }` },
  { text: `    }` },
  { text: `  }` },
  { text: `}` },
] as const;

export const DESKTOP_CONFIG = DESKTOP_CONFIG_LINES.map((line) => line.text).join("\n");

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setTools } from "./tools.js";
import { setResources } from "./resources.js";
import axios from "axios";

const server = new Server(
  {
    name: "letzai-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // <-- Add tools capability
      resources: {},
    },
  }
);

// Check for API key
const LETZAI_API_KEY = process.env.LETZAI_API_KEY!;
if (!LETZAI_API_KEY) {
  console.error("Error: LETZAI_API_KEY environment variable is required");
  process.exit(1);
}

//All available tools in tools.ts (create image, get image)
setTools(server);
setResources(server);

const transport = new StdioServerTransport();
await server.connect(transport);

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createReviewToolHandler, policyFromEnv, reviewToolDescription, reviewToolSchema } from "./mcp-tool.js";

const server = new McpServer({ name: "repository-inspector", version: "2.0.0" });
server.tool(
  "review_repository",
  reviewToolDescription,
  reviewToolSchema,
  createReviewToolHandler(policyFromEnv(process.env)),
);
await server.connect(new StdioServerTransport());
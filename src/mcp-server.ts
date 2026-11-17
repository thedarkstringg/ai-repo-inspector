#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { handleReviewTool, reviewToolDescription, reviewToolSchema } from "./mcp-tool.js";

const server = new McpServer({ name: "repository-inspector", version: "2.0.0" });
server.tool("review_repository", reviewToolDescription, reviewToolSchema, handleReviewTool);
await server.connect(new StdioServerTransport());
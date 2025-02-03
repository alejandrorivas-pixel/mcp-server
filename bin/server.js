#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, URL } from 'url';

// Helper to determine __dirname in ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS and JSON parsing middleware.
app.use(cors());
app.use(express.json());

// Helper functions for JSON-RPC responses.
function createResponse (id, result) {
  return {
    jsonrpc: "2.0",
    id: id,
    result: result
  };
}

function createErrorResponse (id, code, message) {
  return {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: code,
      message: message
    }
  };
}

// Load all plugins from the plugins folder.
const plugins = new Map();
const pluginsDir = new URL('../plugins/', import.meta.url);
try {
  const files = await fs.readdir(pluginsDir);
  for (const file of files) {
    if (file.endsWith('.js')) {
      // Create the URL to the plugin file.
      const moduleUrl = new URL(file, pluginsDir);
      const plugin = await import(moduleUrl.href);
      if (plugin.method && typeof plugin.handler === 'function') {
        plugins.set(plugin.method, plugin);
        console.log(`Loaded plugin: ${plugin.method}`);
      } else {
        console.warn(`Skipping plugin file ${file} (missing 'method' or 'handler')`);
      }
    }
  }
} catch (err) {
  console.error("Error loading plugins:", err);
}

// Handle POST requests to the root endpoint.
app.post('/', async (req, res) => {
  try {
    const message = req.body;
    console.log("Received message:", message);

    // Validate JSON-RPC request.
    if (!message.jsonrpc || message.jsonrpc !== "2.0") {
      return res.json(createErrorResponse(message.id, -32600, "Invalid JSON-RPC request"));
    }
    if (!message.method) {
      return res.json(createErrorResponse(message.id, -32600, "Method is required"));
    }

    // Special handling for the "initialize" method:
    // List available capabilities from the loaded plugins.
    if (message.method === "initialize") {
      const capabilities = {};
      plugins.forEach((plugin, method) => {
        if (plugin.capability) {
          capabilities[method] = plugin.capability;
        }
      });
      const response = {
        capabilities,
        serverInfo: {
          name: "Pluggable MCP Server",
          version: "1.0.0"
        }
      };
      return res.json(createResponse(message.id, response));
    }

    // Lookup the plugin for the requested method.
    const plugin = plugins.get(message.method);
    if (!plugin) {
      return res.json(createErrorResponse(message.id, -32601, "Method not found"));
    }

    // Execute the plugin's handler.
    // The handler may be synchronous or return a Promise.
    const result = plugin.handler(message.params);
    if (result instanceof Promise) {
      result
        .then(r => res.json(createResponse(message.id, r)))
        .catch(err => {
          console.error("Error processing method:", err);
          res.status(500).json(createErrorResponse(message.id, -32603, "Internal server error"));
        });
    } else {
      res.json(createResponse(message.id, result));
    }
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).json(createErrorResponse(null, -32603, "Internal server error"));
  }
});

// Listen on port 4333.
const PORT = process.env.PORT || 4333;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

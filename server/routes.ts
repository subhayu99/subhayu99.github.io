import type { Express } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import path from "path";
import { portfolioSchema } from "@shared/schema";
import * as yaml from "js-yaml";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve the portfolio YAML data
  app.get("/api/portfolio", (req, res) => {
    try {
      const yamlPath = path.join(process.cwd(), "attached_assets", "resume.yaml");
      const yamlContent = readFileSync(yamlPath, "utf8");
      const parsedData = yaml.load(yamlContent);
      
      // Validate the data structure
      const validatedData = portfolioSchema.parse(parsedData);
      
      res.json(validatedData);
    } catch (error) {
      console.error("Error loading portfolio data:", error);
      res.status(500).json({ 
        error: "Failed to load portfolio data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

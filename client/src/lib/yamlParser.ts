import * as yaml from 'js-yaml';
import { portfolioSchema, type PortfolioData } from '@shared/schema';

export async function loadPortfolioData(): Promise<PortfolioData> {
  try {
    // Load YAML file directly from public directory
    const response = await fetch('/resume.yaml');
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio data: ${response.statusText}`);
    }
    
    const yamlContent = await response.text();
    const parsedData = yaml.load(yamlContent);
    
    // Validate the data structure
    const validatedData = portfolioSchema.parse(parsedData);
    
    return validatedData;
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    throw error;
  }
}
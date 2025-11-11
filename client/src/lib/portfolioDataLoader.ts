import { portfolioSchema, type PortfolioData } from '../../../shared/schema';
import { apiConfig } from '../config';

export async function loadPortfolioData(): Promise<PortfolioData> {
  try {
    const response = await fetch(apiConfig.endpoints.resumeData);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate the data against our schema
    const validatedData = portfolioSchema.parse(data);
    return validatedData;
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    throw new Error(
      error instanceof Error 
        ? `Portfolio data loading failed: ${error.message}`
        : 'Unknown error occurred while loading portfolio data'
    );
  }
}

// Portfolio storage interface - currently not used as data comes from YAML
export interface IStorage {
  // Future: Add any portfolio-specific storage methods here
}

export class MemStorage implements IStorage {
  constructor() {
    // Portfolio data loaded from YAML via API
  }
}

export const storage = new MemStorage();

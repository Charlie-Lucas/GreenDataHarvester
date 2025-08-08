class RetryHandler {
  constructor(config) {
    this.maxAttempts = config.maxAttempts || 3;
    this.delayMs = config.delayMs || 1000;
    this.backoffMultiplier = config.backoffMultiplier || 2;
  }

  async execute(operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Ne pas retry sur les erreurs 4xx (sauf 429)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          throw error;
        }
        
        if (attempt === this.maxAttempts) {
          throw error;
        }
        
        // Attendre avant de retry avec backoff exponentiel
        const delay = this.delayMs * Math.pow(this.backoffMultiplier, attempt - 1);
        await this.wait(delay);
      }
    }
    
    throw lastError;
  }

  async retry(operation) {
    return this.execute(operation);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { RetryHandler };


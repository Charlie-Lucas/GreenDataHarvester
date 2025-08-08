class RateLimiter {
  constructor(config) {
    this.requestsPerMinute = config.requestsPerMinute || 30;
    this.requestsPerHour = config.requestsPerHour || 1000;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    
    // Nettoyer les anciennes requêtes
    this.requests = this.requests.filter(
      req => now - req < 60000 // Garder seulement la dernière minute
    );

    // Vérifier la limite par minute
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      await this.wait(waitTime);
    }

    // Ajouter la requête actuelle
    this.requests.push(now);
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { RateLimiter };


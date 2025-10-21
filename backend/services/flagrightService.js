const axios = require('axios');

const FLAGRIGHT_API_KEY = process.env.FLAGRIGHT_API_KEY || '';
const FLAGRIGHT_API_URL = process.env.FLAGRIGHT_API_URL || 'https://api.flagright.com';

// Flagright API Client
class FlagrightClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = FLAGRIGHT_API_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Create or update a user in Flagright
  async createUser(userData) {
    try {
      const response = await this.client.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (createUser):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get user details from Flagright
  async getUser(userId) {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getUser):', error.response?.data || error.message);
      throw error;
    }
  }

  // Create a transaction event in Flagright
  async createTransaction(transactionData) {
    try {
      const response = await this.client.post('/events/transaction', transactionData);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (createTransaction):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get transaction details
  async getTransaction(transactionId) {
    try {
      const response = await this.client.get(`/events/transaction/${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getTransaction):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get user risk score and alerts
  async getUserRiskScore(userId) {
    try {
      const response = await this.client.get(`/users/${userId}/risk`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getUserRiskScore):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get transaction risk score
  async getTransactionRiskScore(transactionId) {
    try {
      const response = await this.client.get(`/events/transaction/${transactionId}/risk`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getTransactionRiskScore):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get alerts for a user
  async getUserAlerts(userId) {
    try {
      const response = await this.client.get(`/users/${userId}/alerts`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getUserAlerts):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get linked entities (relationships)
  async getLinkedEntities(userId) {
    try {
      const response = await this.client.get(`/users/${userId}/linked-entities`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getLinkedEntities):', error.response?.data || error.message);
      throw error;
    }
  }

  // Get transaction monitoring results
  async getTransactionMonitoring(transactionId) {
    try {
      const response = await this.client.get(`/events/transaction/${transactionId}/monitoring`);
      return response.data;
    } catch (error) {
      console.error('Flagright API Error (getTransactionMonitoring):', error.response?.data || error.message);
      throw error;
    }
  }
}

// Export singleton instance
const flagrightClient = new FlagrightClient(FLAGRIGHT_API_KEY);

module.exports = {
  FlagrightClient,
  flagrightClient
};

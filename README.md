# 🚨 Flagright - Advanced Fraud Detection System

A comprehensive graph-based fraud detection system built with Neo4j, Node.js, and React. This system visualizes complex relationships between users and transactions to identify suspicious patterns and potential fraudulent activities.

## 🎯 Live Demo

**Repository**: [https://github.com/Suyash0803/Flagright](https://github.com/Suyash0803/Flagright)

## 🚀 Deployment

### Quick Deploy on Render (15 minutes)
**⚡ Fast Track**: [DEPLOY_NOW.md](./DEPLOY_NOW.md) - Simple 4-step guide

**📚 Detailed Guide**: [RENDER_MANUAL_DEPLOY.md](./RENDER_MANUAL_DEPLOY.md) - Step-by-step with explanations

### Other Deployment Options
- **Docker**: Use the included `docker-compose.yml`
- **Local**: Follow the development setup below
- **Cloud**: Deploy on AWS, GCP, or Azure

## 🌟 Key Features

### 📊 Graph Visualization
- **Interactive Network Graphs**: Real-time visualization of user and transaction relationships
- **Color-Coded Relationships**: Different edge colors for various relationship types
- **Node Details Panel**: Click on any node to view detailed information
- **Shortest Path Analysis**: Find connection paths between any two users

### 🔍 Fraud Detection Capabilities
- **Relationship Mapping**: Identify users sharing emails, phones, addresses, devices, or IP addresses
- **Transaction Pattern Analysis**: Detect suspicious money transfer patterns
- **Network Analysis**: Visualize complex fraud networks and money laundering schemes
- **Real-time Monitoring**: Live detection of suspicious activities

### 🎨 Visual Elements
| Relationship Type | Edge Color | Description |
|-------------------|------------|-------------|
| Made Transaction | 🔵 Blue | User initiated transaction |
| Received Transaction | 🟢 Green | User received transaction |
| Sent Money To | 🟢 Bright Green | Direct money transfer |
| Received Money From | 🟠 Orange Red | Money receipt |
| Shares Email | 🔴 Red | Same email domain |
| Shares Phone | 🟠 Orange | Same phone prefix |
| Shares Address | 🟣 Purple | Same physical address |
| Same IP | 🟠 Dark Orange | Same IP address |
| Same Device | 🩷 Pink | Same device usage |

### 📋 Data Management
- **Transaction Filtering**: Filter by type (withdrawal, deposit, payment, purchase, transfer)
- **User Search**: Search users by name, email, or ID
- **Pagination**: Efficient data loading with proper pagination
- **Export Capabilities**: Export data in JSON/CSV formats

## 🏗️ Technology Stack

### Backend
- **Node.js + Express.js**: RESTful API server
- **Neo4j Graph Database**: Relationship storage and querying
- **Docker**: Containerized deployment

### Frontend
- **React.js**: Interactive user interface
- **Cytoscape.js**: Graph visualization library
- **Axios**: API communication
- **CSS3**: Responsive styling

### Infrastructure
- **Docker Compose**: Multi-service orchestration
- **Neo4j Browser**: Database management interface
- **Nginx**: Frontend web server

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git for cloning the repository

### Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Suyash0803/Flagright.git
   cd Flagright
   ```

2. **Start the Application**
   ```bash
   docker-compose up --build -d
   ```

3. **Access the Services**
   - **Frontend Application**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:5000](http://localhost:5000)
   - **Neo4j Browser**: [http://localhost:7474](http://localhost:7474)

4. **Wait for Data Population**
   The system will automatically populate sample data (users and transactions) on first startup.

### 🎮 Using the Application

#### Main Interface
1. **Transaction View**: Browse and filter transactions by type
2. **User View**: Explore user profiles and relationships
3. **Graph Visualization**: Click any item to see its relationship network

#### Fraud Investigation Workflow
1. **Start with Suspicious Transaction**: Select a high-value or unusual transaction
2. **Analyze User Network**: View the user's relationship graph
3. **Find Connection Paths**: Use shortest path to trace money flows
4. **Identify Risk Patterns**: Look for shared devices, IPs, or personal information

#### Advanced Features
- **Shortest Path Finder**: Enter two user IDs to find connection paths
- **Export Data**: Download relationship data for offline analysis
- **Filter Transactions**: Focus on specific transaction types
- **Interactive Exploration**: Click and explore the graph organically

## 📊 Sample Data

The system comes pre-loaded with:
- **100,000+ Transactions**: Various types and amounts
- **110 Users**: With realistic profiles and relationships
- **Multiple Relationship Types**: All supported relationship patterns
- **Fraud Scenarios**: Pre-configured suspicious patterns for testing

### Transaction Types Distribution
- Payment: ~20,323 transactions
- Purchase: ~20,092 transactions  
- Transfer: ~20,023 transactions
- Deposit: ~19,943 transactions
- Withdrawal: ~19,619 transactions

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/transactions` - List all transactions with pagination
- `GET /api/transactions/by-type/{type}` - Filter transactions by type
- `GET /api/users` - List all users with search and pagination
- `GET /api/relationships/user/{id}` - Get user relationship graph
- `GET /api/relationships/transaction/{id}` - Get transaction relationships
- `GET /api/relationships/shortest-path/{user1}/{user2}` - Find shortest path

### Data Management
- `GET /api/transactions/types` - Get available transaction types
- `GET /api/relationships/export/json` - Export relationship data
- `GET /api/relationships/export/csv` - Export as CSV

## 🛠️ Development

### Project Structure
```
flagright/
├── backend/                 # Node.js API server
│   ├── controllers/        # API route handlers
│   ├── routes/            # Express routes
│   ├── services/          # Business logic
│   ├── scripts/           # Database utilities
│   └── config/           # Database configuration
├── frontend/              # React application
│   ├── src/              # React components
│   └── public/           # Static assets
└── docker-compose.yml    # Service orchestration
```

### Environment Variables
Create `.env` file in backend directory:
```env
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
PORT=5000
```

### Database Schema
The Neo4j database uses the following node types:
- **User**: Individual users with profile information
- **Transaction**: Financial transactions with metadata

Relationship types include:
- `MADE_TRANSACTION`, `SENT_MONEY_TO`, `RECEIVED_MONEY_FROM`
- `SHARES_EMAIL`, `SHARES_PHONE`, `SHARES_ADDRESS`
- `SAME_IP`, `SAME_DEVICE`

## 🚨 Fraud Detection Use Cases

### 1. Identity Fraud Detection
- Users sharing multiple personal identifiers
- Same device/IP used by multiple accounts
- Rapid account creation from same location

### 2. Money Laundering Patterns  
- Complex transaction chains between related users
- Unusual transaction amounts or frequencies
- Geographic inconsistencies in user profiles

### 3. Network Analysis
- Identify fraud rings through relationship clustering
- Detect mule accounts in money transfer chains  
- Find common connection points in suspicious networks

### 4. Real-time Monitoring
- Monitor new relationships as they form
- Alert on suspicious connection patterns
- Track transaction flows through networks

## 📈 Performance & Scalability

- **Neo4j Optimization**: Indexed queries for fast relationship traversal
- **Pagination**: Efficient data loading for large datasets
- **Caching**: In-memory caching for frequent queries
- **Docker**: Scalable containerized architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Neo4j for the powerful graph database
- Cytoscape.js for excellent graph visualization
- React community for the robust frontend framework
- Docker for containerization excellence

---

**Built with ❤️ for fraud prevention and financial security**

For questions or support, please open an issue on GitHub.
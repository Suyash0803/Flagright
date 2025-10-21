import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import './App.css';

cytoscape.use(coseBilkent);

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function to get transaction type icons
const getTypeIcon = (type) => {
  const icons = {
    'withdrawal': '💸',
    'purchase': '🛒',
    'deposit': '💰',
    'payment': '💳',
    'transfer': '🔄'
  };
  return icons[type] || '💼';
};

// Helper function to get user initials
const getUserInitials = (name) => {
  if (!name) return '??';
  return name.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function App() {
  const [view, setView] = useState('transactions');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [transactionType, setTransactionType] = useState('all');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [pathUser1, setPathUser1] = useState('');
  const [pathUser2, setPathUser2] = useState('');
  const [pathResult, setPathResult] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const cyRef = useRef(null);
  const cyInstanceRef = useRef(null);

  

  // Load available transaction types when view changes to transactions
  useEffect(() => {
    if (view === 'transactions') {
      loadTransactionTypes();
    }
  }, [view]);

  

  // Load available transaction types
  const loadTransactionTypes = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/transactions/types`);
      if (res.data.typesInData) {
        setAvailableTypes(res.data.typesInData);
      }
    } catch (err) {
      console.error('Error loading transaction types:', err);
    }
  };

  

  // Render graph when graphData changes
  useEffect(() => {
    if (!graphData || !cyRef.current) return;

    // Clear previous instance
    if (cyInstanceRef.current) {
      cyInstanceRef.current.destroy();
    }

    try {
      // Create cytoscape instance with better styling
      const cy = cytoscape({
        container: cyRef.current,
        elements: graphData.elements || [],
        layout: { 
          name: 'cose-bilkent', 
          animate: true, 
          animationDuration: 500,
          nodeSpacing: 10,
          gravity: 0.5,
        },
        style: [
          // Transaction nodes - FORCE BLUE COLOR
          {
            selector: 'node[type = "transaction"]',
            style: {
              'background-color': '#0066ff',
              'label': 'data(label)',
              'font-size': 11,
              'font-weight': 'bold',
              'color': 'white',
              'text-valign': 'center',
              'text-halign': 'center',
              'border-width': 2,
              'border-color': '#004499'
            }
          },
          // User nodes - FORCE GREEN COLOR  
          {
            selector: 'node[type = "user"]',
            style: {
              'background-color': '#27ae60',
              'label': 'data(label)',
              'font-size': 11,
              'font-weight': 'bold',
              'color': 'white',
              'text-valign': 'center',
              'text-halign': 'center',
              'border-width': 2,
              'border-color': '#1e7e34'
            }
          },
          // Default node style (fallback)
          {
            selector: 'node',
            style: {
              'background-color': (ele) => {
                // Check for special node states first
                if (ele.data('isStartNode')) return '#27ae60'; // Green for start
                if (ele.data('isEndNode')) return '#e74c3c'; // Red for end
                if (ele.data('isPathNode')) return '#f39c12'; // Orange for path nodes
                if (ele.data('isSelected')) return '#e74c3c';
                
                // Default colors by type (should be overridden by specific selectors above)
                const nodeType = ele.data('type');
                if (nodeType === 'transaction') {
                  return '#0066ff'; // Bright blue for transactions
                } else {
                  return '#27ae60'; // Green for users
                }
              },
              'label': 'data(label)',
              'font-size': 11,
              'font-weight': 'bold',
              'width': (ele) => {
                const label = ele.data('label');
                return label ? Math.max(50, label.length * 6) : 50;
              },
              'height': 50,
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '45px',
              'padding': 10,
              'color': '#fff',
              'border-width': (ele) => {
                if (ele.data('isStartNode') || ele.data('isEndNode')) return 4;
                if (ele.data('isPathNode')) return 3;
                return ele.data('isSelected') ? 3 : 1;
              },
              'border-color': (ele) => {
                if (ele.data('isStartNode')) return '#27ae60';
                if (ele.data('isEndNode')) return '#e74c3c';
                if (ele.data('isPathNode')) return '#f39c12';
                return '#000';
              },
            }
          },
          {
            selector: 'edge',
            style: {
              'line-color': 'data(color)',
              'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'width': (ele) => ele.data('isPathEdge') ? 4 : 2,
              'opacity': (ele) => ele.data('isPathEdge') ? 1 : 0.7,
            }
          }
        ]
      });

      // Add click handler for nodes
      cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        const data = node.data();
        setNodeInfo({
          id: data.id,
          type: data.type,
          label: data.label,
          amount: data.amount,
          name: data.name,
          email: data.email
        });
      });

      // Click background to deselect
      cy.on('tap', function(evt) {
        if (evt.target === cy) {
          setNodeInfo(null);
        }
      });

      cyInstanceRef.current = cy;
    } catch (err) {
      console.error('Error initializing Cytoscape:', err);
    }
  }, [graphData]);

  const loadData = useCallback(async (newPage) => {
    setLoading(true);
    try {
      let endpoint;
      let params = { page: newPage, limit: pageSize };
      
      if (view === 'transactions') {
        if (transactionType === 'all') {
          endpoint = `${BASE_URL}/transactions`;
        } else {
          endpoint = `${BASE_URL}/transactions/by-type/${transactionType}`;
        }
      } else {
        endpoint = `${BASE_URL}/users`;
      }
      
      const res = await axios.get(endpoint, { params });
      const dataKey = view === 'transactions' ? 'transactions' : 'users';
      setItems(res.data[dataKey] || []);
      setTotal(res.data.pagination?.totalPages || res.data.totalPages || 0);
      setPage(newPage);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [view, pageSize, transactionType]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  // Handle export functionality
  const handleExport = async (format) => {
    try {
      const exportType = view === 'transactions' ? 'transaction' : 'user';
      const params = selectedId ? `?type=${exportType}&${exportType}Id=${selectedId}` : '';
      
      if (format === 'csv') {
        // For CSV, we need to handle the download differently
        window.open(`${BASE_URL}/relationships/export/csv${params}`, '_blank');
      } else {
        // For JSON, fetch and trigger download
        const response = await axios.get(`${BASE_URL}/relationships/export/json${params}`);
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `graph-data-${Date.now()}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Find shortest path between two users
  const findShortestPath = async () => {
    if (!pathUser1 || !pathUser2) {
      alert('Please enter both user IDs');
      return;
    }
    
    if (pathUser1 === pathUser2) {
      alert('Please enter different user IDs');
      return;
    }

    setPathLoading(true);
    setPathResult(null);
    
    try {
      const response = await axios.get(`${BASE_URL}/relationships/shortest-path/${pathUser1}/${pathUser2}`);
      setPathResult(response.data);
      
      // If path found, visualize it in the graph
      if (response.data.found) {
        const elements = [];
        
        // Add nodes from path
        response.data.nodes.forEach(node => {
          let label = node.name || node.id;
          if (node.type === 'user') {
            label = node.name ? node.name.split(' ')[0] : node.id;
          }
          
          elements.push({
            data: {
              id: node.id,
              label: label,
              type: node.type,
              name: node.name,
              isPathNode: true,
              isStartNode: node.id === pathUser1,
              isEndNode: node.id === pathUser2
            }
          });
        });
        
        // Add relationships from path
        response.data.relationships.forEach(rel => {
          elements.push({
            data: {
              source: rel.start,
              target: rel.end,
              color: '#e74c3c', // Red color for path highlighting
              type: rel.type,
              isPathEdge: true
            }
          });
        });
        
        setGraphData({ elements });
        setSelectedId(null); // Clear previous selection
      }
    } catch (error) {
      console.error('Error finding shortest path:', error);
      setPathResult({
        found: false,
        message: 'Error finding path. Please check the user IDs and try again.'
      });
    }
    
    setPathLoading(false);
  };

  const loadGraph = useCallback(async (id) => {
    setGraphLoading(true);
    try {
      const endpoint = view === 'transactions' 
        ? `${BASE_URL}/relationships/transaction/${id}`
        : `${BASE_URL}/relationships/user/${id}`;
      
      const res = await axios.get(endpoint);
      
      // Convert nodes and edges to Cytoscape format
      // Backend returns: { nodes: [{ data: {...} }, ...], edges: [{ data: {...} }, ...] }
      const elements = [];
      
      if (res.data.nodes) {
        res.data.nodes.forEach(nodeObj => {
          // Backend wraps data in { data: {...} }
          const node = nodeObj.data || nodeObj;
          
          let label = node.label || node.id;
          
          // Create more descriptive labels based on node type
          if (node.type === 'transaction') {
            // For transactions: show amount and type with TX prefix
            const amount = node.amount;
            label = amount 
              ? `TX\n$${parseFloat(amount).toFixed(0)}` 
              : `TX\n${node.id}`;
          } else if (node.type === 'user') {
            // For users: show first name with null safety
            const name = node.name;
            label = name && typeof name === 'string'
              ? name.split(' ')[0] 
              : node.id;
          }
          
          // Set explicit background color based on node type
          const backgroundColor = node.type === 'transaction' ? '#0066ff' : '#27ae60';
          
          elements.push({
            data: {
              id: node.id,
              label: label,
              type: node.type,
              amount: node.amount,
              name: node.name,
              email: node.email,
              isSelected: node.id === id,
              backgroundColor: backgroundColor
            }
          });
        });
      }

      if (res.data.edges) {
        res.data.edges.forEach(edgeObj => {
          // Backend wraps edge data in { data: {...} }
          const edge = edgeObj.data || edgeObj;
          
          elements.push({
            data: {
              source: edge.source,
              target: edge.target,
              color: edge.color || '#999',
              type: edge.type
            }
          });
        });
      }

      setGraphData({ elements });
    } catch (err) {
      console.error('Error loading graph:', err);
      setGraphData(null);
    }
    setGraphLoading(false);
  }, [view]);

  // Load graph when selectedId changes
  useEffect(() => {
    if (selectedId) {
      loadGraph(selectedId);
    } else {
      setGraphData(null);
    }
  }, [selectedId, loadGraph]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>� Transaction Relationship Network</h1>
          <p className="header-subtitle">User and Transaction Relationship Visualization System</p>
        </div>
        <div className="tab-selector">
          <button 
            className={`tab-button ${view === 'transactions' ? 'active' : ''}`} 
            onClick={() => setView('transactions')}
          >
            <span className="tab-icon">💰</span>
            <span className="tab-text">Transactions</span>
          </button>
          <button 
            className={`tab-button ${view === 'users' ? 'active' : ''}`} 
            onClick={() => setView('users')}
          >
            <span className="tab-icon">👥</span>
            <span className="tab-text">Users</span>
          </button>
        </div>
      </header>
      <div className="main-content">
        <div className="left-panel">
          <div className="section control-section">
            <h3>📊 Page Size</h3>
            <select 
              value={pageSize} 
              onChange={(e) => setPageSize(parseInt(e.target.value))}
              className="styled-select"
            >
              <option value="20">20 items</option>
              <option value="50">50 items</option>
              <option value="100">100 items</option>
            </select>
          </div>
          
          <div className="section control-section">
            <h3>📥 Export Data</h3>
            <div className="export-buttons">
              <button 
                className="export-btn json-btn"
                onClick={() => handleExport('json')}
                title="Export as JSON"
              >
                📄 JSON
              </button>
              <button 
                className="export-btn csv-btn"
                onClick={() => handleExport('csv')}
                title="Export as CSV"
              >
                📊 CSV
              </button>
            </div>
          </div>

          <div className="section control-section">
            <h3>🔗 Find Shortest Path</h3>
            <div className="path-finder">
              <div className="path-inputs">
                <input
                  type="text"
                  placeholder="From User ID (e.g., user-1)"
                  value={pathUser1}
                  onChange={(e) => setPathUser1(e.target.value)}
                  className="path-input"
                />
                <span className="path-arrow">→</span>
                <input
                  type="text"
                  placeholder="To User ID (e.g., user-50)"
                  value={pathUser2}
                  onChange={(e) => setPathUser2(e.target.value)}
                  className="path-input"
                />
              </div>
              <button 
                className="path-btn"
                onClick={findShortestPath}
                disabled={pathLoading || !pathUser1 || !pathUser2}
              >
                {pathLoading ? '🔄 Finding...' : '🔍 Find Path'}
              </button>
              
              {pathResult && (
                <div className="path-result">
                  {pathResult.found ? (
                    <div className="path-success">
                      <div className="path-info">
                        <span className="path-length">✅ Path found!</span>
                        <span className="path-details">
                          Length: {pathResult.pathLength} hops
                          {pathResult.weight && ` | Weight: ${pathResult.weight}`}
                        </span>
                      </div>
                      <div className="path-nodes">
                        <strong>Path:</strong>
                        <div className="path-chain">
                          {pathResult.nodes.map((node, index) => (
                            <span key={node.id} className="path-node">
                              {node.name || node.id}
                              {index < pathResult.nodes.length - 1 && (
                                <span className="path-connector"> → </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="path-failure">
                      <span className="no-path">❌ No path found</span>
                      <span className="no-path-message">{pathResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {view === 'transactions' && (
            <div className="section control-section">
              <h3>🔍 Transaction Type</h3>
              <select 
                value={transactionType} 
                onChange={(e) => {
                  setTransactionType(e.target.value);
                  setSelectedId(null); // Clear selection when changing filter
                }}
                className="styled-select"
              >
                <option value="all">🌐 All Types</option>
                {availableTypes.map((typeData) => (
                  <option key={typeData.type} value={typeData.type}>
                    {getTypeIcon(typeData.type)} {typeData.type ? typeData.type.charAt(0).toUpperCase() + typeData.type.slice(1) : 'Unknown'} ({typeData.count.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="section">
            <div className="pagination-controls">
              <button onClick={() => loadData(1)} disabled={page === 1}>First</button>
              <button onClick={() => loadData(page - 1)} disabled={page === 1}>Previous</button>
              <span>Page {page} of {total}</span>
              <button onClick={() => loadData(page + 1)} disabled={page === total}>Next</button>
              <button onClick={() => loadData(total)} disabled={page === total}>Last</button>
            </div>
          </div>
          <div className="section list-section">
            <h3>
              {view === 'transactions' ? '💰 Transactions' : '👥 Users'} - Click to View Graph
              {view === 'transactions' && transactionType !== 'all' && (
                <span className="filter-indicator">
                  (Filtered: {getTypeIcon(transactionType)} {transactionType ? transactionType.charAt(0).toUpperCase() + transactionType.slice(1) : 'Unknown'})
                </span>
              )}
            </h3>
            {loading && <p>Loading...</p>}
            <div className="data-list">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={`list-item ${selectedId === item.id ? 'selected' : ''}`} 
                  onClick={() => setSelectedId(item.id)}
                >
                  {view === 'transactions' ? (
                    <div className="item-content transaction-item">
                      <div className="item-header">
                        <div className="item-icon">{getTypeIcon(item.type)}</div>
                        <div className="item-main">
                          <strong className="item-id">{item.id}</strong>
                          <span className={`status-badge status-${item.status}`}>{item.status}</span>
                        </div>
                        <div className="item-amount">
                          <span className="amount-value">${parseFloat(item.amount).toLocaleString()}</span>
                          <span className="currency">{item.currency}</span>
                        </div>
                      </div>
                      <div className="item-details">
                        <span className={`type-badge type-${item.type || 'unknown'}`}>
                          {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Unknown'}
                        </span>
                        <span className="user-info">User: {item.userId}</span>
                        {item.timestamp && (
                          <span className="timestamp">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="item-content user-item">
                      <div className="item-header">
                        <div className="user-avatar">
                          {getUserInitials(item.name)}
                        </div>
                        <div className="item-main">
                          <strong className="user-name">{item.name || item.id}</strong>
                          <span className="user-email">{item.email}</span>
                        </div>
                        <div className="user-id">
                          <span className="id-badge">{item.id}</span>
                        </div>
                      </div>
                      {item.country && (
                        <div className="item-details">
                          <span className="country-info">📍 {item.country}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="right-panel">
          <div className="graph-section">
            <h3>🔗 Relationship Network {selectedId && `(${selectedId})`}</h3>
            {graphLoading && <div className="loading-spinner">🔄 Loading graph...</div>}
            {!graphData && !graphLoading && (
              <div className="no-data">
                <div className="no-data-content">
                  <span className="no-data-icon">📊</span>
                  <span className="no-data-text">Click an item to view relationships</span>
                </div>
              </div>
            )}
            <div ref={cyRef} className="cytoscape-container"></div>
            
            {/* Edge Color Legend - Bottom Chart */}
            <div className="edge-legend-bottom">
              <h4>🎨 Edge Color Guide</h4>
              <div className="legend-grid">
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#0066ff'}}></div>
                  <span className="legend-label">Made Transaction</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#00cc66'}}></div>
                  <span className="legend-label">Received Transaction</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#00ff00'}}></div>
                  <span className="legend-label">Sent Money To</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#ff4500'}}></div>
                  <span className="legend-label">Received Money From</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#ff0000'}}></div>
                  <span className="legend-label">Shares Email</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#ffa500'}}></div>
                  <span className="legend-label">Shares Phone</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#800080'}}></div>
                  <span className="legend-label">Shares Address</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#ff6600'}}></div>
                  <span className="legend-label">Same IP</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#cc0066'}}></div>
                  <span className="legend-label">Same Device</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{backgroundColor: '#20b2aa'}}></div>
                  <span className="legend-label">Network Connected</span>
                </div>
              </div>
            </div>
          </div>
          {nodeInfo && (
            <div className="node-info-panel">
              <h4>📊 Node Details</h4>
              <div className="info-content">
                <p><strong>ID:</strong> {nodeInfo.id}</p>
                <p><strong>Type:</strong> {nodeInfo.type === 'transaction' ? '💰 Transaction' : '👤 User'}</p>
                {nodeInfo.type === 'transaction' && nodeInfo.amount && (
                  <p><strong>Amount:</strong> ${nodeInfo.amount.toFixed(2)}</p>
                )}
                {nodeInfo.type === 'user' && nodeInfo.name && (
                  <p><strong>Name:</strong> {nodeInfo.name}</p>
                )}
                {nodeInfo.email && (
                  <p><strong>Email:</strong> {nodeInfo.email}</p>
                )}
                <button onClick={() => setNodeInfo(null)} className="close-btn">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

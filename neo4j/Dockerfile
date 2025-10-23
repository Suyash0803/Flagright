FROM neo4j:5.14.0

# Set environment variables for cloud deployment
ENV NEO4J_AUTH=neo4j/password123
ENV NEO4J_PLUGINS='["apoc"]'
ENV NEO4J_dbms_security_procedures_unrestricted=apoc.*
ENV NEO4J_dbms_security_procedures_allowlist=apoc.*

# Optimized memory settings for cloud deployment
ENV NEO4J_dbms_memory_heap_max__size=512M
ENV NEO4J_dbms_memory_pagecache_size=256M
ENV NEO4J_dbms_memory_transaction_total_max=512M

# Accept license and disable usage stats for production
ENV NEO4J_ACCEPT_LICENSE_AGREEMENT=yes
ENV NEO4J_dbms_usage__report_enabled=false

# Expose ports
EXPOSE 7474 7687

# Ensure proper permissions and startup
USER neo4j
WORKDIR /var/lib/neo4j

# Note: Data persistence is handled by cloud provider volumes
# Mount point: /data
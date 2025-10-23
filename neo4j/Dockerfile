FROM neo4j:5.14.0

# Set environment variables
ENV NEO4J_AUTH=neo4j/password123
ENV NEO4J_PLUGINS='["apoc"]'
ENV NEO4J_dbms_security_procedures_unrestricted=apoc.*
ENV NEO4J_dbms_security_procedures_allowlist=apoc.*

# Expose ports
EXPOSE 7474 7687

# Copy any custom configuration if needed
# COPY neo4j.conf /var/lib/neo4j/conf/neo4j.conf

# Note: Data persistence is handled by Railway Volumes
# Mount point: /data
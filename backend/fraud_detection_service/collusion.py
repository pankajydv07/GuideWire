import os
import logging
from neo4j import GraphDatabase

logger = logging.getLogger("zylo.fraud.collusion")

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "zylo12345")

_driver = None

def get_driver():
    global _driver
    if _driver is None:
        try:
            _driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j database: {e}")
    return _driver

async def check_collusion_graph(rider_id: str, upi_id: str, device_fingerprint: str) -> int:
    """
    Connect to Neo4j to build links and search for shared resource networks.
    Returns fraud points (0-50) based on shared resources.
    """
    driver = get_driver()
    if driver is None:
        return 0
        
    points = 0
    try:
        with driver.session() as session:
            # 1. Update graph topology
            session.run(
                "MERGE (r:Rider {id: $rider_id}) "
                "MERGE (d:Device {fingerprint: $device_fingerprint}) "
                "MERGE (u:Upi {vpa: $upi_id}) "
                "MERGE (r)-[:USES_DEVICE]->(d) "
                "MERGE (r)-[:RECEIVES_PAYOUT_TO]->(u)",
                rider_id=rider_id,
                device_fingerprint=device_fingerprint,
                upi_id=upi_id
            )
            
            # 2. Query shared device links
            res_device = session.run(
                "MATCH (r:Rider {id: $rider_id})-[:USES_DEVICE]->(d:Device)<-[:USES_DEVICE]-(other:Rider) "
                "WHERE other.id <> $rider_id "
                "RETURN count(other) as shared_count",
                rider_id=rider_id
            )
            shared_device_count = res_device.single()["shared_count"]
            if shared_device_count > 0:
                logger.warning(f"Neo4j: Rider {rider_id} shares device with {shared_device_count} other riders!")
                points += 25
                
            # 3. Query shared UPI VPA links
            res_upi = session.run(
                "MATCH (r:Rider {id: $rider_id})-[:RECEIVES_PAYOUT_TO]->(u:Upi)<-[:RECEIVES_PAYOUT_TO]-(other:Rider) "
                "WHERE other.id <> $rider_id "
                "RETURN count(other) as shared_count",
                rider_id=rider_id
            )
            shared_upi_count = res_upi.single()["shared_count"]
            if shared_upi_count > 0:
                logger.warning(f"Neo4j: Rider {rider_id} shares UPI VPA with {shared_upi_count} other riders!")
                points += 25
                
    except Exception as e:
        logger.error(f"Neo4j collusion query error: {e}")
        
    return min(points, 50)

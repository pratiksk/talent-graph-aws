"""
Standalone seed script for local development.
Requires Neo4j running locally and env vars set.

Usage:
  NEO4J_URI=bolt://localhost:7687 \
  NEO4J_PASSWORD=yourpassword \
  python3 data/seed.py

In production, seeding is done via POST /ingest.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

import graph
import ingest

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j")

if __name__ == "__main__":
    print(f"Connecting to {NEO4J_URI} ...")
    graph.init_driver(NEO4J_URI, NEO4J_PASSWORD)

    if not graph.ping():
        print("ERROR: Cannot connect to Neo4j. Is it running?")
        sys.exit(1)

    print("Ingesting seed data ...")
    result = ingest.run_ingest()
    print(f"Done: {result['nodes']} nodes, {result['relationships']} relationships")

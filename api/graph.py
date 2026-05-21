import os
from neo4j import GraphDatabase
from neo4j.graph import Node, Relationship

_driver = None


def init_driver(uri: str, password: str):
    global _driver
    _driver = GraphDatabase.driver(uri, auth=("neo4j", password))


def ping() -> bool:
    try:
        _driver.verify_connectivity()
        return True
    except Exception:
        return False


def run_query(cypher: str, params: dict = None) -> list:
    with _driver.session() as session:
        result = session.run(cypher, params or {})
        return [_record_to_dict(record) for record in result]


def _record_to_dict(record) -> dict:
    out = {}
    for key, val in record.items():
        if isinstance(val, Node):
            out[key] = {"id": val.element_id, "labels": list(val.labels), **dict(val)}
        elif isinstance(val, Relationship):
            out[key] = {
                "id": val.element_id,
                "type": val.type,
                "start": val.start_node.element_id,
                "end": val.end_node.element_id,
                **dict(val),
            }
        else:
            out[key] = val
    return out


def execute_query(cypher: str, params: dict = None) -> tuple:
    """Returns (json_records, traversed_node_element_ids)."""
    json_records = []
    node_ids = set()

    with _driver.session() as session:
        result = session.run(cypher, params or {})
        for record in result:
            record_dict = {}
            for key, val in record.items():
                if isinstance(val, Node):
                    node_ids.add(val.element_id)
                    record_dict[key] = {
                        "id": val.element_id,
                        "labels": list(val.labels),
                        **dict(val),
                    }
                elif isinstance(val, Relationship):
                    node_ids.add(val.start_node.element_id)
                    node_ids.add(val.end_node.element_id)
                    record_dict[key] = {
                        "id": val.element_id,
                        "type": val.type,
                        "start": val.start_node.element_id,
                        "end": val.end_node.element_id,
                        **dict(val),
                    }
                else:
                    record_dict[key] = val
            json_records.append(record_dict)

    return json_records, list(node_ids)


def get_all_nodes_and_edges() -> dict:
    nodes = []
    edges = []

    with _driver.session() as session:
        result = session.run("MATCH (n) RETURN n")
        for record in result:
            node = record["n"]
            nodes.append(
                {
                    "id": node.element_id,
                    "label": list(node.labels)[0] if node.labels else "Unknown",
                    "properties": dict(node),
                }
            )

        result = session.run("MATCH ()-[r]->() RETURN r")
        for record in result:
            rel = record["r"]
            edges.append(
                {
                    "id": rel.element_id,
                    "source": rel.start_node.element_id,
                    "target": rel.end_node.element_id,
                    "label": rel.type,
                }
            )

    return {"nodes": nodes, "edges": edges}


def create_constraints():
    labels = ["Person", "Skill", "Project", "Client", "Team"]
    with _driver.session() as session:
        for label in labels:
            session.run(
                f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE"
            )

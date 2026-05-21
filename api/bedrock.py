import os
import re
import json
import boto3

BEDROCK_REGION = os.getenv("BEDROCK_REGION", "ap-south-1")
LLM_MODEL_ID = os.getenv(
    "LLM_MODEL_ID", "apac.anthropic.claude-3-7-sonnet-20250219-v1:0"
)
EMBED_MODEL_ID = os.getenv("EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0")

_client = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

SCHEMA_PROMPT = """You are a Cypher query generator for a Neo4j knowledge graph.

Schema:
Nodes:
  Person(id, name, role, seniority, availability, location)
  Skill(id, name, category)
  Project(id, name, status, start_date, end_date, description)
  Client(id, name, industry, size)
  Team(id, name, location, lead)

Relationships:
  (Person)-[:HAS_SKILL {proficiency, years}]->(Skill)
  (Person)-[:WORKED_ON {role, from, to}]->(Project)
  (Person)-[:MEMBER_OF]->(Team)
  (Project)-[:FOR_CLIENT]->(Client)
  (Project)-[:USED_SKILL]->(Skill)
  (Team)-[:DELIVERED]->(Project)

Rules:
- Return ONLY valid Cypher with no explanation, comments, or markdown fences.
- Use MATCH and RETURN; avoid WRITE operations.
- When filtering by availability, use: WHERE p.availability = true
- Skill names are exact (e.g. "AWS", "Kafka", "Python"). Match case-insensitively with toLower().
- ALWAYS RETURN full node/relationship variables (e.g., RETURN p, r, sk).
  NEVER return individual property fields (e.g., NOT p.name, NOT p.role).
  Returning full nodes is required for graph highlighting to work.
- FOLLOW-UP RULE: When the user's question clearly refines or filters a previous result set
  (uses words like "these", "those", "them", "out of", "among them", "from above", "available"
  as a drill-down, etc.), generate a SINGLE Cypher query that combines ALL constraints from
  the prior questions AND the new question. Do NOT start a fresh query — merge the filters."""


def nl_to_cypher(question: str, history: list = None) -> str:
    user_msg = question
    if history:
        ctx = "\n\n".join(
            f"Q: {h.question}\nCypher: {h.cypher}"
            for h in history[-3:]
            if h.cypher
        )
        if ctx:
            user_msg = (
                f"Conversation history (most recent last):\n{ctx}\n\n"
                f"New question: {question}\n\n"
                "If this question drills down or filters the previous results, "
                "write a single Cypher that merges ALL prior constraints with the new one."
            )
    cypher = _invoke_claude(SCHEMA_PROMPT, [{"role": "user", "content": user_msg}])
    return re.sub(r"```(?:cypher)?\n?|```", "", cypher).strip()


def answer_from_results(question: str, results: list, history: list = None) -> str:
    system = (
        "You are a helpful assistant for an engineering talent management system. "
        "Answer the question using only the graph data provided. Be concise and clear. "
        "If the data is empty, say no matching records were found."
    )
    messages = []
    for h in (history or [])[-3:]:
        messages.append({"role": "user", "content": h.question})
        messages.append({"role": "assistant", "content": h.answer})
    messages.append({
        "role": "user",
        "content": f"Question: {question}\n\nGraph results:\n{json.dumps(results, default=str, indent=2)}",
    })
    return _invoke_claude(system, messages)


def _invoke_claude(system: str, messages: list) -> str:
    body = json.dumps(
        {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "temperature": 0,
            "system": system,
            "messages": messages,
        }
    )
    response = _client.invoke_model(modelId=LLM_MODEL_ID, body=body)
    result = json.loads(response["body"].read())
    return result["content"][0]["text"]


def embed_text(text: str) -> list:
    body = json.dumps({"inputText": text})
    response = _client.invoke_model(modelId=EMBED_MODEL_ID, body=body)
    result = json.loads(response["body"].read())
    return result["embedding"]

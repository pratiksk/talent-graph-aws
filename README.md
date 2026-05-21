# Talent Graph — AWS Demo

A knowledge graph for engineering resource management. Ask natural-language questions about engineers, skills, projects, and clients. Traversed nodes light up in the graph after each query.

**Stack:** Neo4j + FastAPI on EC2 · Amazon Bedrock (Claude Sonnet + Titan Embeddings) · React + react-force-graph-2d · S3 + CloudFront · Terraform

---

## Quick start

### Prerequisites
- Terraform ≥ 1.5
- AWS credentials configured with EC2, S3, CloudFront, IAM, and Bedrock permissions
- Bedrock model access enabled in `ap-south-1`:
  - `amazon.titan-embed-text-v2:0`
  - `apac.anthropic.claude-3-7-sonnet-20250219-v1:0` (cross-region inference profile)

### Deploy

```bash
cd terraform

# Create your vars file (gitignored)
cat > terraform.tfvars <<EOF
neo4j_password       = "ChangeMe123!"
frontend_bucket_name = "talent-graph-yourname-2024"
EOF

terraform init
terraform apply
```

Outputs after apply:
- `cloudfront_url` — Frontend URL
- `api_url` — FastAPI base URL (direct)
- `neo4j_browser_url` — Neo4j Browser (accessible from `my_ip` only)

The instance seeds itself automatically — cloud-init installs Neo4j + the API, then loads the demo dataset (~5 min). The graph is ready when `GET /api/health` returns `"neo4j": true`.

### Teardown

```bash
terraform destroy
```

---

## Demo query

> *"Who has Kafka and AWS experience and is available?"*

Returns 6+ engineers with expert-level Kafka + AWS skills who worked on fintech projects. Their nodes glow in the graph.

---

## Architecture

```
Browser → CloudFront → S3 (React SPA)
                 ↓ /api/* proxy
         EC2:8000 (FastAPI)
               ↓          ↓
           Neo4j:7687   Bedrock (Claude + Titan)
```

> **Demo simplification:** FastAPI and Neo4j run on the same EC2 instance to keep the
> Terraform footprint minimal. In production you would run Neo4j on a dedicated instance
> or use [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/), put the
> API on ECS or a separate EC2 behind an ALB, and have them communicate over a private
> subnet. The ALB would also provide proper HTTPS termination (ACM certificate) instead
> of the CloudFront-proxy approach used here.

Query flow (`POST /query`):
1. Claude converts natural-language → Cypher
2. Cypher runs against Neo4j
3. Claude generates a human answer from the results
4. Response includes `traversed_node_ids` → frontend highlights those nodes

---

## Local development

```bash
# Start Neo4j locally (Docker)
docker run -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/localpassword \
  neo4j:5-community

# Install deps
cd api && pip install -r requirements.txt

# Run API
NEO4J_URI=bolt://localhost:7687 \
NEO4J_PASSWORD=localpassword \
BEDROCK_REGION=ap-south-1 \
LLM_MODEL_ID=apac.anthropic.claude-3-7-sonnet-20250219-v1:0 \
EMBED_MODEL_ID=amazon.titan-embed-text-v2:0 \
uvicorn main:app --reload

# Seed
curl -X POST http://localhost:8000/api/ingest
```

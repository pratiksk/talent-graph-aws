import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import graph
import bedrock
import ingest

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j")


@asynccontextmanager
async def lifespan(app: FastAPI):
    graph.init_driver(NEO4J_URI, NEO4J_PASSWORD)
    yield
    if graph._driver:
        graph._driver.close()


app = FastAPI(title="Talent Graph API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api")


class HistoryItem(BaseModel):
    question: str
    answer: str
    cypher: str


class QueryRequest(BaseModel):
    question: str
    history: list[HistoryItem] = []


class QueryResponse(BaseModel):
    answer: str
    cypher: str
    traversed_node_ids: list[str]


@router.get("/health")
def health():
    return {"status": "ok", "neo4j": graph.ping()}


@router.post("/ingest")
def ingest_data():
    return ingest.run_ingest()


@router.get("/graph")
def get_graph():
    return graph.get_all_nodes_and_edges()


@router.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    try:
        cypher = bedrock.nl_to_cypher(req.question, req.history)
        records, traversed_ids = graph.execute_query(cypher)
        answer = bedrock.answer_from_results(req.question, records, req.history)
        return QueryResponse(
            answer=answer,
            cypher=cypher,
            traversed_node_ids=traversed_ids,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


app.include_router(router)

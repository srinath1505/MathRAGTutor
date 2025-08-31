# backend/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import RAGSystem
import logging
import traceback
from config import API_HOST, API_PORT

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Conversational AI Tutor",
    description="An AI tutor with RAG capabilities for educational content",
    version="1.0.0"
)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG system instance
rag_system = None

@app.on_event("startup")
async def startup_event():
    """Initialize RAG system when the application starts"""
    global rag_system
    try:
        logger.info("Initializing RAG system...")
        rag_system = RAGSystem()
        logger.info("RAG system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {str(e)}")
        logger.error(traceback.format_exc())
        raise

# Request models
class QueryRequest(BaseModel):
    query: str

class ChatRequest(BaseModel):
    query: str
    history: list = []

@app.get("/")
async def root():
    return {
        "message": "Conversational AI Tutor API",
        "endpoints": {
            "query": "POST /query - Single query endpoint",
            "chat": "POST /chat - Multi-turn conversation endpoint"
        },
        "status": "running",
        "info": "Send a POST request with a 'query' field to get started"
    }

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    """Endpoint for single query without conversation history"""
    if rag_system is None:
        logger.error("RAG system not initialized")
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        response = rag_system.get_response(request.query)
        return {
            "text": response["text"],
            "emotion": response["emotion"]
        }
    except Exception as e:
        logger.error(f"Error in /query endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Endpoint for multi-turn conversation with history"""
    if rag_system is None:
        logger.error("RAG system not initialized")
        raise HTTPException(status_code=500, detail="RAG system not initialized")
    
    try:
        response = rag_system.get_response(request.query, request.history)
        return {
            "text": response["text"],
            "emotion": response["emotion"]
        }
    except Exception as e:
        logger.error(f"Error in /chat endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info(f"Starting server at {API_HOST}:{API_PORT}")
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
# backend/rag.py
import os
import logging
from pathlib import Path
import google.generativeai as genai
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.chains import ConversationalRetrievalChain
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Get the directory of this file (backend directory)
BASE_DIR = Path(__file__).parent

class RAGSystem:
    def __init__(self):
        self.embedding_model = None
        self.vector_db = None
        self.qa_chain = None
        self.chat_history = []
        
        # Initialize the system
        self._initialize()
    
    def _initialize(self):
        """Initialize the RAG system by loading documents and creating vector store"""
        try:
            # Initialize embeddings first
            logger.info(f"Loading embedding model: all-MiniLM-L6-v2")
            self.embedding_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            
            # Load documents
            data_dir = BASE_DIR / "data"
            data_dir.mkdir(exist_ok=True)
            
            documents = []
            for file_path in data_dir.glob("*.txt"):
                try:
                    loader = TextLoader(str(file_path), encoding='utf-8')
                    documents.extend(loader.load())
                except Exception as e:
                    logger.warning(f"Could not load {file_path}: {str(e)}")
            
            # If no documents found, create a sample
            if not documents:
                logger.warning("No documents found in data directory. Creating sample document.")
                sample_content = """Basic Math Concepts

Addition is the process of combining two or more numbers. The symbol for addition is +.
Example: 2 + 3 = 5
When adding, the order of numbers doesn't matter (commutative property): 2 + 3 = 3 + 2

Subtraction is the process of taking one number away from another. The symbol for subtraction is -.
Example: 5 - 2 = 3
Unlike addition, subtraction is not commutative: 5 - 2 ≠ 2 - 5

Multiplication is repeated addition. The symbol for multiplication is × or *.
Example: 3 × 4 = 12 (which is the same as 4 + 4 + 4)
Multiplication is commutative: 3 × 4 = 4 × 3

Division is the process of sharing or grouping equally. The symbol for division is ÷ or /.
Example: 12 ÷ 3 = 4
Division is not commutative: 12 ÷ 3 ≠ 3 ÷ 12

Fractions:
A fraction represents a part of a whole. It has two parts:
- Numerator (top number): how many parts we have
- Denominator (bottom number): how many equal parts the whole is divided into
Example: 3/4 means 3 parts out of 4 equal parts
Fractions can be proper (numerator < denominator), improper (numerator > denominator), or mixed numbers.
To add fractions with the same denominator, add the numerators and keep the denominator the same.
To add fractions with different denominators, find a common denominator first.

Decimals:
Decimals are another way to represent fractions. The decimal point separates the whole number part from the fractional part.
Example: 0.5 is the same as 1/2
Decimals can be converted to fractions by placing the decimal number over its place value (e.g., 0.25 = 25/100 = 1/4).

Percentages:
A percentage is a fraction with 100 as the denominator. The symbol for percentage is %.
Example: 50% = 50/100 = 0.5 = 1/2
To convert a percentage to a decimal, divide by 100 (e.g., 75% = 0.75).
To convert a decimal to a percentage, multiply by 100 (e.g., 0.6 = 60%).
"""
                
                sample_path = data_dir / "sample_math.txt"
                with open(sample_path, "w", encoding='utf-8') as f:
                    f.write(sample_content)
                
                loader = TextLoader(str(sample_path), encoding='utf-8')
                documents = loader.load()
            
            # Split documents with better parameters for educational content
            logger.info("Splitting documents with improved parameters...")
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,
                chunk_overlap=100,
                separators=["\n\n", "\n", " ", ""]
            )
            texts = text_splitter.split_documents(documents)
            
            # Create vector store
            vector_db_dir = BASE_DIR.parent / "vector_db"
            vector_db_dir.mkdir(exist_ok=True)
            
            logger.info("Creating vector database...")
            self.vector_db = Chroma.from_documents(
                texts, 
                self.embedding_model,
                persist_directory=str(vector_db_dir)
            )
            logger.info(f"Vector database created with {len(texts)} chunks")
            
            # Set up LLM - Use Google Gemini API
            try:
                logger.info("Configuring Google Gemini API...")
                api_key = os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise ValueError("GOOGLE_API_KEY not found in environment variables")
                
                # Use official LangChain Google Generative AI integration
                llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    temperature=0.3,
                    max_output_tokens=512,
                    google_api_key=api_key
                )
                logger.info("Successfully configured Google Gemini API")
                
            except Exception as e:
                logger.error(f"Could not configure Google Gemini API: {str(e)}")
                logger.info("Falling back to local model")
                
                # Fallback to local model if Gemini fails
                from langchain_community.llms import HuggingFacePipeline
                from transformers import pipeline
                import torch
                
                pipe = pipeline(
                    "text2text-generation",
                    model="google/flan-t5-small",
                    device=0 if torch.cuda.is_available() else -1,
                    model_kwargs={"temperature": 0.3, "max_length": 512}
                )
                llm = HuggingFacePipeline(pipeline=pipe)
            
            # STRICT RAG PROMPT TEMPLATE - ONLY ANSWERS MATH CONCEPTS FROM KNOWLEDGE BASE
            template = """You are a math tutor who ONLY explains the basic math concepts provided in the context below. 
DO NOT discuss ANY topics outside of: addition, subtraction, multiplication, division, fractions, decimals, or percentages.

If the question asks for an explanation of one of these concepts, provide a clear explanation with examples.
If the question is a simple fact request about these concepts, respond in 1-2 sentences.
If the question is about ANY OTHER TOPIC, respond with: "I can only explain basic math concepts from our curriculum."

Context:
{context}

Question: {question}

Response:"""

            PROMPT = PromptTemplate(template=template, input_variables=["context", "question"])
            
            # Create QA chain with better parameters
            self.qa_chain = ConversationalRetrievalChain.from_llm(
                llm,
                self.vector_db.as_retriever(search_kwargs={"k": 4}),
                combine_docs_chain_kwargs={"prompt": PROMPT},
                return_source_documents=True,
                verbose=True
            )
            
            logger.info("RAG system initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing RAG system: {str(e)}")
            logger.error(traceback.format_exc())
            raise
    
    def get_response(self, query, chat_history=None):
        """
        Get response for a single query
        
        Args:
            query (str): User query
            chat_history (list, optional): Previous conversation history
            
        Returns:
            dict: Response with text and emotion
        """
        try:
            # Prepare chat history for the chain
            formatted_history = []
            if chat_history:
                for exchange in chat_history:
                    formatted_history.append((exchange["question"], exchange["answer"]))
            
            # Get response from QA chain
            logger.info(f"Processing query: {query}")
            result = self.qa_chain.invoke({
                "question": query,
                "chat_history": formatted_history
            })
            
            # Extract answer
            answer = result["answer"]
            logger.info(f"Generated answer: {answer}")
            
            # Strict RAG policy enforcement - if answer indicates no information, use short response
            if "I can only explain basic math concepts from our curriculum" in answer:
                return {
                    "text": "I can only explain basic math concepts from our curriculum. Please ask about addition, subtraction, fractions, or other topics in our materials.",
                    "emotion": "thinking"
                }
            
            # Check if this is an explanation request
            explanation_keywords = ["explain", "describe", "tell me about", "what is", "how does", "define", "describe"]
            is_explanation_request = any(keyword in query.lower() for keyword in explanation_keywords)
            
            # For EXPLANATION requests: provide full explanation (already done by prompt)
            if is_explanation_request:
                emotion = self._detect_emotion(answer)
                return {
                    "text": answer,
                    "emotion": emotion
                }
            # For SIMPLE FACT requests: provide 1-2 line answer
            else:
                # Extract just the core answer (first 1-2 sentences)
                short_answer = ". ".join(answer.split(". ")[:2]) + "."
                emotion = self._detect_emotion(short_answer)
                return {
                    "text": short_answer,
                    "emotion": emotion
                }
            
        except Exception as e:
            logger.error(f"Error getting response: {str(e)}")
            logger.error(traceback.format_exc())
            return {
                "text": "I can only explain basic math concepts from our curriculum.",
                "emotion": "thinking"
            }
    
    def _detect_emotion(self, text):
        """
        Enhanced rule-based emotion detection
        
        Args:
            text (str): Response text
            
        Returns:
            str: Detected emotion
        """
        text = text.lower()
        
        # Check for positive/excited language
        if any(word in text for word in ["great", "excellent", "wonderful", "awesome", "good", "yes", "correct", "right", "exactly", "perfect"]):
            return "happy"
        
        # Check for explanatory language with examples
        if any(word in text for word in ["because", "since", "therefore", "so", "thus", "explanation", "reason", "let me explain", "the reason is", "for example", "example", "illustrate", "demonstrate", "show"]):
            return "explaining"
        
        # Check for uncertainty or thinking
        if any(word in text for word in ["not sure", "maybe", "perhaps", "could be", "i think", "might be", "possibly", "it depends", "depends on", "thinking", "considering"]):
            return "thinking"
        
        # Check for questions
        if "?" in text or "question" in text:
            return "thinking"
        
        # Check for detailed mathematical content
        if len(text) > 200 and ("=" in text or "+" in text or "-" in text or "×" in text or "÷" in text):
            return "explaining"
        
        # Default emotion
        return "neutral"
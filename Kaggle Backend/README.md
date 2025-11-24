# LocalForge AI - Privacy-First AI Coding Assistant

A privacy-first, local AI coding assistant built with DeepSeek Coder 1.3B model, featuring RAG capabilities, multi-format document processing, and WebSocket API.

[![GPU Optimized](https://img.shields.io/badge/GPU-T4%20Optimized-blue.svg)](https://kaggle.com)
[![Model](https://img.shields.io/badge/Model-DeepSeek--Coder--1.3B-green.svg)](https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct)
[![Framework](https://img.shields.io/badge/Framework-FastAPI-red.svg)](https://fastapi.tiangolo.com/)
[![RAG](https://img.shields.io/badge/RAG-Enabled-orange.svg)](#features)

## Quick Start

### Prerequisites
1. **Kaggle Account** with GPU access
2. **Ngrok Account** with access token

##  Use Cases

### Development Workflow
- **Code Review**: Analyze code with RAG context
- **Documentation**: Generate documentation from existing files
- **Debugging**: Debug with project context
- **Learning**: Explain code with project examples

### Document Analysis
- **PDF Processing**: Extract and analyze document content
- **Code Documentation**: Generate docs from code files
- **Research**: Contextual Q&A over document collections
- **Content Generation**: Create content with document references

### Setup Process

#### Step 1: Configure Kaggle Environment
```bash
# In Kaggle Notebook Settings:
# Enable GPU: Accelerator → GPU T4
# Enable Internet: Internet → On
```

#### Step 2: Run Setup Cells (A → B → C)
1. **Cell A**: Install Dependencies
2. **Cell B**: Configure Backend & Write Code  
3. **Cell C**: Start Server with Tunnel

#### Step 3: Get Access Credentials
After running Cell C, copy:
- **Public URL** (ngrok tunnel)
- **API Key** (default: `key123`)

## Configuration

### Environment Variables
```python
# Cell B - Backend Configuration
os.environ["BACKEND_API_KEY"] = "key123" # ⚠️ SECURITY: Change this API key to your own secure key!
os.environ["HF_MODEL"] = "deepseek-ai/deepseek-coder-1.3b-instruct"  # ⚠️ Configuration: Change this model name according to your needs!
```

### Model Parameters
```python
# Cell B - Backend Configuration
# Adjust in backend_code
API_KEY = os.environ.get("BACKEND_API_KEY", "test123") # ⚠️ SECURITY: Change this API key to match your own secure key!
MODEL_NAME = "deepseek-ai/deepseek-coder-1.3b-instruct" # ⚠️ Configuration: Change this model name according to your needs!
```

### ngrok Configuration
```python
# Cell C - Tunnel Configuration  
NGROK_TOKEN = "PlaceHolder"   # ⚠️ Configuration: Change this token to your own NGROK Token!
```

---

## **Core Features**

### **Model & Performance**
- DeepSeek Coder **1.3B** (~3GB), optimized for T4 GPU
- **8-bit quantization** for memory efficiency (~50% VRAM reduction)
- **Fast generation** (2–3× faster than 7B models)
- **Smart context management** (2048 tokens)
- **Asynchronous pipeline loading** for quick startup

### **Retrieval-Augmented Generation (RAG)**
- Sentence Transformer embeddings (**all-MiniLM-L6-v2**)
- **Smart chunking** (1300 chars + overlap) with deduplication
- **Cosine similarity** + configurable **Top-K retrieval**
- **Background embedding generation** for non-blocking processing

### **Document & File Handling**
- Multi-format support: **PDF, DOCX, TXT, MD, CSV, XLSX, code files**
- Unified text extraction with artifact cleanup
- **Upload API**, timestamped storage, batch processing
- **Content filtering** for binary/text detection

### **Thread & Session Management**
- Persistent conversation history with **SQLite**
- Session recovery and message tracking

### **API & Backend**
- **FastAPI** with async endpoints
- **CORS** support, API key authentication
- Robust error handling and file validation

## **Advanced Optimizations**
- **Async processing** for embeddings, file handling, and model loading
- **Context compression** for efficient prompt construction
- **Similarity threshold tuning** for precise retrieval
- Automatic **GPU memory management** and garbage collection


## **Security**
-  API key authentication & controlled CORS
-  Input sanitization and file validation
-  Privacy-first local inference (no external data sharing)


## **Technical Specs**
- **Model size**: ~3GB (DeepSeek Coder 1.3B)
- **Startup**: 3× faster with async pipeline loading
- **Response**: Optimized for T4 GPU (256–512 token generation)
- **Supported formats**: PDF, DOCX, TXT, MD, PY, JS, JSON, HTML, XML, CSV, XLSX
- **Encoding**: UTF-8 with fallback handling

---

## Architecture Logic

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Client (VS Code/Web)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LocalForge AI Core                     │    │
│  │                                                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │   RAG API   │  │ File Upload │  │ Chat API    │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              DeepSeek Coder 1.3B Model                      │
│  • GPU T4 Optimized                                  •      │
│  • 8-bit Quantization                                •      │
│  • Pipeline Loading                                  •      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                Data Layer                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   SQLite    │  │  File Store │  │ Embeddings  │          │
│  │  (Threads)  │  │   (Uploads) │  │   (Vectors) │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

#### 1. Chat Request Flow
```
User Input → RAG Retrieval → Context Building → Prompt Engineering → Model Generation → Response
     ↓            ↓              ↓               ↓                    ↓            ↓
  Thread ID   Document     Conversation     System Prompt        DeepSeek     Message
  Creation    Similarity    History         + Context          Generation    Storage
```

#### 2. File Processing Pipeline
```
File Upload → Content Extraction → Text Chunking → Embedding Generation → Vector Storage
     ↓              ↓                  ↓                ↓                  ↓
  Storage      Multi-format       Smart Chunking   Background         SQLite
  Metadata     Text Parsing       + Cleanup        Processing         Database
```

#### 3. RAG Retrieval Logic
```
Query Embedding → Vector Search → Cosine Similarity → Top-K Selection → Context Building
       ↓               ↓              ↓               ↓                  ↓
  Sentence        Vector DB     Similarity      Chunk Ranking      Prompt Context
  Transformer     Retrieval     Computation     + Filtering        Integration
```

##  API Endpoints

### Core Endpoints

| Method | Endpoint | Description | Headers | Request Body | Response |
|--------|----------|-------------|---------|--------------|----------|
| **GET** | `/` | System information and status | None | None | System status, model info, features |
| **GET** | `/api/health` | Health check and system status | `x-api-key: <key>` | None | Health status, model loaded, chunk count |

### Thread Management

| Method | Endpoint | Description | Headers | Request Body | Response |
|--------|----------|-------------|---------|--------------|----------|
| **POST** | `/api/threads` | Create new conversation thread | `x-api-key: <key>` | Form: `title` | Thread ID, title, timestamp |
| **GET** | `/api/threads` | List all conversation threads | `x-api-key: <key>` | None | Array of threads with metadata |
| **GET** | `/api/threads/{thread_id}` | Get specific thread with messages | `x-api-key: <key>` | None | Thread details and message history |

### File Management

| Method | Endpoint | Description | Headers | Request Body | Response |
|--------|----------|-------------|---------|--------------|----------|
| **POST** | `/api/upload` | Upload and process file | `x-api-key: <key>` | Multipart form with file | File ID, extraction status |
| **GET** | `/api/files` | List all uploaded files | `x-api-key: <key>` | None | Array of files with metadata |
| **GET** | `/api/files/{file_id}/content` | Get file content | `x-api-key: <key>` | None | File content or binary data |
| **POST** | `/api/files/{file_id}/delete` | Delete file and chunks | `x-api-key: <key>` | None | Deletion confirmation |

### Chat Endpoints

| Method | Endpoint | Description | Headers | Request Body | Response |
|--------|----------|-------------|---------|--------------|----------|
| **POST** | `/api/chat` | Standard chat with RAG context | `x-api-key: <key>`<br>`Content-Type: application/json` | See request schema below | AI response with RAG details |
| **POST** | `/api/filechat` | File-specific chat without RAG | `x-api-key: <key>`<br>`Content-Type: application/json` | See request schema below | AI response with file context |

#### Request Schemas

**Chat Request Schema (`/api/chat`)**
```json
{
  "thread_id": null,           // Optional: existing thread ID
  "prompt": "Explain this code", // Required: user message
  "max_tokens": 512,           // Optional: max response length
  "temperature": 0.7,          // Optional: creativity level (0.0-1.0)
  "use_rag": true,             // Optional: enable RAG retrieval
  "file_ids": [1, 2, 3]        // Optional: specific file IDs to search
}
```

**File Chat Request Schema (`/api/filechat`)**
```json
{
  "thread_id": null,           // Optional: existing thread ID
  "prompt": "Summarize document", // Required: user message
  "file_ids": [1, 2],          // Optional: file references
  "max_tokens": 512,           // Optional: max response length
  "temperature": 0.0,          // Optional: creativity level
  "use_rag": true,             // Optional: enable RAG retrieval
  "attached_files": [          // Optional: base64 encoded files
    {
      "name": "document.pdf",
      "content": "base64_encoded_content"
    }
  ]
}
```

#### Response Examples

**Health Check Response**
```json
{
  "status": "ok",
  "timestamp": 1699000000.123,
  "hf_model_loaded": true,
  "embeddings": true,
  "chunk_count": 45
}
```

**Chat Response**
```json
{
  "thread_id": 123,
  "answer": "Here is the code explanation...",
  "rag_used": true,
  "files_processed": 2,
  "files_attached": 0,
  "rag_details": "Retrieved 3 clean chunks"
}
```

### Database Schema
```sql
-- Core tables
CREATE TABLE threads (id, title, created_at);
CREATE TABLE messages (id, thread_id, role, content, created_at);
CREATE TABLE files (id, filename, filepath, created_at);
CREATE TABLE chunks (id, file_id, thread_id, doc_name, chunk_index, text, vector, created_at);
CREATE TABLE embeddings (id, doc_name, content, vector, created_at);
```

---

## Support

### Health Check
```bash
curl -H "x-api-key: your_key" http://your_ngrok_url/api/health
```

### Logs
Check Kaggle notebook output for:
- Model loading status
- API request logs
- Error messages
- Performance metrics

## License
This project is part of LocalForge AI suite.

---


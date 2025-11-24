# LocalForge AI

**Privacy-First AI Coding Assistant** - A comprehensive AI-powered development tool with advanced RAG capabilities and document processing, built for enhanced productivity and learning.

[![DeepSeek Coder](https://img.shields.io/badge/Model-DeepSeek%20Coder%201.3B-blue.svg)](https://huggingface.co/deepseek-ai/deepseek-coder-1.3b-instruct-v1.5)
[![RAG Enabled](https://img.shields.io/badge/RAG-Retrieval%20Augmented-orange.svg)](#features)
[![React Frontend](https://img.shields.io/badge/Frontend-React%2018-green.svg)](https://reactjs.org/)
[![FastAPI Backend](https://img.shields.io/badge/Backend-FastAPI-red.svg)](https://fastapi.tiangolo.com/)

##  Project Overview

LocalForge AI is a full-stack AI coding assistant that combines the power of DeepSeek Coder 1.3B with advanced document understanding and retrieval capabilities. The system provides both direct code assistance and contextual learning through uploaded documents, making it an invaluable tool for developers, researchers, and students.

<figure>
  <img width="1920" height="960" alt="Screenshot (186)" src="https://github.com/user-attachments/assets/84a000dc-6ea5-40e8-8df4-1413ae51fd20" /><br>
  <img width="1914" height="957" alt="Screenshot (185)" src="https://github.com/user-attachments/assets/93775473-99f0-4d19-bddd-bb8fd7813a3c" /><br>
</figure>

---

### Core Features

#### **AI-Powered Code Assistance**
- **Advanced Code Generation**: Powered by DeepSeek Coder 1.3B model optimized for development tasks
- **Multi-language Support**: JavaScript, Python, TypeScript, HTML, CSS, and more
- **Intelligent Context Understanding**: Leverages conversation history and uploaded documents
- **Real-time Code Analysis**: Instant code review, debugging, and optimization suggestions

#### **Retrieval-Augmented Generation (RAG)**
- **Smart Document Processing**: Supports PDF, DOCX, TXT, MD, CSV, XLSX, and code files
- **Intelligent Chunking**: Advanced text segmentation with overlap for optimal context retrieval
- **Semantic Search**: Vector-based similarity search using sentence transformers
- **Context-Aware Responses**: AI responses enhanced with relevant document references

#### **Interactive Frontend**
- **Modern Chat Interface**: Sleek dark theme optimized for extended use
- **Thread Management**: Organize conversations into distinct topics
- **File Upload System**: Drag-and-drop file uploads with instant processing
- **Rich Content Rendering**: Markdown support, code syntax highlighting, Mermaid diagrams, and LaTeX math
- **Real-time Status**: Live connection monitoring and model loading indicators

#### **Robust Backend Architecture**
- **High-Performance API**: FastAPI with asynchronous processing
- **Privacy-First Design**: Local inference with no external data sharing
- **Scalable Storage**: SQLite database with persistent conversation and file management
- **GPU Optimization**: 8-bit quantization for efficient memory usage on T4 GPUs

---

## Quick Start

For detailed setup instructions, please visit the respective folders:

### **Backend Setup**  `Kaggle Backend/`
- Complete backend configuration and deployment guide
- Kaggle environment setup with GPU access
- ngrok tunnel configuration for API access
- Environment variables and security configuration
- Model parameters and performance optimization

### **Frontend Setup**  `React Frontend/`
- React application installation and configuration
- Development server setup
- API endpoint configuration
- Feature walkthrough and usage instructions
- Demo mode for testing without backend

---

##  License
This project is designed for educational and research purposes. Ensure compliance with DeepSeek AI model licensing terms and relevant component licenses.

---

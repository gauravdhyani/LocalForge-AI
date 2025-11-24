# LocalForge AI Frontend

A modern, responsive React application for LocalForge AI with a dark theme interface. This frontend provides a comprehensive chat interface for AI interactions with advanced file upload capabilities, markdown rendering, and real-time messaging.

## Features

- **Dark Theme UI**: Modern, sleek dark interface optimized for long usage
- **Chat Interface**: Real-time messaging with AI assistant
- **Thread Management**: Organize conversations into threads
- **File Upload & Management**: Upload, preview, and manage files with drag-and-drop support
- **File Context**: Upload and chat with document content using RAG
- **Settings Panel**: Configure API endpoints, model parameters, and RAG settings
- **Demo Mode**: Mock backend for testing without a real API
- **Real-time Status**: Live connection status and model loading indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Markdown Rendering**: Full markdown support with code blocks, formatting, and syntax highlighting
- **Mermaid Diagrams**: Render Mermaid diagrams directly in chat messages
- **Math Support**: LaTeX math rendering with KaTeX
- **Syntax Highlighting**: Shiki-powered code highlighting with dark theme

## Configuration

### Settings Configuration

```tsx
// Adjust in App.tsx
// ---------- App ----------
const App: React.FC = () => {
  // Config
  const [config, setConfig] = useState<AppConfig>({
    apiUrl: 'http://localhost:8000', // Replace with you ngrok LocalForge API endpoint (default: `http://localhost:8000`)
    apiKey: 'key123', // Replace with your authentication key (default: `test123`)
    temperature: 0.1, // Adjust AI creativity (0.0 - 1.0)
    maxTokens: 2048, // Control response length (64 - 2048)
    useRag: false, // Enable/disable retrieval-augmented generation
  });
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Step 1: Install Dependencies
```bash
cd localforge-frontend
npm install
```
### Step 2: Run the Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### Chat Features
- Create new threads for different conversations
- Upload files to ask questions about document content
- Toggle RAG mode for enhanced responses
- Use Shift+Enter for new lines, Enter to send messages

### File Management
1. Click "Files" tab in sidebar
2. Use "Click to Upload" to add files
3. Select files to include them in chat context
4. Preview file contents or delete files as needed

### Demo Mode
- The app can run in "Demo Mode" which provides mock responses
- You can interact with the UI and see how it works without a backend
- Toggle Demo Mode in Settings to connect to a real backend

---

## Project Structure

```
localforge-frontend/
├── assets/                 # Static files
│   └── logo.png       # Application logo
├── src/
│   ├── App.tsx            # Main application component with full UI
│   ├── main.tsx           # React entry point
│   └── index.css          # Tailwind styles + custom scrollbar
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── tsconfig.json          # TypeScript configuration
├── tsconfig.node.json     # Node.js TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Technologies Used

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Markdown** for markdown rendering
- **KaTeX** for math equation rendering
- **Mermaid** for diagram rendering
- **Shiki** for syntax highlighting
- **Remark & Rehype** plugins for markdown processing
- **PostCSS & Autoprefixer** for CSS processing

## Backend API Requirements
The frontend expects these API endpoints:

### Health Check
- `GET /api/health` - Returns `{ status: 'ok', hf_model_loaded: boolean }`

### Thread Management
- `GET /api/threads` - Returns list of threads
- `POST /api/threads` - Creates new thread (with FormData containing 'title')

### Thread Messages
- `GET /api/threads/{id}` - Returns `{ messages: [...] }`

### File Management
- `GET /api/files` - Returns list of uploaded files
- `POST /api/upload` - Upload file (accepts FormData)
- `GET /api/files/{id}/content` - Get file content
- `POST /api/files/{id}/delete` - Delete file

### Chat Endpoints
- `POST /api/chat` - Regular chat (no file context)
- `POST /api/filechat` - File-based chat (with file_ids)

All requests require `X-API-Key` header for authentication.

---

## License
This project is part of LocalForge AI suite.

---
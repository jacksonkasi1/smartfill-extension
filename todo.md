# SmartFill Development Todo List

## Stage 1: Core RAG Knowledge Management & Basic Extension Integration

### 1.1 Website Dashboard - All-in-One Knowledge Management

#### Dashboard Page Enhancement (`/dashboard/page.tsx`)
- [ ] Add knowledge stats card to existing dashboard grid
- [ ] Add "Upload Knowledge" button that opens modal
- [ ] Create knowledge tab/section in dashboard layout
- [ ] Setup TanStack Query for knowledge data fetching
- [ ] Build `KnowledgeUploadModal` component (popup with text input + .txt file upload)
- [ ] Add file upload validation (only .txt files supported)
- [ ] Add simple form validation using Zod
- [ ] Use existing data-table from `apps/website/src/components/data-table`
- [ ] Learn data-table usage from `apps/website/tnks-data-table-main/README.md`
- [ ] Follow examples in `apps/website/tnks-data-table-main/src/app/(home)/data-table`
- [ ] Create KnowledgeTable with columns: Title, Tags, Updated, Actions
- [ ] Add inline edit functionality within table rows
- [ ] Implement delete confirmation dialog
- [ ] Add search functionality with real-time filtering
- [ ] Create bulk delete with checkbox selection
- [ ] Setup TanStack Query mutations for CRUD operations
- [ ] Add optimistic updates for better UX
- [ ] Add loading states and error handling
- [ ] Style everything with shadcn/ui components (minimalist design)

### 1.2 RAG Service Backend Enhancements

#### File Upload Support
- [ ] Add file upload endpoint `/knowledge/upload` with multipart/form-data
- [ ] Implement text extraction from .txt files (simple file reading)
- [ ] Add file type validation (.txt only) and size limits
- [ ] Update knowledge creation to handle file vs text type

#### Enhanced CRUD Endpoints
- [ ] Update existing knowledge endpoints for better error handling
- [ ] Add batch delete endpoint for bulk operations
- [ ] Improve search/filtering in list endpoint with query params
- [ ] Add knowledge statistics endpoint for dashboard stats card
- [ ] Add real-time data validation for TanStack Query integration

### 1.3 Browser Extension RAG Integration (Plasmo Framework)

#### RAG Settings Panel
- [ ] Research Plasmo popup/options patterns using Context7 MCP if needed
- [ ] Add new "RAG Settings" page in extension popup (React TSX)
- [ ] Create toggle for enabling/disabling RAG
- [ ] Add tag selection UI (checkbox list of user's tags)
- [ ] Add "Auto RAG" setting (AI decides when to use RAG)
- [ ] Style settings page with consistent extension UI (Plasmo CSS)

#### Form Analysis & RAG Query
- [ ] Create form context analyzer in content script (Plasmo content script)
- [ ] Build RAG query generator based on form fields
- [ ] Add API client for RAG service communication
- [ ] Implement form-specific RAG retrieval
- [ ] Handle authentication with Clerk tokens in Plasmo

#### Enhanced Form Filling Logic
- [ ] Modify existing form fill function to check RAG settings (update popup.tsx)
- [ ] Integrate RAG results with custom instructions
- [ ] Add AI-powered form type detection
- [ ] Combine RAG data with form context for better prompts
- [ ] Update form filling status messages
- [ ] Research any Plasmo-specific patterns using Context7 MCP if needed

### 1.4 Testing & Quality Assurance
- [ ] Run `npm run lint` and fix all linting issues
- [ ] Run `npm run typecheck` and resolve TypeScript errors  
- [ ] Run `npm run build` and ensure all apps build successfully
- [ ] Test .txt file upload functionality end-to-end
- [ ] Test knowledge CRUD operations
- [ ] Test extension RAG integration with real forms
- [ ] Test authentication flow between extension and website

---

## Stage 2: User-Created Personas & Advanced Form Filling

### 2.1 Website - Persona Management Integration

#### Dashboard Persona Section (same `/dashboard/page.tsx`)
- [ ] Add personas count card to existing dashboard grid
- [ ] Build `PersonaCreateForm` component below knowledge section
- [ ] Add persona listing with inline edit/delete actions
- [ ] Create expandable persona cards with system prompt textarea
- [ ] Add default values form (name, email, phone, company, job title)
- [ ] Implement tag preference selection for personas
- [ ] Show persona usage statistics in stats card
- [ ] Style with shadcn/ui (keep minimalist)

### 2.2 RAG Service - Persona Support

#### Persona Database Schema
- [ ] Add personas table to database schema
- [ ] Create persona service class with CRUD operations
- [ ] Add persona endpoints (`/personas` - GET, POST, PUT, DELETE)
- [ ] Add persona validation schemas
- [ ] Update knowledge query to consider persona tag preferences

#### Enhanced RAG Processing
- [ ] Modify form-fill endpoint to accept persona ID
- [ ] Integrate persona system prompt with RAG results
- [ ] Add persona-specific knowledge filtering
- [ ] Improve prompt engineering for persona-based filling

### 2.3 Browser Extension - Persona Selection

#### Persona UI Integration
- [ ] Add persona dropdown to main form filling interface
- [ ] Load user's personas from API
- [ ] Update form filling logic to use selected persona
- [ ] Add persona preview/description display
- [ ] Handle cases when no personas exist

#### Advanced Form Processing
- [ ] Implement persona + RAG + custom instructions combination
- [ ] Add form success tracking for learning
- [ ] Improve error handling and user feedback
- [ ] Add form filling analytics

### 2.4 Testing & Quality Assurance Stage 2
- [ ] Run full lint/typecheck/build cycle
- [ ] Test persona creation and management flow
- [ ] Test persona selection in extension
- [ ] Test combined persona + RAG form filling
- [ ] Performance testing with large knowledge bases
- [ ] Cross-browser testing (Chrome, Edge, Firefox)

---

## Stage 3: Agentic Website Access & Side Panel Chat

### 3.1 Browser Extension - Agentic Mode (Plasmo Framework)

#### Side Panel Implementation
- [ ] Research Plasmo side panel implementation using Context7 MCP
- [ ] Create side panel component using Plasmo framework
- [ ] Build chat interface UI in side panel (Plasmo + React)
- [ ] Implement screen capture functionality (Plasmo APIs)
- [ ] Add real-time DOM analysis capabilities

#### AI Agent Core
- [ ] Build website action analyzer (forms, buttons, links detection)
- [ ] Create action executor (click, type, navigate)
- [ ] Implement AI decision engine for next actions
- [ ] Add screenshot-to-text analysis with vision models
- [ ] Build conversation history management

#### Chat Interface (Plasmo + React)
- [ ] Research Plasmo UI patterns using Context7 MCP
- [ ] Create chat message components (React TSX)
- [ ] Add AI response streaming
- [ ] Implement action confirmation prompts
- [ ] Add manual override controls
- [ ] Build progress tracking for multi-step tasks

### 3.2 RAG Service - Agentic Endpoints

#### Vision & Analysis APIs
- [ ] Add screenshot analysis endpoint
- [ ] Create webpage content extraction API
- [ ] Build form detection and analysis service
- [ ] Add action recommendation engine
- [ ] Implement task planning capabilities

#### Enhanced AI Integration
- [ ] Integrate vision-capable AI models
- [ ] Add multi-step task orchestration
- [ ] Build safety checks for destructive actions
- [ ] Add user confirmation workflows

### 3.3 Advanced Features

#### Safety & Control
- [ ] Add action allowlist/blocklist
- [ ] Implement user confirmation for sensitive actions
- [ ] Add rollback capabilities for reversible actions
- [ ] Build action logging and audit trail

#### Performance & UX
- [ ] Optimize side panel loading time
- [ ] Add keyboard shortcuts for quick access
- [ ] Implement action caching and prediction
- [ ] Add customizable AI behavior settings

### 3.4 Final Testing & Polish

#### Comprehensive Testing
- [ ] End-to-end testing of agentic workflows
- [ ] Security testing for injection vulnerabilities  
- [ ] Performance testing under load
- [ ] User acceptance testing with real scenarios

#### Documentation & Deployment
- [ ] Update README with new features
- [ ] Create user guide for agentic mode
- [ ] Add API documentation for all endpoints
- [ ] Prepare for production deployment

---

## Development Guidelines

### Code Quality Standards
- Follow import organization style from CLAUDE.md
- Use shadcn/ui components exclusively for website UI
- Keep UI minimalist and labels simple/understandable
- Maintain TypeScript strict mode
- Run lint/typecheck/build before each stage completion

### Frontend Coding Standards
- **MUST follow:** `.cursor/rules/frontend-data-table-standards.mdc`
- **MUST follow:** `.cursor/rules/better-code.mdc`
- **Data Table Usage:** Use existing `apps/website/src/components/data-table`
- **Data Table Reference:** Learn from `apps/website/tnks-data-table-main/README.md`
- **Data Table Examples:** Follow patterns in `apps/website/tnks-data-table-main/src/app/(home)/data-table`

### Testing Requirements
- All stages must pass: `npm run lint`, `npm run typecheck`, `npm run build`
- Manual testing required for each major feature
- Cross-browser compatibility testing for extension features
- API endpoint testing with Postman or similar tools

### Design Principles
- Minimalist UI design throughout
- Consistent component patterns
- Clear, simple labels and messaging
- Responsive design for all screen sizes
- Accessibility considerations (keyboard navigation, screen readers)
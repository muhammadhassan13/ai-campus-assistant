# AI Campus Assistant - Resolved Version

An intelligent, multi-turn AI campus query system built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

- **AI Chatbot**: Context-aware multi-turn conversational interface.
- **RAG System**: Document-based Q&A (PDF processing with citations).
- **Voice Assistant**: Integrated audio interaction.
- **Real-time Notifications**: Live updates delivered via Socket.IO.
- **Data Management**: Full CRUD operations for student records.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL
- **Realtime & DevOps**: Socket.IO, Docker

## Project Architecture & Directory Structure

The project strictly follows a layered 3-tier architecture with clean separation of concerns and one-directional dependency flow (`Controller` → `Service` → `Repository` → `Database`):
ai-campus-assistant/
├── docs/ # Documentation and architecture diagrams
├── src/
│ ├── config/ # Database connections and environment setups
│ │ └── db.ts # PostgreSQL pool connection configuration
│ ├── controllers/ # HTTP controllers (Handles requests & responses)
│ │ └── student.controller.ts
│ ├── middleware/ # Custom Express middleware (Auth, validation, errors)
│ │ ├── auth.middleware.ts
│ │ └── error.middleware.ts
│ ├── repositories/ # Data Access Layer (Executes raw SQL / DB queries)
│ │ └── student.repository.ts
│ ├── routes/ # Express API route endpoints
│ │ └── student.routes.ts
│ ├── scripts/ # Maintenance and database setup scripts
│ │ ├── check.ts
│ │ └── seed.ts
│ ├── services/ # Business Logic Layer (Pure domain logic & transformations)
│ │ └── student.service.ts
│ ├── app.ts # Express application setup and middleware wiring
│ ├── main.ts # Server entry point
│ └── student.zod.ts # Zod schemas, validation rules, and DTO types
├── .env.example # Environment variable templates
├── package.json # Dependencies and npm scripts
├── tsconfig.json # TypeScript compiler configuration
└── README.md # Project documentation

## Layer Responsibilities

- **`src/routes/`**: Maps HTTP paths and verbs to corresponding controller actions.
- **`src/controllers/`**: Handles HTTP request parsing, status codes, and JSON responses. Contains no business logic.
- **`src/services/`**: Implements core business logic, hashing, JWT token generation, and domain transformations. Unaware of HTTP `req`/`res` objects.
- **`src/repositories/`**: Manages direct database interactions using `pg` pool queries. Contains no business logic.
- **`src/student.zod.ts`**: Holds all Zod input validation schemas and exported DTO TypeScript interfaces used across layer boundaries.

## Project Setup

- **Prerequisites**: Node.js (v20+), npm, PostgreSQL
- **Status**: Core CRUD, authentication, database migrations, and 3-tier service architecture completed.

## Setup & Running

1. **Clone the repository**:
   ```bash
   git clone <YOUR-REPOSITORY-URL>
   cd ai-campus-assistant
   ```

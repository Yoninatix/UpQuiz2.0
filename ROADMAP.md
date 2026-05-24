# Development Roadmap

## Phase 1 — Environment & Database (Week 1)

1. Copy `.env.example` to `.env` and fill in secrets
2. Run: `docker compose up postgres -d`
3. Verify migrations ran: `docker exec -it examdb-postgres psql -U examuser -d examdb -c "\dt"`
4. Pull Ollama models (run inside the ollama container after `docker compose up ollama -d`):
   ```
   docker exec -it ollama ollama pull gemma:2b
   docker exec -it ollama ollama pull nomic-embed-text
   ```

---

## Phase 2 — Go Backend (Week 2)

1. Install Go 1.22 or later
2. `cd backend && go mod tidy`
3. Implement missing repository stubs:
   - `subject_repo.go` (subjects + enrollments)
   - Question handler (`handlers/question_handler.go`)
   - Admin handler (`handlers/admin_handler.go`)
   - Subject handler (`handlers/subject_handler.go`)
   - Analytics handler (`handlers/analytics_handler.go`)
4. Wire all handlers into `router/router.go`
5. Test with: `go run ./cmd/server`

**Key endpoints to implement:**
| Method | Path | Role |
|--------|------|------|
| POST | /api/subjects | educator |
| GET | /api/subjects | educator/admin |
| POST | /api/subjects/:id/enroll | admin |
| GET | /api/questions | educator |
| POST | /api/questions/bulk | educator |
| PATCH | /api/questions/:id/approve | educator |
| DELETE | /api/questions/:id | educator |
| GET | /api/exams/:id/questions | student |
| GET | /api/student/exams | student |
| GET | /api/analytics/subject/:id | educator |
| GET | /api/admin/users | admin |
| PATCH | /api/admin/users/:id/role | admin |
| PATCH | /api/admin/users/:id/deactivate | admin |
| POST | /api/rag/generate (proxy to AI service) | educator |

---

## Phase 3 — AI Service (Week 3)

1. `cd ai-service && npm install`
2. `npm run dev` (for local testing)
3. Verify Milvus connectivity: `GET http://localhost:3001/health`
4. Test document processing: `POST http://localhost:3001/api/document/process`
5. Test RAG generation: `POST http://localhost:3001/api/rag/generate`

**Important:** The Go backend must proxy `/api/rag/generate` requests to the AI service.
Add a proxy handler in Go that forwards educator generation requests.

---

## Phase 4 — Frontend (Week 4)

1. `cd frontend && npm install`
2. `npm run dev`
3. Test each page in order:
   - Login / Register
   - Educator: Subjects → Documents (upload PDF) → Generate → Review → Exam
   - Student: My Exams → Take Exam → Results
   - Admin: Manage Users

---

## Phase 5 — Docker Integration (Week 5)

1. `cp .env.example .env` and fill values
2. `docker compose build`
3. `docker compose up -d`
4. Open `http://localhost:5173` — login with admin@examplatform.local / Admin@1234

**Check all services are healthy:**
```bash
docker compose ps
curl http://localhost:8080/health
curl http://localhost:3001/health
```

---

## Phase 6 — Testing & Polish (Week 6)

- [ ] Full end-to-end flow test (upload → generate → approve → publish → take → score)
- [ ] Handle edge cases: encrypted PDFs, empty retrieval, LLM timeout
- [ ] Add essay manual scoring UI for educator
- [ ] Improve analytics: per-exam stats, weak topic list per student
- [ ] Add student enrollment flow in UI

---

## Phase 7 — Documentation & Thesis Write-up (Week 7)

- System architecture diagram
- RAG pipeline flow diagram
- Screenshot each major screen
- Document API endpoints
- Write limitations (CPU-only Gemma is slow; essay auto-scoring not implemented)

---

## Known Limitations (for thesis discussion)

1. **Gemma on CPU** — generation is slow (~30-120 sec per call). GPU highly recommended.
2. **Essay scoring** — auto-score is skipped; educator must grade manually.
3. **Matching answer format** — stored as JSON string; exact-match comparison (brittle).
4. **No exam time enforcement on server** — time limit is advisory only in MVP.
5. **Single attempt per exam** — one attempt per student by design.
6. **Hallucination control** — grounded prompts + source references help, but Gemma 2B may still drift on complex content.

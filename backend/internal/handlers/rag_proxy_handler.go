package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ccsthesis/examplatform/internal/config"
	"github.com/gin-gonic/gin"
)

// RAGProxyHandler forwards question-generation requests from the frontend
// to the TypeScript AI service, then returns the response to the client.
// This keeps the AI service internal (not exposed to the browser directly).
type RAGProxyHandler struct {
	aiServiceURL string
	client       *http.Client
}

func NewRAGProxyHandler(cfg *config.Config) *RAGProxyHandler {
	return &RAGProxyHandler{
		aiServiceURL: cfg.AIServiceURL,
		client: &http.Client{
			Timeout: 60 * time.Minute, // CPU-only LLM can take a long time
		},
	}
}

// POST /api/rag/generate
// Proxies to AI service POST /api/rag/generate
func (h *RAGProxyHandler) Generate(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not read request body"})
		return
	}

	url := fmt.Sprintf("%s/api/rag/generate", h.aiServiceURL)
	// Use a detached context so browser disconnect doesn't cancel the slow LLM call
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Minute)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not build request"})
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not read AI service response"})
		return
	}

	// Pass through status code and body as-is
	c.Data(resp.StatusCode, "application/json", respBody)
}

// POST /api/documents/:id/process
// Triggers the AI service to process a PDF that was already uploaded.
func (h *RAGProxyHandler) ProcessDocument(c *gin.Context) {
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	payload, _ := json.Marshal(body)
	url := fmt.Sprintf("%s/api/document/process", h.aiServiceURL)

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not build request"})
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	c.Data(resp.StatusCode, "application/json", respBody)
}

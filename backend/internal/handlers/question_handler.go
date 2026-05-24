package handlers

import (
	"net/http"

	"github.com/ccsthesis/examplatform/internal/models"
	"github.com/ccsthesis/examplatform/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type QuestionHandler struct {
	questionRepo repository.QuestionRepository
}

func NewQuestionHandler(questionRepo repository.QuestionRepository) *QuestionHandler {
	return &QuestionHandler{questionRepo: questionRepo}
}

// GET /api/questions?subject_id=<uuid>&approved=true
func (h *QuestionHandler) List(c *gin.Context) {
	subjectID, err := uuid.Parse(c.Query("subject_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject_id"})
		return
	}

	approvedOnly := c.Query("approved") == "true"
	questions, err := h.questionRepo.ListBySubject(c.Request.Context(), subjectID, approvedOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if questions == nil {
		questions = []*models.GeneratedQuestion{}
	}
	c.JSON(http.StatusOK, questions)
}

// POST /api/questions/bulk
// Body: { subject_id, questions: [...] }
// Called by the frontend after RAG generation to persist questions.
func (h *QuestionHandler) BulkCreate(c *gin.Context) {
	var body struct {
		SubjectID string `json:"subject_id" binding:"required"`
		Questions []struct {
			DocumentID    string      `json:"document_id"`
			ChunkID       string      `json:"chunk_id"`
			QuestionText  string      `json:"question_text"  binding:"required"`
			QuestionType  string      `json:"question_type"  binding:"required"`
			Difficulty    string      `json:"difficulty"`
			TopicTag      string      `json:"topic_tag"`
			CorrectAnswer string      `json:"correct_answer" binding:"required"`
			Choices       interface{} `json:"choices"`
		} `json:"questions" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	createdBy, _ := uuid.Parse(c.GetString("userID"))
	subjectID, _ := uuid.Parse(body.SubjectID)

	qs := make([]*models.GeneratedQuestion, 0, len(body.Questions))
	for _, q := range body.Questions {
		docID, _ := uuid.Parse(q.DocumentID)
		var chunkIDPtr *uuid.UUID
		if q.ChunkID != "" {
			cid, err := uuid.Parse(q.ChunkID)
			if err == nil {
				chunkIDPtr = &cid
			}
		}

		difficulty := models.DifficultyLevel(q.Difficulty)
		if difficulty == "" {
			difficulty = models.DiffMedium
		}

		qs = append(qs, &models.GeneratedQuestion{
			DocumentID:    docID,
			ChunkID:       chunkIDPtr,
			SubjectID:     subjectID,
			CreatedBy:     createdBy,
			QuestionText:  q.QuestionText,
			QuestionType:  models.QuestionType(q.QuestionType),
			Difficulty:    difficulty,
			TopicTag:      q.TopicTag,
			CorrectAnswer: q.CorrectAnswer,
			Choices:       q.Choices,
		})
	}

	if err := h.questionRepo.BulkCreate(c.Request.Context(), qs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"created": len(qs)})
}

// PATCH /api/questions/:id/approve
func (h *QuestionHandler) Approve(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid question id"})
		return
	}
	if err := h.questionRepo.Approve(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "question approved"})
}

// PUT /api/questions/:id
func (h *QuestionHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid question id"})
		return
	}

	var body struct {
		QuestionText  string      `json:"question_text"`
		Difficulty    string      `json:"difficulty"`
		TopicTag      string      `json:"topic_tag"`
		CorrectAnswer string      `json:"correct_answer"`
		Choices       interface{} `json:"choices"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	q := &models.GeneratedQuestion{
		ID:            id,
		QuestionText:  body.QuestionText,
		Difficulty:    models.DifficultyLevel(body.Difficulty),
		TopicTag:      body.TopicTag,
		CorrectAnswer: body.CorrectAnswer,
		Choices:       body.Choices,
	}
	if err := h.questionRepo.Update(c.Request.Context(), q); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "question updated"})
}

// DELETE /api/questions/:id
func (h *QuestionHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid question id"})
		return
	}
	if err := h.questionRepo.SoftDelete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "question deleted"})
}

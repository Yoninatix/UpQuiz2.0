package handlers

import (
	"net/http"

	"github.com/ccsthesis/examplatform/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AnalyticsHandler struct {
	analyticsRepo repository.AnalyticsRepository
}

func NewAnalyticsHandler(analyticsRepo repository.AnalyticsRepository) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsRepo: analyticsRepo}
}

// GET /api/analytics/subject/:subjectID
// Returns aggregate class stats for an educator.
func (h *AnalyticsHandler) SubjectSummary(c *gin.Context) {
	subjectID, err := uuid.Parse(c.Param("subjectID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	data, err := h.analyticsRepo.SubjectSummary(c.Request.Context(), subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

// GET /api/analytics/student/:subjectID
// Returns weak-topic breakdown for the current logged-in student.
func (h *AnalyticsHandler) StudentTopics(c *gin.Context) {
	subjectID, err := uuid.Parse(c.Param("subjectID"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subject id"})
		return
	}

	studentID, _ := uuid.Parse(c.GetString("userID"))
	topics, err := h.analyticsRepo.StudentTopics(c.Request.Context(), studentID, subjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, topics)
}

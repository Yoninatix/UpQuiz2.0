package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/ccsthesis/examplatform/internal/models"
	"github.com/ccsthesis/examplatform/internal/repository"
	"github.com/google/uuid"
)

type ScoringService struct {
	attemptRepo  repository.AttemptRepository
	examRepo     repository.ExamRepository
	questionRepo repository.QuestionRepository
	aiServiceURL string
}

func NewScoringService(
	attemptRepo repository.AttemptRepository,
	examRepo repository.ExamRepository,
	questionRepo repository.QuestionRepository,
	aiServiceURL string,
) *ScoringService {
	return &ScoringService{
		attemptRepo:  attemptRepo,
		examRepo:     examRepo,
		questionRepo: questionRepo,
		aiServiceURL: aiServiceURL,
	}
}

type ScoreResult struct {
	AttemptID   uuid.UUID `json:"attempt_id"`
	TotalScore  float64   `json:"total_score"`
	MaxScore    float64   `json:"max_score"`
	Percentage  float64   `json:"percentage"`
	SubmittedAt time.Time `json:"submitted_at"`
}

type essayScoreRequest struct {
	ModelAnswer   string `json:"model_answer"`
	StudentAnswer string `json:"student_answer"`
}

type essayScoreResponse struct {
	Score      float64 `json:"score"`      // 0-100
	Similarity float64 `json:"similarity"` // 0-1
}

// scoreEssay calls the AI service to get an embedding-similarity score (0-100).
func (s *ScoringService) scoreEssay(ctx context.Context, modelAnswer, studentAnswer string) (float64, error) {
	if strings.TrimSpace(studentAnswer) == "" {
		return 0, nil
	}

	body, _ := json.Marshal(essayScoreRequest{
		ModelAnswer:   modelAnswer,
		StudentAnswer: studentAnswer,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		s.aiServiceURL+"/api/essay/score", bytes.NewReader(body))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("AI service unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("AI service returned %d", resp.StatusCode)
	}

	var result essayScoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}
	return result.Score, nil
}

// ScoreAttempt auto-scores objective questions and uses embedding similarity for essays.
func (s *ScoringService) ScoreAttempt(ctx context.Context, attemptID, studentID uuid.UUID) (*ScoreResult, error) {
	answers, err := s.attemptRepo.GetAnswers(ctx, attemptID)
	if err != nil {
		return nil, err
	}

	var total, max float64

	for _, ans := range answers {
		q, err := s.questionRepo.FindByID(ctx, ans.QuestionID)
		if err != nil {
			continue
		}

		const pointsPerQ = 1.0
		max += pointsPerQ

		if q.QuestionType == models.QTypeEssay {
			essayScore, err := s.scoreEssay(ctx, q.CorrectAnswer, ans.AnswerText)
			if err != nil {
				// AI service unavailable — exclude this essay from the scored total
				// so it doesn't penalise the student; educator can review manually.
				fmt.Printf("Essay scoring unavailable for question %s: %v — pending educator review\n", q.ID, err)
				max -= pointsPerQ
				continue
			}
			// essayScore is 0-100; convert to fraction of pointsPerQ
			pts := (essayScore / 100.0) * pointsPerQ
			total += pts
			continue
		}

		if s.checkAnswer(q, ans.AnswerText) {
			total += pointsPerQ
		}
	}

	pct := 0.0
	if max > 0 {
		pct = (total / max) * 100
	}

	if err := s.attemptRepo.Submit(ctx, attemptID, total, max, pct); err != nil {
		return nil, err
	}

	return &ScoreResult{
		AttemptID:   attemptID,
		TotalScore:  total,
		MaxScore:    max,
		Percentage:  pct,
		SubmittedAt: time.Now(),
	}, nil
}

func (s *ScoringService) checkAnswer(q *models.GeneratedQuestion, studentAnswer string) bool {
	correct := strings.TrimSpace(strings.ToLower(q.CorrectAnswer))
	given := strings.TrimSpace(strings.ToLower(studentAnswer))

	switch q.QuestionType {
	case models.QTypeMultipleChoice, models.QTypeTrueOrFalse:
		return correct == given
	case models.QTypeFillBlank:
		return correct == given
	case models.QTypeMatching:
		return correct == given
	default:
		return false
	}
}

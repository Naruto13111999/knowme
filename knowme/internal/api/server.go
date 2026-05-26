package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gyanankur/knowme/internal/game"
	"github.com/gyanankur/knowme/internal/store"
)

type Server struct {
	store *store.Store
}

func NewServer(st *store.Store) *Server {
	return &Server{store: st}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", s.handleIndex)
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /api/config", s.handleConfig)
	mux.HandleFunc("GET /api/questions", s.handleQuestions)
	mux.HandleFunc("POST /api/play", s.handlePlay)
	mux.HandleFunc("GET /api/responses", s.handleResponses)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir("web/static"))))
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "web/templates/index.html")
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, game.DefaultConfig())
}

func (s *Server) handleQuestions(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"questions": game.PublicQuestions(),
	})
}

type playRequest struct {
	Player        string            `json:"player"`
	Answers       map[string]string `json:"answers"`
	WrongAttempts int               `json:"wrongAttempts"`
}

type playResponse struct {
	ID            string              `json:"id"`
	Player        string              `json:"player"`
	Score         int                 `json:"score"`
	Total         int                 `json:"total"`
	WrongAttempts int                 `json:"wrongAttempts"`
	Tier          game.ResultTier     `json:"tier"`
	Breakdown     []game.AnswerResult `json:"breakdown"`
}

func (s *Server) handlePlay(w http.ResponseWriter, r *http.Request) {
	var req playRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Player = strings.TrimSpace(req.Player)
	if req.Player == "" {
		writeError(w, http.StatusBadRequest, "please enter your name")
		return
	}
	if len(req.Player) > 40 {
		writeError(w, http.StatusBadRequest, "name is too long")
		return
	}

	if err := game.ValidateAnswers(req.Answers); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.WrongAttempts < 0 {
		req.WrongAttempts = 0
	}
	if req.WrongAttempts > 9999 {
		req.WrongAttempts = 9999
	}

	score, breakdown := game.ScoreAnswers(req.Answers)
	total := len(breakdown)
	tier := game.TierForScore(score, total)

	id, err := newID()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create session")
		return
	}

	record := store.PlayRecord{
		ID:            id,
		Player:        req.Player,
		Score:         score,
		Total:         total,
		WrongAttempts: req.WrongAttempts,
		Tier:          tier,
		Breakdown:     breakdown,
		PlayedAt:      time.Now().UTC(),
	}
	if err := s.store.Save(record); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save result")
		return
	}

	writeJSON(w, http.StatusOK, playResponse{
		ID:            id,
		Player:        req.Player,
		Score:         score,
		Total:         total,
		WrongAttempts: req.WrongAttempts,
		Tier:          tier,
		Breakdown:     breakdown,
	})
}

func (s *Server) handleResponses(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"responses": s.store.All(),
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func newID() (string, error) {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

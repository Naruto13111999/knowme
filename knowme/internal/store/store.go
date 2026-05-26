package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gyanankur/knowme/internal/game"
)

type PlayRecord struct {
	ID             string              `json:"id"`
	Player         string              `json:"player"`
	Score          int                 `json:"score"`
	Total          int                 `json:"total"`
	WrongAttempts  int                 `json:"wrongAttempts"`
	Tier           game.ResultTier     `json:"tier"`
	Breakdown      []game.AnswerResult `json:"breakdown"`
	PlayedAt       time.Time           `json:"playedAt"`
}

type Store struct {
	mu   sync.RWMutex
	path string
	data []PlayRecord
}

func New(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, err
	}

	s := &Store{path: path}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Save(record PlayRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.data = append(s.data, record)
	return s.persistLocked()
}

func (s *Store) All() []PlayRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]PlayRecord, len(s.data))
	copy(out, s.data)
	return out
}

func (s *Store) load() error {
	b, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	if len(b) == 0 {
		return nil
	}
	return json.Unmarshal(b, &s.data)
}

func (s *Store) persistLocked() error {
	b, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, b, 0644)
}

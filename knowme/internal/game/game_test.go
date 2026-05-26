package game

import "testing"

func TestScoreAnswers(t *testing.T) {
	answers := map[string]string{
		"q1": "good",
		"q2": "yes",
		"q3": "yes",
		"q4": "yes",
		"q5": "smart",
		"q6": "yes",
		"q7": "chill",
		"q8": "win",
	}

	score, breakdown := ScoreAnswers(answers)
	if score != 8 {
		t.Fatalf("expected score 8, got %d", score)
	}
	if len(breakdown) != 8 {
		t.Fatalf("expected 8 breakdown items, got %d", len(breakdown))
	}
}

func TestValidateAnswersIncomplete(t *testing.T) {
	err := ValidateAnswers(map[string]string{"q1": "good"})
	if err != ErrIncompleteAnswers {
		t.Fatalf("expected incomplete error, got %v", err)
	}
}

func TestValidateAnswersRejectsEvasive(t *testing.T) {
	answers := map[string]string{
		"q1": "bad",
		"q2": "yes",
		"q3": "yes",
		"q4": "yes",
		"q5": "smart",
		"q6": "yes",
		"q7": "chill",
		"q8": "win",
	}
	err := ValidateAnswers(answers)
	if err != ErrInvalidOption {
		t.Fatalf("expected invalid option for evasive pick, got %v", err)
	}
}

func TestTierForScore(t *testing.T) {
	tier := TierForScore(7, 8)
	if tier.Title != "Solid Supporter" {
		t.Fatalf("expected Solid Supporter, got %s", tier.Title)
	}
}

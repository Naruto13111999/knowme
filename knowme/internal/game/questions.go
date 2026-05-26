package game

import "strings"

type Option struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Evasive  bool   `json:"evasive,omitempty"`
	positive bool
}

type Question struct {
	ID      string   `json:"id"`
	Text    string   `json:"text"`
	Emoji   string   `json:"emoji"`
	Style   string   `json:"style"`
	Options []Option `json:"options"`
}

type PublicQuestion struct {
	ID      string         `json:"id"`
	Text    string         `json:"text"`
	Emoji   string         `json:"emoji"`
	Style   string         `json:"style"`
	Options []PublicOption `json:"options"`
}

type PublicOption struct {
	ID      string `json:"id"`
	Label   string `json:"label"`
	Evasive bool   `json:"evasive,omitempty"`
}

type questionDef struct {
	Question
}

var defaultQuestions = []questionDef{
	{
		Question: Question{
			ID:    "q1",
			Text:  "How do you think Gyanankur is — a good person or a bad person?",
			Emoji: "😇",
			Style: "binary",
			Options: []Option{
				{ID: "good", Label: "Good", positive: true},
				{ID: "bad", Label: "Bad", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q2",
			Text:  "Would you trust Gyanankur with your secrets?",
			Emoji: "🤫",
			Style: "binary",
			Options: []Option{
				{ID: "yes", Label: "Yes", positive: true},
				{ID: "no", Label: "No", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q3",
			Text:  "Is Gyanankur fun to hang out with?",
			Emoji: "🎉",
			Style: "binary",
			Options: []Option{
				{ID: "yes", Label: "Yes", positive: true},
				{ID: "no", Label: "No", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q4",
			Text:  "Would you want Gyanankur on your team?",
			Emoji: "🤝",
			Style: "binary",
			Options: []Option{
				{ID: "yes", Label: "Absolutely", positive: true},
				{ID: "no", Label: "Hard pass", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q5",
			Text:  "Is Gyanankur smart or just lucky?",
			Emoji: "🧠",
			Style: "binary",
			Options: []Option{
				{ID: "smart", Label: "Smart", positive: true},
				{ID: "lucky", Label: "Just lucky", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q6",
			Text:  "Would you grab coffee with Gyanankur?",
			Emoji: "☕",
			Style: "binary",
			Options: []Option{
				{ID: "yes", Label: "Yes", positive: true},
				{ID: "pass", Label: "Pass", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q7",
			Text:  "Is Gyanankur more chill or chaotic?",
			Emoji: "🌊",
			Style: "binary",
			Options: []Option{
				{ID: "chill", Label: "Chill", positive: true},
				{ID: "chaotic", Label: "Chaotic", Evasive: true},
			},
		},
	},
	{
		Question: Question{
			ID:    "q8",
			Text:  "Overall, is Gyanankur a win or a loss?",
			Emoji: "✨",
			Style: "binary",
			Options: []Option{
				{ID: "win", Label: "Win", positive: true},
				{ID: "loss", Label: "Loss", Evasive: true},
			},
		},
	},
}

func PublicQuestions() []PublicQuestion {
	out := make([]PublicQuestion, len(defaultQuestions))
	for i, q := range defaultQuestions {
		opts := make([]PublicOption, len(q.Options))
		for j, o := range q.Options {
			opts[j] = PublicOption{
				ID:      o.ID,
				Label:   o.Label,
				Evasive: o.Evasive,
			}
		}
		out[i] = PublicQuestion{
			ID:      q.ID,
			Text:    q.Text,
			Emoji:   q.Emoji,
			Style:   q.Style,
			Options: opts,
		}
	}
	return out
}

func ScoreAnswers(answers map[string]string) (score int, breakdown []AnswerResult) {
	breakdown = make([]AnswerResult, 0, len(defaultQuestions))

	for _, q := range defaultQuestions {
		chosen := answers[q.ID]
		positive := isPositive(q.Options, chosen)

		if positive {
			score++
		}

		breakdown = append(breakdown, AnswerResult{
			QuestionID:   q.ID,
			QuestionText: q.Text,
			Emoji:        q.Emoji,
			ChosenOptionID: chosen,
			ChosenLabel:    labelFor(q.Options, chosen),
			Positive:       positive,
		})
	}
	return score, breakdown
}

func isPositive(options []Option, id string) bool {
	for _, o := range options {
		if o.ID == id {
			return o.positive
		}
	}
	return false
}

func isEvasive(options []Option, id string) bool {
	for _, o := range options {
		if o.ID == id {
			return o.Evasive
		}
	}
	return false
}

func labelFor(options []Option, id string) string {
	for _, o := range options {
		if o.ID == id {
			return o.Label
		}
	}
	return ""
}

func TierForScore(score, total int) ResultTier {
	if total == 0 {
		return ResultTier{Title: "Thanks for playing!", Message: "Your thoughts have been recorded.", Emoji: "💜"}
	}
	pct := float64(score) / float64(total) * 100

	switch {
	case pct >= 90:
		return ResultTier{
			Title:   "Certified Fan",
			Message: "Okay wow — you actually think I'm pretty great. I'll remember this.",
			Emoji:   "👑",
		}
	case pct >= 75:
		return ResultTier{
			Title:   "Solid Supporter",
			Message: "Mostly positive vibes. I appreciate you!",
			Emoji:   "🙌",
		}
	case pct >= 55:
		return ResultTier{
			Title:   "Mixed Signals",
			Message: "Interesting take… we've got some talking to do.",
			Emoji:   "🤔",
		}
	default:
		return ResultTier{
			Title:   "Honest Friend",
			Message: "At least you're keeping it real. Respect.",
			Emoji:   "😅",
		}
	}
}

type AnswerResult struct {
	QuestionID     string `json:"questionId"`
	QuestionText   string `json:"questionText"`
	Emoji          string `json:"emoji"`
	ChosenOptionID string `json:"chosenOptionId"`
	ChosenLabel    string `json:"chosenLabel"`
	Positive       bool   `json:"positive"`
}

type ResultTier struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Emoji   string `json:"emoji"`
}

func ValidateAnswers(answers map[string]string) error {
	if len(answers) != len(defaultQuestions) {
		return ErrIncompleteAnswers
	}
	for _, q := range defaultQuestions {
		chosen, ok := answers[q.ID]
		if !ok || strings.TrimSpace(chosen) == "" {
			return ErrIncompleteAnswers
		}
		if labelFor(q.Options, chosen) == "" {
			return ErrInvalidOption
		}
		if isEvasive(q.Options, chosen) {
			return ErrInvalidOption
		}
	}
	return nil
}

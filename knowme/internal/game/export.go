package game

// StaticBundle is baked into the GitHub Pages export.
type StaticBundle struct {
	Config    Config                   `json:"config"`
	Questions []PublicQuestion         `json:"questions"`
	Scoring   map[string]OptionScoring `json:"scoring"`
}

// OptionScoring describes how to score a chosen option in static mode.
type OptionScoring struct {
	Label    string `json:"label"`
	Positive bool   `json:"positive"`
}

// StaticBundleData returns config, questions, and scoring metadata for static hosting.
func StaticBundleData() StaticBundle {
	scoring := make(map[string]OptionScoring, 64)

	for _, q := range defaultQuestions {
		for _, o := range q.Options {
			key := q.ID + ":" + o.ID
			scoring[key] = OptionScoring{
				Label:    o.Label,
				Positive: o.positive,
			}
		}
	}

	return StaticBundle{
		Config:    DefaultConfig(),
		Questions: PublicQuestions(),
		Scoring:   scoring,
	}
}

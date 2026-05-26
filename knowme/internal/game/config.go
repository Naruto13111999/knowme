package game

// Config holds host-facing game metadata.
type Config struct {
	HostName    string `json:"hostName"`
	Title       string `json:"title"`
	Subtitle    string `json:"subtitle"`
	PlayLabel   string `json:"playLabel"`
	TotalRounds int    `json:"totalRounds"`
}

// DefaultConfig returns the game configuration for Gyanankur.
func DefaultConfig() Config {
	return Config{
		HostName:    "Gyanankur",
		Title:       "What Do You Really Think?",
		Subtitle:    "Be honest… well, mostly honest.",
		PlayLabel:   "Play",
		TotalRounds: len(defaultQuestions),
	}
}

package game

import "errors"

var (
	ErrIncompleteAnswers = errors.New("please answer all questions")
	ErrInvalidOption     = errors.New("invalid answer option")
)

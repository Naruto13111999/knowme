.PHONY: run build test export

run:
	go run ./cmd/server

build:
	go build -o bin/knowme ./cmd/server

export:
	go run ./cmd/staticexport

test:
	go test ./...

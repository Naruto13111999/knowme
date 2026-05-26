package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gyanankur/knowme/internal/api"
	"github.com/gyanankur/knowme/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	dataPath := os.Getenv("DATA_PATH")
	if dataPath == "" {
		dataPath = "./data/responses.json"
	}

	st, err := store.New(dataPath)
	if err != nil {
		log.Fatalf("init store: %v", err)
	}

	srv := api.NewServer(st)
	mux := srv.Routes()

	log.Printf("KnowMe game running at http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

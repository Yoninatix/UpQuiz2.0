package main

import (
	"log"

	"github.com/ccsthesis/examplatform/internal/config"
	"github.com/ccsthesis/examplatform/internal/database"
	"github.com/ccsthesis/examplatform/internal/router"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	r := router.New(cfg, db)

	log.Printf("server listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

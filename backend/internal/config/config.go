package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	Env            string
	DatabaseURL    string
	JWTSecret      string
	JWTExpiryHours int
	AIServiceURL   string
	UploadsDir     string
	CookieSecure   bool
}

func Load() *Config {
	// .env is optional in production (env vars injected by Docker)
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, reading environment variables directly")
	}

	return &Config{
		Port:         getEnv("PORT", "8080"),
		Env:          getEnv("ENV", "development"),
		DatabaseURL:  buildDSN(),
		JWTSecret:    mustEnv("JWT_SECRET"),
		AIServiceURL: getEnv("AI_SERVICE_URL", "http://ai-service:3001"),
		UploadsDir:   getEnv("UPLOADS_DIR", "/app/uploads"),
		CookieSecure: getEnv("COOKIE_SECURE", "false") == "true",
	}
}

func buildDSN() string {
	host := getEnv("POSTGRES_HOST", "localhost")
	port := getEnv("POSTGRES_PORT", "5432")
	db := getEnv("POSTGRES_DB", "examdb")
	user := getEnv("POSTGRES_USER", "examuser")
	pass := getEnv("POSTGRES_PASSWORD", "exampassword")
	return "postgres://" + user + ":" + pass + "@" + host + ":" + port + "/" + db + "?sslmode=disable"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return v
}

package web_service

import (
	"fmt"
	"os"
	"path"
)

func (s *WebService) GetMainPage() ([]byte, error) {
	htmlPathFile := path.Join(os.Getenv("PROJECT_ROOT"), "/public/index.html")

	html, err := s.webRepository.GetFile(htmlPathFile)
	if err != nil {
		return nil, fmt.Errorf(
			"get file from repository: %w",
			err,
		)
	}

	return html, err
}

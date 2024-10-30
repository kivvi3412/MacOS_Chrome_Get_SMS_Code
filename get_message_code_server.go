package main

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"os"
	"path/filepath"
	"regexp"

	_ "github.com/mattn/go-sqlite3"
	"net/http"
)

func getLatestVerificationCode() gin.H {
	// 获取数据库路径
	homeDir, _ := os.UserHomeDir()
	dbPath := filepath.Join(homeDir, "Library", "Messages","chat.db")

	// 检查数据库文件是否存在
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		return gin.H{"sms_code": -1, "message": "Database file not found"}
	}

	// 连接数据库
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return gin.H{"sms_code": -1, "message": "Database connection error"}
	}
	defer db.Close()

	// 构建查询语句
	query := `
    SELECT text
    FROM message
    WHERE datetime(date/1000000000 + 978307200, 'unixepoch', 'localtime') > datetime('now', 'localtime', '-60 seconds')
    ORDER BY date DESC
    LIMIT 1;
    `

	// 执行查询
	row := db.QueryRow(query)
	var text string
	err = row.Scan(&text)
	if err != nil {
		if err == sql.ErrNoRows {
			return gin.H{"sms_code": -1, "message": "No message found"}
		}
		return gin.H{"sms_code": -1, "message": "Database query error"}
	}

	// 检查关键词
	keywordRegex := regexp.MustCompile(`验证码|校验码|动态码|短信码`)
	if keywordRegex.MatchString(text) {
		// 提取验证码
		codeRegex := regexp.MustCompile(`\d{4,6}`)
		code := codeRegex.FindString(text)
		if code != "" {
			return gin.H{"sms_code": code, "message": "Code found"}
		} else {
			return gin.H{"sms_code": -1, "message": "No code found"}
		}
	} else {
		return gin.H{"sms_code": -1, "message": "No code found"}
	}
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default() // 创建一个默认的路由引擎

	router.GET("/get_code", func(c *gin.Context) {
		result := getLatestVerificationCode()
		c.JSON(http.StatusOK, result)
	})

	// 监听端口65530
	err := router.Run("127.0.0.1:65530")
	if err != nil {
		fmt.Println("Failed to start server:", err)
	}
}

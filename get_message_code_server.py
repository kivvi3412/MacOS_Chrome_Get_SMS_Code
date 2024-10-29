# -*- coding: utf-8 -*-
import sqlite3
import os
import re
from fastapi import FastAPI
import uvicorn

app = FastAPI()
DB_PATH = os.path.expanduser("~/Library/Messages/chat.db")


def get_latest_verification_code():
    # 使用上下文管理器, 确保连接及时关闭
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        query = """
        SELECT text
        FROM message
        WHERE datetime(date/1000000000 + 978307200, "unixepoch", "localtime") > datetime("now", "localtime", "-60 second")
        ORDER BY date DESC
        LIMIT 1;
        """
        cursor.execute(query)
        result = cursor.fetchone()
        if result:
            text = result[0]
            # 检查消息中是否包含“验证码”或其他常见关键词
            if re.search(r"验证码|校验码|动态码|短信码", text):
                # 提取 4 到 6 位数字的验证码
                match = re.search(r"\d{4,6}", text)
                if match:
                    code = match.group()
                    return {"sms_code": code, "message": "Code found"}
                else:
                    return {"sms_code": -1, "message": "No code found"}
            else:
                return {"sms_code": -1, "message": "No code found"}
        else:
            return {"sms_code": -1, "message": "No message found"}


@app.get("/get_code")
async def get_code():
    result = get_latest_verification_code()
    return result


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=65530)

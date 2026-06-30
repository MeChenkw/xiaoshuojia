# Novelist - AI 辅助小说创作工具

## 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt
python app.py
```

后端运行在 http://localhost:5000

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:3000

### Docker

```bash
docker build -t novelist .
docker run -p 5000:5000 -p 3000:3000 novelist
```

## 技术栈

- **后端**: Flask + Flask-SQLAlchemy + SQLite
- **前端**: React 19 + Vite + TypeScript + Tailwind CSS
- **AI**: OpenAI SDK (兼容 DeepSeek/Ollama/硅基流动)

## 功能

- 创建小说，设置分类和目标字数
- AI 生成大纲
- 逐章 AI 生成内容
- 阅读器，支持目录、翻页、编辑
- 导出 TXT/EPUB
- 中英文切换

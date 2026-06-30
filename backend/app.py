import os
import threading
import time
import json
import io
import sys
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

LOG_FILE = os.path.join(os.path.dirname(__file__), 'generation.log')

def log(msg):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{timestamp}] {msg}'
    print(line)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except:
        pass

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///novelist.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.db = SQLAlchemy(app)

# Models
class Novel(app.db.Model):
    __tablename__ = 'novels'
    id = app.db.Column(app.db.Integer, primary_key=True)
    title = app.db.Column(app.db.String(200), nullable=False)
    category = app.db.Column(app.db.String(50), nullable=False)
    user_idea = app.db.Column(app.db.Text)
    word_count = app.db.Column(app.db.Integer, default=100000)
    status = app.db.Column(app.db.String(20), default='draft')
    created_at = app.db.Column(app.db.DateTime, default=datetime.utcnow)
    updated_at = app.db.Column(app.db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    volumes = app.db.relationship('Volume', backref='novel', lazy=True, cascade='all, delete-orphan')

class Volume(app.db.Model):
    __tablename__ = 'volumes'
    id = app.db.Column(app.db.Integer, primary_key=True)
    novel_id = app.db.Column(app.db.Integer, app.db.ForeignKey('novels.id'), nullable=False)
    order_index = app.db.Column(app.db.Integer, nullable=False)
    title = app.db.Column(app.db.String(200), nullable=False)
    description = app.db.Column(app.db.Text)
    chapters = app.db.relationship('Chapter', backref='volume', lazy=True, cascade='all, delete-orphan')

class Chapter(app.db.Model):
    __tablename__ = 'chapters'
    id = app.db.Column(app.db.Integer, primary_key=True)
    volume_id = app.db.Column(app.db.Integer, app.db.ForeignKey('volumes.id'), nullable=False)
    order_index = app.db.Column(app.db.Integer, nullable=False)
    title = app.db.Column(app.db.String(200), nullable=False)
    outline = app.db.Column(app.db.Text)
    content = app.db.Column(app.db.Text)


# Helper: call LLM API directly via requests (OpenAI-compatible)
def call_llm_api(api_key, base_url, model, messages, json_mode=False):
    """Call OpenAI-compatible LLM API using requests library."""
    if not base_url:
        base_url = 'https://api.openai.com/v1'
    endpoint = base_url.rstrip('/') + '/chat/completions'

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }

    payload = {
        'model': model,
        'messages': messages,
        'temperature': 0.8
    }
    if json_mode:
        payload['response_format'] = {'type': 'json_object'}

    log(f"[LLM] Calling API: {endpoint}")
    log(f"[LLM] Model: {model}, JSON mode: {json_mode}")
    log(f"[LLM] API Key prefix: {api_key[:10] if api_key else 'EMPTY'}...")

    try:
        response = requests.post(
            endpoint,
            headers=headers,
            json=payload,
            timeout=(30, 300)  # 30秒连接超时, 300秒读取超时
        )
        log(f"[LLM] Response status: {response.status_code}")
        response.raise_for_status()
        data = response.json()
        content = data['choices'][0]['message']['content']
        log(f"[LLM] Response received: {len(content)} chars")
        return content
    except requests.exceptions.Timeout as e:
        log(f"[LLM] TIMEOUT ERROR: {e}")
        raise
    except requests.exceptions.RequestException as e:
        log(f"[LLM] REQUEST ERROR: {e}")
        raise
    except Exception as e:
        log(f"[LLM] UNKNOWN ERROR: {e}")
        raise


def get_api_config_from_request():
    api_key = request.headers.get('X-API-Key') or os.environ.get('OPENAI_API_KEY', '')
    base_url = request.headers.get('X-Base-URL') or os.environ.get('OPENAI_BASE_URL', '')
    model = request.headers.get('X-Model') or os.environ.get('OPENAI_MODEL', '')
    return api_key, base_url, model


def serialize_novel(novel, include_details=False):
    data = {
        'id': novel.id,
        'title': novel.title,
        'category': novel.category,
        'user_idea': novel.user_idea,
        'word_count': novel.word_count,
        'status': novel.status,
        'created_at': novel.created_at.isoformat() if novel.created_at else None,
        'updated_at': novel.updated_at.isoformat() if novel.updated_at else None,
    }
    if include_details:
        data['volumes'] = [serialize_volume(v) for v in sorted(novel.volumes, key=lambda x: x.order_index)]
    return data

def serialize_volume(volume):
    return {
        'id': volume.id,
        'novel_id': volume.novel_id,
        'order': volume.order_index,
        'title': volume.title,
        'description': volume.description,
        'chapters': [serialize_chapter(c) for c in sorted(volume.chapters, key=lambda x: x.order_index)]
    }

def serialize_chapter(chapter):
    return {
        'id': chapter.id,
        'volume_id': chapter.volume_id,
        'order': chapter.order_index,
        'title': chapter.title,
        'outline': chapter.outline,
        'content': chapter.content
    }


# Startup check
def startup_check():
    with app.app_context():
        app.db.create_all()
        generating_novels = Novel.query.filter_by(status='generating').all()
        for novel in generating_novels:
            has_incomplete = any(
                not chapter.content
                for volume in novel.volumes
                for chapter in volume.chapters
            )
            novel.status = 'done' if not has_incomplete else 'interrupted'
        app.db.session.commit()


# Routes
@app.route('/api/novels', methods=['POST'])
def create_novel():
    data = request.json
    novel = Novel(
        title=data.get('title', '未命名小说'),
        category=data.get('category', '玄幻'),
        user_idea=data.get('user_idea', ''),
        word_count=data.get('word_count', 100000)
    )
    app.db.session.add(novel)
    app.db.session.commit()
    return jsonify(serialize_novel(novel)), 201

@app.route('/api/novels', methods=['GET'])
def list_novels():
    novels = Novel.query.order_by(Novel.updated_at.desc()).all()
    return jsonify([serialize_novel(n) for n in novels])

@app.route('/api/novels/<int:id>', methods=['GET'])
def get_novel(id):
    novel = Novel.query.get_or_404(id)
    return jsonify(serialize_novel(novel, include_details=True))

@app.route('/api/novels/<int:id>', methods=['DELETE'])
def delete_novel(id):
    novel = Novel.query.get_or_404(id)
    app.db.session.delete(novel)
    app.db.session.commit()
    return jsonify({'success': True})

@app.route('/api/novels/<int:id>/confirm', methods=['PUT'])
def confirm_novel(id):
    novel = Novel.query.get_or_404(id)
    novel.status = 'confirmed'
    app.db.session.commit()
    return jsonify(serialize_novel(novel, include_details=True))

@app.route('/api/novels/<int:id>/outline', methods=['PUT'])
def update_outline(id):
    novel = Novel.query.get_or_404(id)
    data = request.json
    volumes_data = data.get('volumes', [])

    for v in novel.volumes:
        app.db.session.delete(v)
    app.db.session.commit()

    for v_data in volumes_data:
        volume = Volume(
            novel_id=novel.id,
            order_index=v_data.get('order', 0),
            title=v_data.get('title', ''),
            description=v_data.get('description', '')
        )
        app.db.session.add(volume)
        app.db.session.flush()
        for c_data in v_data.get('chapters', []):
            chapter = Chapter(
                volume_id=volume.id,
                order_index=c_data.get('order', 0),
                title=c_data.get('title', ''),
                outline=c_data.get('outline', '')
            )
            app.db.session.add(chapter)

    app.db.session.commit()
    return jsonify(serialize_novel(novel, include_details=True))

@app.route('/api/novels/<int:id>/generate-outline', methods=['POST'])
def generate_outline(id):
    novel = Novel.query.get_or_404(id)
    locale = request.headers.get('X-Locale', 'zh')
    api_key, base_url, model = get_api_config_from_request()

    if not api_key or not model:
        return jsonify({'error': 'API Key or Model not configured. Please set up your model settings first.'}), 400

    try:
        if locale == 'zh':
            prompt = f"""你是一个专业的小说大纲设计师。请为以下创意生成详细的小说大纲。

用户创意：{novel.user_idea}
目标字数：{novel.word_count}字
分类：{novel.category}

请生成包含3-5卷的完整大纲，每卷包含3-5章。
请用中文回复。
必须严格返回纯JSON格式（不要包含任何markdown标记或代码块），格式如下：
{{"title": "小说标题", "volumes": [{{"title": "卷名", "description": "卷简介", "chapters": [{{"title": "章名", "outline": "章纲简介"}}]}}]}}"""
        else:
            prompt = f"""You are a professional novel outline designer. Generate a detailed outline for the following idea.

User Idea: {novel.user_idea}
Target Word Count: {novel.word_count}
Category: {novel.category}

Generate a complete outline with 3-5 volumes, each containing 3-5 chapters.
Reply in English.
You MUST return strictly pure JSON (no markdown or code fences) with this exact format:
{{"title": "Novel Title", "volumes": [{{"title": "Volume Title", "description": "Volume description", "chapters": [{{"title": "Chapter Title", "outline": "Chapter outline"}}]}}]}}"""

        result_text = call_llm_api(
            api_key=api_key,
            base_url=base_url,
            model=model,
            messages=[{"role": "user", "content": prompt}],
            json_mode=True
        )

        result = json.loads(result_text)

        novel.title = result.get('title', novel.title)

        for v in novel.volumes:
            app.db.session.delete(v)

        for i, v_data in enumerate(result.get('volumes', [])):
            volume = Volume(
                novel_id=novel.id,
                order_index=i,
                title=v_data.get('title', ''),
                description=v_data.get('description', '')
            )
            app.db.session.add(volume)
            app.db.session.flush()
            for j, c_data in enumerate(v_data.get('chapters', [])):
                chapter = Chapter(
                    volume_id=volume.id,
                    order_index=j,
                    title=c_data.get('title', ''),
                    outline=c_data.get('outline', '')
                )
                app.db.session.add(chapter)

        app.db.session.commit()
        return jsonify(serialize_novel(novel, include_details=True))

    except Exception as e:
        return jsonify({'error': str(e)}), 500

generation_stop_flags = {}

@app.route('/api/novels/<int:id>/generate', methods=['POST'])
def generate_novel(id):
    novel = Novel.query.get_or_404(id)

    if novel.status == 'generating':
        return jsonify({'status': 'already generating'})

    novel.status = 'generating'
    app.db.session.commit()

    log(f"[Generate] All headers: {dict(request.headers)}")

    api_key, base_url, model = get_api_config_from_request()
    locale = request.headers.get('X-Locale', 'zh')

    log(f"[Generate] Request received - API Key: {api_key[:15] if api_key else 'EMPTY'}...")
    log(f"[Generate] Base URL: {base_url}, Model: {model}")

    if not api_key or not model:
        novel.status = 'interrupted'
        app.db.session.commit()
        return jsonify({'error': 'API Key or Model not configured'}), 400

    generation_stop_flags[id] = False

    def generate_content():
        import time
        with app.app_context():
            try:
                current_novel = Novel.query.get(id)
                if not current_novel:
                    log(f"[Generate] Novel {id} not found in thread")
                    return

                total = sum(len(v.chapters) for v in current_novel.volumes)
                current = 0
                log(f"[Generate] Starting generation for novel {id} ({total} chapters), model={model}")

                for volume in sorted(current_novel.volumes, key=lambda x: x.order_index):
                    for chapter in sorted(volume.chapters, key=lambda x: x.order_index):
                        if generation_stop_flags.get(id, False):
                            log(f"[Generate] Generation stopped by user for novel {id}")
                            current_novel.status = 'interrupted'
                            current_novel.updated_at = datetime.utcnow()
                            app.db.session.commit()
                            return

                        if chapter.content:
                            current += 1
                            log(f"[Generate] Skipping chapter {current}/{total}: {chapter.title} (already has content)")
                            continue

                        log(f"[Generate] Generating chapter {current+1}/{total}: {chapter.title}")

                        if locale == 'zh':
                            prompt = f"""你是一个专业的小说作家。请根据以下大纲撰写章节内容。

小说标题：{current_novel.title}
卷名：{volume.title}
章名：{chapter.title}
章纲：{chapter.outline}

请撰写2000-3000字的章节内容，情节生动，人物鲜明。
请用中文写作。"""
                        else:
                            prompt = f"""You are a professional novelist. Write a chapter based on the following outline.

Novel Title: {current_novel.title}
Volume Title: {volume.title}
Chapter Title: {chapter.title}
Chapter Outline: {chapter.outline}

Write 2000-3000 words of chapter content with vivid plot and distinct characters.
Write in English."""

                        chapter_start_time = time.time()
                        try:
                            log(f"[Generate] Calling LLM for chapter {chapter.title}...")
                            content = call_llm_api(
                                api_key=api_key,
                                base_url=base_url,
                                model=model,
                                messages=[{"role": "user", "content": prompt}]
                            )
                            chapter.content = content
                            current_novel.updated_at = datetime.utcnow()
                            app.db.session.commit()
                            current += 1
                            elapsed = time.time() - chapter_start_time
                            log(f"[Generate] Chapter {current}/{total} done: {chapter.title} ({len(content)} chars) in {elapsed:.1f}s")
                        except Exception as e:
                            elapsed = time.time() - chapter_start_time
                            log(f"[Generate] ERROR generating chapter {chapter.id} after {elapsed:.1f}s: {e}")
                            import traceback
                            traceback.print_exc()
                            current_novel.status = 'interrupted'
                            current_novel.updated_at = datetime.utcnow()
                            app.db.session.commit()
                            return

                current_novel.status = 'done'
                current_novel.updated_at = datetime.utcnow()
                app.db.session.commit()
                log(f"[Generate] Novel {id} generation complete!")

            except Exception as e:
                log(f"[Generate] FATAL error in generation thread: {e}")
                import traceback
                traceback.print_exc()
                try:
                    current_novel = Novel.query.get(id)
                    if current_novel:
                        current_novel.status = 'interrupted'
                        current_novel.updated_at = datetime.utcnow()
                        app.db.session.commit()
                except:
                    pass

    thread = threading.Thread(target=generate_content)
    thread.daemon = True
    thread.start()
    log(f"[Generate] Thread started for novel {id}")

    return jsonify({'status': 'generating'})

@app.route('/api/novels/<int:id>/stop', methods=['POST'])
def stop_generation(id):
    novel = Novel.query.get_or_404(id)

    if novel.status != 'generating':
        return jsonify({'status': 'not generating'})

    generation_stop_flags[id] = True
    novel.status = 'interrupted'
    novel.updated_at = datetime.utcnow()
    app.db.session.commit()
    log(f"[Generate] Stop requested for novel {id}")

    return jsonify({'status': 'interrupted'})

@app.route('/api/novels/<int:id>/progress', methods=['GET'])
def get_progress(id):
    novel = Novel.query.get_or_404(id)

    total_chapters = 0
    completed_chapters = 0
    current_chapter = None

    for volume in novel.volumes:
        for chapter in volume.chapters:
            total_chapters += 1
            if chapter.content:
                completed_chapters += 1
            elif not current_chapter:
                current_chapter = chapter.title

    # Read recent logs
    recent_logs = []
    try:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                recent_logs = [l.strip() for l in lines[-20:] if l.strip()]
    except:
        pass

    return jsonify({
        'current': completed_chapters,
        'total': total_chapters,
        'currentChapter': current_chapter,
        'status': novel.status,
        'logs': recent_logs
    })

@app.route('/api/novels/<int:id>/chapters/<int:chapter_id>', methods=['GET'])
def get_chapter(id, chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    return jsonify(serialize_chapter(chapter))

@app.route('/api/novels/<int:id>/chapters/<int:chapter_id>', methods=['PUT'])
def update_chapter(id, chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    data = request.json
    chapter.content = data.get('content', chapter.content)
    app.db.session.commit()
    return jsonify(serialize_chapter(chapter))

@app.route('/api/novels/<int:id>/download', methods=['GET'])
def download_txt(id):
    novel = Novel.query.get_or_404(id)

    content = f"# {novel.title}\n\n"
    content += f"分类：{novel.category} | 字数：{novel.word_count}\n\n"

    for volume in sorted(novel.volumes, key=lambda x: x.order_index):
        content += f"\n## {volume.title}\n\n"
        if volume.description:
            content += f"{volume.description}\n\n"
        for chapter in sorted(volume.chapters, key=lambda x: x.order_index):
            content += f"### {chapter.title}\n\n"
            if chapter.content:
                content += f"{chapter.content}\n\n"

    return send_file(
        io.BytesIO(content.encode('utf-8')),
        mimetype='text/plain; charset=utf-8',
        as_attachment=True,
        download_name=f'{novel.title}.txt'
    )

@app.route('/api/novels/<int:id>/export/epub', methods=['GET'])
def export_epub(id):
    novel = Novel.query.get_or_404(id)

    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<root>
<title>{novel.title}</title>
<category>{novel.category}</category>
<word_count>{novel.word_count}</word_count>
<volumes>
"""

    for volume in sorted(novel.volumes, key=lambda x: x.order_index):
        content += f"<volume><title>{volume.title}</title><description>{volume.description or ''}</description>\n"
        for chapter in sorted(volume.chapters, key=lambda x: x.order_index):
            content += f"<chapter><title>{chapter.title}</title><content>{chapter.content or ''}</content></chapter>\n"
        content += "</volume>\n"

    content += "</volumes>\n</root>"

    return send_file(
        io.BytesIO(content.encode('utf-8')),
        mimetype='application/epub+zip',
        as_attachment=True,
        download_name=f'{novel.title}.epub'
    )

@app.route('/api/novels/<int:id>/chapters/<int:chapter_id>/download/txt', methods=['GET'])
def download_chapter_txt(id, chapter_id):
    novel = Novel.query.get_or_404(id)
    for volume in novel.volumes:
        for chapter in volume.chapters:
            if chapter.id == chapter_id:
                content = f"{chapter.title}\n\n{chapter.content or ''}"
                return send_file(
                    io.BytesIO(content.encode('utf-8')),
                    mimetype='text/plain;charset=utf-8',
                    as_attachment=True,
                    download_name=f'{chapter.title}.txt'
                )
    return jsonify({'error': 'Chapter not found'}), 404

@app.route('/api/novels/<int:id>/chapters/<int:chapter_id>/export/epub', methods=['GET'])
def export_chapter_epub(id, chapter_id):
    novel = Novel.query.get_or_404(id)
    for volume in novel.volumes:
        for chapter in volume.chapters:
            if chapter.id == chapter_id:
                content = f"""<?xml version="1.0" encoding="UTF-8"?>
<root>
<title>{chapter.title}</title>
<novel_title>{novel.title}</novel_title>
<volume_title>{volume.title}</volume_title>
<content>{chapter.content or ''}</content>
</root>"""
                return send_file(
                    io.BytesIO(content.encode('utf-8')),
                    mimetype='application/epub+zip',
                    as_attachment=True,
                    download_name=f'{chapter.title}.epub'
                )
    return jsonify({'error': 'Chapter not found'}), 404

@app.route('/api/providers', methods=['GET'])
def get_providers():
    return jsonify([
        {
            'id': 'openai',
            'name': 'OpenAI',
            'baseUrl': 'https://api.openai.com/v1',
            'defaultModel': 'gpt-4o-mini',
            'models': ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-4']
        },
        {
            'id': 'deepseek',
            'name': 'DeepSeek',
            'baseUrl': 'https://api.deepseek.com/v1',
            'defaultModel': 'deepseek-chat',
            'models': ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v3', 'deepseek-v2.5', 'deepseek-v4-flash', 'deepseek-v4-pro']
        },
        {
            'id': 'siliconflow',
            'name': '硅基流动',
            'baseUrl': 'https://api.siliconflow.cn/v1',
            'defaultModel': 'Qwen/Qwen2.5-7B-Instruct',
            'models': [
                'Qwen/Qwen2.5-7B-Instruct',
                'Qwen/Qwen2.5-14B-Instruct',
                'Qwen/Qwen2.5-32B-Instruct',
                'Qwen/Qwen2-7B-Chat',
                'Qwen/Qwen2-14B-Chat',
                '01-ai/Yi-6B-Chat',
                '01-ai/Yi-34B-Chat'
            ]
        },
        {
            'id': 'ollama',
            'name': 'Ollama (本地)',
            'baseUrl': 'http://localhost:11434/v1',
            'defaultModel': 'llama3',
            'models': ['llama3', 'qwen2', 'mistral', 'gemma', 'phi3']
        },
        {
            'id': 'dashscope',
            'name': '阿里云通义千问',
            'baseUrl': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            'defaultModel': 'qwen-turbo',
            'models': ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-max-longcontext']
        },
        {
            'id': 'spark',
            'name': '讯飞星火',
            'baseUrl': 'https://spark-api.xf-yun.com/v1',
            'defaultModel': 'spark-3.5',
            'models': ['spark-3.5', 'spark-3.0', 'spark-2.0']
        },
        {
            'id': 'ernie',
            'name': '百度文心一言',
            'baseUrl': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
            'defaultModel': 'ernie-3.5',
            'models': ['ernie-3.5', 'ernie-4.0', 'ernie-turbo']
        },
        {
            'id': 'anthropic',
            'name': 'Anthropic (via兼容接口)',
            'baseUrl': 'https://api.anthropic.com/v1',
            'defaultModel': 'claude-3-sonnet-20240229',
            'models': ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']
        },
        {
            'id': 'custom',
            'name': '自定义',
            'baseUrl': '',
            'defaultModel': '',
            'models': []
        }
    ])

@app.route('/api/test-api', methods=['POST'])
def test_api():
    data = request.json
    api_key = data.get('api_key', '')
    base_url = data.get('base_url', '')
    model = data.get('model', '')

    if not api_key or not model:
        return jsonify({'success': False, 'message': 'API Key 和 Model 不能为空'})

    try:
        log(f"[TestAPI] Testing with API Key: {api_key[:15]}..., BaseURL: {base_url}, Model: {model}")
        content = call_llm_api(
            api_key=api_key,
            base_url=base_url,
            model=model,
            messages=[{"role": "user", "content": "Hi! Respond with one word."}],
            json_mode=False
        )
        log(f"[TestAPI] Success! Got response: {content[:50]}...")
        return jsonify({'success': True, 'message': f'Connection successful! Got: {content[:50]}...'})
    except Exception as e:
        log(f"[TestAPI] Error: {e}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/debug/config', methods=['GET'])
def debug_config():
    """调试端点：显示前端传递的配置"""
    api_key = request.headers.get('X-API-Key', '')
    base_url = request.headers.get('X-Base-URL', '')
    model = request.headers.get('X-Model', '')
    
    return jsonify({
        'apiKey': api_key[:15] + '...' if api_key else 'EMPTY',
        'baseUrl': base_url or 'EMPTY',
        'model': model or 'EMPTY'
    })

SUGGESTIONS_POOL = {
    'zh': {
        'protagonist': [
            '普通青年意外获得异能', '退役特种兵重新出发', '天才科学家拯救世界', '穿越者适应新世界', '失忆的绝世高手',
            '富二代隐藏身份创业', '濒死之人获得第二次机会', '拥有特殊血脉的继承人', '人工智能觉醒意识', '废柴逆袭成王者',
            '被放逐的王子归来', '平凡上班族卷入超自然事件', '转世重生的古代帝王', '拥有时间回溯能力的少女',
            '从底层崛起的佣兵之王', '被选中拯救世界的普通人', '拥有双重人格的侦探', '沉睡千年的吸血鬼苏醒',
            '从异世界归来的勇者', '拥有预知能力的赌徒', '被家族抛弃的天才少年', '从实验体逃脱的超能力者',
            '继承古老传承的医者', '拥有龙族血脉的少年', '从未来穿越回来的战士', '被封印的神兽化为人形',
            '拥有空间异能的孤儿', '从星际流放地归来的罪犯', '掌握禁术的落魄法师', '被命运选中的棋子反抗命运',
        ],
        'world': [
            '现代都市异能世界', '修仙大陆万族林立', '未来星际殖民时代', '古代武侠江湖纷争', '末世丧尸求生世界',
            '魔法与科技并存的世界', '异界召唤师的世界', '远古神话复苏的世界', '赛博朋克反乌托邦', '田园牧歌的桃花源',
            '海底文明与人类共存', '天空之城与地底深渊', '灵气复苏的现代都市', '诸神黄昏后的新世界',
            '被游戏系统入侵的现实', '平行宇宙交汇的混沌时代', '修仙与科技融合的未来', '被冰封万年后解冻的地球',
            '人类意识上传的数字世界', '龙族统治的奇幻大陆', '被诅咒的永夜王国', '机械与血肉融合的生物朋克',
            '时间线不断重置的循环世界', '被遗忘的地下文明重见天日', '灵气枯竭后的废土修真界',
            '人类与AI共管的联邦星球', '被异界入侵后的残破都市', '以梦境为战场的虚幻世界',
            '由音乐驱动魔法的韵律世界', '食物链顶端是植物的异世界',
        ],
        'conflict': [
            '正邪两派终极对决', '家族恩怨情仇纠葛', '权力斗争血雨腥风', '自我认同与救赎', '保护所爱之人的牺牲',
            '揭开惊天阴谋真相', '资源争夺生存之战', '科技发展与伦理冲突', '爱情与责任的抉择', '命运抗争逆天改命',
            '阻止末日降临的倒计时', '寻找失落的古代神器', '打破世代诅咒的宿命', '不同种族之间的和平谈判',
            '揭露伪善统治者的真面目', '拯救被侵蚀的家园', '跨越时空的追杀与逃亡', '为了信念与全世界为敌',
            '在利益与道义间抉择', '解开自己身世之谜', '阻止邪神复苏的仪式', '打破阶级固化的革命',
            '在背叛与忠诚间选择', '修复破碎的世界法则', '对抗来自域外的入侵者', '化解延续千年的血仇',
            '在理想与现实间妥协', '阻止失控的AI统治世界', '夺回被掠夺的文明火种',
        ],
        'style': [
            '热血激昂燃向', '细腻柔情治愈系', '悬疑烧脑推理向', '轻松幽默搞笑风', '黑暗深沉致郁系',
            '史诗宏大叙事风', '清新文艺小确幸', '紧张刺激快节奏', '深度思考哲学向', '浪漫唯美童话风',
            '硬核军事写实风', '温情脉脉日常流', '恐怖惊悚氛围系', '热血中二少年风', '冷峻克制极简风',
            '华丽繁复巴洛克风', '戏谑讽刺黑色幽默', '诗意盎然散文风', '冷静客观纪实风', '浪漫冒险公路片风',
            '群像交织多线叙事', '第一人称沉浸式体验', '打破第四面墙元叙事', '复古怀旧年代感',
            '科幻硬核技术流', '东方美学意境流', '西方魔幻史诗感', '日式轻小说吐槽风',
        ],
        'advantage': [
            '过目不忘的记忆力', '超乎常人的理解力', '神秘势力的支持', '独特的人脉资源', '家传绝学或宝物',
            '系统或金手指', '不断突破的成长', '逆境中的坚强意志', '洞察人心的智慧', '无敌的运气',
            '掌握失传的古武术', '能与动植物沟通', '拥有过目不忘的武学天赋', '精通机关暗器之术',
            '获得上古神兽认可', '拥有改变因果的能力', '掌握预知未来的梦境', '身怀治愈万物的灵力',
            '拥有复制他人能力的异能', '通晓所有已灭绝语言', '能在死亡时回档重生', '拥有制造幻境的精神力',
            '体内封印着远古魔神', '天生免疫一切毒素', '拥有看穿虚妄的天眼', '能进入他人记忆回溯',
            '掌握失传已久的炼金术', '拥有召唤英灵的血脉', '能听见万物心声的共鸣',
        ],
    },
    'en': {
        'protagonist': [
            'Ordinary youth gains special powers', 'Retired soldier starts anew', 'Genius scientist saves the world',
            'Transmigrator adapts to new world', 'Amnesiac master warrior', 'Wealthy heir hiding identity',
            'Near-death second chance', 'Unique bloodline heir', 'AI awakens consciousness', 'Underdog rises to power',
            'Exiled prince returns', 'Office worker dragged into supernatural', 'Reincarnated ancient emperor',
            'Girl with time reversal ability', 'Mercenary king from the bottom', 'Ordinary person chosen to save world',
            'Detective with dual personality', 'Vampire awakened after millennia', 'Hero returned from another world',
            'Gambler with precognition', 'Genius abandoned by family', 'Escaped superpowered test subject',
            'Heir of ancient medical legacy', 'Boy with dragon bloodline', 'Warrior from the future',
            'Sealed divine beast in human form', 'Orphan with spatial powers', 'Criminal returned from exile',
            'Fallen mage mastering forbidden arts', 'Pawn chosen by fate rebels',
        ],
        'world': [
            'Modern urban fantasy', 'Cultivation martial arts world', 'Future interstellar era',
            'Ancient martial arts world', 'Post-apocalyptic survival', 'Magic meets technology',
            'Summoner realm', 'Ancient mythology revival', 'Cyberpunk dystopia', 'Pastoral paradise',
            'Undersea civilization coexists', 'Sky city and underground abyss', 'Spiritual energy modern city',
            'New world after Ragnarok', 'Reality invaded by game system', 'Chaotic era of parallel universes',
            'Future with cultivation and tech', 'Earth thawed after ice age', 'Digital world of uploaded minds',
            'Dragon-ruled fantasy continent', 'Cursed eternal night kingdom', 'Biopunk of flesh and machine',
            'Time loop reset world', 'Underground civilization rediscovered', 'Wasteland cultivation world',
            'Federal planet of humans and AI', 'Ruined city after invasion', 'Dream battlefield world',
            'Music-driven magic world', 'Plant-dominated ecosystem',
        ],
        'conflict': [
            'Final battle of good vs evil', 'Family drama and romance', 'Power struggle bloodbath',
            'Self-identity and redemption', 'Sacrifice for loved ones', 'Uncover conspiracy truth',
            'Resource competition war', 'Technology vs ethics', 'Love vs duty choice', 'Fate defiance',
            'Countdown to prevent apocalypse', 'Search for lost ancient artifact', 'Break generational curse',
            'Peace negotiation between races', 'Expose hypocritical ruler', 'Save eroded homeland',
            'Cross-time chase and escape', 'Enemy of the world for belief', 'Interest vs morality choice',
            'Unravel own origin mystery', 'Stop邪神 revival ritual', 'Revolution against class固化',
            'Choice between betrayal and loyalty', 'Repair broken world laws', 'Repel extradimensional invaders',
            'Resolve millennia-old blood feud', 'Compromise between ideal and reality',
            'Stop失控 AI world domination', 'Reclaim stolen civilization spark',
        ],
        'style': [
            'Action-packed', 'Gentle healing style', 'Suspenseful mystery', 'Light-hearted comedy',
            'Dark emotional journey', 'Epic grand narrative', 'Fresh literary style', 'Fast-paced thriller',
            'Deep philosophical', 'Romantic fairy tale', 'Hardcore military realism', 'Warm daily life flow',
            'Horror thriller atmosphere', 'Hot-blooded chuunibyou', 'Cold restrained minimalism',
            'Ornate baroque style', 'Satirical black humor', 'Poetic prose style', 'Objective documentary',
            'Romantic adventure road trip', 'Multi-character intertwined', 'First-person immersive',
            'Meta-narrative breaking 4th wall', 'Retro nostalgic era feel', 'Sci-fi hard tech',
            'Eastern aesthetic意境', 'Western magical epic', 'Light novel吐槽 style',
        ],
        'advantage': [
            'Photographic memory', 'Extraordinary comprehension', 'Mysterious faction support',
            'Unique connections', 'Family secrets/treasures', 'System/golden finger', 'Continuous growth',
            'Strong will in adversity', 'Insightful wisdom', 'Unbeatable luck', 'Lost ancient martial arts',
            'Communicate with nature', 'Photographic martial talent', 'Master of mechanisms and traps',
            'Ancient beast recognition', 'Causality-changing ability', 'Precognitive dreams',
            'Healing spiritual power', 'Copy others abilities', 'Extinct languages mastery',
            'Death checkpoint restart', 'Illusion-creating psyche', 'Sealed ancient demon within',
            'Immune to all toxins', 'Heavenly eye sees through falsehood', 'Enter others memories',
            'Lost alchemy mastery', 'Hero-summoning bloodline', 'Hear all things hearts resonance',
        ],
    }
}

# Track refresh counts per session to rotate suggestions
_suggest_refresh_counts = {}

@app.route('/api/suggest-options', methods=['POST'])
def suggest_options():
    data = request.json
    dimension = data.get('dimension', '')
    context = data.get('context', '')
    category = data.get('category', '')
    locale = request.headers.get('X-Locale', 'zh')
    use_ai = data.get('use_ai', False)

    pool = SUGGESTIONS_POOL.get(locale, SUGGESTIONS_POOL['zh']).get(dimension, [])
    if not pool:
        return jsonify([])

    # Default to AI if category is provided, since pool is generic
    should_use_ai = use_ai or (category and category != '玄幻')

    if should_use_ai:
        api_key, base_url, model = get_api_config_from_request()
        if api_key and model:
            try:
                dim_names = {
                    'zh': {
                        'protagonist': '主角设定', 'world': '世界观', 'conflict': '核心冲突',
                        'style': '风格基调', 'advantage': '主角优势'
                    },
                    'en': {
                        'protagonist': 'protagonist', 'world': 'world setting', 'conflict': 'core conflict',
                        'style': 'writing style', 'advantage': 'protagonist advantage'
                    }
                }
                dim_name = dim_names.get(locale, dim_names['zh']).get(dimension, dimension)

                if locale == 'zh':
                    prompt = f"""你是小说创意助手。请根据以下信息，生成10个新颖的{dim_name}创意选项。

小说分类：{category}
故事背景：{context}

要求：
1. 每个选项简短有力，不超过15个字
2. 选项必须与{category}分类相关，例如历史类不应出现魔法、外星人等元素
3. 选项要有创意，避免陈词滥调
4. 直接返回列表，每行一个选项，不要编号和额外说明
5. 确保选项与故事背景相关"""
                else:
                    prompt = f"""You are a novel idea assistant. Based on the following information, generate 10 fresh creative options for {dim_name}.

Novel category: {category}
Story context: {context}

Requirements:
1. Each option should be concise, no more than 20 words
2. Options must be relevant to {category} genre, e.g. historical genre should not include magic or aliens
3. Be creative, avoid clichés
4. Return a plain list, one per line, no numbering or extra text
5. Make sure options are relevant to the story context"""

                content = call_llm_api(
                    api_key=api_key,
                    base_url=base_url,
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    json_mode=False
                )
                ai_options = [line.strip() for line in content.split('\n') if line.strip() and not line.strip().startswith('- ')][:10]
                if len(ai_options) >= 5:
                    log(f"[Suggest] AI generated {len(ai_options)} options for {dimension}")
                    return jsonify(ai_options)
            except Exception as e:
                log(f"[Suggest] AI generation failed: {e}")
                # Fall back to pool rotation

    # Pool rotation: return a different slice based on refresh count
    key = f"{locale}:{dimension}"
    count = _suggest_refresh_counts.get(key, 0)
    _suggest_refresh_counts[key] = count + 1

    # Return 10 options, rotating through the pool
    start = (count * 6) % len(pool)
    result = []
    for i in range(10):
        result.append(pool[(start + i) % len(pool)])

    return jsonify(result)


# Demo routes
@app.route('/api/demo/seed', methods=['POST'])
def demo_seed():
    novel = Novel(
        title='星际觉醒：人类新纪元',
        category='科幻',
        user_idea='未来人类在星际殖民过程中遭遇神秘文明',
        word_count=500000,
        status='confirmed'
    )
    app.db.session.add(novel)
    app.db.session.flush()

    volumes_data = [
        {
            'title': '第一卷：星际曙光',
            'description': '人类开始星际殖民，遭遇未知信号',
            'chapters': [
                {'title': '第一章：火星基地', 'outline': '主人公在火星基地的日常生活'},
                {'title': '第二章：神秘信号', 'outline': '接收来自深空的异常信号'},
                {'title': '第三章：星际议会', 'outline': '联合国召开紧急会议'},
            ]
        },
        {
            'title': '第二卷：文明觉醒',
            'description': '人类与外星文明的首次接触',
            'chapters': [
                {'title': '第四章：接触', 'outline': '外星飞船降临地球'},
                {'title': '第五章：翻译', 'outline': '破解外星语言'},
                {'title': '第六章：抉择', 'outline': '人类面临选择'},
            ]
        },
        {
            'title': '第三卷：新纪元',
            'description': '人类文明的全新篇章',
            'chapters': [
                {'title': '第七章：联盟', 'outline': '建立星际联盟'},
                {'title': '第八章：挑战', 'outline': '新的威胁出现'},
                {'title': '第九章：觉醒', 'outline': '人类文明觉醒'},
            ]
        },
    ]

    for i, v_data in enumerate(volumes_data):
        volume = Volume(
            novel_id=novel.id,
            order_index=i,
            title=v_data['title'],
            description=v_data['description']
        )
        app.db.session.add(volume)
        app.db.session.flush()
        for j, c_data in enumerate(v_data['chapters']):
            chapter = Chapter(
                volume_id=volume.id,
                order_index=j,
                title=c_data['title'],
                outline=c_data['outline']
            )
            app.db.session.add(chapter)

    app.db.session.commit()
    return jsonify(serialize_novel(novel, include_details=True))

@app.route('/api/demo/seed-en', methods=['POST'])
def demo_seed_en():
    novel = Novel(
        title='Stellar Awakening: New Era of Humanity',
        category='Sci-Fi',
        user_idea='In the future, humanity encounters a mysterious civilization during interstellar colonization',
        word_count=500000,
        status='confirmed'
    )
    app.db.session.add(novel)
    app.db.session.flush()

    volumes_data = [
        {
            'title': 'Volume 1: Dawn of the Stars',
            'description': 'Humanity begins interstellar colonization, encounters unknown signals',
            'chapters': [
                {'title': 'Chapter 1: Mars Base', 'outline': "Protagonist's daily life at Mars base"},
                {'title': 'Chapter 2: Mysterious Signal', 'outline': 'Receiving abnormal signals from deep space'},
                {'title': 'Chapter 3: Stellar Council', 'outline': 'UN convenes emergency meeting'},
            ]
        },
        {
            'title': 'Volume 2: Civilization Awakening',
            'description': "Humanity's first contact with alien civilization",
            'chapters': [
                {'title': 'Chapter 4: Contact', 'outline': 'Alien spacecraft descends to Earth'},
                {'title': 'Chapter 5: Translation', 'outline': 'Cracking alien language'},
                {'title': 'Chapter 6: Choice', 'outline': 'Humanity faces a choice'},
            ]
        },
        {
            'title': 'Volume 3: New Era',
            'description': 'A new chapter for human civilization',
            'chapters': [
                {'title': 'Chapter 7: Alliance', 'outline': 'Establishing interstellar alliance'},
                {'title': 'Chapter 8: Challenge', 'outline': 'New threats emerge'},
                {'title': 'Chapter 9: Awakening', 'outline': 'Human civilization awakens'},
            ]
        },
    ]

    for i, v_data in enumerate(volumes_data):
        volume = Volume(
            novel_id=novel.id,
            order_index=i,
            title=v_data['title'],
            description=v_data['description']
        )
        app.db.session.add(volume)
        app.db.session.flush()
        for j, c_data in enumerate(v_data['chapters']):
            chapter = Chapter(
                volume_id=volume.id,
                order_index=j,
                title=c_data['title'],
                outline=c_data['outline']
            )
            app.db.session.add(chapter)

    app.db.session.commit()
    return jsonify(serialize_novel(novel, include_details=True))

@app.route('/api/demo/generate-outline/<int:id>', methods=['POST'])
def demo_generate_outline(id):
    novel = Novel.query.get_or_404(id)
    volumes_data = [
        {
            'title': '第一卷：星际曙光',
            'description': '人类开始星际殖民，遭遇未知信号',
            'chapters': [
                {'title': '第一章：火星基地', 'outline': '主人公在火星基地的日常生活与工作'},
                {'title': '第二章：神秘信号', 'outline': '火星基地接收到来自深空的异常信号'},
                {'title': '第三章：星际议会', 'outline': '联合国召开紧急会议讨论对策'},
            ]
        },
        {
            'title': '第二卷：文明觉醒',
            'description': '人类与外星文明的首次接触',
            'chapters': [
                {'title': '第四章：接触', 'outline': '外星飞船突然降临地球'},
                {'title': '第五章：翻译', 'outline': '科学家们努力破解外星语言'},
                {'title': '第六章：抉择', 'outline': '人类面临历史性的重大选择'},
            ]
        },
        {
            'title': '第三卷：新纪元',
            'description': '人类文明的全新篇章',
            'chapters': [
                {'title': '第七章：联盟', 'outline': '人类与外星文明建立星际联盟'},
                {'title': '第八章：挑战', 'outline': '新的更大威胁开始出现'},
                {'title': '第九章：觉醒', 'outline': '人类文明迎来真正的觉醒'},
            ]
        },
    ]

    for v in novel.volumes:
        app.db.session.delete(v)

    for i, v_data in enumerate(volumes_data):
        volume = Volume(
            novel_id=novel.id,
            order_index=i,
            title=v_data['title'],
            description=v_data['description']
        )
        app.db.session.add(volume)
        app.db.session.flush()
        for j, c_data in enumerate(v_data['chapters']):
            chapter = Chapter(
                volume_id=volume.id,
                order_index=j,
                title=c_data['title'],
                outline=c_data['outline']
            )
            app.db.session.add(chapter)

    app.db.session.commit()
    return jsonify(serialize_novel(novel, include_details=True))

@app.route('/api/demo/generate-outline-en/<int:id>', methods=['POST'])
def demo_generate_outline_en(id):
    novel = Novel.query.get_or_404(id)
    volumes_data = [
        {
            'title': 'Volume 1: Dawn of the Stars',
            'description': 'Humanity begins interstellar colonization, encounters unknown signals',
            'chapters': [
                {'title': 'Chapter 1: Mars Base', 'outline': "Protagonist's daily life and work at Mars base"},
                {'title': 'Chapter 2: Mysterious Signal', 'outline': 'Mars base receives abnormal signals from deep space'},
                {'title': 'Chapter 3: Stellar Council', 'outline': 'UN convenes emergency meeting to discuss plans'},
            ]
        },
        {
            'title': 'Volume 2: Civilization Awakening',
            'description': "Humanity's first contact with alien civilization",
            'chapters': [
                {'title': 'Chapter 4: Contact', 'outline': 'Alien spacecraft suddenly descends to Earth'},
                {'title': 'Chapter 5: Translation', 'outline': 'Scientists work to crack alien language'},
                {'title': 'Chapter 6: Choice', 'outline': 'Humanity faces a historic major choice'},
            ]
        },
        {
            'title': 'Volume 3: New Era',
            'description': 'A new chapter for human civilization',
            'chapters': [
                {'title': 'Chapter 7: Alliance', 'outline': 'Humanity and alien civilization establish interstellar alliance'},
                {'title': 'Chapter 8: Challenge', 'outline': 'New and greater threats begin to emerge'},
                {'title': 'Chapter 9: Awakening', 'outline': 'Human civilization ushers in true awakening'},
            ]
        },
    ]

    for v in novel.volumes:
        app.db.session.delete(v)

    for i, v_data in enumerate(volumes_data):
        volume = Volume(
            novel_id=novel.id,
            order_index=i,
            title=v_data['title'],
            description=v_data['description']
        )
        app.db.session.add(volume)
        app.db.session.flush()
        for j, c_data in enumerate(v_data['chapters']):
            chapter = Chapter(
                volume_id=volume.id,
                order_index=j,
                title=c_data['title'],
                outline=c_data['outline']
            )
            app.db.session.add(chapter)

    app.db.session.commit()
    return jsonify(serialize_novel(novel, include_details=True))


if __name__ == '__main__':
    startup_check()
    app.run(host='0.0.0.0', port=5000, debug=True)

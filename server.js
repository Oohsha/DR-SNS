const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(cors()); // 프론트엔드 통신 허용
app.use(express.json()); // JSON 파싱

// --- 데이터베이스 역할 (메모리 저장소) ---
// 실제 서비스에서는 여기에 MongoDB나 MySQL을 연결합니다.
let db = {
    users: [],
    posts: [],
    comments: []
};

// --- [API 1] 사용자 인증 (Auth) ---
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }
    const newUser = { id: 'u_' + Date.now(), username, password };
    db.users.push(newUser);
    res.status(201).json({ message: "회원가입 성공" });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ id: user.id, username: user.username });
    } else {
        res.status(401).json({ message: "아이디 또는 비밀번호가 틀립니다." });
    }
});

// --- [API 2] 게시글 기능 (Posts) ---
app.get('/api/posts', (req, res) => {
    res.json(db.posts);
});

app.post('/api/posts', (req, res) => {
    const newPost = { ...req.body, id: 'p_' + Date.now(), likes: [], createdAt: new Date().toLocaleString() };
    db.posts.unshift(newPost); // 최신글 상단
    res.status(201).json(newPost);
});

app.delete('/api/posts/:id', (req, res) => {
    db.posts = db.posts.filter(p => p.id !== req.params.id);
    db.comments = db.comments.filter(c => c.postId !== req.params.id);
    res.json({ message: "삭제 완료" });
});

// --- [API 3] 좋아요 기능 (Likes) ---
app.post('/api/posts/:id/like', (req, res) => {
    const { userId } = req.body;
    const post = db.posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).send();

    const idx = post.likes.indexOf(userId);
    if (idx === -1) post.likes.push(userId);
    else post.likes.splice(idx, 1);
    res.json(post);
});

// --- [API 4] 댓글 기능 (Comments) ---
app.get('/api/comments/:postId', (req, res) => {
    const postComments = db.comments.filter(c => c.postId === req.params.postId);
    res.json(postComments);
});

app.post('/api/comments', (req, res) => {
    const newComment = { ...req.body, id: 'c_' + Date.now(), createdAt: new Date().toLocaleString() };
    db.comments.push(newComment);
    res.status(201).json(newComment);
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`[DR-SNS 서버 시작] http://localhost:${PORT}`);
});
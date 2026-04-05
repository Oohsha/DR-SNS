// 1. DNS 에러 방지
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); 

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // 파일 경로 설정을 위해 추가

const app = express();

// [수정 1] Render가 정해주는 포트를 사용하게 합니다. (매우 중요)
const PORT = process.env.PORT || 3000; 

// [수정 2] 보안을 위해 실제 주소는 Render 설정창(Environment Variables)에 넣을 것입니다.
// 로컬 테스트를 위해 일단 기존 주소를 뒤에 적어둡니다.
const MONGO_URI = process.env.MONGODB_URI || "mongodb://sdh250415_db_user:Xodbs0307@ac-hghibco-shard-00-00.fp0ajgn.mongodb.net:27017,ac-hghibco-shard-00-01.fp0ajgn.mongodb.net:27017,ac-hghibco-shard-00-02.fp0ajgn.mongodb.net:27017/?ssl=true&replicaSet=atlas-zwpmtm-shard-0&authSource=admin&appName=Cluster0";

// 몽고디비 연결
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ 몽고디비 연결 성공!"))
    .catch(err => console.error("❌ 연결 실패:", err));

app.use(cors());
app.use(express.json());

// [추가] 프론트엔드 파일(html, css, js)을 서버가 직접 보여주게 설정합니다.
// 이렇게 하면 Render 주소로 접속했을 때 바로 화면이 뜹니다.
app.use(express.static(path.join(__dirname, './')));

// --- API 구현 부분 (회원가입, 로그인 등) ---
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ message: "이미 사용 중인 아이디입니다." });
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ message: "회원가입 성공!" });
    } catch (e) { res.status(500).json({ message: "서버 에러" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) res.json({ id: user._id, username: user.username });
    else res.status(401).json({ message: "정보가 틀립니다." });
});

app.get('/api/posts', async (req, res) => {
    const posts = await Post.find().sort({ _id: -1 });
    res.json(posts);
});

app.post('/api/posts', async (req, res) => {
    const newPost = new Post(req.body);
    await newPost.save();
    res.json(newPost);
});

app.delete('/api/posts/:id', async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ postId: req.params.id });
    res.json({ message: "삭제 완료" });
});

app.post('/api/posts/:id/like', async (req, res) => {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    const idx = post.likes.indexOf(userId);
    if (idx === -1) post.likes.push(userId);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json(post);
});

app.get('/api/comments/:postId', async (req, res) => {
    const comments = await Comment.find({ postId: req.params.postId });
    res.json(comments);
});

app.post('/api/comments', async (req, res) => {
    const newComment = new Comment(req.body);
    await newComment.save();
    res.json(newComment);
});

// 데이터 구조 정의
const UserSchema = new mongoose.Schema({ username: { type: String, required: true }, password: { type: String, required: true } });
const PostSchema = new mongoose.Schema({
    title: String, content: String, author: String, authorId: String,
    likes: [String],
    date: { type: String, default: () => new Date().toLocaleString() }
});
const CommentSchema = new mongoose.Schema({
    postId: String, author: String, content: String,
    date: { type: String, default: () => new Date().toLocaleString() }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const Comment = mongoose.model('Comment', CommentSchema);

// 서버 실행
app.listen(PORT, () => console.log(`🚀 서버 시작: 포트 ${PORT}`));
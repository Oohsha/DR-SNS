const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); 

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

const MONGO_URI = process.env.MONGODB_URI || "mongodb://dradmin:dr1234@ac-hghibco-shard-00-00.fp0ajgn.mongodb.net:27017,ac-hghibco-shard-00-01.fp0ajgn.mongodb.net:27017,ac-hghibco-shard-00-02.fp0ajgn.mongodb.net:27017/dr_sns?ssl=true&replicaSet=atlas-zwpmtm-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ 몽고디비 연결 성공!"))
    .catch(err => console.error("❌ 연결 실패:", err));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

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

// API 구현
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

app.listen(PORT, () => console.log(`🚀 서버 시작: 포트 ${PORT}`));
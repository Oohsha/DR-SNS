/* DR-SNS 프론트엔드 스크립트 */
const API_URL = "http://localhost:3000/api";
let currentUser = JSON.parse(sessionStorage.getItem('dr_session')) || null;

document.addEventListener('DOMContentLoaded', () => {
    updateUIState();
    renderAllPosts();
});

// 서버 통신 함수
async function request(path, method = "GET", body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${API_URL}${path}`, options);
    return response.json();
}

async function handleSignup() {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    try {
        const result = await request('/signup', 'POST', { username, password });
        alert(result.message);
        if(result.message === "회원가입 성공!") toggleAuthTab('login');
    } catch (e) { alert("서버 통신 에러"); }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const user = await request('/login', 'POST', { username, password });
    if (user.id) {
        currentUser = user;
        sessionStorage.setItem('dr_session', JSON.stringify(currentUser));
        updateUIState();
        showView('main-view');
    } else { alert(user.message); }
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('dr_session');
    updateUIState();
    showView('main-view');
}

async function renderAllPosts() {
    const posts = await request('/posts');
    const container = document.getElementById('post-list');
    container.innerHTML = posts.length ? '' : '<div class="card">새 글을 작성해보세요!</div>';
    for (const post of posts) {
        const comments = await request(`/comments/${post.id}`);
        container.innerHTML += createPostHTML(post, comments);
    }
}

async function handleCreatePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    if (!title || !content) return alert("내용을 입력하세요.");
    await request('/posts', 'POST', { title, content, author: currentUser.username, authorId: currentUser.id });
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    renderAllPosts();
}

async function toggleLike(postId) {
    if (!currentUser) return alert("로그인 필요");
    await request(`/posts/${postId}/like`, 'POST', { userId: currentUser.id });
    refreshCurrentView();
}

async function addComment(postId) {
    const input = document.getElementById(`comment-in-${postId}`);
    if (!input.value.trim()) return;
    await request('/comments', 'POST', { postId, content: input.value, author: currentUser.username });
    input.value = '';
    refreshCurrentView();
}

async function deletePost(postId) {
    if (!confirm("삭제할까요?")) return;
    await request(`/posts/${postId}`, 'DELETE');
    refreshCurrentView();
}

function createPostHTML(post, postComments) {
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const isAuthor = currentUser && post.authorId === currentUser.id;
    return `
        <div class="card">
            <div class="post-header">
                <span class="post-author">@${post.author}</span>
                <span class="post-date">${post.date} ${isAuthor ? `<span class="delete-btn" onclick="deletePost('${post.id}')">삭제</span>` : ''}</span>
            </div>
            <div class="post-title">${post.title}</div>
            <div class="post-content">${post.content}</div>
            <div class="post-footer">
                <div class="action-item" onclick="toggleLike('${post.id}')" style="color:${isLiked ? '#bb86fc' : 'inherit'}">❤️ ${post.likes.length}</div>
                <div class="action-item">💬 ${postComments.length}</div>
            </div>
            <div class="comment-section">
                ${postComments.map(c => `<div class="comment-item"><strong>${c.author}:</strong> ${c.content}</div>`).join('')}
                <div class="comment-form">
                    <input type="text" id="comment-in-${post.id}" placeholder="댓글 입력...">
                    <button class="btn-main" style="width:60px;" onclick="addComment('${post.id}')">등록</button>
                </div>
            </div>
        </div>`;
}

function updateUIState() {
    const nav = document.getElementById('nav-menu');
    const writeArea = document.getElementById('post-write-area');
    if (currentUser) {
        nav.innerHTML = `<span>${currentUser.username}님</span> <button onclick="showView('profile-view')">내글</button> <button onclick="handleLogout()">로그아웃</button>`;
        writeArea.classList.remove('hidden');
    } else {
        nav.innerHTML = `<button onclick="showView('auth-view')">로그인</button>`;
        writeArea.classList.add('hidden');
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'main-view') renderAllPosts();
    if (viewId === 'profile-view') renderMyPosts();
}

function toggleAuthTab(type) {
    document.getElementById('login-form').classList.toggle('hidden', type !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', type === 'login');
}

function refreshCurrentView() {
    if (document.getElementById('profile-view').classList.contains('active')) renderMyPosts();
    else renderAllPosts();
}

async function renderMyPosts() {
    const posts = await request('/posts');
    const myPosts = posts.filter(p => p.authorId === currentUser.id);
    const container = document.getElementById('my-post-list');
    container.innerHTML = '';
    for (const post of myPosts) {
        const comments = await request(`/comments/${post.id}`);
        container.innerHTML += createPostHTML(post, comments);
    }
}
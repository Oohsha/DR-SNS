/* 1~7단계 통합: UI 및 하트 기능 수정 버전 */
// const API_URL = "/api";
const API_URL = "http://localhost:3000/api"; //내 컴터 테스트용

let currentUser = JSON.parse(sessionStorage.getItem('dr_session')) || null;

document.addEventListener('DOMContentLoaded', () => {
    updateUIState();
    renderAllPosts();
});

async function request(path, method = "GET", body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${API_URL}${path}`, options);
    return response.json();
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if (viewId === 'main-view') renderAllPosts();
    if (viewId === 'profile-view') renderMyPosts();
}

function updateUIState() {
    const nav = document.getElementById('nav-menu');
    const writeArea = document.getElementById('post-write-area');
    if (currentUser) {
        nav.innerHTML = `
            <span class="user-info"><strong>${currentUser.username}</strong>님</span>
            <button onclick="showView('profile-view')">내 활동</button>
            <button onclick="handleLogout()" style="border-color:var(--danger); color:var(--danger);">로그아웃</button>
        `;
        writeArea.classList.remove('hidden');
    } else {
        nav.innerHTML = `<button onclick="showView('auth-view')">로그인 / 회원가입</button>`;
        writeArea.classList.add('hidden');
    }
}

// 렌더링 엔진 (post.id -> post._id 로 수정)
function createPostHTML(post, postComments) {
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const isAuthor = currentUser && post.authorId === currentUser.id;
    const postId = post._id; // 몽고디비 고유 ID 사용

    return `
        <div class="card">
            <div class="post-header">
                <span class="post-author">@${post.author}</span>
                <span class="post-date">${post.date} ${isAuthor ? `<span class="delete-btn" onclick="deletePost('${postId}')">삭제</span>` : ''}</span>
            </div>
            <div class="post-title">${post.title}</div>
            <div class="post-content">${post.content}</div>
            <div class="post-footer">
                <div class="action-item" onclick="toggleLike('${postId}')" style="color:${isLiked ? 'var(--accent)' : 'inherit'}">
                    ${isLiked ? '❤️' : '🤍'} <span>${post.likes.length}</span>
                </div>
                <div class="action-item">💬 ${postComments.length}</div>
            </div>
            <div class="comment-section">
                <div class="comment-list">
                    ${postComments.map(c => `<div class="comment-item"><span class="comment-author">${c.author}:</span> ${c.content}</div>`).join('')}
                </div>
                ${currentUser ? `
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <input type="text" id="comment-in-${postId}" placeholder="댓글 입력..." style="margin-bottom:0; padding:8px; font-size:0.8rem;">
                        <button class="btn-main" style="width:60px; padding:5px; font-size:0.8rem;" onclick="addComment('${postId}')">등록</button>
                    </div>
                ` : ''}
            </div>
        </div>`;
}

async function handleCreatePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    if (!title || !content) return alert("내용을 채워주세요.");
    await request('/posts', 'POST', { title, content, author: currentUser.username, authorId: currentUser.id });
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    renderAllPosts();
}

async function handleLogin() {
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    const res = await request('/login', 'POST', { username: u, password: p });
    if (res.id) {
        currentUser = res;
        sessionStorage.setItem('dr_session', JSON.stringify(currentUser));
        updateUIState();
        showView('main-view');
    } else { alert("로그인 실패"); }
}

async function handleSignup() {
    const u = document.getElementById('signup-username').value;
    const p = document.getElementById('signup-password').value;
    const res = await request('/signup', 'POST', { username: u, password: p });
    alert(res.message);
    if(res.message === "회원가입 성공!") toggleAuthTab('login');
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
    container.innerHTML = posts.length ? '' : '<p style="text-align:center; color:#888;">게시글이 없습니다.</p>';
    for (const post of posts) {
        const comments = await request(`/comments/${post._id}`);
        container.innerHTML += createPostHTML(post, comments);
    }
}

async function renderMyPosts() {
    if(!currentUser) return;
    document.getElementById('user-display-name').innerText = `${currentUser.username}님`;
    const posts = await request('/posts');
    const myPosts = posts.filter(p => p.authorId === currentUser.id);
    const container = document.getElementById('my-post-list');
    container.innerHTML = '';
    for (const post of myPosts) {
        const comments = await request(`/comments/${post._id}`);
        container.innerHTML += createPostHTML(post, comments);
    }
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

function toggleAuthTab(type) {
    document.getElementById('login-form').classList.toggle('hidden', type !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', type === 'login');
    document.getElementById('tab-login').classList.toggle('active', type === 'login');
    document.getElementById('tab-signup').classList.toggle('active', type !== 'login');
}

function refreshCurrentView() {
    if (document.getElementById('profile-view').classList.contains('active')) renderMyPosts();
    else renderAllPosts();
}
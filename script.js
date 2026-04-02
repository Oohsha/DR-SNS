/* 7단계 통합: 백엔드 서버 연동 버전 */

const API_URL = "http://localhost:3000/api";
let currentUser = JSON.parse(sessionStorage.getItem('dr_session')) || null;

document.addEventListener('DOMContentLoaded', () => {
    updateUIState();
    renderAllPosts();
});

// --- 서버 통신 공통 함수 (Fetch) ---
async function request(path, method = "GET", body = null) {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_URL}${path}`, options);
    return response.json();
}

// --- 사용자 인증 (Auth) ---
async function handleSignup() {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    try {
        const result = await request('/signup', 'POST', { username, password });
        if(result.message) {
            alert(result.message);
            toggleAuthTab('login');
        }
    } catch (e) { alert("회원가입 중 오류가 발생했습니다."); }
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
    } else {
        alert(user.message || "로그인 실패");
    }
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('dr_session');
    updateUIState();
    showView('main-view');
}

// --- 게시글/좋아요/댓글 기능 ---
async function renderAllPosts() {
    const posts = await request('/posts');
    const container = document.getElementById('post-list');
    container.innerHTML = posts.length ? '' : '<div class="card">새로운 글을 작성해보세요!</div>';

    for (const post of posts) {
        const comments = await request(`/comments/${post.id}`);
        container.innerHTML += createPostHTML(post, comments);
    }
}

async function handleCreatePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    if (!title || !content) return;

    await request('/posts', 'POST', {
        title, content, author: currentUser.username, authorId: currentUser.id
    });

    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    renderAllPosts();
}

async function toggleLike(postId) {
    if (!currentUser) return alert("로그인이 필요합니다.");
    await request(`/posts/${postId}/like`, 'POST', { userId: currentUser.id });
    refreshCurrentView();
}

async function handleAddComment(postId) {
    if (!currentUser) return alert("로그인이 필요합니다.");
    const input = document.getElementById(`comment-in-${postId}`);
    if (!input.value.trim()) return;

    await request('/comments', 'POST', {
        postId, content: input.value, author: currentUser.username
    });
    input.value = '';
    refreshCurrentView();
}

async function deletePost(postId) {
    if (!confirm("삭제하시겠습니까?")) return;
    await request(`/posts/${postId}`, 'DELETE');
    refreshCurrentView();
}

// --- 마이페이지 (사용자별 기능) ---
async function renderMyPosts() {
    const allPosts = await request('/posts');
    const myPosts = allPosts.filter(p => p.authorId === currentUser.id);
    document.getElementById('user-display-name').innerText = `${currentUser.username} 님의 마이페이지`;
    
    const container = document.getElementById('my-post-list');
    container.innerHTML = '';
    for (const post of myPosts) {
        const comments = await request(`/comments/${post.id}`);
        container.innerHTML += createPostHTML(post, comments);
    }
}

// --- UI 렌더링 헬퍼 ---
function createPostHTML(post, postComments) {
    const isLiked = currentUser && post.likes.includes(currentUser.id);
    const isAuthor = currentUser && post.authorId === currentUser.id;

    return `
        <div class="card">
            <div class="post-header">
                <span class="post-author">@${post.author}</span>
                <span class="post-date">${post.createdAt} ${isAuthor ? `<span class="delete-btn" onclick="deletePost('${post.id}')"> | 삭제</span>` : ''}</span>
            </div>
            <div class="post-title">${post.title}</div>
            <div class="post-content">${post.content}</div>
            <div class="post-footer">
                <div class="action-item" onclick="toggleLike('${post.id}')" style="color:${isLiked ? 'var(--accent)' : 'inherit'}">
                    ${isLiked ? '❤️' : '🤍'} ${post.likes.length}
                </div>
                <div class="action-item">💬 ${postComments.length}</div>
            </div>
            <div class="comment-section">
                ${postComments.map(c => `
                    <div class="comment-item"><span class="comment-author">${c.author}:</span> ${c.content}</div>
                `).join('')}
                ${currentUser ? `
                    <div class="comment-form">
                        <input type="text" id="comment-in-${post.id}" placeholder="댓글 입력...">
                        <button class="btn-main" style="width:60px; padding:5px; font-size:0.8rem;" onclick="handleAddComment('${post.id}')">등록</button>
                    </div>
                ` : ''}
            </div>
        </div>`;
}

// --- 화면 전환 및 상태 관리 ---
function updateUIState() {
    const nav = document.getElementById('nav-menu');
    const writeArea = document.getElementById('post-write-area');
    if (currentUser) {
        nav.innerHTML = `<span class="user-info">${currentUser.username}님</span><button onclick="showView('profile-view')">마이페이지</button><button onclick="handleLogout()">로그아웃</button>`;
        writeArea.classList.remove('hidden');
    } else {
        nav.innerHTML = `<button onclick="showView('auth-view')">로그인 / 가입</button>`;
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
    document.getElementById('tab-login').classList.toggle('active', type === 'login');
    document.getElementById('tab-signup').classList.toggle('active', type !== 'login');
}

function refreshCurrentView() {
    if (document.getElementById('profile-view').classList.contains('active')) renderMyPosts();
    else renderAllPosts();
}
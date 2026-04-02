/* 7. 데이터 처리 - LocalStorage 활용 */
let users = JSON.parse(localStorage.getItem('dr_users')) || [];
let posts = JSON.parse(localStorage.getItem('dr_posts')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('dr_currentUser')) || null;

// 초기화: 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    renderPosts();
});

// 5. 화면 전환 기능
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    if(viewId === 'main-view') renderPosts();
    if(viewId === 'profile-view') renderMyPosts();
}

/* 3.4 사용자 인증 기능 */
function handleSignup() {
    const id = document.getElementById('signup-id').value;
    const pw = document.getElementById('signup-pw').value;
    
    if(!id || !pw) return alert("아이디와 비밀번호를 모두 입력해주세요.");
    if(users.find(u => u.id === id)) return alert("이미 존재하는 아이디입니다.");

    users.push({ id, pw });
    localStorage.setItem('dr_users', JSON.stringify(users));
    alert("회원가입이 완료되었습니다! 로그인해주세요.");
    showView('login-view');
}

function handleLogin() {
    const id = document.getElementById('login-id').value;
    const pw = document.getElementById('login-pw').value;
    const user = users.find(u => u.id === id && u.pw === pw);

    if(user) {
        currentUser = user;
        sessionStorage.setItem('dr_currentUser', JSON.stringify(currentUser));
        updateNav();
        showView('main-view');
    } else {
        alert("아이디 또는 비밀번호가 올바르지 않습니다.");
    }
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('dr_currentUser');
    updateNav();
    showView('main-view');
}

// 네비게이션 및 UI 상태 업데이트
function updateNav() {
    const nav = document.getElementById('nav-menu');
    const writeArea = document.getElementById('post-write-area');
    
    if(currentUser) {
        nav.innerHTML = `
            <span style="margin-right:10px;"><strong>${currentUser.id}</strong>님</span>
            <button onclick="showView('profile-view')">내 글</button>
            <button onclick="handleLogout()">로그아웃</button>
        `;
        writeArea.classList.remove('hidden');
    } else {
        nav.innerHTML = `
            <button onclick="showView('login-view')">로그인</button>
            <button onclick="showView('signup-view')">회원가입</button>
        `;
        writeArea.classList.add('hidden');
    }
}

/* 3.1 게시글 기능 (CRUD) */
function handleCreatePost() {
    const content = document.getElementById('post-input').value;
    if(!content.trim()) return;

    const newPost = {
        id: Date.now(),
        author: currentUser.id,
        content: content,
        date: new Date().toLocaleString(),
        likes: [],
        comments: []
    };

    posts.unshift(newPost); // 최신글이 위로 오게 추가
    savePosts();
    document.getElementById('post-input').value = '';
    renderPosts();
}

function deletePost(postId) {
    if(!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
    posts = posts.filter(p => p.id !== postId);
    savePosts();
    
    // 현재 뷰에 따라 다시 렌더링
    if(document.getElementById('profile-view').classList.contains('active')) {
        renderMyPosts();
    } else {
        renderPosts();
    }
}

/* 3.3 좋아요 기능 */
function toggleLike(postId) {
    if(!currentUser) return alert("로그인이 필요한 서비스입니다.");
    const post = posts.find(p => p.id === postId);
    const likeIndex = post.likes.indexOf(currentUser.id);

    if(likeIndex === -1) {
        post.likes.push(currentUser.id);
    } else {
        post.likes.splice(likeIndex, 1);
    }
    savePosts();
    refreshCurrentView();
}

/* 3.2 댓글 기능 */
function addComment(postId) {
    if(!currentUser) return alert("로그인이 필요한 서비스입니다.");
    const input = document.getElementById(`comment-in-${postId}`);
    if(!input.value.trim()) return;

    const post = posts.find(p => p.id === postId);
    post.comments.push({
        author: currentUser.id,
        text: input.value
    });
    savePosts();
    input.value = '';
    refreshCurrentView();
}

// 공통 데이터 저장 함수
function savePosts() {
    localStorage.setItem('dr_posts', JSON.stringify(posts));
}

// 화면 렌더링 함수
function renderPosts(targetData = posts, containerId = 'post-list') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if(targetData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">표시할 게시글이 없습니다.</p>';
        return;
    }

    targetData.forEach(post => {
        const isLiked = currentUser && post.likes.includes(currentUser.id);
        const isAuthor = currentUser && post.author === currentUser.id;

        const postHtml = `
            <div class="card">
                <div class="post-header">
                    <span class="post-author">@${post.author}</span>
                    <div>
                        <span class="post-date">${post.date}</span>
                        ${isAuthor ? `<span class="delete-btn" onclick="deletePost(${post.id})"> | 삭제</span>` : ''}
                    </div>
                </div>
                <div class="post-content">${post.content}</div>
                <div class="post-actions">
                    <div class="action-btn" onclick="toggleLike(${post.id})" style="color: ${isLiked ? 'var(--accent-color)' : 'inherit'}">
                        ♥ <span>${post.likes.length}</span>
                    </div>
                    <div class="action-btn">
                        💬 <span>${post.comments.length}</span>
                    </div>
                </div>
                
                <div class="comment-section">
                    ${post.comments.map(c => `
                        <div class="comment-item"><strong>${c.author}</strong>: ${c.text}</div>
                    `).join('')}
                    <div class="comment-form">
                        <input type="text" id="comment-in-${post.id}" class="comment-input" placeholder="댓글 내용을 입력하세요...">
                        <button class="btn-main comment-btn" onclick="addComment(${post.id})">등록</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += postHtml;
    });
}

/* 3.5 사용자 기능 - 내가 작성한 글 관리 */
function renderMyPosts() {
    if(!currentUser) return;
    const myPosts = posts.filter(p => p.author === currentUser.id);
    renderPosts(myPosts, 'my-post-list');
}

// 좋아요나 댓글 작성 후 현재 보고 있는 화면을 유지하며 새로고침
function refreshCurrentView() {
    if(document.getElementById('profile-view').classList.contains('active')) {
        renderMyPosts();
    } else {
        renderPosts();
    }
}
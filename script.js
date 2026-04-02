/* 2~3단계 통합: 게시글(Title 포함) + 좋아요(Toggle) + 댓글(PostID 연동) */

let users = JSON.parse(localStorage.getItem('dr_users')) || [];
let posts = JSON.parse(localStorage.getItem('dr_posts')) || [];
let comments = JSON.parse(localStorage.getItem('dr_comments')) || []; // 댓글 별도 관리
let currentUser = JSON.parse(sessionStorage.getItem('dr_currentUser')) || null;

window.onload = () => {
    updateNav();
    renderPosts();
};

/* --- 공통 기능 --- */
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(viewId === 'main-view') renderPosts();
    if(viewId === 'profile-view') renderMyPosts();
}

function saveData() {
    localStorage.setItem('dr_posts', JSON.stringify(posts));
    localStorage.setItem('dr_comments', JSON.stringify(comments));
}

/* --- 3.4 사용자 인증 --- */
function handleSignup() {
    const id = document.getElementById('signup-id').value;
    const pw = document.getElementById('signup-pw').value;
    if(!id || !pw) return alert("빈칸을 입력해주세요.");
    if(users.find(u => u.id === id)) return alert("이미 있는 아이디입니다.");
    users.push({ id, pw });
    localStorage.setItem('dr_users', JSON.stringify(users));
    alert("가입 완료!");
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
    } else { alert("로그인 실패!"); }
}

function handleLogout() {
    currentUser = null;
    sessionStorage.removeItem('dr_currentUser');
    updateNav();
    showView('main-view');
}

function updateNav() {
    const nav = document.getElementById('nav-menu');
    const writeArea = document.getElementById('post-write-area');
    if(currentUser) {
        nav.innerHTML = `<span><strong>${currentUser.id}</strong>님</span><button onclick="showView('profile-view')">내 글</button><button onclick="handleLogout()">로그아웃</button>`;
        writeArea.classList.remove('hidden');
    } else {
        nav.innerHTML = `<button onclick="showView('login-view')">로그인</button><button onclick="showView('signup-view')">회원가입</button>`;
        writeArea.classList.add('hidden');
    }
}

/* --- 3.1 게시글 기능 (기획서 5.1 반영) --- */
function handleCreatePost() {
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-input').value;
    if(!title.trim() || !content.trim()) return alert("제목과 내용을 입력하세요.");

    const newPost = {
        id: 'post_' + Date.now(),
        author: currentUser.id,
        title: title,
        content: content,
        date: new Date().toLocaleString(),
        likedUsers: [] // 좋아요 토글용 (내부 데이터)
    };
    posts.unshift(newPost);
    saveData();
    document.getElementById('post-title').value = '';
    document.getElementById('post-input').value = '';
    renderPosts();
}

/* --- 3.2 좋아요 기능 (기획서 3.2 토글 방식) --- */
function toggleLike(postId) {
    if(!currentUser) return alert("로그인 후 좋아요를 누를 수 있습니다.");
    const post = posts.find(p => p.id === postId);
    const userIdx = post.likedUsers.indexOf(currentUser.id);

    if(userIdx === -1) {
        post.likedUsers.push(currentUser.id); // 좋아요 추가
    } else {
        post.likedUsers.splice(userIdx, 1); // 좋아요 취소
    }
    saveData();
    refreshView();
}

/* --- 3.1 댓글 기능 (기획서 5.2 반영) --- */
function addComment(postId) {
    const input = document.getElementById(`comment-in-${postId}`);
    if(!input.value.trim()) return;

    const newComment = {
        id: 'comm_' + Date.now(),
        postId: postId,
        author: currentUser ? currentUser.id : "익명",
        content: input.value,
        createdAt: new Date().toLocaleString()
    };
    comments.push(newComment);
    saveData();
    input.value = '';
    refreshView();
}

function deleteComment(commId) {
    if(!confirm("댓글을 삭제할까요?")) return;
    comments = comments.filter(c => c.id !== commId);
    saveData();
    refreshView();
}

function deletePost(postId) {
    if(!confirm("게시글을 삭제하시겠습니까?")) return;
    posts = posts.filter(p => p.id !== postId);
    comments = comments.filter(c => c.postId !== postId); // 연관 댓글 삭제
    saveData();
    refreshView();
}

/* --- 렌더링 로직 --- */
function renderPosts(targetData = posts, containerId = 'post-list') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    targetData.forEach(post => {
        const postComments = comments.filter(c => c.postId === post.id);
        const isLiked = currentUser && post.likedUsers.includes(currentUser.id);

        container.innerHTML += `
            <div class="card">
                <div class="post-header">
                    <span class="post-author">@${post.author}</span>
                    <div>
                        <span class="post-date">${post.date}</span>
                        ${(currentUser && post.author === currentUser.id) ? `<span class="comment-del-btn" onclick="deletePost('${post.id}')">삭제</span>` : ''}
                    </div>
                </div>
                <div class="post-title">${post.title}</div>
                <div class="post-content">${post.content}</div>
                
                <div class="post-actions">
                    <div class="like-btn" onclick="toggleLike('${post.id}')" style="color: ${isLiked ? '#ff5252' : '#888'}">
                        ${isLiked ? '❤️' : '🤍'} <span>${post.likedUsers.length}</span>
                    </div>
                    <div class="like-btn" style="color: #888; cursor:default;">
                        💬 <span>${postComments.length}</span>
                    </div>
                </div>

                <div class="comment-section">
                    <div class="comment-list">
                        ${postComments.map(c => `
                            <div class="comment-item">
                                <div class="comment-text">
                                    <strong>${c.author}</strong>: ${c.content}
                                    <div class="comment-info">${c.createdAt}</div>
                                </div>
                                ${(currentUser && c.author === currentUser.id) ? `<span class="comment-del-btn" onclick="deleteComment('${c.id}')">×</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="comment-form">
                        <input type="text" id="comment-in-${post.id}" placeholder="댓글 입력...">
                        <button class="btn-main comment-btn" onclick="addComment('${post.id}')">등록</button>
                    </div>
                </div>
            </div>
        `;
    });
}

function renderMyPosts() {
    if(!currentUser) return;
    renderPosts(posts.filter(p => p.author === currentUser.id), 'my-post-list');
}

function refreshView() {
    if(document.getElementById('profile-view').classList.contains('active')) renderMyPosts();
    else renderPosts();
}
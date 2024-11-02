class ContextComments {
    constructor() {
        this.postId = this.getPostId();
        this.init();
        this.bindEvents();
    }

    init() {
        this.article = document.querySelector('.entry-content');
        this.currentPopup = null;
        this.loadExistingComments();
    }

    bindEvents() {
        // 监听文本选择事件
        document.addEventListener('mouseup', (e) => {
            const selection = window.getSelection();
            if (selection.toString().length > 0) {
                this.handleTextSelection(selection, e);
            }
        });

        // 监听点击空白区域
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.comment-popup') && !e.target.closest('.context-highlight')) {
                this.hideAllPopups();
            }
        });

        // 监听滚动事件
        window.addEventListener('scroll', this.debounce(() => {
            this.loadVisibleComments();
        }, 200));
    }

    loadExistingComments() {
        if (!this.postId) {
            console.error('Post ID not found');
            return;
        }

        fetch(`${contextCommentsObj.ajaxurl}?action=get_context_comments&post_id=${this.postId}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.renderExistingComments(result.data);
                }
            })
            .catch(error => console.error('Error loading comments:', error));
    }

    saveComment(range, comment) {
        if (!this.postId) {
            console.error('Post ID not found');
            return;
        }

        const data = {
            action: 'save_context_comment',
            security: contextCommentsObj.security,
            post_id: this.postId,
            context: range.toString(),
            comment: comment
        };

        fetch(contextCommentsObj.ajaxurl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const newComment = {
                    id: result.data.comment_id,
                    context: result.data.context,
                    comment: result.data.comment
                };
                
                this.wrapRangeWithHighlight(range, newComment);
            }
        });
    }

    highlightComments(comments) {
        comments.forEach(comment => {
            const range = this.findTextRange(comment.context);
            if (range) {
                this.wrapRangeWithHighlight(range, comment);
            }
        });
    }

    handleTextSelection(selection, event) {
        if (!contextCommentsObj.isLoggedIn) {
            window.location.href = contextCommentsObj.loginurl;
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        
        this.showCommentForm(range, event);
    }

    showCommentForm(range, event) {
        const form = document.createElement('div');
        form.className = 'comment-form-popup';
        form.innerHTML = `
            <textarea placeholder="输入您的评论"></textarea>
            <button type="button">提交</button>
        `;

        document.body.appendChild(form);
        form.style.top = `${event.pageY}px`;
        form.style.left = `${event.pageX}px`;

        const button = form.querySelector('button');
        button.addEventListener('click', () => {
            const comment = form.querySelector('textarea').value;
            this.saveComment(range, comment);
            form.remove();
        });
    }

    wrapRangeWithHighlight(range, comment) {
        const highlight = document.createElement('span');
        highlight.className = 'context-highlight';
        highlight.dataset.commentId = comment.id;
        highlight.dataset.comment = comment.comment;
        
        range.surroundContents(highlight);
        
        highlight.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showCommentPopup(highlight, comment);
        });
    }

    showCommentPopup(element, comment) {
        this.hideAllPopups();
        
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        popup.innerHTML = `
            <div class="comment-content">${comment.comment}</div>
            <div class="comment-meta">
                <small>评论 ID: ${comment.id}</small>
            </div>
        `;
        
        const rect = element.getBoundingClientRect();
        popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        popup.style.left = `${rect.left}px`;
        
        document.body.appendChild(popup);
        this.currentPopup = popup;
    }

    hideAllPopups() {
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }

    // 辅助方法
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    getPostId() {
        // 从 body 标签的 class 中获取 post ID
        const bodyClasses = document.body.className.split(' ');
        const postIdClass = bodyClasses.find(className => className.startsWith('postid-'));
        if (postIdClass) {
            return postIdClass.replace('postid-', '');
        }
        
        // 备选方案：从文章容器中获取
        const articleElement = document.querySelector('article');
        if (articleElement && articleElement.id) {
            return articleElement.id.replace('post-', '');
        }

        // 如果都没有找到，从 URL 中获取
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('p') || '';
    }

    isUserLoggedIn() {
        // 检查用户登录状态的逻辑
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
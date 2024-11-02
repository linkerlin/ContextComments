class ContextComments {
    constructor() {
        this.contentContainer = document.querySelector('.entry-content, .post-content, article, .context-comments-content');
        this.currentPopup = null;
        this.postId = this.getPostId();

        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        console.log('ContextComments initialized with:', {
            container: this.contentContainer,
            postId: this.postId
        });

        this.setupEventListeners();
        this.loadExistingComments();
    }

    getPostId() {
        const bodyClasses = document.body.className.split(' ');
        const postIdClass = bodyClasses.find(className => className.startsWith('postid-'));
        if (postIdClass) {
            return postIdClass.replace('postid-', '');
        }
        
        const articleElement = document.querySelector('article');
        if (articleElement && articleElement.id) {
            return articleElement.id.replace('post-', '');
        }

        return '';
    }

    loadExistingComments() {
        if (!this.postId) {
            console.error('Post ID not found');
            return;
        }

        fetch(`${contextCommentsObj.ajaxurl}?action=get_context_comments&post_id=${this.postId}`)
            .then(response => response.json())
            .then(result => {
                if (result.success && result.data) {
                    this.renderExistingComments(result.data);
                }
            })
            .catch(error => console.error('Error loading comments:', error));
    }

    setupEventListeners() {
        // 处理选择文本
        this.contentContainer.addEventListener('mouseup', (e) => {
            // 忽略点击已高亮文本的情况
            if (e.target.classList.contains('context-highlight')) {
                return;
            }

            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const selectedText = selection.toString().trim();
            if (selectedText) {
                const range = selection.getRangeAt(0);
                this.handleTextSelection(e, range, selectedText);
            }
        });

        // 处理高亮文本的点击
        this.contentContainer.addEventListener('click', (e) => {
            const highlight = e.target.closest('.context-highlight');
            if (highlight) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Highlight clicked:', {
                    commentId: highlight.dataset.commentId,
                    comment: highlight.dataset.comment
                });

                this.showCommentPopup(highlight, {
                    id: highlight.dataset.commentId,
                    comment: decodeURIComponent(highlight.dataset.comment)
                });
            }
        });

        // 点击其他地方关闭弹出框
        document.addEventListener('click', (e) => {
            if (this.currentPopup && 
                !this.currentPopup.contains(e.target) && 
                !e.target.closest('.context-highlight')) {
                this.hideAllPopups();
            }
        });
    }

    handleTextSelection(event, range, selectedText) {
        console.log('Handling text selection:', selectedText);

        const popup = document.createElement('div');
        popup.className = 'comment-input-popup';
        popup.innerHTML = `
            <textarea placeholder="写下你的评论..."></textarea>
            <button class="submit-comment">提交</button>
            <button class="cancel-comment">取消</button>
        `;

        const rect = range.getBoundingClientRect();
        popup.style.position = 'absolute';
        popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        popup.style.left = `${rect.left}px`;

        document.body.appendChild(popup);

        const textarea = popup.querySelector('textarea');
        popup.querySelector('.submit-comment').addEventListener('click', () => {
            const comment = textarea.value.trim();
            if (comment) {
                this.saveComment(range, comment);
            }
            popup.remove();
        });

        popup.querySelector('.cancel-comment').addEventListener('click', () => {
            popup.remove();
        });
    }

    showCommentPopup(element, comment) {
        console.log('Showing comment popup:', comment); // 调试日志

        this.hideAllPopups();
        
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        
        popup.innerHTML = `
            <div class="comment-popup-content">
                <div class="comment-text">${this.escapeHtml(comment.comment)}</div>
                <div class="comment-meta">
                    <span class="comment-id">评论 #${comment.id}</span>
                </div>
            </div>
        `;

        // 计算位置
        const rect = element.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        
        // 设置基本样式
        Object.assign(popup.style, {
            position: 'fixed',
            zIndex: '1000'
        });
        
        // 确定水平位置
        if (rect.right + 320 < windowWidth) {
            popup.style.left = `${rect.right + 15}px`;
        } else {
            popup.style.left = `${Math.max(10, rect.left - 315)}px`;
        }
        
        // 确定垂直位置
        popup.style.top = `${Math.max(10, rect.top)}px`;
        
        document.body.appendChild(popup);
        this.currentPopup = popup;

        console.log('Popup created and positioned:', {
            left: popup.style.left,
            top: popup.style.top
        });
    }

    hideAllPopups() {
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ... 其他现有方法 ...
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
class ContextComments {
    constructor() {
        this.postId = this.getPostId();
        this.contentContainer = document.querySelector('.context-comments-content');
        this.init();
    }

    init() {
        this.loadExistingComments();
        // ... other init code ...
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

    renderExistingComments(comments) {
        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        // 获取文章内容的HTML
        let content = this.contentContainer.innerHTML;

        // 对评论按context长度降序排序，避免短文本替换影响长文本
        comments.sort((a, b) => b.context.length - a.context.length);

        comments.forEach(comment => {
            // 解码context（如果需要的话）
            const decodedContext = this.decodeHtmlEntities(comment.context);
            
            // 创建高亮span的HTML
            const highlightHtml = `<span class="context-highlight" data-comment-id="${comment.id}" data-comment="${this.escapeHtml(comment.comment)}">${decodedContext}</span>`;
            
            // 替换文本为高亮版本
            content = content.replace(decodedContext, highlightHtml);
        });

        // 更新内容
        this.contentContainer.innerHTML = content;

        // 添加点击事件监听器
        this.addClickListeners();
    }

    addClickListeners() {
        const highlights = document.querySelectorAll('.context-highlight');
        highlights.forEach(highlight => {
            highlight.addEventListener('click', (e) => {
                e.stopPropagation();
                const comment = {
                    id: highlight.dataset.commentId,
                    comment: highlight.dataset.comment
                };
                this.showCommentPopup(highlight, comment);
            });
        });
    }

    // 辅助函数：HTML实体解码
    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    // 辅助函数：HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showCommentPopup(element, comment) {
        // 隐藏其他可能存在的弹出框
        this.hideAllPopups();
        
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        popup.innerHTML = `
            <div class="comment-content">${this.escapeHtml(comment.comment)}</div>
            <div class="comment-meta">
                <small>评论 ID: ${comment.id}</small>
            </div>
        `;
        
        // 计算弹出框位置
        const rect = element.getBoundingClientRect();
        popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        popup.style.left = `${rect.left}px`;
        
        document.body.appendChild(popup);
        this.currentPopup = popup;

        // 添加点击外部关闭弹出框
        document.addEventListener('click', (e) => {
            if (!popup.contains(e.target) && !element.contains(e.target)) {
                this.hideAllPopups();
            }
        });
    }

    hideAllPopups() {
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
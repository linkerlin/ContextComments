class ContextComments {
    constructor() {
        this.init();
        this.bindEvents();
        this.loadComments();
    }

    init() {
        this.article = document.querySelector('.entry-content');
        this.currentPopup = null;
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

    loadComments() {
        fetch(`${contextCommentsObj.ajaxurl}?action=get_context_comments&post_id=${this.getPostId()}`)
            .then(response => response.json())
            .then(comments => {
                this.highlightComments(comments);
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

    saveComment(range, comment) {
        const data = {
            action: 'save_context_comment',
            security: contextCommentsObj.security,
            post_id: this.getPostId(),
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
                this.highlightComments([result.comment]);
            }
        });
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
        // 从页面获取文ID的逻辑
    }

    isUserLoggedIn() {
        // 检查用户登录状态的逻辑
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
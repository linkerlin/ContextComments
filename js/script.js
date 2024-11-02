class ContextComments {
    constructor() {
        this.contentContainer = document.querySelector('.entry-content, .post-content, article, .context-comments-content');
        this.currentPopup = null;
        this.init();
        
        // 移除 mouseup 事件监听器，改用 click 事件
        this.setupEventListeners();
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
                
                console.log('Highlight clicked, data:', {
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

document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
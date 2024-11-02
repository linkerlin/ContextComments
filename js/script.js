class ContextComments {
    constructor() {
        this.postId = this.getPostId();
        this.contentContainer = document.querySelector('.context-comments-content');
        this.init();
        console.log('ContextComments initialized with postId:', this.postId);
    }

    init() {
        this.loadExistingComments();
        
        this.contentContainer.addEventListener('mouseup', (e) => {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();

            if (selectedText) {
                this.handleTextSelection(e, range, selectedText);
            }
        });

        console.log('Init completed, content container:', this.contentContainer);
    }

    handleTextSelection(event, range, selectedText) {
        if (!selectedText || !contextCommentsObj.isLoggedIn) {
            return;
        }

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

    saveComment(range, comment) {
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
                this.wrapRangeWithHighlight(range, result.data);
            }
        });
    }

    loadExistingComments() {
        if (!this.postId) {
            console.error('Post ID not found');
            return;
        }

        console.log('Loading comments for post:', this.postId);

        fetch(`${contextCommentsObj.ajaxurl}?action=get_context_comments&post_id=${this.postId}`)
            .then(response => response.json())
            .then(result => {
                console.log('Received comments:', result);
                if (result.success && result.data) {
                    this.renderExistingComments(result.data);
                }
            })
            .catch(error => console.error('Error loading comments:', error));
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

    renderExistingComments(comments) {
        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        let content = this.contentContainer.innerHTML;

        comments.sort((a, b) => b.context.length - a.context.length);

        comments.forEach(comment => {
            const decodedContext = this.decodeHtmlEntities(comment.context);
            
            const highlightHtml = `<span class="context-highlight" data-comment-id="${comment.id}" data-comment="${this.escapeHtml(comment.comment)}">${decodedContext}</span>`;
            
            content = content.replace(decodedContext, highlightHtml);
        });

        this.contentContainer.innerHTML = content;

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

    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showCommentPopup(element, comment) {
        this.hideAllPopups();
        
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        popup.innerHTML = `
            <div class="comment-content">${this.escapeHtml(comment.comment)}</div>
            <div class="comment-meta">
                <small>评论 ID: ${comment.id}</small>
            </div>
        `;
        
        const rect = element.getBoundingClientRect();
        popup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        popup.style.left = `${rect.left}px`;
        
        document.body.appendChild(popup);
        this.currentPopup = popup;

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

document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
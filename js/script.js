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
        console.log('Rendering comments:', comments);

        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        let content = this.contentContainer.innerHTML;
        
        comments.sort((a, b) => b.context.length - a.context.length);

        comments.forEach(comment => {
            try {
                const decodedContext = decodeURIComponent(JSON.parse('"' + comment.context.replace(/\"/g, '\\"') + '"'));
                console.log('Looking for similar text to:', decodedContext);

                const bestMatch = this.findBestMatch(decodedContext, content);
                if (bestMatch) {
                    console.log('Found match:', bestMatch.text, 'with similarity:', bestMatch.similarity);
                    
                    const highlightHtml = `<span class="context-highlight" data-comment-id="${comment.id}" data-comment="${encodeURIComponent(comment.comment)}">${bestMatch.text}</span>`;
                    
                    content = content.replace(bestMatch.text, highlightHtml);
                }
            } catch (e) {
                console.error('Error processing comment:', e);
            }
        });

        this.contentContainer.innerHTML = content;

        this.addClickListeners();
    }

    findBestMatch(searchText, content) {
        const searchChars = Array.from(searchText);
        
        const windowSize = searchChars.length;
        let bestMatch = null;
        let bestSimilarity = 0;

        for (let i = 0; i < content.length - windowSize + 1; i++) {
            const windowText = content.substr(i, windowSize);
            const similarity = this.calculateSimilarity(searchText, windowText);

            if (similarity > 0.9 && similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = {
                    text: windowText,
                    similarity: similarity
                };
            }
        }

        return bestMatch;
    }

    calculateSimilarity(str1, str2) {
        if (str1.length !== str2.length) return 0;

        let matches = 0;
        for (let i = 0; i < str1.length; i++) {
            if (str1[i] === str2[i]) {
                matches++;
            }
        }

        return matches / str1.length;
    }

    addClickListeners() {
        const highlights = document.querySelectorAll('.context-highlight');
        highlights.forEach(highlight => {
            highlight.addEventListener('click', (e) => {
                e.stopPropagation();
                const commentId = highlight.dataset.commentId;
                const comment = decodeURIComponent(highlight.dataset.comment);
                this.showCommentPopup(highlight, {
                    id: commentId,
                    comment: comment
                });
            });
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
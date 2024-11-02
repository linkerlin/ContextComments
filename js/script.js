class ContextComments {
    constructor() {
        this.contentContainer = document.querySelector('.entry-content, .post-content, article, .context-comments-content');
        if (!this.contentContainer) {
            console.error('Content container not found. Available classes:', 
                document.body.innerHTML.match(/class="[^"]*"/g));
            return;
        }
        console.log('Content container found:', this.contentContainer);
        console.log('Content length:', this.contentContainer.innerHTML.length);
        
        this.postId = this.getPostId();
        this.init();
        this.currentPopup = null;
    }

    init() {
        this.loadExistingComments();
        
        this.contentContainer.addEventListener('mouseup', (e) => {
            console.log('Mouse up event triggered');
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();
            
            console.log('Selected text:', selectedText);

            if (selectedText) {
                this.handleTextSelection(e, range, selectedText);
            }
        });
    }

    handleTextSelection(event, range, selectedText) {
        console.log('Handling text selection:', selectedText);
        console.log('Is logged in:', contextCommentsObj.isLoggedIn);

        if (!selectedText) {
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
        console.log('Starting to render comments');
        
        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        let content = this.contentContainer.innerHTML;
        console.log('Original content:', {
            length: content.length,
            preview: content.substring(0, 100) + '...'
        });

        comments.forEach(comment => {
            try {
                const decodedContext = decodeURIComponent(JSON.parse('"' + comment.context.replace(/\"/g, '\\"') + '"'));
                console.log('Processing comment:', {
                    id: comment.id,
                    context: decodedContext,
                    contextLength: decodedContext.length
                });

                if (content.includes(decodedContext)) {
                    console.log('Found exact match');
                    const highlightHtml = `<span class="context-highlight" data-comment-id="${comment.id}" data-comment="${encodeURIComponent(comment.comment)}">${decodedContext}</span>`;
                    content = content.replace(decodedContext, highlightHtml);
                } else {
                    console.log('No exact match, trying fuzzy match');
                    const bestMatch = this.findBestMatch(decodedContext, content);
                    if (bestMatch) {
                        console.log('Found fuzzy match:', bestMatch);
                        const highlightHtml = `<span class="context-highlight" data-comment-id="${comment.id}" data-comment="${encodeURIComponent(comment.comment)}">${bestMatch.text}</span>`;
                        content = content.replace(bestMatch.text, highlightHtml);
                    }
                }
            } catch (e) {
                console.error('Error processing comment:', e);
            }
        });

        console.log('Processed content:', {
            length: content.length,
            preview: content.substring(0, 100) + '...'
        });

        this.contentContainer.innerHTML = content;
        
        const highlights = this.contentContainer.querySelectorAll('.context-highlight');
        console.log('Added highlights:', highlights.length);
    }

    findBestMatch(searchText, content) {
        console.log('Finding best match for:', searchText);
        console.log('Content length:', content.length);

        const searchChars = Array.from(searchText);
        const windowSize = searchChars.length;
        let bestMatch = null;
        let bestSimilarity = 0;

        const SIMILARITY_THRESHOLD = 0.8;

        for (let i = 0; i < content.length - windowSize + 1; i++) {
            const windowText = content.substr(i, windowSize);
            const similarity = this.calculateSimilarity(searchText, windowText);

            if (similarity > SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = {
                    text: windowText,
                    similarity: similarity
                };
                console.log('New best match found:', {
                    text: windowText,
                    similarity: similarity,
                    position: i
                });
            }
        }

        return bestMatch;
    }

    calculateSimilarity(str1, str2) {
        if (str1.length !== str2.length) return 0;

        let matches = 0;
        let total = str1.length;

        for (let i = 0; i < total; i++) {
            if (str1[i] === str2[i]) {
                matches++;
            }
        }

        const similarity = matches / total;
        if (similarity > 0.7) {
            console.log('High similarity found:', {
                text1: str1,
                text2: str2,
                similarity: similarity
            });
        }

        return similarity;
    }

    addClickListeners() {
        console.log('Adding click listeners to highlights');
        const highlights = document.querySelectorAll('.context-highlight');
        
        highlights.forEach(highlight => {
            highlight.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const commentId = highlight.dataset.commentId;
                const comment = decodeURIComponent(highlight.dataset.comment);
                
                console.log('Highlight clicked:', { commentId, comment });
                
                this.showCommentPopup(highlight, {
                    id: commentId,
                    comment: comment
                });
            });
        });

        // 添加点击文档其他地方关闭弹出框的功能
        document.addEventListener('click', (e) => {
            if (this.currentPopup && !this.currentPopup.contains(e.target) && 
                !e.target.classList.contains('context-highlight')) {
                this.hideAllPopups();
            }
        });
    }

    showCommentPopup(element, comment) {
        // 先隐藏其他可能存在的弹出框
        this.hideAllPopups();
        
        const popup = document.createElement('div');
        popup.className = 'comment-popup';
        
        // 使用模板字符串创建弹出框内容
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
        
        // 设置弹出框样式和位置
        popup.style.position = 'fixed';
        
        // 判断是否有足够空间在右侧显示
        if (rect.right + 300 < windowWidth) { // 300px 是弹出框的预计宽度
            popup.style.left = `${rect.right + 10}px`; // 在高亮文本右侧显示
        } else {
            popup.style.left = `${rect.left - 310}px`; // 在高亮文本左侧显示
        }
        
        popup.style.top = `${rect.top}px`;
        
        // 添加到文档中
        document.body.appendChild(popup);
        this.currentPopup = popup;
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
}

document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
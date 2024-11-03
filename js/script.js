class ContextComments {
    constructor() {
        this.contentContainer = document.querySelector('.entry-content, .post-content, article, .context-comments-content');
        this.currentPopup = null;
        this.hoverTimer = null;
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

        // 处理高亮文本的点击和悬停
        this.contentContainer.addEventListener('click', (e) => {
            const highlight = e.target.closest('.context-highlight');
            if (highlight) {
                e.preventDefault();
                e.stopPropagation();
                this.handleHighlightInteraction(highlight);
            }
        });

        // 添加鼠标悬停事件
        this.contentContainer.addEventListener('mouseover', (e) => {
            const highlight = e.target.closest('.context-highlight');
            if (highlight) {
                // 清除之前的计时器
                if (this.hoverTimer) {
                    clearTimeout(this.hoverTimer);
                }
                
                // 设置新的计时器
                this.hoverTimer = setTimeout(() => {
                    this.handleHighlightInteraction(highlight);
                }, 1000); // 1秒延迟
            }
        });

        // 添加鼠标移出事件
        this.contentContainer.addEventListener('mouseout', (e) => {
            const highlight = e.target.closest('.context-highlight');
            if (highlight) {
                // 清除计时器
                if (this.hoverTimer) {
                    clearTimeout(this.hoverTimer);
                    this.hoverTimer = null;
                }
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

    handleHighlightInteraction(highlight) {
        const commentId = highlight.dataset.commentId;
        this.fetchCommentDetails(commentId, highlight);
    }

    fetchCommentDetails(commentId, element) {
        fetch(`${contextCommentsObj.ajaxurl}?action=get_comment_details&comment_id=${commentId}`)
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.showCommentPopup(element, result.data);
                }
            })
            .catch(error => {
                console.error('Error fetching comment details:', error);
                // 如果获取详细信息失败，仍然显示基本信息
                this.showCommentPopup(element, {
                    id: commentId,
                    comment: decodeURIComponent(element.dataset.comment),
                    author: {
                        name: '匿名用户',
                        url: '#',
                        avatar: 'https://www.gravatar.com/avatar/?d=mp'
                    }
                });
            });
    }

    handleTextSelection(event, range, selectedText) {
        console.log('Handling text selection, user logged in:', contextCommentsObj.isLoggedIn);

        // 检查用户是否登录
        if (!contextCommentsObj.isLoggedIn) {
            // 保存当前 URL 到 localStorage，以便登录后返回
            localStorage.setItem('contextCommentsReturnUrl', window.location.href);
            
            // 重定向到登录页面
            window.location.href = contextCommentsObj.loginurl;
            return;
        }

        // 以下是已登录用户的评论框逻辑
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

        // 添加点击外部区域的处理
        const handleOutsideClick = (e) => {
            if (!popup.contains(e.target)) {
                // 检查评论框是否为空
                if (!textarea.value.trim()) {
                    popup.remove();
                    document.removeEventListener('click', handleOutsideClick);
                }
            }
        };

        // 延迟添加事件监听器，避免触发当前的点击事件
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 0);

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
        console.log('Showing popup...');
        this.hideAllPopups();
        
        const popup = document.createElement('div');
        popup.className = 'comment-popup';

        // 使用默认值处理可能缺失的作者信息
        const author = comment.author || {
            name: '匿名用户',
            url: '#',
            avatar: 'https://www.gravatar.com/avatar/?d=mp'
        };
        
        popup.innerHTML = `
            <div class="comment-popup-content">
                <div class="comment-header">
                    <img class="author-avatar" src="${author.avatar}" alt="${author.name}" />
                    <div class="author-info">
                        <a href="${author.url}" class="author-name" target="_blank">${author.name}</a>
                        ${comment.date ? `<span class="comment-date">${this.formatDate(comment.date)}</span>` : ''}
                    </div>
                </div>
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

        // 添加 ESC 键监听
        const escListener = (e) => {
            if (e.key === 'Escape') {
                console.log('ESC pressed');
                if (this.currentPopup) {
                    this.currentPopup.remove();
                    this.currentPopup = null;
                }
                document.removeEventListener('keydown', escListener);
            }
        };
        document.addEventListener('keydown', escListener);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // 如果是24小时内
        if (diff < 24 * 60 * 60 * 1000) {
            if (diff < 60 * 60 * 1000) {
                // 不到1小时
                const minutes = Math.floor(diff / (60 * 1000));
                return `${minutes} 分钟前`;
            } else {
                // 不到24小时
                const hours = Math.floor(diff / (60 * 60 * 1000));
                return `${hours} 小时前`;
            }
        } else {
            // 超过24小时，显示具体日期
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    hideAllPopups() {
        console.log('Hiding all popups...');
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

    renderExistingComments(comments) {
        console.log('Rendering comments:', comments);

        if (!this.contentContainer) {
            console.error('Content container not found');
            return;
        }

        let content = this.contentContainer.innerHTML;
        console.log('Original content length:', content.length);
        
        comments.forEach(comment => {
            try {
                const decodedContext = decodeURIComponent(JSON.parse('"' + comment.context.replace(/\"/g, '\\"') + '"'));
                console.log('Looking for text:', decodedContext);

                // 创建一个正则表达式来匹配文本，忽略 HTML 标签
                const escapedContext = decodedContext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedContext, 'g');

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

        this.contentContainer.innerHTML = content;
        console.log('Highlights added:', this.contentContainer.querySelectorAll('.context-highlight').length);
    }

    findBestMatch(searchText, content) {
        console.log('Finding best match for:', searchText);
        
        const searchChars = Array.from(searchText);
        const windowSize = searchChars.length;
        let bestMatch = null;
        let bestSimilarity = 0;
        const SIMILARITY_THRESHOLD = 0.8; // 80% 相似度阈值

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
                    similarity: similarity
                });
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
                // 创建高亮
                const highlightHtml = `<span class="context-highlight" data-comment-id="${result.data.comment_id}" data-comment="${encodeURIComponent(result.data.comment)}">${result.data.context}</span>`;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = highlightHtml;
                const highlightElement = tempDiv.firstChild;
                
                range.deleteContents();
                range.insertNode(highlightElement);
                
                // 重新添加事件监听器
                this.setupEventListeners();
            }
        })
        .catch(error => console.error('Error saving comment:', error));
    }

    // ... 其他现有方法 ...
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new ContextComments();
}); 
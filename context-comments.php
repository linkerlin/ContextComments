<?php
/*
Plugin Name: Context Comments
Description: 允许用户对文章特定文本进行评论
Version: 1.0
Author: Halo Master
*/

if (!defined('ABSPATH')) exit;

class ContextComments {
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_save_context_comment', array($this, 'save_context_comment'));
        add_action('wp_ajax_nopriv_save_context_comment', array($this, 'handle_unauthorized'));
        add_filter('the_content', array($this, 'modify_post_content'));
        
        add_action('wp_ajax_get_context_comments', array($this, 'get_context_comments'));
        add_action('wp_ajax_nopriv_get_context_comments', array($this, 'get_context_comments'));
        add_action('wp_ajax_get_comment_details', array($this, 'get_comment_details'));
        add_action('wp_ajax_nopriv_get_comment_details', array($this, 'get_comment_details'));
    }

    public function enqueue_scripts() {
        if (is_single()) {
            wp_enqueue_style('context-comments', plugins_url('css/style.css', __FILE__));
            wp_enqueue_script('context-comments', plugins_url('js/script.js', __FILE__), array('jquery'), '1.0', true);
            wp_localize_script('context-comments', 'contextCommentsObj', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'security' => wp_create_nonce('context-comments-nonce'),
                'loginurl' => wp_login_url(get_permalink()),
                'isLoggedIn' => is_user_logged_in(),
                'userId' => get_current_user_id()
            ));
        }
    }

    public function save_context_comment() {
        check_ajax_referer('context-comments-nonce', 'security');
        
        error_log('User login status: ' . (is_user_logged_in() ? 'true' : 'false'));
        error_log('User ID: ' . get_current_user_id());
        
        if (!is_user_logged_in()) {
            wp_send_json_error(array(
                'message' => '请先登录',
                'code' => 'not_logged_in'
            ));
            exit;
        }

        $post_id = intval($_POST['post_id']);
        $context = sanitize_textarea_field($_POST['context']);
        $comment = sanitize_textarea_field($_POST['comment']);
        
        $comment_data = array(
            'comment_post_ID' => $post_id,
            'comment_content' => $comment,
            'comment_type' => 'context_comment',
            'comment_parent' => 0,
            'user_id' => get_current_user_id(),
            'comment_meta' => array(
                'context_text' => $context
            )
        );

        $comment_id = wp_insert_comment($comment_data);

        if ($comment_id) {
            add_comment_meta($comment_id, 'context_text', $context);
            wp_send_json_success(array(
                'comment_id' => $comment_id,
                'context' => $context,
                'comment' => $comment
            ));
        } else {
            wp_send_json_error('保存评论失败');
        }
    }

    public function handle_unauthorized() {
        wp_send_json_error('请先登录后再评论');
    }

    public function modify_post_content($content) {
        if (!is_single()) {
            return $content;
        }
        
        error_log('Original content length: ' . strlen($content));
        
        $wrapped_content = '<div class="context-comments-content">' . $content . '</div>';
        
        error_log('Wrapped content length: ' . strlen($wrapped_content));
        
        return $wrapped_content;
    }

    public function get_context_comments() {
        $post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
        
        if (!$post_id) {
            wp_send_json_error('Invalid post ID');
            return;
        }

        $comments = get_comments(array(
            'post_id' => $post_id,
            'type' => 'context_comment',
            'status' => 'approve'
        ));

        $formatted_comments = array_map(function($comment) {
            $author_id = $comment->user_id;
            $author_name = $comment->comment_author;
            $author_url = $author_id ? get_author_posts_url($author_id) : $comment->comment_author_url;
            
            return array(
                'id' => $comment->comment_ID,
                'context' => get_comment_meta($comment->comment_ID, 'context_text', true),
                'comment' => $comment->comment_content,
                'date' => $comment->comment_date,
                'author' => array(
                    'name' => $author_name,
                    'url' => $author_url,
                    'avatar' => get_avatar_url($author_id ? $author_id : $comment->comment_author_email, array('size' => 32))
                )
            );
        }, $comments);

        wp_send_json_success($formatted_comments);
    }

    public function get_comment_details() {
        $comment_id = isset($_GET['comment_id']) ? intval($_GET['comment_id']) : 0;
        
        if (!$comment_id) {
            wp_send_json_error('Invalid comment ID');
            return;
        }

        $comment = get_comment($comment_id);
        if (!$comment) {
            wp_send_json_error('Comment not found');
            return;
        }

        // 获取作者信息
        $author_id = $comment->user_id;
        $author_name = $comment->comment_author;
        $author_url = $author_id ? get_author_posts_url($author_id) : $comment->comment_author_url;
        
        $comment_data = array(
            'id' => $comment->comment_ID,
            'comment' => $comment->comment_content,
            'date' => $comment->comment_date,
            'author' => array(
                'name' => $author_name,
                'url' => $author_url,
                'avatar' => get_avatar_url($author_id ? $author_id : $comment->comment_author_email, array('size' => 32))
            )
        );

        wp_send_json_success($comment_data);
    }
}

new ContextComments(); 
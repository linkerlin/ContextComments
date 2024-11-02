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
        
        return '<div class="context-comments-content">' . $content . '</div>';
    }
}

new ContextComments(); 
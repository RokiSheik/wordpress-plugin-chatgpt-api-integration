<?php
/*
Plugin Name: ChatGPT Clone
Description: A ChatGPT-style chatbot using OpenAI API.
Version: 1.1
Author: ADIL
*/

defined('ABSPATH') || exit;

// Enqueue scripts and styles
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('chatgpt-clone-style', plugin_dir_url(__FILE__) . 'assets/style.css');

    // Load Marked.js first (dependency)
    wp_enqueue_script('marked-js', 'https://cdn.jsdelivr.net/npm/marked/marked.min.js', [], null, true);

    // Then your script (depends on marked.js and jQuery)
    wp_enqueue_script('chatgpt-clone-script', plugin_dir_url(__FILE__) . 'assets/script.js', ['jquery', 'marked-js'], null, true);

    wp_localize_script('chatgpt-clone-script', 'chatgpt_ajax', [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('chatgpt_nonce'),
        'default_api_key' => get_option('chatgpt_clone_api_key', '')
    ]);
});


// Add shortcode
add_shortcode('chatgpt_clone', function () {
    ob_start();
    include plugin_dir_path(__FILE__) . 'templates/chat-box.php';
    return ob_get_clean();
});

// AJAX handler
add_action('wp_ajax_chatgpt_clone_send', 'chatgpt_clone_send');
add_action('wp_ajax_nopriv_chatgpt_clone_send', 'chatgpt_clone_send');

function chatgpt_clone_send() {
    check_ajax_referer('chatgpt_nonce', 'nonce');

    // Always load the API key from settings, ignore frontend input
    $api_key = get_option('chatgpt_clone_api_key', '');

    if (empty($api_key)) {
        wp_send_json_error('API key is missing.');
    }

    $message = sanitize_text_field($_POST['message']);

    $body = json_encode([
        'model' => 'gpt-3.5-turbo',
        'messages' => [
            ['role' => 'user', 'content' => $message]
        ]
    ]);

    $response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type' => 'application/json'
        ],
        'body' => $body
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error('API request failed');
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    $reply = $data['choices'][0]['message']['content'] ?? 'No response.';

    wp_send_json_success($reply);
}

// Settings page
add_action('admin_menu', function () {
    add_options_page('ChatGPT Clone Settings', 'ChatGPT Clone', 'manage_options', 'chatgpt-clone-settings', 'chatgpt_clone_settings_page');
});

add_action('admin_init', function () {
    register_setting('chatgpt_clone_settings_group', 'chatgpt_clone_api_key');
});

function chatgpt_clone_settings_page() {
    ?>
    <div class="wrap">
        <h1>ChatGPT Clone Settings</h1>
        <form method="post" action="options.php">
            <?php
            settings_fields('chatgpt_clone_settings_group');
            do_settings_sections('chatgpt_clone_settings_group');
            ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">OpenAI API Key</th>
                    <td><input type="text" name="chatgpt_clone_api_key" value="<?php echo esc_attr(get_option('chatgpt_clone_api_key')); ?>" style="width: 400px;" /></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

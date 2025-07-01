<?php
/*
Plugin Name: ChatGPT Clone
Description: A ChatGPT-style chatbot using OpenAI API with file upload and voice recording.
Version: 1.3
Author: ADIL
*/

defined('ABSPATH') || exit;

// Enqueue styles and scripts
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('chatgpt-clone-style', plugin_dir_url(__FILE__) . 'assets/style.css');

    // External libraries
    wp_enqueue_script('marked-js', 'https://cdn.jsdelivr.net/npm/marked/marked.min.js', [], null, true);
    wp_enqueue_script('wavesurfer-js', 'https://unpkg.com/wavesurfer.js', [], null, true);

    // Main chat script (text chat)
    wp_enqueue_script('chatgpt-clone-script', plugin_dir_url(__FILE__) . 'assets/script.js', ['jquery', 'marked-js'], null, true);

    // File upload handler script (optional)
    wp_enqueue_script('chatgpt-clone-file-upload', plugin_dir_url(__FILE__) . 'assets/file-upload.js', ['jquery'], null, true);

    // Voice record script with wavesurfer.js dependency
    wp_enqueue_script('chatgpt-clone-voice-record', plugin_dir_url(__FILE__) . 'assets/voice-record.js', ['jquery', 'wavesurfer-js'], null, true);

    // Localize data for ajax URL and nonce for all scripts
    $local_data = [
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('chatgpt_nonce'),
        'default_api_key' => get_option('chatgpt_clone_api_key', '')
    ];

    wp_localize_script('chatgpt-clone-script', 'chatgpt_ajax', $local_data);
    wp_add_inline_script('chatgpt-clone-file-upload', 'var chatgpt_ajax = ' . json_encode($local_data) . ';', 'before');
    wp_add_inline_script('chatgpt-clone-voice-record', 'var chatgpt_ajax = ' . json_encode($local_data) . ';', 'before');
});

// Register shortcode for the chat box
add_shortcode('chatgpt_clone', function () {
    ob_start();
    include plugin_dir_path(__FILE__) . 'templates/chat-box.php';
    return ob_get_clean();
});

// Handle text chat AJAX
add_action('wp_ajax_chatgpt_clone_send', 'chatgpt_clone_send');
add_action('wp_ajax_nopriv_chatgpt_clone_send', 'chatgpt_clone_send');

function chatgpt_clone_send() {
    check_ajax_referer('chatgpt_nonce', 'nonce');

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
            'Content-Type'  => 'application/json'
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

// Handle file upload & voice recording AJAX (using Whisper + ChatGPT)
add_action('wp_ajax_chatgpt_clone_file', 'chatgpt_clone_file');
add_action('wp_ajax_nopriv_chatgpt_clone_file', 'chatgpt_clone_file');

function chatgpt_clone_file() {
    check_ajax_referer('chatgpt_nonce', 'nonce');

    if (!isset($_FILES['file'])) {
        wp_send_json_error('No file uploaded.');
    }

    $api_key = get_option('chatgpt_clone_api_key', '');
    if (empty($api_key)) {
        wp_send_json_error('API key is missing.');
    }

    $file = $_FILES['file'];

    // Handle upload securely
    require_once ABSPATH . 'wp-admin/includes/file.php';
    $uploaded = wp_handle_upload($file, ['test_form' => false]);

    if (!isset($uploaded['file'])) {
        wp_send_json_error('Upload failed.');
    }

    $file_path = $uploaded['file'];

    // Call Whisper API (OpenAI audio transcription)
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, 'https://api.openai.com/v1/audio/transcriptions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);

    $cfile = curl_file_create($file_path, mime_content_type($file_path), basename($file_path));

    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        'file' => $cfile,
        'model' => 'whisper-1',
    ]);

    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $api_key,
    ]);

    $transcribe_response = curl_exec($ch);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if (!$transcribe_response) {
        wp_send_json_error('Transcription request failed: ' . $curl_error);
    }

    $transcribe_body = json_decode($transcribe_response, true);
    $transcribed_text = $transcribe_body['text'] ?? '';

    if (!$transcribed_text) {
        wp_send_json_error('Failed to transcribe audio.');
    }

    // Send transcribed text to ChatGPT for response
    $chat_body = json_encode([
        'model' => 'gpt-3.5-turbo',
        'messages' => [
            ['role' => 'user', 'content' => $transcribed_text]
        ]
    ]);

    $chat_response = wp_remote_post('https://api.openai.com/v1/chat/completions', [
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json'
        ],
        'body' => $chat_body
    ]);

    if (is_wp_error($chat_response)) {
        wp_send_json_error('AI response failed');
    }

    $chat_data = json_decode(wp_remote_retrieve_body($chat_response), true);
    $ai_reply = $chat_data['choices'][0]['message']['content'] ?? 'No response.';

    wp_send_json_success($ai_reply);
}

// Settings page in WP admin
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

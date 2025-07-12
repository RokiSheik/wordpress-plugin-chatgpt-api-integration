jQuery(document).ready(function ($) {
  let attachedFile = null;

  // Trigger file input when upload button clicked
  $(document).on('click', '#upload-btn', function () {
    $('#chatgpt-file').click();
  });

  // Show attached file preview
  $(document).on('change', '#chatgpt-file', function (e) {
    attachedFile = e.target.files[0];

    if (attachedFile) {
      const filePreview = `
        <span class="attachment-file">
          📎 ${attachedFile.name}
          <span class="remove-attachment" title="Remove">&times;</span>
        </span>
      `;
      $('#chatgpt-attachment-preview').html(filePreview);
    }
  });

  // Remove attached file preview
  $(document).on('click', '.remove-attachment', function () {
    attachedFile = null;
    $('#chatgpt-file').val('');
    $('#chatgpt-attachment-preview').empty();
  });

  // Unified submit handler (handles both text message and file upload)
  $('#chatgpt-form').on('submit', function (e) {
    e.preventDefault();

    const message = $('#chatgpt-input').val().trim();

    // Nothing to send?
    if (!message && !attachedFile) return;

    $('#chatgpt-input').val('').prop('disabled', true);
    $('.chatgpt-send-btn').prop('disabled', true);

    const typingIndicator = showTyping();

    if (attachedFile) {
      // Send file + optional message
      const formData = new FormData();
      formData.append('action', 'chatgpt_clone_file');
      formData.append('nonce', chatgpt_ajax.nonce);
      formData.append('file', attachedFile);
      formData.append('user_message', message);

      if (message) appendMessage(message, 'user'); // Show user message only if text exists

      $.ajax({
        url: chatgpt_ajax.ajax_url,
        method: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (response) {
          typingIndicator.remove();

          if (response.success) {
            appendMessage(response.data, 'bot', true);
          } else {
            appendMessage('❌ Error: ' + response.data, 'bot');
          }

          $('#chatgpt-input').prop('disabled', false).focus();
          $('.chatgpt-send-btn').prop('disabled', false);

          attachedFile = null;
          $('#chatgpt-file').val('');
          $('#chatgpt-attachment-preview').empty();
        },
        error: function () {
          typingIndicator.remove();
          appendMessage('❌ File upload failed.', 'bot');
          $('#chatgpt-input').prop('disabled', false).focus();
          $('.chatgpt-send-btn').prop('disabled', false);
        }
      });
    } else {
      // Send text message only
      appendMessage(message, 'user');

      $.post(chatgpt_ajax.ajax_url, {
        action: 'chatgpt_clone_send',
        nonce: chatgpt_ajax.nonce,
        messages: JSON.stringify([{ sender: 'user', text: message }])
      }).done(function (response) {
        typingIndicator.remove();
        if (response.success) {
          appendMessage(response.data, 'bot', true);
        } else {
          appendMessage('❌ Error: ' + response.data, 'bot');
        }
        $('#chatgpt-input').prop('disabled', false).focus();
        $('.chatgpt-send-btn').prop('disabled', false);
      }).fail(function () {
        typingIndicator.remove();
        appendMessage('❌ Message failed to send.', 'bot');
        $('#chatgpt-input').prop('disabled', false).focus();
        $('.chatgpt-send-btn').prop('disabled', false);
      });
    }
  });

  // Append message to chat window
  function appendMessage(text, sender, isHtml = false) {
    const $messages = $('#chatgpt-messages');
    const messageClass = sender === 'user' ? 'user' : 'bot';
    const $message = $('<div>').addClass('chatgpt-message').addClass(messageClass);

    if (isHtml && sender === 'bot') {
      const html = window.marked ? marked.parse(text) : text;
      $message.html(html);
    } else {
      $message.text(text);
    }

    $messages.append($message);
    $messages.scrollTop($messages[0].scrollHeight);
  }

  // Show typing indicator
  function showTyping() {
    const $typing = $('<div>')
      .addClass('chatgpt-message bot typing')
      .html('<span class="chatgpt-typing"><span></span><span></span><span></span></span>');
    $('#chatgpt-messages').append($typing);
    return $typing;
  }
});

jQuery(document).ready(function ($) {
  // Trigger file input when upload button is clicked
  $(document).on('click', '#upload-btn', function () {
    $('#chatgpt-file').click();
  });

  // Handle file selection
  $(document).on('change', '#chatgpt-file', function (e) {
    const file = e.target.files[0];
    if (file) {
      appendMessage(`📎 File selected: ${file.name}`, 'user');
      uploadFile(file);
    }
  });

  function uploadFile(file) {
  const formData = new FormData();
  formData.append('action', 'chatgpt_clone_file');
  formData.append('file', file);
  formData.append('nonce', chatgpt_ajax.nonce);

  // Send current user instruction as well
  const instruction = $('#chatgpt-input').val().trim();
  formData.append('user_message', instruction);

  $.ajax({
    url: chatgpt_ajax.ajax_url,
    method: 'POST',
    data: formData,
    contentType: false,
    processData: false,
    success: function(response) {
      if (response.success) {
        appendMessage(response.data, 'bot', true);
      } else {
        appendMessage('❌ Upload error: ' + response.data, 'bot');
      }
    },
    error: function() {
      appendMessage('❌ File upload failed.', 'bot');
    }
  });
}


  // Utility for showing messages
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
});

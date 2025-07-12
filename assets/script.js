jQuery(document).ready(function ($) {
  let currentSessionId = null;
  let currentMessages = [];
  const CHAT_STORAGE_KEY = 'chatgpt_sessions';
  let attachedFile = null;
  let mediaRecorder = null;
  let audioChunks = [];

  const $messages = $('#chatgpt-messages');
  const $form = $('#chatgpt-form');
  const $input = $('#chatgpt-input');
  const $sendBtn = $('.chatgpt-send-btn');

  function initChat() {
    currentSessionId = Date.now().toString();
    currentMessages = [];
    $messages.empty();
    $input.val('');
    attachedFile = null;
    $('#chatgpt-file').val('');
    $('#chatgpt-attachment-preview').empty();
  }

  function renderChatHistory() {
    const allSessions = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
    const $list = $('#chatgpt-history-list');
    $list.empty();

    const keys = Object.keys(allSessions);
    if (keys.length === 0) {
      $list.append('<li class="no-chat-msg">No chats yet</li>');
      return;
    }

    keys.forEach((id) => {
      const session = allSessions[id];
      const $li = $('<li>').text(session.title || 'Untitled Chat');
      $li.attr('data-id', id);
      if (id === currentSessionId) $li.addClass('active');
      $list.append($li);
    });
  }

  function saveChatToHistory() {
    const allSessions = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
    const title = currentMessages[0]?.text?.slice(0, 30) || 'New Chat';

    allSessions[currentSessionId] = {
      title,
      messages: currentMessages
    };

    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(allSessions));
    renderChatHistory();
  }

  function appendMessage(text, sender, isHtml = false) {
    const messageClass = sender === 'user' ? 'user' : 'bot';
    const $message = $('<div>').addClass('chatgpt-message').addClass(messageClass);

    if (isHtml && sender === 'bot') {
      const html = window.marked ? marked.parse(text) : text;
      $message.html(html);
      addCopyButtons($message);
    } else {
      $message.text(text);
    }

    $messages.append($message);
    $messages.scrollTop($messages[0].scrollHeight);

    currentMessages.push({ text, sender });
    saveChatToHistory();
  }

  function showTyping() {
    const $typing = $('<div>')
      .addClass('chatgpt-message bot typing')
      .html('<span class="chatgpt-typing"><span></span><span></span><span></span></span>');
    $messages.append($typing);
    $messages.scrollTop($messages[0].scrollHeight);
    return $typing;
  }

  function addCopyButtons($message) {
    $message.find('pre').each(function () {
      const $pre = $(this);
      if ($pre.find('.copy-btn').length === 0) {
        const $btn = $('<button class="copy-btn" title="Copy code">Copy</button>');
        $btn.on('click', () => {
          copyToClipboard($pre.text());
          $btn.text('Copied!');
          setTimeout(() => $btn.text('Copy'), 2000);
        });
        $pre.css('position', 'relative').append($btn);
      }
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      alert('Copy failed');
    }
    document.body.removeChild(textArea);
  }

  $('#chatgpt-history-list').on('click', 'li', function () {
    const id = $(this).data('id');
    if (!id) return;

    const allSessions = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
    const session = allSessions[id];
    if (!session) return;

    $messages.empty();
    currentMessages = session.messages;
    currentSessionId = id;

    session.messages.forEach((msg) => {
      appendMessage(msg.text, msg.sender, msg.sender === 'bot');
    });
  });

  $('#new-chat-btn').on('click', () => {
    initChat();
    renderChatHistory();
  });

  $(document).on('click', '#upload-btn', function () {
    $('#chatgpt-file').click();
  });

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

  $(document).on('click', '.remove-attachment', function () {
    attachedFile = null;
    $('#chatgpt-file').val('');
    $('#chatgpt-attachment-preview').empty();
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    const message = $input.val().trim();
    if (!message && !attachedFile) return;

    $input.val('').prop('disabled', true);
    $sendBtn.prop('disabled', true);
    const typingIndicator = showTyping();

    if (attachedFile) {
      const formData = new FormData();
      formData.append('action', 'chatgpt_clone_file');
      formData.append('nonce', chatgpt_ajax.nonce);
      formData.append('file', attachedFile);
      formData.append('user_message', message);

      if (message) appendMessage(message, 'user');

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
          $input.prop('disabled', false).focus();
          $sendBtn.prop('disabled', false);
          attachedFile = null;
          $('#chatgpt-file').val('');
          $('#chatgpt-attachment-preview').empty();
          saveChatToHistory();
        },
        error: function () {
          typingIndicator.remove();
          appendMessage('❌ File upload failed.', 'bot');
          $input.prop('disabled', false).focus();
          $sendBtn.prop('disabled', false);
        }
      });
    } else {
      appendMessage(message, 'user');
      $.post(chatgpt_ajax.ajax_url, {
        action: 'chatgpt_clone_send',
        nonce: chatgpt_ajax.nonce,
        messages: JSON.stringify(currentMessages)
      }).done(function (response) {
        typingIndicator.remove();
        if (response.success) {
          appendMessage(response.data, 'bot', true);
        } else {
          appendMessage('❌ Error: ' + response.data, 'bot');
        }
        $input.prop('disabled', false).focus();
        $sendBtn.prop('disabled', false);
        saveChatToHistory();
      }).fail(function () {
        typingIndicator.remove();
        appendMessage('❌ Message failed to send.', 'bot');
        $input.prop('disabled', false).focus();
        $sendBtn.prop('disabled', false);
      });
    }
  });

  $input.on('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $form.submit();
    }
  });

  // Voice recording
  $(document).on('click', '#record-btn', async function () {
    const $btn = $(this);

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          appendAudioMessage(audioUrl, 'user');
          uploadVoice(audioBlob);
        };

        mediaRecorder.start();
        $btn.addClass('recording').text('⏹️ Stop ');
      } catch (err) {
        alert('🎙️ Microphone access denied or not available.');
      }
    } else {
      mediaRecorder.stop();
      $btn.removeClass('recording').text('🎤');
    }
  });

  function uploadVoice(blob) {
    const formData = new FormData();
    formData.append('action', 'chatgpt_clone_file');
    formData.append('file', new File([blob], 'recording.webm', { type: 'audio/webm' }));
    formData.append('nonce', chatgpt_ajax.nonce);
    const instruction = $('#chatgpt-input').val().trim();
    formData.append('user_message', instruction);

    $.ajax({
      url: chatgpt_ajax.ajax_url,
      method: 'POST',
      data: formData,
      contentType: false,
      processData: false,
      success: function (response) {
        if (response.success) {
          appendMessage(response.data, 'bot', true);
        } else {
          appendMessage('❌ Upload error: ' + response.data, 'bot');
        }
      },
      error: function () {
        appendMessage('❌ Voice upload failed.', 'bot');
      }
    });
  }

  function appendAudioMessage(audioUrl, sender) {
    const messageClass = sender === 'user' ? 'user' : 'bot';
    const $message = $('<div>').addClass('chatgpt-message').addClass(messageClass).addClass('audio-message');
    const waveId = 'waveform-' + Date.now() + Math.floor(Math.random() * 1000);
    const $waveform = $('<div>').attr('id', waveId).addClass('waveform');
    const $playBtn = $('<button>').addClass('waveplay-btn').text('▶');

    $message.append($waveform).append($playBtn);
    $messages.append($message);
    $messages.scrollTop($messages[0].scrollHeight);

    setTimeout(() => {
      const wavesurfer = WaveSurfer.create({
        container: '#' + waveId,
        waveColor: '#cccccc',
        progressColor: '#000000',
        height: 32,
        barWidth: 2,
        responsive: true,
        cursorWidth: 0,
      });

      wavesurfer.load(audioUrl);

      $playBtn.on('click', () => {
        if (wavesurfer.isPlaying()) {
          wavesurfer.pause();
          $playBtn.text('▶');
        } else {
          wavesurfer.play();
          $playBtn.text('⏸');
        }
      });

      wavesurfer.on('finish', () => {
        $playBtn.text('▶');
      });
    }, 100);
  }

  // Initialize on load
  initChat();
  renderChatHistory();
});
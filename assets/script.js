jQuery(document).ready(function ($) {
  let currentSessionId = null;
  let currentMessages = [];
  const CHAT_STORAGE_KEY = 'chatgpt_sessions';

  const $messages = $('#chatgpt-messages');
  const $form = $('#chatgpt-form');
  const $input = $('#chatgpt-input');
  const $sendBtn = $('.chatgpt-send-btn');

  function initChat() {
    currentSessionId = Date.now().toString();
    currentMessages = [];
    $messages.empty();
    $input.val('');
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
      const html = marked.parse(text);
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

  // Load a previous chat
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

  // New Chat
  $('#new-chat-btn').on('click', () => {
    initChat();
    renderChatHistory();
  });

  // Form submit
  $form.on('submit', function (e) {
    e.preventDefault();
    const message = $input.val().trim();
    if (!message) return;

    appendMessage(message, 'user');
    $input.val('');
    $input.prop('disabled', true);
    $sendBtn.prop('disabled', true);

    const $typing = showTyping();

    $.post(
      chatgpt_ajax.ajax_url,
      {
        action: 'chatgpt_clone_send',
        api_key: '', // backend will use stored key
        message: message,
        nonce: chatgpt_ajax.nonce
      },
      function (response) {
        $typing.remove();
        if (response.success) {
          appendMessage(response.data, 'bot', true);
        } else {
          appendMessage('Error: ' + response.data, 'bot');
        }
        $input.prop('disabled', false);
        $sendBtn.prop('disabled', false);
        $input.focus();
      }
    );
  });

  // Submit on Enter
  $input.on('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $form.submit();
    }
  });

  // Start first chat
  initChat();
  renderChatHistory();
});

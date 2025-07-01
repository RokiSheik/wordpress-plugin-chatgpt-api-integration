jQuery(document).ready(function ($) {
  let mediaRecorder = null;
  let audioChunks = [];

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

  function appendMessage(text, sender, isHtml = false) {
    const $messages = $('#chatgpt-messages');
    if ($messages.length === 0) return;

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

  function appendAudioMessage(audioUrl, sender) {
    const $messages = $('#chatgpt-messages');
    if ($messages.length === 0) return;

    const messageClass = sender === 'user' ? 'user' : 'bot';
    const $message = $('<div>').addClass('chatgpt-message').addClass(messageClass).addClass('audio-message');

    const waveId = 'waveform-' + Date.now() + Math.floor(Math.random() * 1000);
    const $waveform = $('<div>').attr('id', waveId).addClass('waveform');
    const $playBtn = $('<button>').addClass('waveplay-btn').text('▶');

    $message.append($waveform).append($playBtn);
    $messages.append($message);
    $messages.scrollTop($messages[0].scrollHeight);

    // Delay rendering until element is visible
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
    }, 100); // Small delay to ensure DOM is rendered
  }
});

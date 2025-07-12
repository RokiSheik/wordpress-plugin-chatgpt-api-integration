<div class="chatgpt-wrapper">
    <!-- Sidebar for history -->
    <div class="chatgpt-sidebar">
        <button id="new-chat-btn">+ New Chat</button>
        <h2>Chat History</h2>
        <ul id="chatgpt-history-list">
            <li class="no-chat-msg">No chats yet</li>
        </ul>
    </div>


    <!-- Chat area -->
    <div class="chatgpt-container">
        <div id="chatgpt-messages" class="chatgpt-messages"></div>
        <div id="chatgpt-attachment-preview"></div>
        <form id="chatgpt-form" class="chatgpt-form" enctype="multipart/form-data">
            <!-- <div id="chatgpt-attachment-preview"></div> -->
            <input type="file" id="chatgpt-file" accept="audio/*,image/*,.pdf,.doc,.docx,.txt" style="display: none;">
            <button type="button" id="upload-btn" title="Upload file">📎</button>
            <button type="button" id="record-btn" title="Record voice">🎤</button>
            <textarea id="chatgpt-input" class="chatgpt-input" placeholder="Type your message..." rows="1"></textarea>
            <button type="submit" class="chatgpt-send-btn">➤</button>

        </form>

    </div>
</div>


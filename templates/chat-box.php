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
        <form id="chatgpt-form" class="chatgpt-form">
            <textarea id="chatgpt-input" class="chatgpt-input" placeholder="Type your message..." rows="1"></textarea>
            <button type="submit" class="chatgpt-send-btn">➤</button>
        </form>
    </div>
</div>
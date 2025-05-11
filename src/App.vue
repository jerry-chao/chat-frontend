<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import ChatLayout from "./components/ChatLayout.vue";
import ConversationList from "./components/ConversationList.vue";
import MessageList from "./components/MessageList.vue";
import MessageInput from "./components/MessageInput.vue";
import chatService from "./services/chat.js";
import { authenticate, setAuthToken } from "./services/api.js";

// State management
const conversations = ref([]);
const selectedConversation = ref(null);
const currentUserId = ref("zhagchao@test.com"); // Normally this would come from authentication
const connectionStatus = ref("disconnected");
const loading = ref(false);

// Mock data for demo purposes (remove in production)
const generateMockData = () => {
    const mockConversations = [
        {
            id: "1",
            name: "General Chat",
            lastMessageTime: new Date().toISOString(),
            unreadCount: 2,
            messages: [
                {
                    id: "101",
                    content: "Hello, how are you?",
                    senderId: "user-2",
                    senderName: "Jane Doe",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 60,
                    ).toISOString(),
                    status: "read",
                },
                {
                    id: "102",
                    content: "I'm doing well, thanks for asking!",
                    senderId: currentUserId.value,
                    senderName: "You",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 30,
                    ).toISOString(),
                    status: "read",
                },
                {
                    id: "103",
                    content: "What are you working on today?",
                    senderId: "user-2",
                    senderName: "Jane Doe",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 20,
                    ).toISOString(),
                    status: "delivered",
                },
            ],
        },
        {
            id: "2",
            name: "Project Discussion",
            lastMessageTime: new Date(
                Date.now() - 1000 * 60 * 60 * 2,
            ).toISOString(),
            unreadCount: 0,
            messages: [
                {
                    id: "201",
                    content: "Did you see the latest pull request?",
                    senderId: "user-3",
                    senderName: "John Smith",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 60 * 3,
                    ).toISOString(),
                    status: "read",
                },
                {
                    id: "202",
                    content: "Yes, I'm reviewing it now. Looks good so far.",
                    senderId: currentUserId.value,
                    senderName: "You",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 60 * 2,
                    ).toISOString(),
                    status: "read",
                },
            ],
        },
        {
            id: "3",
            name: "Team Chat",
            lastMessageTime: new Date(
                Date.now() - 1000 * 60 * 60 * 24,
            ).toISOString(),
            unreadCount: 5,
            messages: [
                {
                    id: "301",
                    content: "Team meeting at 3pm tomorrow",
                    senderId: "user-4",
                    senderName: "Alice Johnson",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 60 * 25,
                    ).toISOString(),
                    status: "read",
                },
                {
                    id: "302",
                    content: "I'll be there!",
                    senderId: currentUserId.value,
                    senderName: "You",
                    timestamp: new Date(
                        Date.now() - 1000 * 60 * 60 * 24,
                    ).toISOString(),
                    status: "read",
                },
            ],
        },
    ];

    conversations.value = mockConversations;
};

// State for authentication
const token = ref(null);
const authError = ref(null);

// Authenticate with API
const authenticateUser = async () => {
  try {
    authError.value = null;
    const response = await authenticate("zhangchao@test.com", "SimbazhanG123");
    token.value = response.token;
    // Set token for future requests
    setAuthToken(token.value);
    return token.value;
  } catch (error) {
    console.error("Authentication failed:", error);
    authError.value = error.message;
    return null;
  }
};

// Initialize Phoenix connection
const initializePhoenixConnection = async () => {
    // First authenticate to get token
    const authToken = await authenticateUser();
    
    if (authToken) {
        // Connection would normally be established here
        // Using WebSocket endpoint from your Phoenix backend
        try {
            chatService
                .initialize("/socket", authToken, currentUserId.value)
                .onMessage(handleNewMessage)
                .onConnectionStateChange(handleConnectionChange)
                .onError(handleError);

            connectionStatus.value = "connected";
        } catch (error) {
            console.error("Connection initialization failed:", error);
            connectionStatus.value = "error";
        }
    } else {
        // Authentication failed
        connectionStatus.value = "error";
        console.error("Could not initialize connection: Authentication failed");
    }
};

// Handle incoming messages
const handleNewMessage = (payload) => {
    if (!payload || !payload.message) return;

    const { message, conversation_id } = payload;
    const convo = conversations.value.find((c) => c.id === conversation_id);

    if (convo) {
        convo.messages.push(message);
        convo.lastMessageTime = message.timestamp;

        // Update unread count if not the selected conversation
        if (
            !selectedConversation.value ||
            selectedConversation.value.id !== conversation_id
        ) {
            convo.unreadCount = (convo.unreadCount || 0) + 1;
        }
    }
};

// Handle connection state changes
const handleConnectionChange = (status) => {
    connectionStatus.value = status;
};

// Handle errors
const handleError = (error) => {
    console.error("Chat service error:", error);
    // Implement error handling UI here
};

// Select a conversation
const selectConversation = (conversation) => {
    selectedConversation.value = conversation;

    // Reset unread count when selecting
    if (conversation) {
        conversation.unreadCount = 0;

        // In a real app, you would join the Phoenix channel for this conversation
        chatService.joinConversation(conversation.id)
    }
};

// Send a message
const sendMessage = async (messageData) => {
    if (!selectedConversation.value) return;

    loading.value = true;

    try {
        // Create a temporary message
        const tempMessage = {
            id: `temp-${Date.now()}`,
            content: messageData.content,
            senderId: currentUserId.value,
            senderName: "You",
            timestamp: new Date().toISOString(),
            status: "sending",
        };

        // Add to local state
        selectedConversation.value.messages.push(tempMessage);
        selectedConversation.value.lastMessageTime = tempMessage.timestamp;

        // In a real app, you would send via Phoenix
        await chatService.sendMessage(tempMessage);

        // Update message status
        const messageIndex = selectedConversation.value.messages.findIndex(
            (m) => m.id === tempMessage.id,
        );
        if (messageIndex >= 0) {
            selectedConversation.value.messages[messageIndex] = {
                ...tempMessage,
                id: `real-${Date.now()}`,
                status: "sent",
            };
        }
    } catch (error) {
        console.error("Failed to send message:", error);
        // Implement error handling UI here
    } finally {
        loading.value = false;
    }
};

// Create a new conversation
const createNewConversation = () => {
    // Implement conversation creation logic here
    // For demo, we'll just create a mock one
    const newConversation = {
        id: `new-${Date.now()}`,
        name: `New Chat ${conversations.value.length + 1}`,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        messages: [],
    };

    conversations.value.unshift(newConversation);
    selectConversation(newConversation);
};

// Initialize
onMounted(async () => {
    // Load mock data for demo
    generateMockData();

    // Initialize Phoenix connection
    await initializePhoenixConnection();
});

// Cleanup on unmount
onBeforeUnmount(() => {
    // In a real app, disconnect from Phoenix
    chatService.disconnect();
});
</script>

<template>
    <div class="app-container">
        <div class="app-header">
            <h1 class="app-title">Chat App</h1>
            <div class="connection-status" :class="connectionStatus">
                            <span v-if="connectionStatus === 'connected'">Connected</span>
                            <span v-else-if="connectionStatus === 'connecting'">Connecting...</span>
                            <span v-else-if="connectionStatus === 'error'">
                                Connection Error
                                <span v-if="authError" class="error-details">{{ authError }}</span>
                            </span>
                            <span v-else>Disconnected</span>
                        </div>
        </div>

        <ChatLayout class="chat-layout-container">
            <template
                #conversation-list="{
                    selectedConversation: selectedChat,
                    onSelectConversation,
                }"
            >
                <div class="new-chat-wrapper">
                    <button
                        class="new-chat-button"
                        @click="createNewConversation"
                    >
                        New Chat
                    </button>
                </div>
                <ConversationList
                    :conversations="conversations"
                    :selectedConversation="selectedConversation"
                    @select-conversation="selectConversation"
                />
            </template>

            <template #message-list="{ conversation }">
                <MessageList
                    :conversation="selectedConversation"
                    :currentUserId="currentUserId"
                />
            </template>

            <template #message-input="{ conversation }">
                <MessageInput
                    :conversation="selectedConversation"
                    :loading="loading"
                    @send-message="sendMessage"
                />
            </template>
        </ChatLayout>
    </div>
</template>

<style>
/* Global styles */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html,
body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f5f5;
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.app-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    background-color: #2196f3;
    color: white;
    flex-shrink: 0;
}

.app-title {
    font-size: 1.5rem;
    font-weight: 500;
}

.connection-status {
    font-size: 0.8rem;
    padding: 5px 10px;
    border-radius: 20px;
    background-color: rgba(255, 255, 255, 0.2);
}

.connection-status.connected {
    background-color: #4caf50;
}

.connection-status.disconnected {
    background-color: #ff9800;
}

.connection-status.error {
    background-color: #f44336;
}

.connection-status.connecting {
    background-color: #2196f3;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

.error-details {
    display: block;
    font-size: 0.7rem;
    margin-top: 2px;
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.new-chat-wrapper {
    padding: 15px;
    text-align: center;
}

.new-chat-button {
    width: 100%;
    padding: 10px;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
}

.new-chat-button:hover {
    background-color: #388e3c;
}

.chat-layout-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    min-height: 0; /* Important for flex children to respect container size */
    width: 100%;
}

@media (max-width: 768px) {
    .app-header {
        padding: 8px 15px;
    }

    .app-title {
        font-size: 1.2rem;
    }

    .connection-status {
        font-size: 0.7rem;
        padding: 4px 8px;
    }

    .new-chat-wrapper {
        padding: 10px;
    }

    .new-chat-button {
        padding: 8px;
        font-size: 0.9rem;
    }
}

@media (max-width: 480px) {
    .app-header {
        padding: 6px 12px;
    }

    .app-title {
        font-size: 1.1rem;
    }

    .connection-status {
        font-size: 0.65rem;
        padding: 3px 6px;
    }
}
</style>

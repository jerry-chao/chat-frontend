<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import ChatLayout from "./ChatLayout.vue";
import ConversationList from "./ConversationList.vue";
import MessageList from "./MessageList.vue";
import MessageInput from "./MessageInput.vue";
import chatService from "../services/chat.js";

const props = defineProps({
    currentUserId: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
});

// State management
const conversations = ref([]);
const selectedConversation = ref(null);
const connectionStatus = ref("disconnected");
const loading = ref(false);
const authError = ref(null);

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
                    senderId: props.currentUserId,
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
                    senderId: props.currentUserId,
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
                    senderId: props.currentUserId,
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

// Initialize Phoenix connection
const initializePhoenixConnection = async () => {
    try {
        console.log("Initializing Phoenix connection with token:", props.token ? "Valid token" : "No token");
        connectionStatus.value = "connecting";
        
        // Add check for mock mode (for demo purposes)
        if (!props.token || props.token === "demo") {
            console.log("Using mock mode for demo");
            connectionStatus.value = "connected";
            return;
        }
        
        chatService
            .initialize("/socket", props.token, props.currentUserId)
            .onMessage(handleNewMessage)
            .onConnectionStateChange(handleConnectionChange)
            .onError(handleError);

        // Wait for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("Socket initialized, connection status:", chatService.socket ? "Connected" : "Disconnected");
        connectionStatus.value = "connected";
    } catch (error) {
        console.error("Connection initialization failed:", error);
        connectionStatus.value = "error";
        authError.value = error.message;
    }
};

// Handle incoming messages
const handleNewMessage = (payload) => {
    console.log("received payload:", payload);
    if (!payload || !payload.message) return;

    const { message, topic: conversation_id } = payload;
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
    authError.value = error.message;
};

// Select a conversation
const selectConversation = (conversation) => {
    console.log("Selecting conversation:", conversation?.id);
    
    // leave old conversation
    if (selectedConversation.value) {
        console.log("Leaving previous conversation:", selectedConversation.value.id);
        chatService.leaveConversation();
    }

    selectedConversation.value = conversation;

    // Reset unread count when selecting
    if (conversation) {
        conversation.unreadCount = 0;

        // In a real app, you would join the Phoenix channel for this conversation
        try {
            console.log("Joining conversation:", conversation.id);
            // Verify socket is connected before joining
            if (!chatService.socket) {
                console.error("Socket not connected. Cannot join conversation.");
                throw new Error("Socket not connected");
            }
            
            // Ensure we're properly joining the conversation before sending messages
            setTimeout(() => {
                try {
                    chatService.joinConversation(conversation.id);
                    console.log("Successfully joined conversation channel");
                } catch (innerError) {
                    console.error("Failed to join conversation (delayed):", innerError);
                }
            }, 500);
        } catch (error) {
            console.error("Failed to join conversation:", error);
            authError.value = error.message;
        }
    }
};

// Send a message
const sendMessage = async (messageData) => {
    if (!selectedConversation.value) return;

    loading.value = true;
    console.log("sendMessage called with:", messageData);
    
    // Create a temporary message
    const tempMessage = {
        id: `temp-${Date.now()}`,
        content: messageData.content,
        senderId: props.currentUserId,
        senderName: "You",
        timestamp: new Date().toISOString(),
        status: "sending",
    };

    // Add to local state
    selectedConversation.value.messages.push(tempMessage);
    selectedConversation.value.lastMessageTime = tempMessage.timestamp;

    try {
        // In a real app, you would send via Phoenix
        const sendResult = await chatService.sendMessage(tempMessage);
        console.log("sendResult:", sendResult);

        // Update message status with the response data
        const messageIndex = selectedConversation.value.messages.findIndex(
            (m) => m.id === tempMessage.id,
        );
        if (messageIndex >= 0) {
            console.log("Updating message status with sendResult:", sendResult);
            selectedConversation.value.messages[messageIndex] = {
                ...tempMessage,
                id: sendResult?.id || `real-${Date.now()}`,
                status: "sent",
                serverResponse: sendResult // Store the complete server response
            };
        }
    } catch (error) {
        console.error("Failed to send message:", error);
        // Update message status to show error
        const messageIndex = selectedConversation.value.messages.findIndex(
            (m) => m.id === tempMessage.id,
        );
        if (messageIndex >= 0) {
            selectedConversation.value.messages[messageIndex] = {
                ...tempMessage,
                status: "failed",
            };
        }
        // Don't rethrow here so we can continue
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
<<<<<<< HEAD
    try {
        // Initialize Phoenix connection
        await initializePhoenixConnection();
    } catch (error) {
        console.error("Failed to initialize Phoenix connection:", error);
    }
=======
    // Initialize Phoenix connection
    await initializePhoenixConnection();
>>>>>>> b1bcc01 (modify chat front show the message received)

    // Load mock data for demo
    generateMockData();
    
    // For development debugging - Add error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
    });
});

// Cleanup on unmount
onBeforeUnmount(() => {
    // In a real app, disconnect from Phoenix
    chatService.disconnect();
});
</script>

<template>
    <div class="chat-container">
        <div class="app-header">
            <h1 class="app-title">Chat App</h1>
            <div class="user-info">{{ currentUserId }}</div>
            <div class="connection-status" :class="connectionStatus">
                <span v-if="connectionStatus === 'connected'">Connected</span>
                <span v-else-if="connectionStatus === 'connecting'"
                    >Connecting...</span
                >
                <span v-else-if="connectionStatus === 'error'">
                    Connection Error
                    <span v-if="authError" class="error-details">{{
                        authError
                    }}</span>
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
.chat-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
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

.user-info {
    font-size: 0.9rem;
    padding: 5px 10px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
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
    0% {
        opacity: 0.6;
    }
    50% {
        opacity: 1;
    }
    100% {
        opacity: 0.6;
    }
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
    min-height: 0;
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

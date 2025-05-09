<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  conversations: {
    type: Array,
    default: () => []
  },
  selectedConversation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-conversation'])

// Select a conversation
const selectConversation = (conversation) => {
  emit('select-conversation', conversation)
}

// Get last message preview (truncated if too long)
const getLastMessagePreview = (conversation) => {
  if (!conversation.messages || conversation.messages.length === 0) {
    return 'No messages yet'
  }
  
  const lastMessage = conversation.messages[conversation.messages.length - 1]
  const content = lastMessage.content || ''
  
  return content.length > 30 ? content.substring(0, 30) + '...' : content
}

// Format timestamp
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  
  // If same day, only show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // If within the last week, show day name
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  if (date > oneWeekAgo) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  
  // Otherwise show date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="conversation-list">
    <div v-if="conversations.length === 0" class="empty-state">
      <p>No conversations yet</p>
      <button class="new-chat-btn">Start a New Chat</button>
    </div>
    
    <div v-else class="list-container">
      <div class="new-chat-container">
        <button class="new-chat-btn">New Chat</button>
      </div>
      
      <div 
        v-for="conversation in conversations" 
        :key="conversation.id"
        class="conversation-item"
        :class="{ 'selected': selectedConversation && selectedConversation.id === conversation.id }"
        @click="selectConversation(conversation)"
      >
        <div class="avatar">
          <span v-if="conversation.unreadCount" class="unread-badge">
            {{ conversation.unreadCount > 9 ? '9+' : conversation.unreadCount }}
          </span>
          <div class="avatar-circle">
            {{ conversation.name ? conversation.name.charAt(0).toUpperCase() : 'C' }}
          </div>
        </div>
        
        <div class="conversation-info">
          <div class="conversation-header">
            <h3 class="conversation-name">{{ conversation.name || 'Chat' }}</h3>
            <span class="conversation-time">{{ formatTime(conversation.lastMessageTime) }}</span>
          </div>
          
          <p class="conversation-preview">{{ getLastMessagePreview(conversation) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-list {
  height: 100%;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
  padding: 20px;
}

.list-container {
  display: flex;
  flex-direction: column;
}

.new-chat-container {
  padding: 10px 15px;
  position: sticky;
  top: 0;
  background-color: #f5f5f5;
  z-index: 1;
}

.new-chat-btn {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.new-chat-btn:hover {
  background-color: #45a049;
}

.conversation-item {
  display: flex;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: #e9e9e9;
}

.conversation-item.selected {
  background-color: #e1f5fe;
}

.avatar {
  position: relative;
  margin-right: 15px;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3f51b5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #f44336;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.conversation-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  font-size: 0.8rem;
  color: #757575;
  white-space: nowrap;
}

.conversation-preview {
  margin: 0;
  font-size: 0.85rem;
  color: #757575;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  conversation: {
    type: Object,
    default: null
  },
  currentUserId: {
    type: String,
    default: ''
  }
})

const messagesEndRef = ref(null)

// Watch for changes in messages to scroll to bottom
watch(
  () => props.conversation?.messages,
  async () => {
    if (props.conversation?.messages?.length) {
      await nextTick()
      scrollToBottom()
    }
  },
  { deep: true }
)

// Compute messages from conversation
const messages = computed(() => {
  if (!props.conversation || !props.conversation.messages) {
    return []
  }
  return props.conversation.messages
})

// Check if message is from current user
const isCurrentUser = (message) => {
  return message.senderId === props.currentUserId
}

// Format date for messages
const formatMessageTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Format date for message groups
const formatMessageDate = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
}

// Group messages by date
const groupedMessages = computed(() => {
  if (!messages.value.length) return []
  
  const groups = []
  let currentDate = null
  let currentGroup = null
  
  messages.value.forEach(message => {
    const messageDate = new Date(message.timestamp).toDateString()
    
    if (messageDate !== currentDate) {
      currentDate = messageDate
      currentGroup = {
        date: message.timestamp,
        messages: []
      }
      groups.push(currentGroup)
    }
    
    currentGroup.messages.push(message)
  })
  
  return groups
})

// Scroll to bottom of message list
const scrollToBottom = () => {
  if (messagesEndRef.value) {
    messagesEndRef.value.scrollIntoView({ behavior: 'smooth' })
  }
}

// Load more messages (could be implemented with a function)
const loadMoreMessages = () => {
  // Emit an event to load earlier messages
  // This would be implemented based on how your API pagination works
}
</script>

<template>
  <div class="message-list">
    <div v-if="!conversation" class="empty-state">
      <p>Select a conversation to start chatting</p>
    </div>
    
    <div v-else-if="!messages.length" class="empty-state">
      <p>No messages yet</p>
      <p>Send a message to start the conversation</p>
    </div>
    
    <div v-else class="messages-container">
      <div class="load-more">
        <button @click="loadMoreMessages" class="load-more-btn">Load earlier messages</button>
      </div>
      
      <div v-for="(group, groupIndex) in groupedMessages" :key="groupIndex" class="message-group">
        <div class="date-separator">
          <span class="date-text">{{ formatMessageDate(group.date) }}</span>
        </div>
        
        <div 
          v-for="(message, messageIndex) in group.messages" 
          :key="message.id || messageIndex"
          class="message-wrapper"
          :class="{ 'own-message': isCurrentUser(message), 'other-message': !isCurrentUser(message) }"
        >
          <div class="message">
            <div v-if="!isCurrentUser(message) && group.messages[messageIndex - 1]?.senderId !== message.senderId" class="sender-name">
              {{ message.senderName || 'User' }}
            </div>
            
            <div class="message-content">
              {{ message.content }}
            </div>
            
            <div class="message-meta">
              <span class="message-time">{{ formatMessageTime(message.timestamp) }}</span>
              <span v-if="isCurrentUser(message)" class="message-status">
                <!-- You can add icons or text for message status here -->
                <span v-if="message.status === 'sent'">✓</span>
                <span v-else-if="message.status === 'delivered'">✓✓</span>
                <span v-else-if="message.status === 'read'" class="status-read">✓✓</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div ref="messagesEndRef"></div>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
}

.messages-container {
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.load-more {
  text-align: center;
  margin-bottom: 15px;
}

.load-more-btn {
  background: none;
  border: none;
  color: #2196F3;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 5px 10px;
}

.load-more-btn:hover {
  text-decoration: underline;
}

.message-group {
  margin-bottom: 20px;
}

.date-separator {
  text-align: center;
  margin: 15px 0;
  position: relative;
}

.date-text {
  background-color: #f9f9f9;
  padding: 0 10px;
  font-size: 0.8rem;
  color: #757575;
  position: relative;
  z-index: 1;
}

.date-separator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e0e0e0;
  z-index: 0;
}

.message-wrapper {
  display: flex;
  margin-bottom: 10px;
}

.own-message {
  justify-content: flex-end;
}

.other-message {
  justify-content: flex-start;
}

.message {
  max-width: 70%;
  border-radius: 12px;
  padding: 10px 12px;
  position: relative;
  word-break: break-word;
}

.own-message .message {
  background-color: #e3f2fd;
  border-bottom-right-radius: 4px;
}

.other-message .message {
  background-color: #f5f5f5;
  border-bottom-left-radius: 4px;
}

.sender-name {
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 4px;
  color: #424242;
}

.message-content {
  font-size: 0.95rem;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-meta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 4px;
  font-size: 0.7rem;
  color: #757575;
}

.message-time {
  margin-right: 4px;
}

.message-status {
  display: flex;
  align-items: center;
}

.status-read {
  color: #2196F3;
}

@media (max-width: 768px) {
  .message {
    max-width: 85%;
  }
  
  .date-text {
    font-size: 0.7rem;
  }
  
  .message-content {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .message {
    max-width: 90%;
  }
  
  .messages-container {
    padding: 5px;
  }
  
  .date-separator {
    margin: 10px 0;
  }
}
</style>
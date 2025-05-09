<script setup>
import { ref } from 'vue'

// Props or state can be defined here
const selectedConversation = ref(null)

// Method to handle conversation selection
const selectConversation = (conversation) => {
  selectedConversation.value = conversation
}
</script>

<template>
  <div class="chat-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>Conversations</h2>
      </div>
      <div class="sidebar-content">
        <!-- Conversation list component will go here -->
        <slot name="conversation-list" :selectedConversation="selectedConversation" :onSelectConversation="selectConversation"></slot>
      </div>
    </div>
    <div class="main-content">
      <div class="chat-header">
        <h2 v-if="selectedConversation">{{ selectedConversation.name || 'Chat' }}</h2>
        <h2 v-else>Select a conversation</h2>
      </div>
      <div class="chat-messages">
        <!-- Message list component will go here -->
        <slot name="message-list" :conversation="selectedConversation"></slot>
      </div>
      <div class="chat-input">
        <!-- Message input component will go here -->
        <slot name="message-input" :conversation="selectedConversation"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f9f9f9;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background-color: #ffffff;
}

h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 500;
}

@media (max-width: 768px) {
  .chat-layout {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: 30vh;
  }
}
</style>
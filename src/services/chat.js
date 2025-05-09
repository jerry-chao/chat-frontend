import { Socket } from 'phoenix';

class ChatService {
  constructor() {
    this.socket = null;
    this.channel = null;
    this.userId = null;
    this.callbacks = {
      onMessage: () => {},
      onPresenceChange: () => {},
      onConnectionStateChange: () => {},
      onError: () => {}
    };
  }

  // Initialize Phoenix socket connection
  initialize(endpoint, token, userId) {
    this.userId = userId;
    
    // Create a new socket connection
    this.socket = new Socket(endpoint, {
      params: { token },
      logger: (kind, msg, data) => {
        console.log(`${kind}: ${msg}`, data);
      }
    });

    // Connect to the socket
    this.socket.connect();
    
    // Update connection state
    this.socket.onOpen(() => this.callbacks.onConnectionStateChange('connected'));
    this.socket.onClose(() => this.callbacks.onConnectionStateChange('disconnected'));
    this.socket.onError(() => this.callbacks.onConnectionStateChange('error'));
    
    return this;
  }

  // Register callback functions
  onMessage(callback) {
    this.callbacks.onMessage = callback;
    return this;
  }

  onPresenceChange(callback) {
    this.callbacks.onPresenceChange = callback;
    return this;
  }

  onConnectionStateChange(callback) {
    this.callbacks.onConnectionStateChange = callback;
    return this;
  }

  onError(callback) {
    this.callbacks.onError = callback;
    return this;
  }

  // Join a chat room/conversation
  joinConversation(conversationId) {
    // Leave current channel if any
    if (this.channel) {
      this.leaveConversation();
    }

    // Join the new channel
    this.channel = this.socket.channel(`conversation:${conversationId}`, {
      user_id: this.userId
    });

    // Handle received messages
    this.channel.on('new_message', (payload) => {
      this.callbacks.onMessage(payload);
    });

    // Handle presence state changes
    this.channel.on('presence_state', (state) => {
      this.callbacks.onPresenceChange({ state, joins: {}, leaves: {} });
    });

    this.channel.on('presence_diff', (diff) => {
      this.callbacks.onPresenceChange({ state: null, ...diff });
    });

    // Join the channel and handle errors
    this.channel.join()
      .receive('ok', (response) => {
        console.log('Joined conversation successfully', response);
      })
      .receive('error', (reason) => {
        console.error('Failed to join conversation', reason);
        this.callbacks.onError(reason);
      });

    return this;
  }

  // Leave the current conversation
  leaveConversation() {
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    return this;
  }

  // Send a message to the current conversation
  sendMessage(content) {
    if (!this.channel) {
      const error = new Error('Not connected to any conversation');
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      this.channel.push('new_message', { content })
        .receive('ok', (response) => resolve(response))
        .receive('error', (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Fetch message history for the current conversation
  fetchMessageHistory(limit = 20, before = null) {
    if (!this.channel) {
      const error = new Error('Not connected to any conversation');
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      this.channel.push('fetch_messages', { limit, before })
        .receive('ok', (response) => resolve(response.messages))
        .receive('error', (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Fetch conversation list
  fetchConversations() {
    if (!this.socket) {
      const error = new Error('Socket not connected');
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    const listChannel = this.socket.channel('conversation:list', {
      user_id: this.userId
    });

    return new Promise((resolve, reject) => {
      listChannel.join()
        .receive('ok', () => {
          listChannel.push('list_conversations')
            .receive('ok', (response) => {
              listChannel.leave();
              resolve(response.conversations);
            })
            .receive('error', (reason) => {
              listChannel.leave();
              this.callbacks.onError(reason);
              reject(reason);
            });
        })
        .receive('error', (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Create a new conversation
  createConversation(name, participants = []) {
    if (!this.socket) {
      const error = new Error('Socket not connected');
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    const listChannel = this.socket.channel('conversation:list', {
      user_id: this.userId
    });

    return new Promise((resolve, reject) => {
      listChannel.join()
        .receive('ok', () => {
          listChannel.push('create_conversation', { name, participants })
            .receive('ok', (response) => {
              listChannel.leave();
              resolve(response.conversation);
            })
            .receive('error', (reason) => {
              listChannel.leave();
              this.callbacks.onError(reason);
              reject(reason);
            });
        })
        .receive('error', (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Mark messages as read
  markAsRead(messageIds) {
    if (!this.channel) {
      const error = new Error('Not connected to any conversation');
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      this.channel.push('mark_read', { message_ids: messageIds })
        .receive('ok', (response) => resolve(response))
        .receive('error', (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Close the socket connection
  disconnect() {
    if (this.channel) {
      this.channel.leave();
      this.channel = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    return this;
  }
}

export default new ChatService();
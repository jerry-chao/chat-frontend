import { Socket } from "phoenix";

class ChatService {
  constructor() {
    this.socket = null;
    this.channel = null;
    this.userId = null;
    this.callbacks = {
      onMessage: () => {},
      onPresenceChange: () => {},
      onConnectionStateChange: () => {},
      onError: () => {},
    };
  }

  // Initialize Phoenix socket connection
  initialize(endpoint, token, userId) {
    console.log("ChatService.initialize called with userId:", userId);
    this.userId = userId;

    if (!token) {
      console.error("ChatService.initialize error: No token provided");
      throw new Error("Authentication token is required");
    }

    // Create a new socket connection
    const socketUrl = endpoint.startsWith("http")
      ? endpoint
      : "ws://127.0.0.1:4001/socket";
    console.log("ChatService.initialize: Creating socket with URL:", socketUrl);
    this.socket = new Socket(socketUrl, {
      params: { token },
      logger: (kind, msg, data) => {
        console.log(`${kind}: ${msg}`, data);
      },
    });

    // Connect to the socket
    console.log("ChatService.initialize: Connecting to socket");
    this.socket.connect();

    // Update connection state
    this.socket.onOpen(() => {
      console.log("ChatService: Socket connection opened successfully");
      this.callbacks.onConnectionStateChange("connected");
    });
    this.socket.onClose(() => {
      console.log("ChatService: Socket connection closed");
      this.callbacks.onConnectionStateChange("disconnected");
    });
    this.socket.onError((error) => {
      console.error("ChatService: Socket connection error:", error);
      this.callbacks.onConnectionStateChange("error");
      this.callbacks.onError(new Error("Socket connection failed"));
    });

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
    console.log("ChatService.joinConversation called with:", conversationId);

    // Verify socket is connected
    if (!this.socket) {
      console.error("ChatService.joinConversation error: Socket not connected");
      const error = new Error("Socket not connected");
      this.callbacks.onError(error);
      return this;
    }

    // Leave current channel if any
    if (this.channel) {
      console.log("ChatService.joinConversation: Leaving current channel");
      this.leaveConversation();
    }

    console.log(
      "ChatService.joinConversation: Creating new channel for:",
      conversationId,
    );
    // Join the new channel
    this.channel = this.socket.channel(`${conversationId}`, {
      user_id: this.userId
    });

    console.log(
      "ChatService.joinConversation: Setting up channel event handlers",
    );
    // Handle received messages
    this.channel.on("new_message", (payload) => {
      console.log("ChatService: Received new message:", payload);
      this.callbacks.onMessage(payload);
    });

    // Handle presence state changes
    this.channel.on("presence_state", (state) => {
      console.log("ChatService: Received presence state:", state);
      this.callbacks.onPresenceChange({ state, joins: {}, leaves: {} });
    });

    this.channel.on("presence_diff", (diff) => {
      console.log("ChatService: Received presence diff:", diff);
      this.callbacks.onPresenceChange({ state: null, ...diff });
    });

    console.log("ChatService.joinConversation: Joining channel");
    // Join the channel and handle errors
    this.channel
      .join()
      .receive("ok", (response) => {
        console.log("ChatService: Joined conversation successfully", response);
      })
      .receive("error", (reason) => {
        console.error("ChatService: Failed to join conversation", reason);
        this.callbacks.onError(reason);
      });

    return this;
  }

  // Leave the current conversation
  leaveConversation() {
    console.log("ChatService.leaveConversation called");
    if (this.channel) {
      console.log("ChatService.leaveConversation: Leaving channel");
      this.channel.leave();
      this.channel = null;
    } else {
      console.log("ChatService.leaveConversation: No channel to leave");
    }
    return this;
  }

  // Send a message to the current conversation
  sendMessage(content) {
    console.log("ChatService.sendMessage: Channel exists, preparing to send");
    return new Promise((resolve, reject) => {
      console.log("ChatService.sendMessage: Pushing message to channel");
      this.channel
        .push("new_message", { content })
        .receive("ok", (response) => {
          console.log(
            "ChatService.sendMessage: Message sent successfully:",
            response,
          );
          resolve(response);
        })
        .receive("error", (reason) => {
          console.error(
            "ChatService.sendMessage: Error sending message:",
            reason,
          );
          this.callbacks.onError(reason);
          reject(reason);
        })
        .receive("timeout", () => {
          console.log("timed out pushing");
          reject(new Error("Timeout"));
        });
    });
  }

  // Fetch message history for the current conversation
  fetchMessageHistory(limit = 20, before = null) {
    if (!this.channel) {
      const error = new Error("Not connected to any conversation");
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      this.channel
        .push("fetch_messages", { limit, before })
        .receive("ok", (response) => resolve(response.messages))
        .receive("error", (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Fetch conversation list
  fetchConversations() {
    if (!this.socket) {
      const error = new Error("Socket not connected");
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    const listChannel = this.socket.channel("conversation:list", {
      user_id: this.userId,
    });

    return new Promise((resolve, reject) => {
      listChannel
        .join()
        .receive("ok", () => {
          listChannel
            .push("list_conversations")
            .receive("ok", (response) => {
              listChannel.leave();
              resolve(response.conversations);
            })
            .receive("error", (reason) => {
              listChannel.leave();
              this.callbacks.onError(reason);
              reject(reason);
            });
        })
        .receive("error", (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Create a new conversation
  createConversation(name, participants = []) {
    if (!this.socket) {
      const error = new Error("Socket not connected");
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    const listChannel = this.socket.channel("conversation:list", {
      user_id: this.userId,
    });

    return new Promise((resolve, reject) => {
      listChannel
        .join()
        .receive("ok", () => {
          listChannel
            .push("create_conversation", { name, participants })
            .receive("ok", (response) => {
              listChannel.leave();
              resolve(response.conversation);
            })
            .receive("error", (reason) => {
              listChannel.leave();
              this.callbacks.onError(reason);
              reject(reason);
            });
        })
        .receive("error", (reason) => {
          this.callbacks.onError(reason);
          reject(reason);
        });
    });
  }

  // Mark messages as read
  markAsRead(messageIds) {
    if (!this.channel) {
      const error = new Error("Not connected to any conversation");
      this.callbacks.onError(error);
      return Promise.reject(error);
    }

    return new Promise((resolve, reject) => {
      this.channel
        .push("mark_read", { message_ids: messageIds })
        .receive("ok", (response) => resolve(response))
        .receive("error", (reason) => {
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

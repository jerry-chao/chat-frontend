<script setup>
import { ref } from "vue";
import Chat from "./components/Chat.vue";
import LoginForm from "./components/LoginForm.vue";
import { setAuthToken } from "./services/api.js";

// State management
const isAuthenticated = ref(false);
const currentUserId = ref(""); // Will be set after login
const token = ref(null);
const authError = ref(null);

// Handle successful login
const handleLoginSuccess = async (username, receivedToken) => {
    token.value = receivedToken;
    // Set token for future requests
    setAuthToken(token.value);
    // Set user ID (in a real app, you would decode the token or fetch user info)
    currentUserId.value = username;
    isAuthenticated.value = true;
};

// Handle login error
const handleLoginError = (error) => {
    authError.value = error;
};
</script>

<template>
    <div class="app-container">
        <!-- Show login form if not authenticated -->
        <LoginForm
            v-if="!isAuthenticated"
            @login-success="handleLoginSuccess"
            @login-error="handleLoginError"
        />

        <!-- Show chat interface if authenticated -->
        <Chat 
            v-else
            :currentUserId="currentUserId"
            :token="token"
        />
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
</style>

<script setup>
import { ref } from "vue";
import { authenticate } from "../services/api.js";

const emit = defineEmits(["login-success", "login-error"]);

const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref(null);

const login = async () => {
    if (!username.value || !password.value) {
        error.value = "Please enter both username and password.";
        return;
    }

    loading.value = true;
    error.value = null;

    try {
        const response = await authenticate(username.value, password.value);
        emit("login-success", username.value, response.token);
    } catch (err) {
        error.value = err.message || "Login failed. Please try again.";
        emit("login-error", error.value);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="login-form-container">
        <div class="login-form">
            <h1 class="login-title">Chat Login</h1>

            <div class="form-group">
                <label for="username">Username</label>
                <input
                    id="username"
                    v-model="username"
                    type="text"
                    placeholder="Enter your username"
                    :disabled="loading"
                />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input
                    id="password"
                    v-model="password"
                    type="password"
                    placeholder="Enter your password"
                    :disabled="loading"
                />
            </div>

            <div v-if="error" class="error-message">
                {{ error }}
            </div>

            <button class="login-button" @click="login" :disabled="loading">
                <span v-if="loading">Logging in...</span>
                <span v-else>Login</span>
            </button>
        </div>
    </div>
</template>

<style>
.login-form-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f5f7fb;
}

.login-form {
    width: 100%;
    max-width: 400px;
    padding: 30px;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.login-title {
    text-align: center;
    color: #2196f3;
    margin-bottom: 30px;
    font-size: 1.8rem;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
}

.form-group input {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

.form-group input:focus {
    outline: none;
    border-color: #2196f3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.error-message {
    color: #f44336;
    margin-bottom: 20px;
    padding: 10px;
    background-color: rgba(244, 67, 54, 0.1);
    border-radius: 4px;
    text-align: center;
}

.login-button {
    width: 100%;
    padding: 12px;
    background-color: #2196f3;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.login-button:hover {
    background-color: #1976d2;
}

.login-button:disabled {
    background-color: #90caf9;
    cursor: not-allowed;
}

@media (max-width: 480px) {
    .login-form {
        padding: 20px;
    }

    .login-title {
        font-size: 1.5rem;
    }

    .form-group input {
        padding: 10px;
    }

    .login-button {
        padding: 10px;
    }
}
</style>

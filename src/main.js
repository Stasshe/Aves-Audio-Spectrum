import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPersist from 'pinia-plugin-persist';
import App from './App.vue';
import './assets/style.css';

// Pinia ストアの作成と永続化プラグインの適用
const pinia = createPinia();
pinia.use(piniaPersist);

// アプリケーションの作成
const app = createApp(App);

// プラグインのインストール
app.use(pinia);

// グローバルエラーハンドラー
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue Error:', err);
  console.error('Error Info:', info);
};

// アプリケーションのマウント
app.mount('#app');


import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // 获取构建时的北京时间
  const buildTime = new Date().toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false 
  });

  return {
    plugins: [react()],
    define: {
      // 注入全局常量，注意需要 JSON.stringify
      __BUILD_TIME__: JSON.stringify(buildTime)
    }
  };
});

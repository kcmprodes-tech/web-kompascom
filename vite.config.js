import { defineConfig } from "vite";
import { resolve } from "node:path";

const root = import.meta.dirname;

// Multi-page app: every top-level .html file is a build entry.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(root, "index.html"),
        account: resolve(root, "account.html"),
        article: resolve(root, "article-detail.html"),
        karin: resolve(root, "karin-chat.html"),
        laya: resolve(root, "laya-read.html"),
        membership: resolve(root, "membership.html"),
        originalIndex: resolve(root, "original-index.html"),
        originalDetail: resolve(root, "original-detail.html"),
        originalReader: resolve(root, "original-reader.html"),
      },
    },
  },
});

import { Article } from '@/types/article';
import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), '.tmp-articles.json');

// Global articles store using file-based persistence
class ArticlesStore {
  private static instance: ArticlesStore;

  private constructor() {}

  public static getInstance(): ArticlesStore {
    if (!ArticlesStore.instance) {
      ArticlesStore.instance = new ArticlesStore();
    }
    return ArticlesStore.instance;
  }

  public getArticles(): Article[] {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        const articles = JSON.parse(data);
        console.log(`📖 ArticlesStore: Loaded ${articles.length} articles from file`);
        return articles;
      }
    } catch (error) {
      console.error('Error reading articles from file:', error);
    }
    return [];
  }

  public setArticles(articles: Article[]): void {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(articles, null, 2));
      console.log(`📦 ArticlesStore: Stored ${articles.length} articles to file`);
    } catch (error) {
      console.error('Error storing articles to file:', error);
    }
  }

  public getCount(): number {
    return this.getArticles().length;
  }

  public clear(): void {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        fs.unlinkSync(STORAGE_FILE);
        console.log(`🗑️ ArticlesStore: Cleared articles file`);
      }
    } catch (error) {
      console.error('Error clearing articles file:', error);
    }
  }
}

// Export singleton instance
export const articlesStore = ArticlesStore.getInstance(); 
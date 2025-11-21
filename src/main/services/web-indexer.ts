/**
 * Web Indexer Service
 * Indexes web pages into the knowledge base with support for crawling
 */

import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { lanceDBManager } from '../storage/lancedb-manager';

interface WebIndexOptions {
  url: string;
  depth?: number;
  maxPages?: number;
}

interface PageResult {
  url: string;
  title: string;
  chunks: number;
  error?: string;
}

export class WebIndexer {
  /**
   * Index a web page or site
   */
  async indexWeb(options: WebIndexOptions): Promise<{ success: boolean; pagesCount: number; results: PageResult[]; error?: string }> {
    // Default to deep crawl if not specified, since we want to capture documentation fully
    const { url, depth = 20, maxPages = 1000 } = options;
    const visited = new Set<string>();
    const queue: { url: string; currentDepth: number }[] = [{ url, currentDepth: 0 }];
    const results: PageResult[] = [];
    
    const baseUrl = new URL(url);
    const baseDomain = baseUrl.hostname;
    // Keep path prefix to avoid escaping documentation subfolders (e.g. /docs/)
    const basePath = baseUrl.pathname;

    try {
      console.log(`Starting web index for ${url} (depth: ${depth}, max: ${maxPages})`);

      while (queue.length > 0 && visited.size < maxPages) {
        const current = queue.shift()!;
        
        // Normalize URL (strip hash, trailing slash usually handled by visited check but let's be safe)
        const currentUrlObj = new URL(current.url);
        currentUrlObj.hash = '';
        const normalizedUrl = currentUrlObj.href;

        if (visited.has(normalizedUrl)) continue;
        visited.add(normalizedUrl);

        const result = await this.processPage(normalizedUrl);
        results.push(result);

        // If we haven't reached max depth, find links
        if (current.currentDepth < depth && result.success && result.links) {
          for (const link of result.links) {
            try {
              const linkUrl = new URL(link, current.url);
              linkUrl.hash = ''; // strip hash for comparison
              
              // Only follow links within the same domain
              // And ideally, if we started at /docs, we should probably stay in /docs to avoid crawling the whole marketing site?
              // For now, strict domain check is safest.
              
              if (linkUrl.hostname === baseDomain && !visited.has(linkUrl.href)) {
                // Optional: Check if link starts with basePath to keep it scoped?
                // Usually docs are at root or /docs. If user enters /docs, they probably want just docs.
                // Let's add a soft check: if the base path was not root '/', enforce startsWith.
                
                const shouldFollow = basePath === '/' || linkUrl.pathname.startsWith(basePath);
                
                if (shouldFollow) {
                  queue.push({ url: linkUrl.href, currentDepth: current.currentDepth + 1 });
                }
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }
        }
      }

      return {
        success: true,
        pagesCount: results.filter(r => !r.error).length,
        results
      };

    } catch (error: any) {
      console.error('Web indexing failed:', error);
      return {
        success: false,
        pagesCount: results.filter(r => !r.error).length,
        results,
        error: error.message
      };
    }
  }

  private async processPage(url: string): Promise<PageResult & { success: boolean; links?: string[] }> {
    try {
      console.log(`Fetching URL: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Guru-AI-Indexer/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract links before removing elements
      const links: string[] = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links.push(href);
        }
      });

      // Cleanup
      $('script, style, nav, footer, svg, noscript, iframe, ad').remove();
      
      const title = $('title').text().trim() || url;
      let content = $('body').text();
      content = content.replace(/\s+/g, ' ').trim();
      
      if (!content) {
        return {
          url,
          title,
          chunks: 0,
          success: false,
          error: 'No content found'
        };
      }
      
      const chunks = this.chunkText(content);
      const documentId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `chunk-${i}`;
        const chunkContent = chunks[i];
        const vector = this.generateDummyEmbedding(chunkContent);
        
        await lanceDBManager.addDocumentChunk({
          document_id: documentId,
          chunk_id: chunkId,
          content: chunkContent,
          vector,
          position: i,
          file_path: url,
          file_type: 'web',
          title: title,
          chunk_tokens: Math.ceil(chunkContent.length / 4),
          metadata: JSON.stringify({
            url: url,
            source: 'web-scraper',
            indexed_at: new Date().toISOString()
          })
        });
      }
      
      return {
        url,
        title,
        chunks: chunks.length,
        success: true,
        links
      };
      
    } catch (error: any) {
      return {
        url,
        title: url,
        chunks: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  private chunkText(text: string): string[] {
    const chunkSize = 1000;
    const chunkOverlap = 200;
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start += chunkSize - chunkOverlap;
      if (start + chunkSize >= text.length) break;
    }
    return chunks;
  }
  
  private generateDummyEmbedding(text: string): number[] {
    const dim = 384;
    const vector = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = charCode % dim;
      vector[index] += 1 / text.length;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / (magnitude || 1));
  }
}

export const webIndexer = new WebIndexer();


/**
 * A Trie (Prefix Tree) optimized for case-insensitive item name lookups.
 * This allows for O(L) retrieval speed where L is the length of the search term,
 * making it instant even with thousands of items.
 */

class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  originalWord: string | null;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.originalWord = null;
  }
}

export class ItemTrie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string) {
    if (!word) return;
    let current = this.root;
    const lowerWord = word.toLowerCase();

    for (const char of lowerWord) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    current.isEndOfWord = true;
    current.originalWord = word; // Store original casing
  }

  search(prefix: string, limit: number = 5): string[] {
    if (!prefix) return [];
    let current = this.root;
    const lowerPrefix = prefix.toLowerCase();

    // Navigate to the end of the prefix
    for (const char of lowerPrefix) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    // Collect all words from this point downwards
    const results: string[] = [];
    this.collectWords(current, results, limit);
    return results;
  }

  private collectWords(node: TrieNode, results: string[], limit: number) {
    if (results.length >= limit) return;
    
    if (node.isEndOfWord && node.originalWord) {
      results.push(node.originalWord);
    }

    for (const childNode of node.children.values()) {
      this.collectWords(childNode, results, limit);
    }
  }
}

'use client';

import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Copy,
  Check,
  Trash2,
  BookOpen,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const LOADING_MESSAGES = [
  'Thinking...',
  'Structuring ideas...',
  'Drafting blog content...',
  'Polishing final response...',
];

export default function Home() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch saved history on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Cycle Gemini loading status messages every 2 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingMsgIndex(0);
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to load posts history:', err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate blog');
      }

      setCurrentPost(data);
      setPosts((prev) => [data, ...prev]);
      setTopic('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong while generating.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!currentPost) return;
    const fullText = `# ${currentPost.title}\n\n${currentPost.content}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering item selection
    setDeletingId(id);

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        if (currentPost?.id === id) {
          setCurrentPost(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-300">
              AI Blog Generator
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Input Section */}
        <section className="space-y-4">
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What blog topic would you like to generate?"
                suppressHydrationWarning
                disabled={loading}
                className="w-full px-5 py-4 text-base rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-7 py-4 rounded-2xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Blog</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}
        </section>

        {/* Gemini-Style Loading State UI */}
        {loading && (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 sm:p-10 space-y-8">
            {/* Status Badge with Spinning Sparkle & Dynamic Message */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Gemini AI Processing
                </span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 transition-all duration-300">
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            </div>

            {/* Skeleton Shimmer Bars */}
            <div className="space-y-8">
              {/* 1 Title Bar Skeleton */}
              <div className="h-9 w-3/4 rounded-2xl animate-shimmer" />

              {/* 3 Paragraph Skeleton Blocks */}
              <div className="space-y-3 pt-2">
                <div className="h-4.5 w-full rounded-xl animate-shimmer" />
                <div className="h-4.5 w-11/12 rounded-xl animate-shimmer" />
                <div className="h-4.5 w-4/5 rounded-xl animate-shimmer" />
              </div>

              <div className="space-y-3">
                <div className="h-4.5 w-full rounded-xl animate-shimmer" />
                <div className="h-4.5 w-5/6 rounded-xl animate-shimmer" />
                <div className="h-4.5 w-3/4 rounded-xl animate-shimmer" />
              </div>

              <div className="space-y-3">
                <div className="h-4.5 w-11/12 rounded-xl animate-shimmer" />
                <div className="h-4.5 w-full rounded-xl animate-shimmer" />
                <div className="h-4.5 w-2/3 rounded-xl animate-shimmer" />
              </div>
            </div>
          </section>
        )}

        {/* Direct Output Display */}
        {!loading && currentPost && (
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-500 animate-in fade-in">
            {/* Top Toolbar with Copy Content Action Button */}
            <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Generated Content</span>
              </div>
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Content</span>
                  </>
                )}
              </button>
            </div>

            {/* Rendered Text / Markdown Area */}
            <div id="blog-content" className="p-6 sm:p-10 space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {currentPost.title}
              </h2>
              <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed font-sans">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-6 mb-3">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2 border-b border-slate-200/60 dark:border-slate-800 pb-1">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-slate-700 dark:text-slate-300 mb-4 leading-7">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1.5 my-3 pl-2 text-slate-700 dark:text-slate-300">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1.5 my-3 pl-2 text-slate-700 dark:text-slate-300">
                        {children}
                      </ol>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-600 dark:text-slate-400 my-4">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children }) => (
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-sm font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {currentPost.content}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Previously Generated Blogs History */}
        <section className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <span>Previously Generated Blogs</span>
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {posts.length} {posts.length === 1 ? 'saved blog' : 'saved blogs'}
            </span>
          </div>

          {posts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-sm">
              No blog posts generated yet. Enter a topic above to create your first post!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => {
                const isSelected = currentPost?.id === post.id;
                const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={post.id}
                    onClick={() => setCurrentPost(post)}
                    className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 shadow-xs'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {post.title}
                        </h4>
                        <button
                          type="button"
                          aria-label="Delete post"
                          disabled={deletingId === post.id}
                          onClick={(e) => handleDelete(post.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer shrink-0"
                        >
                          {deletingId === post.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {post.content.replace(/[#*`_]/g, '')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
